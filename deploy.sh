#!/bin/bash

set -e  # Exit on any error
set -o pipefail

echo "=== Starting Deployment ==="

# Ensure required tools exist
echo "--- Checking for curl and git ---"
command -v curl >/dev/null 2>&1 || { echo >&2 "curl is required but not installed."; exit 1; }
command -v git >/dev/null 2>&1 || { echo >&2 "git is required but not installed."; exit 1; }

# Setup NVM if not already installed
if [ -z "$NVM_DIR" ]; then
  export NVM_DIR="$HOME/.nvm"
fi

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "--- Installing NVM ---"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
else
  echo "--- Loading NVM ---"
  . "$NVM_DIR/nvm.sh"
fi

# Install Node.js 20 if needed
REQUIRED_NODE_VERSION=20
CURRENT_NODE_VERSION=$(node -v 2>/dev/null | cut -d'.' -f1 | sed 's/v//')

if [ -z "$CURRENT_NODE_VERSION" ] || [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
  echo "--- Installing Node.js $REQUIRED_NODE_VERSION via NVM ---"
  nvm install $REQUIRED_NODE_VERSION
  nvm use $REQUIRED_NODE_VERSION
  nvm alias default $REQUIRED_NODE_VERSION
else
  echo "--- Node.js version $(node -v) is OK ---"
fi

# Ensure npm is available
command -v npm >/dev/null 2>&1 || { echo "npm is not installed."; exit 1; }

# Install PM2 globally (without sudo when using nvm)
if ! command -v pm2 &> /dev/null; then
  echo "--- Installing PM2 globally ---"
  npm install -g pm2
else
  echo "--- PM2 already installed ---"
fi

echo "--- Deploying Frontend ---"
cd front || { echo "Error: 'front' directory not found."; exit 1; }
npm install
npm run build
cd ..

# Copy built frontend files to the project root
echo "--- Copying frontend build to project root ---"
rm -rf ./assets
rm -f ./index.html
cp -r front/dist/. .

echo "--- Deploying Backend ---"
cd back || { echo "Error: 'back' directory not found."; exit 1; }
npm install

# Inject allowed origins if not set in .env
if ! grep -q "CORS_ORIGIN=" .env; then
  echo 'CORS_ORIGIN=https://store.doubleredcars.sk' >> .env
  echo 'Added CORS_ORIGIN to .env'
fi

# Optional: Add localhost to backend CORS logic (if not already coded)
if ! grep -q "NODE_ENV=" .env; then
  echo 'NODE_ENV=production' >> .env
fi

echo "--- Starting Backend with PM2 ---"
pm2 delete pos-backend 2>/dev/null || true
pm2 start server.js --name pos-backend --watch
pm2 save
cd ..

echo "=== Deployment Successful ==="
echo "Frontend built in 'front/dist'. Backend running under PM2."
