#!/bin/bash

# Deploy Relai Real Estate Platform directly from Replit to AWS EC2

echo "🚀 Deploying from Replit to AWS EC2..."

# Server configuration
SERVER_IP="13.201.223.222"
SERVER_USER="ubuntu"
APP_DIR="/var/www/relai-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we can access the PEM key from environment or user input
if [ -z "$PEM_KEY_CONTENT" ]; then
    print_error "PEM key content not provided!"
    echo "Please provide your PEM key content when prompted."
    echo "You can either:"
    echo "1. Set PEM_KEY_CONTENT environment variable"
    echo "2. Paste the key content when prompted"
    echo ""
    read -p "Paste your PEM key content here (or press Enter to skip): " PEM_KEY_INPUT
    
    if [ -n "$PEM_KEY_INPUT" ]; then
        echo "$PEM_KEY_INPUT" > temp_key.pem
        chmod 600 temp_key.pem
        PEM_KEY="temp_key.pem"
    else
        print_error "Cannot proceed without PEM key"
        exit 1
    fi
else
    echo "$PEM_KEY_CONTENT" > temp_key.pem
    chmod 600 temp_key.pem
    PEM_KEY="temp_key.pem"
fi

# Create deployment package
print_status "Creating deployment package..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='coverage' \
    --exclude='.DS_Store' \
    --exclude='*.pem' \
    --exclude='temp_key.pem' \
    -czf relai-app.tar.gz .

print_status "Testing SSH connection..."
ssh -i "$PEM_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo 'SSH connection successful'" || {
    print_error "SSH connection failed!"
    rm -f temp_key.pem relai-app.tar.gz
    exit 1
}

# Upload the package
print_status "Uploading application to server..."
scp -i "$PEM_KEY" relai-app.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/" || {
    print_error "Failed to upload application"
    rm -f temp_key.pem relai-app.tar.gz
    exit 1
}

# Deploy on server
print_status "Installing and configuring on server..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    set -e
    
    echo "🔧 Setting up server environment..."
    
    # Update system
    sudo apt update -y
    
    # Install Node.js 20
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install global packages
    sudo npm install -g pm2 tsx
    
    # Install Nginx
    if ! command -v nginx &> /dev/null; then
        sudo apt-get install -y nginx
    fi
    
    # Create app directory
    sudo mkdir -p /var/www/relai-app
    sudo chown -R ubuntu:ubuntu /var/www/relai-app
    
    # Stop existing app if running
    pm2 stop relai-app 2>/dev/null || true
    pm2 delete relai-app 2>/dev/null || true
    
    # Extract new version
    cd /var/www/relai-app
    rm -rf * .[^.]* 2>/dev/null || true
    tar -xzf /tmp/relai-app.tar.gz
    
    # Install dependencies
    echo "Installing dependencies..."
    npm install --production
    
    # Create logs directory
    mkdir -p logs
    
    # Create PM2 ecosystem config
    cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'relai-app',
    script: './server/index.ts',
    interpreter: 'tsx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOFPM2
    
    # Configure Nginx
    sudo tee /etc/nginx/sites-available/relai-app > /dev/null << 'EOFNGINX'
server {
    listen 80;
    server_name 13.201.223.222;
    
    client_max_body_size 50M;
    
    # Serve static files
    location /static/ {
        alias /var/www/relai-app/client/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Property images
    location /property_images/ {
        alias /var/www/relai-app/public/property_images/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Frontend application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOFNGINX
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/relai-app /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart Nginx
    sudo nginx -t && sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    # Start application
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup PM2 startup (ignore errors if already configured)
    pm2 startup ubuntu 2>/dev/null | grep "sudo" | sh || true
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "Application URL: http://13.201.223.222"
    echo ""
    echo "Application Status:"
    pm2 status
    
    echo ""
    echo "Recent logs:"
    pm2 logs relai-app --lines 5 || echo "Application starting..."
    
    # Cleanup
    rm -f /tmp/relai-app.tar.gz
EOF

# Cleanup local files
rm -f temp_key.pem relai-app.tar.gz

print_status "Deployment completed!"
echo ""
echo "🌐 Your Relai Real Estate Platform is now live at:"
echo "   http://13.201.223.222"
echo ""
echo "To check status: ssh -i your-pem-key.pem ubuntu@13.201.223.222 'pm2 status'"
echo "To view logs: ssh -i your-pem-key.pem ubuntu@13.201.223.222 'pm2 logs relai-app'"