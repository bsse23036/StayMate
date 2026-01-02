const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const serverless = require('serverless-http');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const s3Client = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = process.env.BUCKET_NAME || 'thikana-app-images';

// Database Connection
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

// Health Check
app.get('/', (req, res) => {
    res.json({ status: "✅ StayMate API is Running!" });
});

// ===== AUTHENTICATION =====
app.post('/register', async(req, res) => {
    const { full_name, email, password, phone_number, role } = req.body;

    try {
        // Validate role
        const validRoles = ['student', 'hostel_owner', 'mess_owner'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const checkUser = await queryDB('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await queryDB(
            `INSERT INTO users (full_name, email, password_hash, phone_number, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING user_id, full_name, email, phone_number, role, created_at`,
            [full_name, email, password_hash, phone_number, role]
        );

        const user = result.rows[0];
        res.json({
            success: true,
            user: {
                id: user.user_id,
                user_id: user.user_id,
                name: user.full_name,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            },
            message: 'Registration successful'
        });

    } catch (err) {
        console.error('Registration error:', err);
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
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        res.json({
            success: true,
            user: {
                id: user.user_id,
                user_id: user.user_id,
                name: user.full_name,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            },
            message: 'Login successful'
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== IMAGE UPLOAD =====
app.post('/get-upload-url', async(req, res) => {
    const { fileName, fileType } = req.body;
    const uniqueKey = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({ 
        Bucket: BUCKET_NAME, 
        Key: uniqueKey, 
        ContentType: fileType 
    });

    try {
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        res.json({ 
            success: true,
            uploadUrl: signedUrl, 
            finalImageUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${uniqueKey}` 
        });
    } catch (err) {
        console.error('Upload URL error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate upload URL' });
    }
});

// ===== HOSTELS =====
app.get('/hostels', async(req, res) => {
    const { search } = req.query;
    try {
        let queryText = `
            SELECT h.*, 
                   COALESCE(MIN(r.price_per_month), 0) as price_per_month
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
        res.json({ success: true, hostels: result.rows });
    } catch (err) {
        console.error('Get hostels error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/hostels/owner/:ownerId', async(req, res) => {
    try {
        const result = await queryDB(`
            SELECT h.*, COALESCE(MIN(r.price_per_month), 0) as price_per_month
            FROM hostels h
            LEFT JOIN rooms r ON h.hostel_id = r.hostel_id
            WHERE h.owner_id = $1
            GROUP BY h.hostel_id ORDER BY h.hostel_id DESC
        `, [req.params.ownerId]);
        res.json({ success: true, hostels: result.rows });
    } catch (err) {
        console.error('Get owner hostels error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/hostels', async(req, res) => {
    const { owner_id, name, city, address, description, main_image_url } = req.body;
    try {
        const hostelResult = await queryDB(
            `INSERT INTO hostels (owner_id, name, city, address, description, main_image_url, wifi_available, generator_available) 
             VALUES ($1, $2, $3, $4, $5, $6, false, false) RETURNING *`,
            [owner_id, name, city, address, description, main_image_url]
        );
        
        res.json({ success: true, message: 'Hostel added!', hostel: hostelResult.rows[0] });
    } catch (err) {
        console.error('Add hostel error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/hostels/:id', async(req, res) => {
    const { name, city, address, description, main_image_url, wifi_available, generator_available } = req.body;
    try {
        const result = await queryDB(
            `UPDATE hostels SET name=$1, city=$2, address=$3, description=$4, 
             main_image_url=$5, wifi_available=$6, generator_available=$7 
             WHERE hostel_id=$8 RETURNING *`,
            [name, city, address, description, main_image_url, wifi_available, generator_available, req.params.id]
        );
        res.json({ success: true, message: 'Hostel updated!', hostel: result.rows[0] });
    } catch (err) {
        console.error('Update hostel error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/hostels/:id', async(req, res) => {
    try {
        await queryDB('DELETE FROM hostels WHERE hostel_id = $1', [req.params.id]);
        res.json({ success: true, message: 'Hostel deleted!' });
    } catch (err) {
        console.error('Delete hostel error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== ROOMS =====
app.get('/rooms/:hostelId', async(req, res) => {
    try {
        const result = await queryDB(
            'SELECT * FROM rooms WHERE hostel_id = $1 ORDER BY room_id',
            [req.params.hostelId]
        );
        res.json({ success: true, rooms: result.rows });
    } catch (err) {
        console.error('Get rooms error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/rooms', async(req, res) => {
    const { hostel_id, room_type, price_per_month, total_beds, has_attached_bath } = req.body;
    try {
        const result = await queryDB(
            `INSERT INTO rooms (hostel_id, room_type, price_per_month, total_beds, available_beds, has_attached_bath) 
             VALUES ($1, $2, $3, $4, $4, $5) RETURNING *`,
            [hostel_id, room_type, price_per_month, total_beds, has_attached_bath]
        );
        res.json({ success: true, message: 'Room added!', room: result.rows[0] });
    } catch (err) {
        console.error('Add room error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/rooms/:id', async(req, res) => {
    const { room_type, price_per_month, total_beds, has_attached_bath } = req.body;
    try {
        const result = await queryDB(
            `UPDATE rooms SET room_type=$1, price_per_month=$2, total_beds=$3, has_attached_bath=$4 
             WHERE room_id=$5 RETURNING *`,
            [room_type, price_per_month, total_beds, has_attached_bath, req.params.id]
        );
        res.json({ success: true, message: 'Room updated!', room: result.rows[0] });
    } catch (err) {
        console.error('Update room error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/rooms/:id', async(req, res) => {
    try {
        await queryDB('DELETE FROM rooms WHERE room_id = $1', [req.params.id]);
        res.json({ success: true, message: 'Room deleted!' });
    } catch (err) {
        console.error('Delete room error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== MESSES =====
app.get('/messes', async(req, res) => {
    try {
        const result = await queryDB(
            `SELECT mess_id as id, name, city as location, monthly_price as price, 
                    delivery_radius_km, owner_id 
             FROM mess_services ORDER BY mess_id DESC`
        );
        res.json({ success: true, messes: result.rows });
    } catch (err) {
        console.error('Get messes error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/messes/owner/:ownerId', async(req, res) => {
    try {
        const result = await queryDB(
            'SELECT * FROM mess_services WHERE owner_id = $1 ORDER BY mess_id DESC',
            [req.params.ownerId]
        );
        res.json({ success: true, messes: result.rows });
    } catch (err) {
        console.error('Get owner messes error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/messes', async(req, res) => {
    const { owner_id, name, city, monthly_price, delivery_radius_km } = req.body;
    try {
        const result = await queryDB(
            `INSERT INTO mess_services (owner_id, name, city, monthly_price, delivery_radius_km) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [owner_id, name, city, monthly_price, delivery_radius_km]
        );
        res.json({ success: true, message: 'Mess service added!', mess: result.rows[0] });
    } catch (err) {
        console.error('Add mess error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/messes/:id', async(req, res) => {
    const { name, city, monthly_price, delivery_radius_km } = req.body;
    try {
        const result = await queryDB(
            `UPDATE mess_services SET name=$1, city=$2, monthly_price=$3, delivery_radius_km=$4 
             WHERE mess_id=$5 RETURNING *`,
            [name, city, monthly_price, delivery_radius_km, req.params.id]
        );
        res.json({ success: true, message: 'Mess service updated!', mess: result.rows[0] });
    } catch (err) {
        console.error('Update mess error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/messes/:id', async(req, res) => {
    try {
        await queryDB('DELETE FROM mess_services WHERE mess_id = $1', [req.params.id]);
        res.json({ success: true, message: 'Mess service deleted!' });
    } catch (err) {
        console.error('Delete mess error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== BOOKINGS =====
app.post('/book', async(req, res) => {
    const { student_id, hostel_id, mess_id, start_date } = req.body;

    try {
        if (hostel_id) {
            const roomCheck = await queryDB(
                'SELECT room_id FROM rooms WHERE hostel_id = $1 AND available_beds > 0 LIMIT 1', 
                [hostel_id]
            );
            
            if (roomCheck.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'No rooms available' });
            }

            const room_id = roomCheck.rows[0].room_id;

            await queryDB(
                `INSERT INTO room_bookings (student_id, room_id, start_date, status) 
                 VALUES ($1, $2, $3, 'confirmed')`,
                [student_id, room_id, start_date || new Date()]
            );

            await queryDB(
                'UPDATE rooms SET available_beds = available_beds - 1 WHERE room_id = $1', 
                [room_id]
            );

        } else if (mess_id) {
            await queryDB(
                `INSERT INTO mess_subscriptions (student_id, mess_id, start_date, is_active) 
                 VALUES ($1, $2, $3, true)`,
                [student_id, mess_id, start_date || new Date()]
            );
        }

        res.json({ success: true, message: 'Booking confirmed!' });

    } catch (err) {
        console.error('Booking error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== ADMIN ENDPOINTS =====
app.get('/users', async(req, res) => {
    try {
        const result = await queryDB(
            'SELECT user_id, full_name, email, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/bookings', async(req, res) => {
    try {
        const roomBookings = await queryDB(`
            SELECT booking_id, student_id, room_id, start_date, status, created_at 
            FROM room_bookings ORDER BY created_at DESC
        `);
        
        const messSubscriptions = await queryDB(`
            SELECT subscription_id, student_id, mess_id, start_date, is_active, 
                   created_at 
            FROM mess_subscriptions ORDER BY created_at DESC
        `);
        
        res.json({ 
            success: true, 
            bookings: [...roomBookings.rows, ...messSubscriptions.rows] 
        });
    } catch (err) {
        console.error('Get bookings error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports.handler = serverless(app);