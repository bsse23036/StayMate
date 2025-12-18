const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const serverless = require('serverless-http');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
require('dotenv').config();

// --- SETUP EXPRESS APP ---
const app = express();
app.use(cors()); // Allow our Frontend (S3) to talk to this Backend
app.use(express.json()); // Teach Express how to read JSON data

// --- 1. AWS & DB CONFIGURATION ---
// We initialize the AWS services we need: S3 for images, SES for emails.
// Important: The region must match where you created your Learner Lab resources!
const s3Client = new S3Client({ region: "us-east-1" });
const sesClient = new SESClient({ region: "us-east-1" });

// Grab secret keys from the Lambda Environment Variables
const BUCKET_NAME = process.env.BUCKET_NAME || 'thikana-app-images';
const SENDER_EMAIL = 'YOUR-VERIFIED-EMAIL@gmail.com'; // CHANGE THIS to your verified email!

// Setup the connection to our PostgreSQL Database (RDS)
const client = new Client({
    user: process.env.DB_USER, // 'postgres'
    host: process.env.DB_HOST, // The long RDS endpoint link
    database: 'postgres', // Default database name
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false } // Required for secure AWS connections
});

// actually connect to the database now
client.connect()
    .then(() => console.log('✅ Connected to RDS Database successfully!'))
    .catch(err => console.error('❌ DB Connection Error:', err));


