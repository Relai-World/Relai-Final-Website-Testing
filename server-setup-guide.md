# Relai Real Estate Platform - Server Deployment Guide

## Quick Deployment

### Prerequisites
1. Your PEM key file (`my-pem-key.pem`) must be in the current directory
2. Ensure SSH access to the server: `ssh -i my-pem-key.pem ubuntu@13.201.223.222`

### One-Command Deployment
```bash
chmod +x deploy-to-server.sh && ./deploy-to-server.sh
```

## Manual Deployment Steps

If you prefer manual deployment or need to troubleshoot:

### 1. Connect to Server
```bash
ssh -i my-pem-key.pem ubuntu@13.201.223.222
```

### 2. Install Dependencies
```bash
# Update system
sudo apt update

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and other tools
sudo npm install -g pm2 tsx

# Install Nginx
sudo apt-get install -y nginx
```

### 3. Upload Your Code
From your local machine:
```bash
# Create deployment package
tar --exclude='node_modules' --exclude='.git' --exclude='*.log' -czf relai-app.tar.gz .

# Upload to server
scp -i my-pem-key.pem relai-app.tar.gz ubuntu@13.201.223.222:/tmp/
```

### 4. Deploy on Server
```bash
# Create app directory
sudo mkdir -p /var/www/relai-app
sudo chown -R ubuntu:ubuntu /var/www/relai-app

# Extract and setup
cd /var/www/relai-app
tar -xzf /tmp/relai-app.tar.gz
npm install --production
```

### 5. Configure Environment
Create `/var/www/relai-app/.env` with your production settings:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_production_mongodb_uri
GOOGLE_MAPS_API_KEY=your_google_maps_key
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
```

### 6. Start Application
```bash
# Start with PM2
pm2 start server/index.ts --name relai-app --interpreter tsx
pm2 save
pm2 startup
```

### 7. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/relai-app
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name 13.201.223.222;
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/relai-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Post-Deployment

### Check Application Status
```bash
pm2 status
pm2 logs relai-app
```

### Monitor Application
```bash
# View real-time logs
pm2 logs relai-app --lines 100

# Monitor resource usage
pm2 monit
```

### Restart Application
```bash
pm2 restart relai-app
```

## Troubleshooting

### Common Issues

1. **Permission Denied for PEM key**
   ```bash
   chmod 600 my-pem-key.pem
   ```

2. **Application not starting**
   ```bash
   pm2 logs relai-app
   # Check for missing environment variables or dependencies
   ```

3. **Nginx 502 Bad Gateway**
   ```bash
   # Check if application is running
   pm2 status
   # Check Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Database Connection Issues**
   - Ensure MongoDB URI is correct in .env file
   - Check if MongoDB allows connections from your server IP

## Security Recommendations

1. **Firewall Configuration**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   ```

2. **SSL Certificate (Optional)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

3. **Regular Updates**
   ```bash
   sudo apt update && sudo apt upgrade
   npm audit fix
   ```

## Application URLs

Once deployed, your application will be available at:
- **Main Application**: http://13.201.223.222
- **API Endpoints**: http://13.201.223.222/api/*
- **Property Search**: http://13.201.223.222/properties
- **AI Chatbot**: http://13.201.223.222/web-bot

## Environment Variables Required

Make sure these are set in your server's `.env` file:
- `MONGODB_URI`
- `GOOGLE_MAPS_API_KEY`
- `ZOHO_CLIENT_ID`
- `ZOHO_CLIENT_SECRET`
- `ZOHO_REDIRECT_URI`
- `NODE_ENV=production`
- `PORT=5000`