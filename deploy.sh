#!/bin/bash

echo "--- Checking Node.js Version ---"
# Get the major version of Node.js
NODE_MAJOR_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')

# Check if Node.js is installed and if its version is at least 18
if ! command -v node &> /dev/null
then
    echo "Error: Node.js is not installed. Please install Node.js 18 or higher."
    echo "For Linux, consider using nvm (Node Version Manager) or your distribution's package manager."
    exit 1
elif (( NODE_MAJOR_VERSION < 18 )); then
  echo "Error: Node.js version is too old. Please update to Node.js 18 or higher."
  echo "Current Node.js version: $(node -v)"
  echo "For Linux, you can use nvm (Node Version Manager) to easily switch/install Node.js versions."
  echo "Example: nvm install 20 && nvm use 20"
  exit 1
fi

echo "--- Deploying Frontend ---"
cd front || { echo "Error: 'front' directory not found."; exit 1; }
npm install || { echo "Error: npm install failed in frontend."; exit 1; }
npm run build || { echo "Error: npm run build failed in frontend."; exit 1; }
cd ..

echo "--- Deploying Backend ---"
cd back || { echo "Error: 'back' directory not found."; exit 1; }
npm install || { echo "Error: npm install failed in backend."; exit 1; }

echo "--- Installing PM2 globally (requires sudo) ---"
# Attempt to install PM2 globally. This requires sudo on most Linux systems.
# You might be prompted for your password.
sudo npm install -g pm2 || { echo "Error: Failed to install PM2 globally. Please ensure you have sudo privileges and try again."; exit 1; }

echo "--- Starting Backend with PM2 ---"
# Start the backend server with PM2. --watch will restart on file changes.
pm2 start server.js --name pos-backend --watch || { echo "Error: Failed to start backend with PM2."; exit 1; }
pm2 save || { echo "Error: Failed to save PM2 process list."; exit 1; }

cd ..

echo "Deployment script finished. Frontend built in 'front/dist'. Backend dependencies installed and started with PM2."
echo "Remember to configure a web server (e.g., Nginx) to serve the frontend and proxy API requests."
