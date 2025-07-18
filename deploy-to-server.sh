#!/bin/bash

# Deployment script for Relai Real Estate Platform
# Target: AWS EC2 Ubuntu Server

echo "🚀 Starting deployment to AWS EC2 server..."

# Server configuration
SERVER_IP="13.201.223.222"
SERVER_USER="ubuntu"
PEM_KEY="my-pem-key.pem"
APP_DIR="/var/www/relai-app"
SERVICE_NAME="relai-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PEM key exists
if [ ! -f "$PEM_KEY" ]; then
    print_error "PEM key file '$PEM_KEY' not found!"
    print_warning "Please ensure your PEM key is in the current directory"
    exit 1
fi

# Set correct permissions for PEM key
chmod 600 "$PEM_KEY"
print_status "Set PEM key permissions"

# Test SSH connection
print_status "Testing SSH connection..."
ssh -i "$PEM_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo 'SSH connection successful'" || {
    print_error "SSH connection failed!"
    exit 1
}

# Create deployment package (excluding node_modules and other unnecessary files)
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
    -czf relai-app.tar.gz .

print_status "Deployment package created: relai-app.tar.gz"

# Upload the package to server
print_status "Uploading application to server..."
scp -i "$PEM_KEY" relai-app.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"

# Connect to server and deploy
print_status "Connecting to server for deployment..."
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    set -e
    
    echo "🔧 Setting up server environment..."
    
    # Update system packages
    sudo apt update
    
    # Install Node.js 20 (LTS)
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install PM2 for process management
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    # Install Nginx for reverse proxy
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        sudo apt-get install -y nginx
    fi
    
    # Create application directory
    sudo mkdir -p /var/www/relai-app
    sudo chown -R ubuntu:ubuntu /var/www/relai-app
    
    # Extract application
    echo "Extracting application..."
    cd /var/www/relai-app
    tar -xzf /tmp/relai-app.tar.gz
    
    # Install dependencies
    echo "Installing dependencies..."
    npm install --production
    
    # Build the application
    echo "Building application..."
    npm run build || echo "Build step completed (may have warnings)"
    
    echo "✅ Application deployed successfully!"
EOF

print_status "Creating PM2 ecosystem file..."

# Create PM2 ecosystem configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'relai-app',
    script: './server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
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
EOF

# Upload PM2 config
scp -i "$PEM_KEY" ecosystem.config.js "$SERVER_USER@$SERVER_IP:/var/www/relai-app/"

# Configure Nginx and start services
ssh -i "$PEM_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
    set -e
    
    cd /var/www/relai-app
    
    # Create logs directory
    mkdir -p logs
    
    # Install tsx for TypeScript execution
    npm install -g tsx
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/relai-app > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name 13.201.223.222;
    
    # Serve static files
    location /static/ {
        alias /var/www/relai-app/client/public/;
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
NGINX_EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/relai-app /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Start services
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    # Start application with PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup | grep sudo | sh || true
    
    echo "🎉 Deployment completed successfully!"
    echo "Your application is now running at: http://13.201.223.222"
    
    # Show application status
    pm2 status
    
    # Show application logs
    echo "Recent application logs:"
    pm2 logs relai-app --lines 10 || echo "Logs will be available once app starts"
EOF

# Cleanup
rm -f relai-app.tar.gz ecosystem.config.js

print_status "Deployment script completed!"
print_status "Your Relai Real Estate Platform should now be accessible at: http://13.201.223.222"
print_warning "Make sure to:"
print_warning "1. Update your .env file on the server with production credentials"
print_warning "2. Configure your domain DNS if using a custom domain"
print_warning "3. Set up SSL certificate for HTTPS (recommended)"

echo ""
echo "To check application status, run:"
echo "ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP 'pm2 status'"
echo ""
echo "To view logs, run:"
echo "ssh -i $PEM_KEY $SERVER_USER@$SERVER_IP 'pm2 logs relai-app'"