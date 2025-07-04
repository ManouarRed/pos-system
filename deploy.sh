#!/bin/bash

echo "--- Checking Node.js Version ---"
NODE_MAJOR_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if (( NODE_MAJOR_VERSION < 18 )); then
  echo "Error: Node.js version is too old. Please update to Node.js 18 or higher."
  echo "Current Node.js version: $(node -v)"
  exit 1
fi

echo "--- Deploying Frontend ---"
cd front
npm install
npm run build
cd ..

echo "--- Deploying Backend ---"
cd back
npm install

echo "--- Installing PM2 (requires elevated privileges) ---"
# This command might require 'sudo' on Linux/macOS or running the script as Administrator on Windows.
npm install -g pm2 || { echo "Failed to install PM2. Please run this script with elevated privileges (e.g., sudo ./deploy.sh) or install PM2 manually."; exit 1; }

# Start the backend server with PM2
pm2 start server.js --name pos-backend --watch
pm2 save

cd ..

echo "Deployment script finished. Frontend built in 'front/dist'. Backend dependencies installed and started with PM2."
echo "Remember to configure a web server (e.g., Nginx) to serve the frontend and proxy API requests."
