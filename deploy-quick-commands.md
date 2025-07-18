# Quick Deployment Commands for AWS EC2

Since SSH isn't available from Replit, here are the exact commands to run on your server.

## Step 1: Connect to Your Server
From any computer with SSH access, run:
```bash
ssh -i my-pem-key.pem ubuntu@13.201.223.222
```

## Step 2: Copy and Paste These Commands One by One

### Install Dependencies
```bash
# Update system
sudo apt update -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install global tools
sudo npm install -g pm2 tsx

# Install Nginx
sudo apt-get install -y nginx git
```

### Clone Your Project
```bash
# Clone from GitHub
cd ~
git clone https://github.com/Relai-World/Relai-Final-Website-Testing.git
cd Relai-Final-Website-Testing
```

### Install Project Dependencies
```bash
# Install dependencies
npm install --production

# Create logs directory
mkdir -p logs
```

### Create Environment File
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://subscriptions:Subcribe%40Mongodb@cluster0.vynzql2.mongodb.net/Relai?retryWrites=true&w=majority&appName=Cluster0
GOOGLE_MAPS_API_KEY=AIzaSyDKHC_bVedAir1Dl2w2ZV7-B3H5qgVPYng
ZOHO_CLIENT_ID=1000.6RTQRDP88L3F5F9T5TB3H2XRMU9BBE
ZOHO_CLIENT_SECRET=1b0e3f5935abcde6f5b9c1234567890abc123456
ZOHO_REDIRECT_URI=http://13.201.223.222/api/auth/zoho/callback
EOF
```

### Create PM2 Configuration
```bash
cat > ecosystem.config.js << 'EOF'
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
EOF
```

### Configure Nginx
```bash
sudo tee /etc/nginx/sites-available/relai-app > /dev/null << 'EOF'
server {
    listen 80;
    server_name 13.201.223.222;
    
    client_max_body_size 50M;
    
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
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/relai-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Start Your Application
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup ubuntu
```

### Final Commands (Run the sudo command that PM2 outputs)
PM2 will output a command starting with `sudo`. Copy and run that command.

## Step 3: Verify Deployment
```bash
# Check application status
pm2 status

# View recent logs
pm2 logs relai-app --lines 20

# Test application
curl http://localhost:5000
```

## Your Application URL
Once all commands complete successfully, your application will be available at:
**http://13.201.223.222**

## Update Application (Future Updates)
To update with new code:
```bash
cd ~/Relai-Final-Website-Testing
git pull origin main
pm2 restart relai-app
```