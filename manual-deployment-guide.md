# Manual Deployment Guide - Replit to AWS EC2

Since SSH isn't available directly from Replit, here's how to deploy your application manually:

## Method 1: Download and Deploy from Local Machine

### Step 1: Download Your Project from Replit
1. In Replit, click the **three dots menu** (⋯) next to your files
2. Select **"Download as ZIP"**
3. Extract the ZIP file to a folder on your computer
4. Put your `my-pem-key.pem` file in the same folder

### Step 2: Deploy from Your Computer
1. Open terminal/command prompt on your computer
2. Navigate to the extracted folder:
   ```bash
   cd /path/to/extracted/relai-project
   ```
3. Run the deployment script:
   ```bash
   chmod +x deploy-to-server.sh
   ./deploy-to-server.sh
   ```

## Method 2: Manual Server Setup (No Local Machine Needed)

### Step 1: Connect to Your Server
From any computer with SSH, connect to your server:
```bash
ssh -i my-pem-key.pem ubuntu@13.201.223.222
```

### Step 2: Clone from GitHub
Since your code is now on GitHub, clone it directly:
```bash
# Install git if not available
sudo apt update
sudo apt install -y git

# Clone your repository
git clone https://github.com/Relai-World/Relai-Final-Website-Testing.git
cd Relai-Final-Website-Testing
```

### Step 3: Install Dependencies
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install global tools
sudo npm install -g pm2 tsx

# Install Nginx
sudo apt-get install -y nginx

# Install project dependencies
npm install --production
```

### Step 4: Configure Environment
Create your production environment file:
```bash
nano .env
```

Add your production settings:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_production_mongodb_uri
GOOGLE_MAPS_API_KEY=your_production_api_key
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REDIRECT_URI=http://13.201.223.222/api/auth/zoho/callback
```

### Step 5: Configure PM2
Create PM2 configuration:
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

# Create logs directory
mkdir -p logs
```

### Step 6: Configure Nginx
```bash
sudo tee /etc/nginx/sites-available/relai-app > /dev/null << 'EOF'
server {
    listen 80;
    server_name 13.201.223.222;
    
    client_max_body_size 50M;
    
    # Serve static files
    location /static/ {
        alias /home/ubuntu/Relai-Final-Website-Testing/client/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Property images
    location /property_images/ {
        alias /home/ubuntu/Relai-Final-Website-Testing/public/property_images/;
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
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/relai-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 7: Start Your Application
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
# Run the command that PM2 outputs (starts with sudo)
```

### Step 8: Verify Deployment
```bash
# Check application status
pm2 status

# View logs
pm2 logs relai-app

# Test the application
curl http://localhost:5000
```

## Accessing Your Application

Your application will be available at: **http://13.201.223.222**

## Updating Your Application

To update your application with new changes:

```bash
# Pull latest changes from GitHub
git pull origin main

# Restart the application
pm2 restart relai-app
```

## Troubleshooting

### Check Application Logs
```bash
pm2 logs relai-app --lines 50
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart application
pm2 restart relai-app

# Restart Nginx
sudo systemctl restart nginx
```

### Check Process Status
```bash
# Check if application is running
pm2 status

# Check Nginx status
sudo systemctl status nginx
```