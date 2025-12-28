const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const serverless = require('serverless-http');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
require('dotenv').config();

const app = express();

// --- 1. CONFIGURATION ---
app.use(cors());
app.use(express.json());

const s3Client = new S3Client({ region: "us-east-1" });
const sesClient = new SESClient({ region: "us-east-1" });
const BUCKET_NAME = process.env.BUCKET_NAME || 'thikana-app-images';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'your-verified-email@gmail.com';

// --- 2. DATABASE CONNECTION ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

const queryDB = async(text, params) => {
    return await pool.query(text, params);
};


// --- 3. HEALTH CHECK ---
app.get('/', (req, res) => {
    res.send("✅ StayMate Advanced API is Running!");
});


// --- 4. SETUP DATABASE (NEW ADVANCED SCHEMA) ---
app.get('/setup-database', async(req, res) => {
    try {
        console.log("🛠️ Starting Advanced Database Setup...");

        // 1. Cleanup
        await queryDB("DROP TABLE IF EXISTS room_bookings CASCADE");
        await queryDB("DROP TABLE IF EXISTS mess_subscriptions CASCADE");
        await queryDB("DROP TABLE IF EXISTS mess_menus CASCADE");
        await queryDB("DROP TABLE IF EXISTS mess_services CASCADE");
        await queryDB("DROP TABLE IF EXISTS rooms CASCADE");
        await queryDB("DROP TABLE IF EXISTS hostels CASCADE");
        await queryDB("DROP TABLE IF EXISTS users CASCADE");
        await queryDB("DROP TYPE IF EXISTS user_role");

        // 2. Create Type & Users
        await queryDB("CREATE TYPE user_role AS ENUM ('student', 'hostel_owner', 'mess_owner')");

        await queryDB(`
            CREATE TABLE users (
                user_id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                phone_number VARCHAR(20),
                role user_role NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Hostels
        await queryDB(`
            CREATE TABLE hostels (
                hostel_id SERIAL PRIMARY KEY,
                owner_id INT REFERENCES users(user_id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                city VARCHAR(50) NOT NULL,
                address TEXT NOT NULL,
                description TEXT,
                main_image_url TEXT,
                wifi_available BOOLEAN DEFAULT FALSE,
                generator_available BOOLEAN DEFAULT FALSE
            );
        `);

        // 4. Rooms (Price is here now)
        await queryDB(`
            CREATE TABLE rooms (
                room_id SERIAL PRIMARY KEY,
                hostel_id INT REFERENCES hostels(hostel_id) ON DELETE CASCADE,
                room_type VARCHAR(50) NOT NULL, 
                price_per_month DECIMAL(10, 2) NOT NULL,
                total_beds INT NOT NULL,
                available_beds INT NOT NULL,
                has_attached_bath BOOLEAN DEFAULT TRUE
            );
        `);

        // 5. Mess Services
        await queryDB(`
            CREATE TABLE mess_services (
                mess_id SERIAL PRIMARY KEY,
                owner_id INT REFERENCES users(user_id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                city VARCHAR(50) NOT NULL,
                monthly_price DECIMAL(10, 2) NOT NULL,
                delivery_radius_km DECIMAL(4, 1)
            );
        `);

        // 6. Mess Menus
        await queryDB(`
            CREATE TABLE mess_menus (
                menu_id SERIAL PRIMARY KEY,
                mess_id INT REFERENCES mess_services(mess_id) ON DELETE CASCADE,
                day_of_week VARCHAR(15) NOT NULL,
                breakfast_item VARCHAR(100),
                lunch_item VARCHAR(100),
                dinner_item VARCHAR(100)
            );
        `);

        // 7. Bookings
        await queryDB(`
            CREATE TABLE room_bookings (
                booking_id SERIAL PRIMARY KEY,
                student_id INT REFERENCES users(user_id),
                room_id INT REFERENCES rooms(room_id),
                start_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        res.send("✅ Advanced Database Tables Created Successfully!");
    } catch (err) {
        console.error("Setup Error:", err);
        res.status(500).send("❌ Error: " + err.message);
    }
});


// --- 5. AUTHENTICATION ROUTES (UPDATED FIELDS) ---

app.post('/register', async(req, res) => {
    // Note: Frontend sends 'role' as string, Postgres casts it to ENUM automatically
    const { name, email, password, role } = req.body;
    try {
        const checkUser = await queryDB('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const result = await queryDB(
            'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, full_name, email, role', [name, email, password, role]
        );

        // Normalize response to match Frontend expectation (id, name, role)
        const u = result.rows[0];
        res.json({ success: true, user: { id: u.user_id, name: u.full_name, role: u.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/login', async(req, res) => {
    const { email, password } = req.body;
    try {
        const result = await queryDB('SELECT * FROM users WHERE email = $1 AND password_hash = $2', [email, password]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({
                success: true,
                user: { id: user.user_id, name: user.full_name, role: user.role }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 6. VIEWING LISTINGS (SMART QUERY) ---

app.get('/hostels', async(req, res) => {
    const { search } = req.query;
    try {
        // COMPLEX QUERY:
        // We join Hostels with Rooms to find the "Starting Price" (MIN price)
        // This lets the frontend still show a price tag even though price is in a different table.
        let queryText = `
            SELECT h.hostel_id as id, h.name, h.city as location, h.main_image_url as image_url, h.description, 
                   COALESCE(MIN(r.price_per_month), 0) as price
            FROM hostels h
            LEFT JOIN rooms r ON h.hostel_id = r.hostel_id
        `;

        let params = [];

        if (search) {
            queryText += ` WHERE h.city ILIKE $1 OR h.name ILIKE $1 `;
            params.push(`%${search}%`);
        }

        queryText += ` GROUP BY h.hostel_id ORDER BY h.hostel_id DESC`;

        const result = await queryDB(queryText, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/messes', async(req, res) => {
    try {
        // Map 'monthly_price' back to 'price' for frontend compatibility
        const result = await queryDB(`
            SELECT mess_id as id, name, city as location, monthly_price as price, 
                   delivery_radius_km, 'View Menu' as menu_description 
            FROM mess_services ORDER BY mess_id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 7. OWNER ACTIONS (UPDATED) ---

app.post('/add-hostel', async(req, res) => {
    // Note: We don't take 'price' here anymore. We take it in 'add-room'.
    const { name, location, image_url, owner_id, description } = req.body;
    try {
        const result = await queryDB(
            'INSERT INTO hostels (name, city, address, main_image_url, owner_id, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING hostel_id', [name, location, location, image_url, owner_id, description]
        );
        res.json({ success: true, message: 'Hostel added! Now add a room.', hostelId: result.rows[0].hostel_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// NEW ROUTE: Add Room (Required to have a price)
app.post('/add-room', async(req, res) => {
    const { hostel_id, room_type, price, total_beds } = req.body;
    try {
        await queryDB(
            'INSERT INTO rooms (hostel_id, room_type, price_per_month, total_beds, available_beds) VALUES ($1, $2, $3, $4, $4)', [hostel_id, room_type, price, total_beds]
        );
        res.json({ success: true, message: 'Room added successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/add-mess', async(req, res) => {
    const { name, price, location, owner_id } = req.body;
    try {
        await queryDB(
            'INSERT INTO mess_services (name, monthly_price, city, owner_id) VALUES ($1, $2, $3, $4)', [name, price, location, owner_id]
        );
        res.json({ success: true, message: 'Mess service added!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 8. IMAGE UPLOADS (Unchanged) ---
app.post('/get-upload-url', async(req, res) => {
    const { fileName, fileType } = req.body;
    const uniqueKey = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: uniqueKey,
        ContentType: fileType,
    });

    try {
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        res.json({
            uploadUrl: signedUrl,
            finalImageUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${uniqueKey}`
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});


// --- 9. BOOKING (UPDATED FOR ROOMS) ---

app.post('/book', async(req, res) => {
    // We now book a specific room, not just a hostel
    const { guest_id, room_id, guest_name } = req.body;

    // Note: If frontend sends 'hostel_id' instead of 'room_id', this will fail.
    // For simplicity in this transition, let's assume we book the first available room of that hostel
    // OR we can update the frontend to pass room_id.

    // Let's implement a "Auto-assign Room" logic for backward compatibility
    // If we receive hostel_id, find a room. If room_id, use it.
    let targetRoomId = room_id;

    try {
        if (!targetRoomId && req.body.hostel_id) {
            const roomCheck = await queryDB('SELECT room_id FROM rooms WHERE hostel_id = $1 AND available_beds > 0 LIMIT 1', [req.body.hostel_id]);
            if (roomCheck.rows.length === 0) return res.status(400).json({ success: false, message: 'No rooms available' });
            targetRoomId = roomCheck.rows[0].room_id;
        }

        await queryDB('INSERT INTO room_bookings (student_id, room_id, start_date) VALUES ($1, $2, CURRENT_DATE)', [guest_id, targetRoomId]);

        // Email Notification
        try {
            const emailParams = {
                Source: SENDER_EMAIL,
                Destination: { ToAddresses: [SENDER_EMAIL] },
                Message: {
                    Subject: { Data: `New Booking Alert - StayMate` },
                    Body: { Text: { Data: `Student ${guest_name} booked Room ID ${targetRoomId}` } },
                },
            };
            await sesClient.send(new SendEmailCommand(emailParams));
        } catch (emailErr) {
            console.warn("Email Warning:", emailErr.message);
        }

        res.json({ success: true, message: 'Booking confirmed!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 10. SERVER EXPORTS ---
module.exports.handler = serverless(app);

if (require.main === module) {
    app.listen(3000, () => console.log('Server running on port 3000'));
}