const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const serverless = require('serverless-http');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require('dotenv').config();

const app = express();

// CRITICAL: Middleware order matters!
app.use(cors());
app.use(express.json());

const s3Client = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = process.env.BUCKET_NAME || 'stay-mate-img-bucket';

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
    res.json({ status: "✅ StayMate API is Running!", timestamp: new Date().toISOString() });
});


// =============================================
//      AUTHENTICATION (REGISTER & LOGIN)
// =============================================
app.post('/register', async(req, res) => {
    try {
        const { full_name, email, password, phone_number, role } = req.body;

        // Validate required fields
        if (!full_name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate role
        const validRoles = ['student', 'hostel_owner', 'mess_owner'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        // Check if user exists
        const checkUser = await queryDB('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert user
        const result = await queryDB(
            `INSERT INTO users (full_name, email, password_hash, phone_number, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING user_id, full_name, email, phone_number, role, created_at`, [full_name, email, password_hash, phone_number, role]
        );

        const user = result.rows[0];

        return res.status(200).json({
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
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err.message
        });
    }
});

app.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        const result = await queryDB('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        return res.status(200).json({
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
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err.message
        });
    }
});

// =============================================
//      IMAGE UPLOAD (PRE-SIGNED URLs)
// =============================================

app.post('/get-upload-url', async(req, res) => {
    try {
        const { fileName, fileType } = req.body;
        if (!fileName || !fileType) return res.status(400).json({ success: false, error: 'Missing fileName' });

        const uniqueKey = `uploads/${Date.now()}-${fileName}`;

        // Prepare the S3 Command (Notice: No ACLs used, safe for Learner Labs)
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: uniqueKey,
            ContentType: fileType
        });

        // Generate the URL (Valid for 5 minutes)
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return res.status(200).json({
            success: true,
            uploadUrl: signedUrl,
            finalImageUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${uniqueKey}`
        });
    } catch (err) {
        console.error('Upload URL error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// =============================================
//                  HOSTELS
// =============================================

app.get('/hostels', async(req, res) => {
    try {
        const { search } = req.query;

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

        console.log('Hostels fetched:', result.rows.length);

        return res.status(200).json({
            success: true,
            hostels: result.rows
        });
    } catch (err) {
        console.error('Get hostels error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching hostels: ' + err.message
        });
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

        console.log('Owner hostels fetched:', result.rows.length);

        return res.status(200).json({
            success: true,
            hostels: result.rows
        });
    } catch (err) {
        console.error('Get owner hostels error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching hostels: ' + err.message
        });
    }
});

app.post('/hostels', async(req, res) => {
    try {
        const { owner_id, name, city, address, description, main_image_url } = req.body;

        if (!owner_id || !name || !city || !address) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const hostelResult = await queryDB(
            `INSERT INTO hostels (owner_id, name, city, address, description, main_image_url, wifi_available, generator_available) 
             VALUES ($1, $2, $3, $4, $5, $6, false, false) RETURNING *`, [owner_id, name, city, address, description, main_image_url]
        );

        console.log('Hostel created:', hostelResult.rows[0].hostel_id);

        return res.status(200).json({
            success: true,
            message: 'Hostel added successfully!',
            hostel: hostelResult.rows[0]
        });
    } catch (err) {
        console.error('Add hostel error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error adding hostel: ' + err.message
        });
    }
});

app.put('/hostels/:id', async(req, res) => {
    try {
        const { name, city, address, description, main_image_url, wifi_available, generator_available } = req.body;

        const result = await queryDB(
            `UPDATE hostels 
             SET name=$1, city=$2, address=$3, description=$4, 
                 main_image_url=$5, wifi_available=$6, generator_available=$7 
             WHERE hostel_id=$8 RETURNING *`, [name, city, address, description, main_image_url, wifi_available, generator_available, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Hostel not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Hostel updated successfully!',
            hostel: result.rows[0]
        });
    } catch (err) {
        console.error('Update hostel error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error updating hostel: ' + err.message
        });
    }
});

app.delete('/hostels/:id', async(req, res) => {
    try {
        await queryDB('DELETE FROM hostels WHERE hostel_id = $1', [req.params.id]);

        return res.status(200).json({
            success: true,
            message: 'Hostel deleted successfully!'
        });
    } catch (err) {
        console.error('Delete hostel error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error deleting hostel: ' + err.message
        });
    }
});

// Get Bookings for a Hostel Owner
app.get('/bookings/owner/:ownerId', async(req, res) => {
    try {
        // Complex query to get Student Name, Room Type, and Status
        const result = await queryDB(`
            SELECT rb.booking_id, rb.status, rb.start_date, rb.created_at,
                   u.full_name as student_name, u.email as student_email, u.phone_number,
                   r.room_type, h.name as hostel_name
            FROM room_bookings rb
            JOIN rooms r ON rb.room_id = r.room_id
            JOIN hostels h ON r.hostel_id = h.hostel_id
            JOIN users u ON rb.student_id = u.user_id
            WHERE h.owner_id = $1
            ORDER BY rb.created_at DESC
        `, [req.params.ownerId]);

        res.json({ success: true, bookings: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Approve or Reject Booking
app.put('/bookings/:id/status', async(req, res) => {
    try {
        const { status } = req.body; // 'confirmed' or 'cancelled'
        const bookingId = req.params.id;

        if (!['confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        // 1. Get Booking Info
        const booking = await queryDB('SELECT * FROM room_bookings WHERE booking_id = $1', [bookingId]);
        if (booking.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });

        const { room_id, status: currentStatus } = booking.rows[0];

        // 2. Logic for Confirming
        if (status === 'confirmed' && currentStatus !== 'confirmed') {
            // Check if beds are still available
            const room = await queryDB('SELECT available_beds FROM rooms WHERE room_id = $1', [room_id]);
            if (room.rows[0].available_beds <= 0) {
                return res.status(400).json({ success: false, message: 'Room is full! Cannot confirm.' });
            }

            // Decrease Bed Count
            await queryDB('UPDATE rooms SET available_beds = available_beds - 1 WHERE room_id = $1', [room_id]);
        }

        // 3. Logic for Cancelling (if it was previously confirmed, give back the bed)
        if (status === 'cancelled' && currentStatus === 'confirmed') {
            await queryDB('UPDATE rooms SET available_beds = available_beds + 1 WHERE room_id = $1', [room_id]);
        }

        // 4. Update Status
        await queryDB('UPDATE room_bookings SET status = $1 WHERE booking_id = $2', [status, bookingId]);

        res.json({ success: true, message: `Booking ${status} successfully!` });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// =============================================
//                  ROOMS
// =============================================

app.get('/rooms/:hostelId', async(req, res) => {
    try {
        const result = await queryDB(
            'SELECT * FROM rooms WHERE hostel_id = $1 ORDER BY room_id', [req.params.hostelId]
        );

        return res.status(200).json({
            success: true,
            rooms: result.rows
        });
    } catch (err) {
        console.error('Get rooms error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching rooms: ' + err.message
        });
    }
});

app.post('/rooms', async(req, res) => {
    try {
        const { hostel_id, room_type, price_per_month, total_beds, has_attached_bath } = req.body;

        if (!hostel_id || !room_type || !price_per_month || !total_beds) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const result = await queryDB(
            `INSERT INTO rooms (hostel_id, room_type, price_per_month, total_beds, available_beds, has_attached_bath) 
             VALUES ($1, $2, $3, $4, $4, $5) RETURNING *`, [hostel_id, room_type, price_per_month, total_beds, has_attached_bath]
        );

        return res.status(200).json({
            success: true,
            message: 'Room added successfully!',
            room: result.rows[0]
        });
    } catch (err) {
        console.error('Add room error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error adding room: ' + err.message
        });
    }
});

app.put('/rooms/:id', async(req, res) => {
    try {
        const { room_type, price_per_month, total_beds, has_attached_bath } = req.body;

        const result = await queryDB(
            `UPDATE rooms 
             SET room_type=$1, price_per_month=$2, total_beds=$3, has_attached_bath=$4 
             WHERE room_id=$5 RETURNING *`, [room_type, price_per_month, total_beds, has_attached_bath, req.params.id]
        );

        return res.status(200).json({
            success: true,
            message: 'Room updated successfully!',
            room: result.rows[0]
        });
    } catch (err) {
        console.error('Update room error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error updating room: ' + err.message
        });
    }
});

app.delete('/rooms/:id', async(req, res) => {
    try {
        await queryDB('DELETE FROM rooms WHERE room_id = $1', [req.params.id]);

        return res.status(200).json({
            success: true,
            message: 'Room deleted successfully!'
        });
    } catch (err) {
        console.error('Delete room error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error deleting room: ' + err.message
        });
    }
});

// =============================================
//                  MESSES
// =============================================

app.get('/messes', async(req, res) => {
    try {
        const result = await queryDB(
            `SELECT mess_id as id, name, city as location, monthly_price as price, 
                    delivery_radius_km, owner_id, main_image_url 
             FROM mess_services ORDER BY mess_id DESC`
        );

        console.log('Messes fetched:', result.rows.length);

        return res.status(200).json({
            success: true,
            messes: result.rows
        });
    } catch (err) {
        console.error('Get messes error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching messes: ' + err.message
        });
    }
});

app.get('/messes/owner/:ownerId', async(req, res) => {
    try {
        const result = await queryDB(
            'SELECT * FROM mess_services WHERE owner_id = $1 ORDER BY mess_id DESC', [req.params.ownerId]
        );

        console.log('Owner messes fetched:', result.rows.length);

        return res.status(200).json({
            success: true,
            messes: result.rows
        });
    } catch (err) {
        console.error('Get owner messes error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error fetching messes: ' + err.message
        });
    }
});

app.get('/mess-subscribers/:id', async(req, res) => {
    try {
        const mess_id = req.params.id;

        const query = `
            SELECT ms.subscription_id, ms.start_date, ms.created_at,
                   u.full_name as student_name, u.phone_number, u.email as student_email
            FROM mess_subscriptions ms
            JOIN users u ON ms.student_id = u.user_id
            WHERE ms.mess_id = $1
            ORDER BY ms.created_at DESC
        `;

        const result = await queryDB(query, [mess_id]);

        res.json({ success: true, subscribers: result.rows });

    } catch (err) {
        console.error("Error fetching subscribers:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/messes', async(req, res) => {
    try {
        console.log('POST /messes called with body:', req.body);

        const { owner_id, name, city, monthly_price, delivery_radius_km, main_image_url } = req.body;

        // Validate required fields
        if (!owner_id || !name || !city || !monthly_price) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: owner_id, name, city, monthly_price'
            });
        }

        const result = await queryDB(
            `INSERT INTO mess_services (owner_id, name, city, monthly_price, delivery_radius_km, main_image_url) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [owner_id, name, city, parseFloat(monthly_price), delivery_radius_km ? parseFloat(delivery_radius_km) : null, main_image_url]
        );

        console.log('Mess created:', result.rows[0].mess_id);

        return res.status(200).json({
            success: true,
            message: 'Mess service added successfully!',
            mess: result.rows[0]
        });
    } catch (err) {
        console.error('Add mess error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error adding mess: ' + err.message
        });
    }
});

