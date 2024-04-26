// Import required modules
const express = require('express');
const fs = require('fs');
const mysql = require('mysql');

// Create an Express application instance
const app = express();

// File path for memory statistics
const fsMemoryStats = '/proc/meminfo';

// Process ID and environment variables
const pid = process.pid;
const env = process.env;

// Global counter for statistics
globalThis.globalStatsCounter = 0;

// Keys for memory statistics
const memoryKeys = ['MemFree', 'MemAvailable'];

// Route to retrieve system memory statistics
app.get('/api/stats', (req, res) => {
    let response = {};
    try {
        const memStatus = {};
        const data = fs.readFileSync(fsMemoryStats, 'utf8');
        const lines = data.split("\n");
        lines.forEach(line => {
            const parts = line.split(":");
            const index = memoryKeys.indexOf(parts[0]);
            if (index !== -1) {
                memStatus[parts[0]] = parseInt(parts[1].replace(/\s*/, '').slice(0, -2));
            }
        });

        response = {
            status: 'success',
            contents: memStatus,
            pid: pid,
            hostname: env.HOSTNAME,
            counter: globalThis.globalStatsCounter
        };

        console.log(response);
    } catch (err) {
        response = {
            status: 'error',
            msg: err
        };
        console.error('Error reading file:', err);
    }
    
    res.json(response);
});

// Create a MySQL database connection pool
const pool = mysql.createPool({
    host: env.DB_HOST, 
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE
});

// Route to retrieve all books
app.get('/api/books', (req, res) => {    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ' + err.stack);
            return res.status(500).json({ error: 'Database error' });
        }

        connection.query('SELECT * FROM books', (error, results, fields) => {
            connection.release();
            if (error) {
                console.error('Error querying the database: ' + error.stack);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json(results);
        });
    });
});

// Route to retrieve a specific book by ID
app.get('/api/books/:id', (req, res) => {
    globalThis.globalStatsCounter++;
    const bookId = parseInt(req.params.id);

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database: ' + err.stack);
            return res.status(500).json({ error: 'Database error' });
        }

        connection.query('SELECT * FROM books WHERE id = ?', [bookId], (error, results, fields) => {
            connection.release();

            if (error) {
                console.error('Error querying the database: ' + error.stack);
                return res.status(500).json({ error: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Book not found' });
            }

            res.json(results[0]);
        });
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
