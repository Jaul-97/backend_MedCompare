// db.js
const mysql = require('mysql2/promise');
const fs = require('node:fs'); // Required for reading SSL certificate
const path = require('node:path'); // Required for path joining
require('dotenv').config(); // To load environment variables from .env file

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // Should be 'your_prescription_db'
    port: parseInt(process.env.DB_PORT),
    ssl: {
        // Ensure ca.pem is in the root of your Node.js project or provide correct path
      // ca: fs.readFileSync(path.join(__dirname, 'ca.pem'))
        ca: fs.readFileSync(path.join(__dirname, '..', 'ca.pem')) // Adjust path if db.js is in a subdirectory
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000 // 20 seconds connection timeout
});

// Test the connection (optional, but good for startup)
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to Aiven MySQL database pool for med-alt feature.');
        connection.release();
    })
    .catch(err => {
        console.error('Failed to connect to Aiven MySQL database pool for med-alt feature:', err);
    });

module.exports = pool;