app.put('/messes/:id', async(req, res) => {
    try {
        // Destructure the updated values from the request body
        const { name, city, monthly_price, delivery_radius_km, main_image_url } = req.body;

        // Execute SQL Update Query
        // We use RETURNING * to get the updated row back immediately
        const result = await queryDB(
            `UPDATE mess_services 
             SET name=$1, city=$2, monthly_price=$3, delivery_radius_km=$4, main_image_url=$5 
             WHERE mess_id=$6 RETURNING *`, [
                name,
                city,
                parseFloat(monthly_price), // Ensure price is stored as a number
                delivery_radius_km ? parseFloat(delivery_radius_km) : null, // Handle optional delivery radius
                main_image_url,
                req.params.id // Get the Mess ID from the URL parameter
            ]
        );

        // Check if the mess existed
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mess not found'
            });
        }

        // Send success response with the updated data
        return res.status(200).json({
            success: true,
            message: 'Mess service updated successfully!',
            mess: result.rows[0]
        });

    } catch (err) {
        // Handle any server or database errors
        console.error('Update mess error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error updating mess: ' + err.message
        });
    }
});

app.delete('/messes/:id', async(req, res) => {
    try {
        await queryDB('DELETE FROM mess_services WHERE mess_id = $1', [req.params.id]);

        return res.status(200).json({
            success: true,
            message: 'Mess service deleted successfully!'
        });
    } catch (err) {
        console.error('Delete mess error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error deleting mess: ' + err.message
        });
    }
});

