# Backend Application

This is the backend application for the DOUBLE RED Store POS system, built with Node.js, Express, and MySQL.

## Setup

1.  Navigate to the `back` directory:
    ```bash
    cd C:\Users\mano-\Desktop\pos\back
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Database Configuration**: Create a `.env` file in this directory based on `backend_setup_guide.md` and configure your MySQL database connection details.

## Running the Application

To start the development server (with `nodemon` for auto-restarts):

```bash
npm run dev
```

To start the production server:

```bash
npm start
```

This will typically run the backend on `http://localhost:3001`.

## API Endpoints

Refer to the `routes/` directory for available API endpoints.