// --- SPECIAL: AUTOMATIC DATABASE SETUP ---
// This route is the "Magic Button". When you visit /setup-database, 
// it builds your entire database structure (tables) for you.
app.get('/setup-database', async(req, res) => {
    try {
        console.log("🛠️ Starting Database Setup...");

        // 1. Create Users Table (Stores Guests, Hostel Owners, and Mess Owners)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL CHECK (role IN ('guest', 'hostel_owner', 'mess_owner')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Create Hostels Table (Linked to an Owner)
        await client.query(`
            CREATE TABLE IF NOT EXISTS hostels (
                id SERIAL PRIMARY KEY,
                owner_id INT REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(150) NOT NULL,
                price INT NOT NULL,
                location VARCHAR(100) NOT NULL,
                image_url TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Create Mess Services Table (For food services)
        await client.query(`
            CREATE TABLE IF NOT EXISTS mess_services (
                id SERIAL PRIMARY KEY,
                owner_id INT REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(150) NOT NULL,
                price INT NOT NULL,
                location VARCHAR(100) NOT NULL,
                image_url TEXT,
                menu_description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Create Bookings Table (Links a Guest to a Hostel)
        await client.query(`
            CREATE TABLE IF NOT EXISTS room_bookings (
                id SERIAL PRIMARY KEY,
                guest_id INT REFERENCES users(id) ON DELETE CASCADE,
                hostel_id INT REFERENCES hostels(id) ON DELETE CASCADE,
                booking_date DATE DEFAULT CURRENT_DATE,
                status VARCHAR(50) DEFAULT 'confirmed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        res.send("✅ Database Tables Created Successfully! You can now start using the app.");
    } catch (err) {
        console.error("Setup Error:", err);
        res.status(500).send("❌ Error creating tables: " + err.message);
    }
});


// --- 2. AUTHENTICATION ROUTES ---

// Route for New User Registration
app.post('/register', async(req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // First, verify if this email is already taken
        const checkUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // If new, save them to the database
        const query = `
            INSERT INTO users (name, email, password, role) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, name, email, role
        `;
        const result = await client.query(query, [name, email, password, role]);

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route for User Login
app.post('/login', async(req, res) => {
    const { email, password } = req.body;
    try {
        // Find user with matching email AND password
        const query = 'SELECT * FROM users WHERE email = $1 AND password = $2';
        const result = await client.query(query, [email, password]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Send back only safe info (no password)
            res.json({
                success: true,
                user: { id: user.id, name: user.name, role: user.role }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 3. VIEWING LISTINGS (PUBLIC) ---

// Get all Hostels (Or search by city/name)
app.get('/hostels', async(req, res) => {
    const { search } = req.query;
    try {
        let query = 'SELECT * FROM hostels ORDER BY id DESC'; // Newest first
        let params = [];

        // If someone typed in the search bar, filter the results
        if (search) {
            query = 'SELECT * FROM hostels WHERE location ILIKE $1 OR name ILIKE $1 ORDER BY id DESC';
            params = [`%${search}%`]; // The % signs mean "match anything containing this text"
        }

        const result = await client.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Mess Services
app.get('/messes', async(req, res) => {
    try {
        const result = await client.query('SELECT * FROM mess_services ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 4. OWNER ACTIONS (ADD, EDIT, DELETE) ---

// Add a New Hostel (Only Owners use this)
app.post('/add-hostel', async(req, res) => {
    const { name, price, location, image_url, owner_id } = req.body;
    try {
        const query = `
            INSERT INTO hostels (name, price, location, image_url, owner_id)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(query, [name, price, location, image_url, owner_id]);
        res.json({ success: true, message: 'Hostel added successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a New Mess Service
app.post('/add-mess', async(req, res) => {
    const { name, price, location, image_url, owner_id } = req.body;
    try {
        const query = `
            INSERT INTO mess_services (name, price, location, image_url, owner_id)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(query, [name, price, location, image_url, owner_id]);
        res.json({ success: true, message: 'Mess service added!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a Hostel (With Security Check)
app.delete('/hostels/:id', async(req, res) => {
    const { id } = req.params;
    const { user_id } = req.body; // Frontend sends who is asking to delete

    try {
        // Security: Check if the user is actually a hostel owner
        const userCheck = await client.query('SELECT role FROM users WHERE id = $1', [user_id]);

        if (!userCheck.rows[0] || userCheck.rows[0].role !== 'hostel_owner') {
            return res.status(403).json({ error: "Access Denied: Only Owners can delete." });
        }

        // If safe, delete the hostel
        await client.query('DELETE FROM hostels WHERE id = $1', [id]);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a Mess Service
app.delete('/messes/:id', async(req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    try {
        const userCheck = await client.query('SELECT role FROM users WHERE id = $1', [user_id]);

        if (!userCheck.rows[0] || userCheck.rows[0].role !== 'mess_owner') {
            return res.status(403).json({ error: "Access Denied" });
        }

        await client.query('DELETE FROM mess_services WHERE id = $1', [id]);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Edit Hostel Details
app.put('/hostels/:id', async(req, res) => {
    const { id } = req.params;
    const { name, price, location, image_url } = req.body;
    try {
        const query = `
            UPDATE hostels SET name = $1, price = $2, location = $3, image_url = $4
            WHERE id = $5
        `;
        await client.query(query, [name, price, location, image_url, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- 5. IMAGE UPLOADS (S3 PRESIGNED URLs) ---
// Since Lambda can't handle large files, we generate a "safe link" 
// so the frontend can upload the image directly to S3.
app.post('/get-upload-url', async(req, res) => {
    const { fileName, fileType } = req.body;

    // Create a unique name (timestamp) to prevent overwriting old files
    const uniqueKey = `uploads/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: uniqueKey,
        ContentType: fileType,
    });

    try {
        // Generate a URL valid for 60 seconds
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        res.json({
            uploadUrl: signedUrl,
            // This is the permanent link we will save to the database
            finalImageUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${uniqueKey}`
        });
    } catch (err) {
        console.error("S3 Error:", err);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});


// --- 6. BOOKINGS & EMAILS ---

// Handle Booking Requests
app.post('/book', async(req, res) => {
    const { guest_id, hostel_id, guest_name } = req.body;

    try {
        // 1. Save the booking in the database
        await client.query(
            'INSERT INTO room_bookings (guest_id, hostel_id) VALUES ($1, $2)', [guest_id, hostel_id]
        );

        // 2. Try to send an email notification (AWS SES)
        // We wrap this in a try-catch so if email fails (due to sandbox), 
        // the booking still succeeds.
        try {
            const emailParams = {
                Source: SENDER_EMAIL, // This MUST be verified in AWS SES Console
                Destination: { ToAddresses: [SENDER_EMAIL] }, // Sending to self for demo purposes
                Message: {
                    Subject: { Data: `New Booking Alert - StayMate` },
                    Body: {
                        Text: { Data: `Great News! \n\nA new booking has been made by Guest: ${guest_name}\nFor Hostel ID: ${hostel_id}` },
                    },
                },
            };
            await sesClient.send(new SendEmailCommand(emailParams));
            console.log("Email notification sent successfully.");
        } catch (emailErr) {
            console.warn("SES Email Warning (Sandbox Mode?):", emailErr.message);
        }

        res.json({ success: true, message: 'Booking confirmed!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 7. START SERVER ---
// We use serverless-http to wrap the app for AWS Lambda
module.exports.handler = serverless(app);

// If running locally on your laptop, this starts the server on port 3000
if (require.main === module) {
    app.listen(3000, () => console.log('Server running on port 3000'));
}