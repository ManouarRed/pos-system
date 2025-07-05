require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const pool = require('./config/db'); // Your MySQL pool
const { UNCATEGORIZED_ID_UUID, UNKNOWN_MANUFACTURER_ID_UUID } = require('./constants');

const app = express();
const PORT = process.env.PORT || 3001;

// Validate env vars early
const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// CORS config
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true
}));

app.use(express.json());

// Initialize DB schema function
async function initializeDatabaseSchema() {
  let conn;
  try {
    conn = await pool.getConnection();
    const schemaSql = fs.readFileSync(path.join(__dirname, 'db_schema.sql'), 'utf-8');
    const statements = schemaSql.split(/;\s*$/m);
    for (const stmt of statements) {
      if (stmt.trim()) await conn.query(stmt);
    }
    console.log("Schema initialized");

    // Seed Uncategorized category
    const [cat] = await conn.execute('SELECT category_id FROM categories WHERE uuid = ?', [UNCATEGORIZED_ID_UUID]);
    if (cat.length === 0) {
      await conn.execute('INSERT INTO categories (uuid, name) VALUES (?, ?)', [UNCATEGORIZED_ID_UUID, 'Uncategorized']);
      console.log("Seeded Uncategorized category");
    }

    // Seed Unknown Manufacturer
    const [man] = await conn.execute('SELECT manufacturer_id FROM manufacturers WHERE uuid = ?', [UNKNOWN_MANUFACTURER_ID_UUID]);
    if (man.length === 0) {
      await conn.execute('INSERT INTO manufacturers (uuid, name) VALUES (?, ?)', [UNKNOWN_MANUFACTURER_ID_UUID, 'Unknown Manufacturer']);
      console.log("Seeded Unknown Manufacturer");
    }
  } catch (err) {
    console.error("DB initialization error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// Load all API routes dynamically from /routes
const routesDir = path.join(__dirname, 'routes');
fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.js')) {
    const route = require(path.join(routesDir, file));
    const name = file.replace('.js', '');
    if (typeof route === 'function') {
      app.use(`/api/${name}`, route);
      console.log(`Loaded API route /api/${name}`);
    } else {
      console.warn(`Skipping ${file}, not an Express router.`);
    }
  }
});

// API health check endpoint
app.get('/api', (req, res) => {
  res.json({ status: 'API is running', time: new Date().toISOString() });
});

// Serve frontend static files built by Vite
const frontendDist = path.join(__dirname, '../front/dist');
app.use(express.static(frontendDist));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDist, 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server after initializing DB
(async () => {
  try {
    await initializeDatabaseSchema();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      console.log(`Frontend served from: ${frontendDist}`);
      console.log(`API available under /api`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
