#!/bin/bash

echo "--- Deploying Frontend ---"
cd front
npm install
npm run build
cd ..

echo "--- Deploying Backend ---"
cd back
npm install

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null
then
    echo "PM2 not found, installing globally..."
    npm install -g pm2
fi

# Start the backend server with PM2
pm2 start server.js --name pos-backend --watch
pm2 save

cd ..

echo "Deployment script finished. Frontend built in 'front/dist'. Backend dependencies installed and started with PM2."
echo "Remember to configure a web server (e.g., Nginx) to serve the frontend and proxy API requests."