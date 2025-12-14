const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const serverless = require('serverless-http');
require('dotenv').config();

const app = express();
app.use(cors()); // CRITICAL: Allows Frontend to talk to Backend
app.use(express.json());

// 1. Database Configuration
const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'YOUR-RDS-ENDPOINT-HERE', // Paste your AWS Endpoint
    database: 'postgres',
    password: process.env.DB_PASSWORD || 'password123',
    port: 5432,
    ssl: { rejectUnauthorized: false } // Required for AWS RDS connections
});

// Connect to DB (with error handling)
client.connect()
    .then(() => console.log('Connected to AWS RDS'))
    .catch(err => console.error('DB Connection Error:', err));

// 2. API Route: Get All Hostels
app.get('/hostels', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM hostels');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. API Route: Create a Booking
app.post('/book', async (req, res) => {
    // We will just fake a success message for the demo
    console.log("Booking requested:", req.body);
    res.json({ message: 'Booking Confirmed!', status: 'success' });
});

// 4. Export for AWS Lambda
module.exports.handler = serverless(app);

// 5. Local Testing Code
if (require.main === module) {
    app.listen(3000, () => console.log('Server running on port 3000'));
}