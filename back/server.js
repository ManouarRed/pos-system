
require('dotenv').config();
const express = require('express');
const corsMiddleware = require('cors'); // Renamed variable for clarity and correctness
const path = require('path');
const fs = require('node:fs');

// Early check for essential environment variables
const essentialEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missingEnvVars = essentialEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`FATAL ERROR: Missing essential environment variables: ${missingEnvVars.join(', ')}.`);
  console.error("Please ensure they are set in your .env file.");
  process.exit(1); // Exit if critical env vars are missing
}

const pool = require('./config/db'); // MySQL connection pool
const { generateId } = require('./utils/idGenerator');
const { UNCATEGORIZED_ID_UUID, UNKNOWN_MANUFACTURER_ID_UUID } = require('./constants');


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? undefined : '*');
const corsOptions = {
  origin: corsOrigin,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true
};
app.use(corsMiddleware(corsOptions)); // Use the required cors module
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Function to execute SQL schema
async function initializeDatabaseSchema() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Reading schema file...");
    const schemaSql = fs.readFileSync(path.join(__dirname, 'db_schema.sql'), 'utf-8');
    const statements = schemaSql.split(/;\s*$/m); 
    
    for (const statement of statements) {
      if (statement.trim().length > 0) {
        await connection.query(statement);
      }
    }
    console.log("Database schema initialized/verified successfully.");

    const [catExists] = await connection.execute('SELECT category_id FROM categories WHERE uuid = ?', [UNCATEGORIZED_ID_UUID]);
    if (catExists.length === 0) {
      await connection.execute('INSERT INTO categories (uuid, name) VALUES (?, ?)', [UNCATEGORIZED_ID_UUID, 'Uncategorized']);
      console.log("Seeded 'Uncategorized' category.");
    }

    const [manExists] = await connection.execute('SELECT manufacturer_id FROM manufacturers WHERE uuid = ?', [UNKNOWN_MANUFACTURER_ID_UUID]);
    if (manExists.length === 0) {
      await connection.execute('INSERT INTO manufacturers (uuid, name) VALUES (?, ?)', [UNKNOWN_MANUFACTURER_ID_UUID, 'Unknown Manufacturer']);
      console.log("Seeded 'Unknown Manufacturer'.");
    }

  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// Dynamically load routes
const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  if (file.endsWith('.js')) {
    const routeName = file.split('.')[0];
    const routeModule = require(path.join(routesPath, file));
    if (typeof routeModule === 'function') {
        app.use(`/api/${routeName}`, routeModule);
        console.log(`Routes for /api/${routeName} loaded from ${file}`);
    } else {
        console.warn(`File ${file} in routes directory does not export an Express Router. Skipping.`);
    }
  }
});

// Explicitly load the images route
const imagesRoutes = require('./routes/images');
app.use('/api/images', imagesRoutes);
console.log('Routes for /api/images loaded from images.js');

// Explicitly load the data route
const dataRoutes = require('./routes/data');
app.use('/api/data', dataRoutes);
console.log('Routes for /api/data loaded from data.js');

app.get('/', (req, res) => {
  res.send('POS Backend Server with MySQL is running!');
});

app.use('/api/*', (req, res, next) => {
    res.status(404).json({ message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err.message || err);
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500 
                ? 'An unexpected internal server error occurred.' 
                : (err.message || 'Internal Server Error');
  res.status(statusCode).json({ message });
});

const startServer = async () => {
  try {
    await initializeDatabaseSchema();
    app.listen(PORT, () => {
      console.log(`Backend server listening on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (corsOrigin) {
        console.log(`CORS enabled for origin: ${corsOrigin}`);
        if (process.env.NODE_ENV === 'production' && corsOrigin === '*') {
            console.warn("SECURITY WARNING: CORS_ORIGIN is set to '*' in a production environment. This is insecure.");
        }
      } else if (process.env.NODE_ENV === 'production') {
          console.error("CRITICAL SECURITY WARNING: CORS_ORIGIN is not set in production.");
      } else {
           console.warn(`CORS enabled for all origins ('*') by default in development.`);
      }
    });
  } catch (error) {
    console.error("Failed to start server due to database initialization failure:", error);
    process.exit(1);
  }
};

startServer();
