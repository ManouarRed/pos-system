#!/bin/bash
set -e
set -o pipefail

echo "=== Starting Deployment ==="

# Check commands exist
for cmd in curl git node npm pm2; do
  if ! command -v $cmd >/dev/null 2>&1; then
    echo "Error: $cmd is required but not installed."
    exit 1
  fi
done

# Setup NVM (install if needed)
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "--- Installing NVM ---"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
# Load NVM
. "$NVM_DIR/nvm.sh"

REQUIRED_NODE_VERSION=20
CURRENT_NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')

if [ -z "$CURRENT_NODE_VERSION" ] || [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
  echo "--- Installing Node.js $REQUIRED_NODE_VERSION via NVM ---"
  nvm install $REQUIRED_NODE_VERSION
fi

nvm use $REQUIRED_NODE_VERSION
nvm alias default $REQUIRED_NODE_VERSION

echo "--- Node.js version: $(node -v) ---"
echo "--- npm version: $(npm -v) ---"

# Frontend build
echo "--- Building frontend ---"
cd front || { echo "front directory missing"; exit 1; }
npm install
npm run build
cd ..

# Backend install
echo "--- Installing backend dependencies ---"
cd back || { echo "back directory missing"; exit 1; }
npm install
cd ..

# Copy frontend build to backend folder (adjust paths if needed)
echo "--- Copying frontend build to backend folder ---"
rm -rf back/front/dist
mkdir -p back/front
cp -r front/dist back/front/dist

# Start backend with PM2
echo "--- Starting backend with PM2 ---"
cd back
pm2 delete pos-backend 2>/dev/null || true
pm2 start server.js --name pos-backend --watch
pm2 save
cd ..

echo "=== Deployment finished successfully ==="