// =============================================
//                  BOOKINGS
// =============================================

// Updated Booking Route
app.post('/book', async(req, res) => {
    try {
        const { student_id, hostel_id, mess_id, start_date, room_type } = req.body;
        if (hostel_id) {
            // Validation: Ensure room_type is sent
            if (!room_type) {
                return res.status(400).json({ success: false, message: 'Please select a room type' });
            }

            // Find a specific room that matches Hostel + Type + Availability
            const roomCheck = await queryDB(
                `SELECT room_id, available_beds FROM rooms 
                 WHERE hostel_id = $1 AND room_type = $2 AND available_beds > 0 
                 LIMIT 1`, [hostel_id, room_type]
            );

            if (roomCheck.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Sorry, that room type is fully booked.' });
            }

            const room_id = roomCheck.rows[0].room_id;

            // Create booking with 'pending' status
            await queryDB(
                `INSERT INTO room_bookings (student_id, room_id, start_date, status) 
                 VALUES ($1, $2, $3, 'pending')`, [student_id, room_id, start_date || new Date()]
            );

            return res.json({ success: true, message: '🏠 Hostel booking request sent! Waiting for owner approval.' });
        } else if (mess_id) {
            // Check if already subscribed
            const check = await queryDB(
                `SELECT * FROM mess_subscriptions 
                 WHERE student_id = $1 AND mess_id = $2 AND is_active = TRUE`, [student_id, mess_id]
            );

            if (check.rows.length > 0) {
                return res.status(400).json({ success: false, message: 'You are already subscribed to this mess!' });
            }

            // Create subscription with 'is_active = TRUE' (Instant Activation)
            await queryDB(
                `INSERT INTO mess_subscriptions (student_id, mess_id, start_date, is_active) 
                 VALUES ($1, $2, $3, TRUE)`, [student_id, mess_id, start_date || new Date()]
            );

            return res.json({ success: true, message: '✅ Mess subscription activated instantly!' });
        }

        // Fallback if neither ID is provided
        return res.status(400).json({ success: false, message: 'Invalid booking request' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Cancel Room Booking
app.delete('/bookings/:id', async(req, res) => {
    try {
        const bookingId = req.params.id;

        // Get the booking details first (to find the room_id)
        const bookingCheck = await queryDB('SELECT * FROM room_bookings WHERE booking_id = $1', [bookingId]);

        if (bookingCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const { room_id } = bookingCheck.rows[0];

        // Delete the booking
        await queryDB('DELETE FROM room_bookings WHERE booking_id = $1', [bookingId]);

        // Increase the available beds back by 1
        await queryDB('UPDATE rooms SET available_beds = available_beds + 1 WHERE room_id = $1', [room_id]);

        res.json({ success: true, message: 'Booking cancelled and bed restored!' });
    } catch (err) {
        console.error('Cancel booking error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Cancel Mess Subscription
app.delete('/mess-subscriptions/:id', async(req, res) => {
    try {
        const subId = req.params.id;

        // Check if it exists
        const subCheck = await queryDB('SELECT * FROM mess_subscriptions WHERE subscription_id = $1', [subId]);

        if (subCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }
        // Delete it
        await queryDB('DELETE FROM mess_subscriptions WHERE subscription_id = $1', [subId]);

        res.json({ success: true, message: 'Mess subscription cancelled!' });
    } catch (err) {
        console.error('Cancel mess error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/bookings', async(req, res) => {
    try {
        const { student_id } = req.query;

        // Validation: If no ID is sent, return empty arrays
        if (!student_id) {
            return res.json({ success: true, bookings: [], subscriptions: [] });
        }

        // Fetch Hostel Bookings
        const hostelQuery = `
            SELECT rb.booking_id, h.name as property_name, r.room_type as details, 
                   rb.start_date, rb.status, 'Hostel' as type
            FROM room_bookings rb
            JOIN rooms r ON rb.room_id = r.room_id
            JOIN hostels h ON r.hostel_id = h.hostel_id
            WHERE rb.student_id = $1
            ORDER BY rb.created_at DESC
        `;
        const hostelRes = await queryDB(hostelQuery, [student_id]);

        // Fetch Mess Subscriptions
        const messQuery = `
            SELECT ms.subscription_id, m.name as property_name, 'Monthly Plan' as details,
                   ms.start_date, ms.is_active, 'Mess' as type
            FROM mess_subscriptions ms
            JOIN mess_services m ON ms.mess_id = m.mess_id
            WHERE ms.student_id = $1
            ORDER BY ms.created_at DESC
        `;
        const messRes = await queryDB(messQuery, [student_id]);

        // Return Data
        res.json({
            success: true,
            bookings: hostelRes.rows,
            subscriptions: messRes.rows
        });

    } catch (err) {
        console.error("GET /bookings Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//                 REVIEWS
// ==========================================

// Submit a Review
app.post('/reviews', async(req, res) => {
    try {
        const { student_id, hostel_id, mess_id, rating, comment } = req.body;

        // Basic validation
        if (!student_id || !rating || (!hostel_id && !mess_id)) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        await queryDB(
            `INSERT INTO reviews (student_id, hostel_id, mess_id, rating, comment) 
            VALUES ($1, $2, $3, $4, $5)`, [student_id, hostel_id, mess_id, rating, comment]
        );

        res.json({ success: true, message: 'Review submitted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get a Review
app.get('/reviews', async(req, res) => {
    try {
        // Extract hostel_id or mess_id from the query parameters (e.g., /reviews?hostel_id=1)
        const { hostel_id, mess_id } = req.query;

        // Start building the SQL query
        // We use a LEFT JOIN to fetch the student's name from the 'users' table alongside the review
        let query = `
            SELECT r.rating, r.comment, r.created_at, u.full_name as student_name 
            FROM reviews r
            LEFT JOIN users u ON r.student_id = u.user_id
        `;
        let params = [];

        // Dynamically add the WHERE clause based on the target (Hostel or Mess)
        if (hostel_id) {
            query += ` WHERE r.hostel_id = $1`;
            params.push(hostel_id);
        } else if (mess_id) {
            query += ` WHERE r.mess_id = $1`;
            params.push(mess_id);
        } else {
            // If neither ID is provided, return an empty list immediately
            return res.json({ success: true, reviews: [] });
        }

        // Order results so the newest reviews appear first
        query += ` ORDER BY r.created_at DESC`;

        // Execute the query
        const result = await queryDB(query, params);

        // Send the list of reviews back to the frontend
        res.json({ success: true, reviews: result.rows });

    } catch (err) {
        // Handle any server errors
        res.status(500).json({ success: false, message: err.message });
    }
});

// 404 Handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.method, req.path);
    res.status(404).json({
        success: false,
        message: 'Route not found: ' + req.method + ' ' + req.path
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error: ' + err.message
    });
});

module.exports.handler = serverless(app);