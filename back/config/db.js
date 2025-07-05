
const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10, // Adjust as needed
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test the connection (optional, but good for diagnostics)
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to the MySQL database.');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the MySQL database:');
    console.error('DB_HOST:', process.env.DB_HOST);
    console.error('DB_USER:', process.env.DB_USER);
    console.error('DB_PASSWORD:', process.env.DB_PASSWORD ? '******' : 'NOT SET');
    console.error('DB_NAME:', process.env.DB_NAME);
    console.error('DB_PORT:', process.env.DB_PORT);
    console.error(err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error("Hint: Check your MySQL username and password in the .env file.");
    } else if (err.code === 'ER_BAD_DB_ERROR') {
        console.error("Hint: Ensure the database specified in DB_NAME exists.");
    } else if (err.code === 'ECONNREFUSED') {
        console.error("Hint: Ensure MySQL server is running and accessible at DB_HOST and DB_PORT.");
    }
    // process.exit(1); // Optionally exit if DB connection fails at startup
  });

module.exports = pool;
