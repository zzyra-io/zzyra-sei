#!/bin/bash
# Setup script for Zyra Worker on Oracle Cloud Infrastructure
# This script installs Node.js, pnpm, and sets up the Zyra worker as a service

# Exit on error
set -e

echo "=== Starting Zyra Worker Setup ==="

# Update system packages
echo "Updating system packages..."
sudo yum update -y

# Install Node.js 20.x
echo "Installing Node.js 20.x..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify Node.js installation
node -v
npm -v

# Install pnpm
echo "Installing pnpm..."
npm install -g pnpm

# Install PM2 for process management
echo "Installing PM2..."
npm install -g pm2

# Create app directory if it doesn't exist
APP_DIR="/opt/zyra-worker"
echo "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Copy application files (assuming they're in the current directory)
echo "Copying application files..."
cp -r ./* $APP_DIR/

# Install dependencies
echo "Installing dependencies..."
cd $APP_DIR
pnpm install --frozen-lockfile

# Build the application
echo "Building the application..."
pnpm run build

# Setup environment variables
echo "Setting up environment variables..."
if [ ! -f "$APP_DIR/.env" ]; then
  cp .env.example .env
  echo "Created .env file from .env.example. Please update with your configuration."
fi

# Create PM2 ecosystem file
echo "Creating PM2 ecosystem file..."
cat > $APP_DIR/ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'zyra-worker',
    script: 'dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOL

# Setup PM2 to start on boot
echo "Setting up PM2 to start on boot..."
pm2 start $APP_DIR/ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | bash

# Create a health check script
echo "Creating health check script..."
cat > $APP_DIR/health-check.js << EOL
const http = require('http');

const options = {
  host: 'localhost',
  port: 3000,
  path: '/health',
  timeout: 2000
};

const request = http.get(options, (res) => {
  console.log(\`Health check status: \${res.statusCode}\`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error('Health check failed:', err);
  process.exit(1);
});

request.end();
EOL

# Setup firewall to allow traffic on port 3000
echo "Configuring firewall..."
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

echo "=== Zyra Worker Setup Complete ==="
echo "The worker is now running and configured to start automatically on boot."
echo "You can manage the worker using PM2 commands:"
echo "  - Check status: pm2 status"
echo "  - View logs: pm2 logs zyra-worker"
echo "  - Restart: pm2 restart zyra-worker"
echo ""
echo "Remember to update the .env file with your production configuration."
