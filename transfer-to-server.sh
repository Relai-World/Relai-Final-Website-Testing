#!/bin/bash

# Relai Production Deployment Transfer Script
echo "🚀 Transferring Relai production files to external server..."

SERVER_IP="13.201.223.222"
SERVER_USER="ubuntu"

echo "📦 Creating deployment archive..."
tar -czf relai-production-deploy.tar.gz production-deploy/

echo "📤 Uploading to server..."
scp relai-production-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:~/

echo "🔧 Setting up on server..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
# Extract the deployment files
tar -xzf relai-production-deploy.tar.gz
cd production-deploy

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the production server
echo "🚀 Starting production server..."
npm start
EOF

echo "✅ Deployment complete!"
echo "🌍 Your app should now be available at: http://${SERVER_IP}:5000/"