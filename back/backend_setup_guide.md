
# Backend Setup Guide: POS Application (Node.js/Express.js with MySQL)

This document guides you through setting up the backend which now uses a MySQL database.

## Prerequisites:

1.  **Node.js and npm:** Ensure you have Node.js (which includes npm) installed.
2.  **MySQL Server:** You need a running MySQL server instance (local or remote).
3.  **MySQL Client (Optional but Recommended):** A tool like MySQL Workbench, DBeaver, or the `mysql` command-line client to interact with your database.

## Setup Steps:

1.  **Project Directory:**
    *   If you haven't already, create a `pos-backend` directory for all the backend files (`config`, `middleware`, `routes`, `utils`, `.env.example`, `.gitignore`, `package.json`, `server.js`, `constants.js`, `db_schema.sql`).

2.  **Install Dependencies:**
    *   Open your terminal.
    *   Navigate into your `pos-backend` directory (e.g., `cd path/to/pos-backend`).
    *   Run: `npm install`
        *   This will install Express, mysql2, bcryptjs,jsonwebtoken, dotenv, cors, and nodemon.

3.  **Configure Environment Variables:**
    *   In the `pos-backend` directory, rename `.env.example` to `.env`.
    *   Open the `.env` file and configure the following:
        *   `NODE_ENV`: Set to `development` for local work.
        *   `PORT`: Port for the backend server (e.g., `3001`).
        *   `CORS_ORIGIN`: For local development, this can be your frontend's URL (e.g., `http://localhost:5173`). In production, this **MUST** be your exact frontend domain.
        *   `JWT_SECRET`: A **strong, unique, long random string** for signing JWTs. Generate a new one for your setup.
        *   **MySQL Database Connection:**
            *   `DB_HOST`: Your MySQL server host (e.g., `localhost` or an IP address).
            *   `DB_USER`: Your MySQL username (e.g., `root` or a dedicated user).
            *   `DB_PASSWORD`: The password for your MySQL user.
            *   `DB_NAME`: The name of the database to use (e.g., `pos_system_db`). You might need to create this database manually in MySQL first.
            *   `DB_PORT`: The port MySQL is running on (default is `3306`).

    *   **Example `.env` for local development:**
        ```
        NODE_ENV=development
        PORT=3001
        CORS_ORIGIN=http://localhost:5173
        JWT_SECRET=replace_this_with_a_very_strong_random_secret_key

        DB_HOST=localhost
        DB_USER=root
        DB_PASSWORD=your_mysql_password_here
        DB_NAME=pos_system_db
        DB_PORT=3306
        ```

4.  **Create MySQL Database (if it doesn't exist):**
    *   Using your MySQL client, connect to your MySQL server.
    *   Execute the command: `CREATE DATABASE IF NOT EXISTS pos_system_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        *   Replace `pos_system_db` if you used a different name in your `.env` file.

5.  **Database Schema Initialization:**
    *   The backend server (`server.js`) includes logic to read `db_schema.sql` and attempt to create the necessary tables (`categories`, `manufacturers`, `users`, `products`, `product_sizes`, `sales`, `sale_items`) if they don't already exist when the server starts.
    *   It will also attempt to seed the 'Uncategorized' category and 'Unknown Manufacturer' using the UUIDs defined in `pos-backend/constants.js`.

6.  **Initial User Data & Passwords:**
    *   The backend **does not** automatically seed users from a JSON file anymore.
    *   **To create your first admin user:**
        1.  **Option 1 (Recommended):** After the server starts and tables are created, you might need a temporary script or manually insert an admin user directly into the `users` table via your MySQL client. Make sure to hash the password using `bcryptjs`.
            *   Example SQL to insert an admin (replace with your desired username/password, and hash the password):
                ```sql
                -- First, generate a bcrypt hash for your desired password (e.g., using an online tool or a simple Node.js script)
                -- For example, if password is 'adminpass', the hash might look like: $2a$10$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuvwxyza
                INSERT INTO users (uuid, username, hashedPassword, role) 
                VALUES ('user_admin_initial_seed_uuid', 'admin', 'YOUR_BCRYPT_HASHED_PASSWORD_HERE', 'admin');
                ```
                *(Ensure 'user_admin_initial_seed_uuid' is a unique UUID string you generate, e.g., using an online UUID generator)*
        2.  **Option 2 (Temporary modification):** You could temporarily modify the `POST /api/users` route to allow creating the first admin without `isAdmin` protection, then use your frontend to create the first admin, and then revert the route change. This is less secure.
    *   Once you have an admin user, you can use the User Management section in your frontend application to add other users. New users created via the application will have their passwords hashed automatically.

7.  **Run the Backend Server (Local Development):**
    *   From the `pos-backend` directory in your terminal:
        *   For development (server restarts automatically on file changes): `npm run dev`
        *   For a standard run: `npm start`
    *   Look for console messages indicating successful database connection and schema initialization, followed by: `Backend server listening on http://localhost:3001` (or your configured port).
    *   Address any database connection errors reported in the console (e.g., wrong credentials, database not found, MySQL server not running).

8.  **Connect Frontend to Backend (Local Development):**
    *   Ensure your frontend's `services/productService.ts` has `API_BASE_URL = '/api'`.
    *   Use a Vite proxy (or similar for other dev servers) in your frontend's configuration to forward `/api` requests to your backend server's address (e.g., `http://localhost:3001`).
        ```javascript
        // Example for frontend's vite.config.js
        import { defineConfig } from 'vite';
        import react from '@vitejs/plugin-react';

        export default defineConfig({
          plugins: [react()],
          server: {
            proxy: {
              '/api': {
                target: 'http://localhost:3001', // Your backend's port
                changeOrigin: true,
              }
            }
          }
        });
        ```
        Restart your frontend dev server if you add/change the proxy.

9.  **Test:**
    *   Open your frontend application.
    *   Try logging in with your manually created admin user.
    *   Test all CRUD operations for products, categories, manufacturers, users, and sales processing. Check the browser's developer console and your backend's terminal output for errors.

## Production Deployment Considerations (`https://obchod.doubleredcars.sk/`):

Migrating to MySQL is a good step for production. Key considerations remain similar but adapt to the database:

1.  **Environment Variables (Production):**
    *   `NODE_ENV=production`
    *   `JWT_SECRET`: **Extremely strong, unique, long random string.**
    *   `CORS_ORIGIN`: Your exact frontend production URL.
    *   `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Production database credentials and details. These should be managed securely (e.g., through your hosting provider's environment variable settings).
    *   **Never commit your production `.env` file to version control.**

2.  **Database Management (Production):**
    *   **Migrations:** While the dev setup creates tables if they don't exist, for production, use a proper database migration tool (e.g., Flyway, Liquibase, or Node.js based ones like `db-migrate` or `Knex.js migrations`). This allows for version-controlled schema changes.
    *   **Backups:** Implement regular, automated backups of your MySQL database.
    *   **Security:** Ensure your MySQL server is secured (e.g., firewall, strong user passwords, limited privileges for the application user).

3.  **Process Manager:**
    *   Use PM2 or a similar process manager as described in the previous JSON-based setup guide.

4.  **Web Server (Reverse Proxy):**
    *   Configuration for Nginx/Apache remains the same: serve frontend static files and reverse proxy `/api/*` requests to your Node.js backend.

5.  **Backend Constants (`pos-backend/constants.js`):**
    *   The `UNCATEGORIZED_ID_UUID` and `UNKNOWN_MANUFACTURER_ID_UUID` are used by the server startup script to seed these essential records if they are missing from the `categories` and `manufacturers` tables.

This setup provides a more robust and scalable backend compared to JSON files.
