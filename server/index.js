const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Security package
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
    res.send("✅ StayMate Advanced API is Running! (Secure + Admin Mode)");
});

// --- 4. SETUP DATABASE (ADMIN & HASHING SUPPORT) ---
app.get('/setup-database', async(req, res) => {
    try {
        console.log("🛠️ Starting Advanced Database Setup...");

        // 1. Cleanup Old Tables
        await queryDB("DROP TABLE IF EXISTS room_bookings CASCADE");
        await queryDB("DROP TABLE IF EXISTS mess_subscriptions CASCADE");
        await queryDB("DROP TABLE IF EXISTS mess_menus CASCADE");
        await queryDB("DROP TABLE IF EXISTS mess_services CASCADE");
        await queryDB("DROP TABLE IF EXISTS rooms CASCADE");
        await queryDB("DROP TABLE IF EXISTS hostels CASCADE");
        await queryDB("DROP TABLE IF EXISTS users CASCADE");
        await queryDB("DROP TYPE IF EXISTS user_role");

        // 2. Create Type & Users (Includes Admin)
        await queryDB("CREATE TYPE user_role AS ENUM ('student', 'hostel_owner', 'mess_owner', 'admin')");

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

        // 4. Rooms
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

        // 7. Room Bookings
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

        // 8. Mess Subscriptions
        await queryDB(`
            CREATE TABLE mess_subscriptions (
                subscription_id SERIAL PRIMARY KEY,
                student_id INT REFERENCES users(user_id),
                mess_id INT REFERENCES mess_services(mess_id),
                start_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            );
        `);

        // 9. Create Default Admin User
        const adminPasswordHash = await bcrypt.hash('admin123', 10);
        await queryDB(`
            INSERT INTO users (full_name, email, password_hash, phone_number, role)
            VALUES ('System Admin', 'admin@staymate.com', $1, '+92 300 0000000', 'admin')
            ON CONFLICT (email) DO NOTHING
        `, [adminPasswordHash]);

        res.send("✅ Database Tables Created! Admin: admin@staymate.com / admin123");
    } catch (err) {
        console.error("Setup Error:", err);
        res.status(500).send("❌ Error: " + err.message);
    }
});


// --- 5. AUTHENTICATION ROUTES (SECURE) ---

app.post('/register', async(req, res) => {
    const { full_name, email, password, phone_number, role } = req.body;

    try {
        const checkUser = await queryDB('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // 🔐 SECURE: Hash the password before saving
        const password_hash = await bcrypt.hash(password, 10);

        const result = await queryDB(
            `INSERT INTO users (full_name, email, password_hash, phone_number, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING user_id, full_name, email, phone_number, role, created_at`, [full_name, email, password_hash, phone_number, role]
        );

        const user = result.rows[0];
        res.json({
            success: true,
            user: {
                id: user.user_id, // Map for frontend compatibility
                user_id: user.user_id,
                name: user.full_name, // Map for frontend compatibility
                full_name: user.full_name,
                email: user.email,
                role: user.role
            },
            message: 'Registration successful'
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/login', async(req, res) => {
    const { email, password } = req.body;

    try {
        const result = await queryDB('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // 🔐 SECURE: Compare the hashed password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        res.json({
            success: true,
            user: {
                id: user.user_id, // Map for frontend compatibility
                user_id: user.user_id,
                name: user.full_name, // Map for frontend compatibility
                full_name: user.full_name,
                email: user.email,
                role: user.role
            },
            message: 'Login successful'
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// --- 6. VIEWING LISTINGS ---

app.get('/hostels', async(req, res) => {
    const { search } = req.query;
    try {
        let queryText = `
            SELECT h.hostel_id as id, h.name, h.city as location, h.address, h.description, 
                   h.main_image_url as image_url, h.owner_id,
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
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/messes', async(req, res) => {
    try {
        const result = await queryDB(`
            SELECT mess_id as id, name, city as location, monthly_price as price, 
                   delivery_radius_km, owner_id 
            FROM mess_services ORDER BY mess_id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// --- 7. HOSTEL OWNER ENDPOINTS ---

app.get('/hostels/owner/:ownerId', async(req, res) => {
    try {
        const result = await queryDB(`
            SELECT h.*, COALESCE(MIN(r.price_per_month), 0) as price
            FROM hostels h
            LEFT JOIN rooms r ON h.hostel_id = r.hostel_id
            WHERE h.owner_id = $1
            GROUP BY h.hostel_id ORDER BY h.hostel_id DESC
        `, [req.params.ownerId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/hostels', async(req, res) => {
    const { owner_id, name, city, address, description, main_image_url, price_per_month } = req.body;
    try {
        const hostelResult = await queryDB(
            `INSERT INTO hostels (owner_id, name, city, address, description, main_image_url) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [owner_id, name, city, address, description, main_image_url]
        );
        const hostel = hostelResult.rows[0];

        // Create Default Room
        await queryDB(
            `INSERT INTO rooms (hostel_id, room_type, price_per_month, total_beds, available_beds)
             VALUES ($1, 'Standard', $2, 4, 4)`, [hostel.hostel_id, price_per_month || 0]
        );

        res.json({ success: true, message: 'Hostel added!', hostel });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// --- 8. BOOKING ENDPOINTS ---

app.post('/book', async(req, res) => {
    // This handles both Hostel and Mess bookings
    const { student_id, hostel_id, mess_id, start_date, student_name } = req.body;

    try {
        if (hostel_id) {
            // 1. Find a room
            const roomCheck = await queryDB('SELECT room_id FROM rooms WHERE hostel_id = $1 AND available_beds > 0 LIMIT 1', [hostel_id]);
            if (roomCheck.rows.length === 0) return res.status(400).json({ success: false, message: 'No rooms available' });

            const room_id = roomCheck.rows[0].room_id;

            // 2. Book Room
            await queryDB(
                `INSERT INTO room_bookings (student_id, room_id, start_date, status) VALUES ($1, $2, $3, 'pending')`, [student_id, room_id, start_date || new Date()]
            );

            // 3. Update Availability
            await queryDB('UPDATE rooms SET available_beds = available_beds - 1 WHERE room_id = $1', [room_id]);

        } else if (mess_id) {
            // Book Mess
            await queryDB(
                `INSERT INTO mess_subscriptions (student_id, mess_id, start_date, is_active) VALUES ($1, $2, $3, true)`, [student_id, mess_id, start_date || new Date()]
            );
        }

        // Email Notification
        try {
            const emailParams = {
                Source: SENDER_EMAIL,
                Destination: { ToAddresses: [SENDER_EMAIL] },
                Message: {
                    Subject: { Data: `New Booking Alert` },
                    Body: { Text: { Data: `Student ${student_name} made a new booking.` } }
                }
            };
            await sesClient.send(new SendEmailCommand(emailParams));
        } catch (emailErr) { console.warn("Email warning:", emailErr.message); }

        res.json({ success: true, message: 'Booking confirmed!' });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// --- 9. ADMIN ENDPOINTS ---

app.get('/users', async(req, res) => {
    try {
        const result = await queryDB('SELECT user_id, full_name, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});


// --- 10. IMAGE UPLOADS ---
app.post('/get-upload-url', async(req, res) => {
    const { fileName, fileType } = req.body;
    const uniqueKey = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: uniqueKey, ContentType: fileType });

    try {
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        res.json({ uploadUrl: signedUrl, finalImageUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${uniqueKey}` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

// --- 11. EXPORT ---
module.exports.handler = serverless(app);