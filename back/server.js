require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const pool = require('./config/db'); // MySQL pool
const { UNCATEGORIZED_ID_UUID, UNKNOWN_MANUFACTURER_ID_UUID } = require('./constants');

const app = express();
const PORT = process.env.PORT || 3001;

// Check required env vars
const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// CORS setup
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true
}));

// JSON and static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Optional: serve frontend (if deploying fullstack)
app.get('/', (req, res) => {
  res.send('POS Backend Server is running');
});

// Healthcheck route
app.get('/api', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date().toISOString() });
});

// Database initialization
async function initializeDatabaseSchema() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Loading schema...");
    const schemaSql = fs.readFileSync(path.join(__dirname, 'db_schema.sql'), 'utf-8');
    const statements = schemaSql.split(/;\s*$/m);
    for (const stmt of statements) {
      if (stmt.trim()) await connection.query(stmt);
    }
    console.log("Schema OK");

    const [cat] = await connection.execute('SELECT category_id FROM categories WHERE uuid = ?', [UNCATEGORIZED_ID_UUID]);
    if (cat.length === 0) {
      await connection.execute('INSERT INTO categories (uuid, name) VALUES (?, ?)', [UNCATEGORIZED_ID_UUID, 'Uncategorized']);
      console.log("Seeded Uncategorized category");
    }

    const [man] = await connection.execute('SELECT manufacturer_id FROM manufacturers WHERE uuid = ?', [UNKNOWN_MANUFACTURER_ID_UUID]);
    if (man.length === 0) {
      await connection.execute('INSERT INTO manufacturers (uuid, name) VALUES (?, ?)', [UNKNOWN_MANUFACTURER_ID_UUID, 'Unknown Manufacturer']);
      console.log("Seeded Unknown Manufacturer");
    }
  } catch (err) {
    console.error("DB Init Error:", err);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// Auto-load all routes from /routes/*.js
const routesDir = path.join(__dirname, 'routes');
fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.js')) {
    const route = require(path.join(routesDir, file));
    const name = file.replace('.js', '');
    if (typeof route === 'function') {
      app.use(`/api/${name}`, route);
      console.log(`Loaded /api/${name}`);
    }
  }
});

// Catch-all for missing API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Not found: ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start
const start = async () => {
  try {
    await initializeDatabaseSchema();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Available at: https://store.doubleredcars.sk/api`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
};

start();
