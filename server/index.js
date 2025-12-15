const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const serverless = require('serverless-http');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. CONFIGURATION ---
// Initialize AWS Clients (Region must match your Learner Lab, usually us-east-1)
const s3Client = new S3Client({ region: "us-east-1" });
const sesClient = new SESClient({ region: "us-east-1" });

// Get Env Variables (Set these in AWS Lambda Configuration)
const BUCKET_NAME = process.env.BUCKET_NAME || 'thikana-app-images'; 
const SENDER_EMAIL = 'YOUR-VERIFIED-EMAIL@gmail.com'; // Must be verified in SES

// Database Connection
const client = new Client({
  user: process.env.DB_USER,      // 'postgres'
  host: process.env.DB_HOST,      // Your RDS Endpoint
  database: 'postgres',
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Connect to DB (Log error if fails)
client.connect()
  .then(() => console.log('✅ Connected to RDS Database'))
  .catch(err => console.error('❌ DB Connection Error:', err));


// --- 2. AUTHENTICATION ROUTES ---

// Register New User
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Check if email exists
    const checkUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Insert User
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

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = 'SELECT * FROM users WHERE email = $1 AND password = $2';
    const result = await client.query(query, [email, password]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
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


// --- 3. LISTING ROUTES (VIEW & SEARCH) ---

// Get Hostels (With Search)
app.get('/hostels', async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM hostels ORDER BY id DESC';
    let params = [];

    if (search) {
      // ILIKE performs case-insensitive search
      query = 'SELECT * FROM hostels WHERE location ILIKE $1 OR name ILIKE $1 ORDER BY id DESC';
      params = [`%${search}%`];
    }
    
    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Messes
app.get('/messes', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM mess_services ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- 4. OWNER ROUTES (ADD, EDIT, DELETE) ---

// Add Hostel
app.post('/add-hostel', async (req, res) => {
  const { name, price, location, image_url, owner_id } = req.body;
  try {
    const query = `
      INSERT INTO hostels (name, price, location, image_url, owner_id)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await client.query(query, [name, price, location, image_url, owner_id]);
    res.json({ success: true, message: 'Hostel added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Mess
app.post('/add-mess', async (req, res) => {
  const { name, price, location, image_url, owner_id } = req.body;
  try {
    const query = `
      INSERT INTO mess_services (name, price, location, image_url, owner_id)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await client.query(query, [name, price, location, image_url, owner_id]);
    res.json({ success: true, message: 'Mess added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Hostel (Secure Check)
app.delete('/hostels/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // Sent from frontend to verify identity

  try {
    // Check if user is the valid owner
    const userCheck = await client.query('SELECT role FROM users WHERE id = $1', [user_id]);
    if (!userCheck.rows[0] || userCheck.rows[0].role !== 'hostel_owner') {
      return res.status(403).json({ error: "Access Denied" });
    }

    await client.query('DELETE FROM hostels WHERE id = $1', [id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Mess (Secure Check)
app.delete('/messes/:id', async (req, res) => {
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

// Edit/Update Hostel
app.put('/hostels/:id', async (req, res) => {
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


// --- 5. IMAGE UPLOAD (S3 PRESIGNED URL) ---

app.post('/get-upload-url', async (req, res) => {
  const { fileName, fileType } = req.body;
  
  // Unique file path: uploads/timestamp-filename
  const uniqueKey = `uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    ContentType: fileType,
  });

  try {
    // Generate URL valid for 60 seconds
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
    
    res.json({ 
      uploadUrl: signedUrl, 
      finalImageUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${uniqueKey}` 
    });
  } catch (err) {
    console.error("S3 Error:", err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});


// --- 6. BOOKING + EMAIL NOTIFICATION (SES) ---

app.post('/book', async (req, res) => {
  const { guest_id, hostel_id, guest_name } = req.body;

  try {
    // 1. Save Booking to DB (Using updated 'guest_id' column)
    await client.query(
      'INSERT INTO room_bookings (guest_id, hostel_id) VALUES ($1, $2)', 
      [guest_id, hostel_id]
    );

    // 2. Send Email Notification
    // Note: In Learner Lab, if SES is blocked, this block might fail. 
    // We try/catch it so the booking still succeeds even if email fails.
    try {
      const emailParams = {
        Source: SENDER_EMAIL, // Must match your verified SES email
        Destination: { ToAddresses: [SENDER_EMAIL] }, // Sending to self for demo
        Message: {
          Subject: { Data: `New Booking Alert - Thikana.pk` },
          Body: {
            Text: { Data: `Congratulations! \n\nNew booking received from Guest: ${guest_name}\nFor Hostel ID: ${hostel_id}` },
          },
        },
      };
      await sesClient.send(new SendEmailCommand(emailParams));
      console.log("Email sent successfully");
    } catch (emailErr) {
      console.warn("SES Email Warning:", emailErr.message);
    }

    res.json({ success: true, message: 'Booking confirmed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- 7. EXPORT HANDLER ---
// This line wraps the Express app for AWS Lambda
module.exports.handler = serverless(app);

// Local testing (Optional: runs if you do 'node index.js')
if (require.main === module) {
  app.listen(3000, () => console.log('Server running on port 3000'));
}