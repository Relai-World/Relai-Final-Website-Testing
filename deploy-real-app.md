# Deploy Real Relai Application from GitHub

## Run These Commands on Your Server

### 1. Stop Current Simple App
```bash
pm2 delete relai-app
```

### 2. Install TypeScript Globally
```bash
sudo npm install -g typescript tsx ts-node
```

### 3. Install All Dependencies (Including Dev Dependencies)
```bash
cd ~/Relai-Final-Website-Testing
npm install
```

### 4. Create Production Environment File
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

### 5. Create Production PM2 Configuration
```bash
cat > ecosystem.production.cjs << 'EOF'
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

### 6. Start Real Application
```bash
pm2 start ecosystem.production.cjs
pm2 save
```

### 7. Check Status and Logs
```bash
pm2 status
pm2 logs relai-app --lines 20
```

### 8. Test Application
```bash
curl http://localhost:5000/api/properties | head -50
```

### 9. Update Nginx Configuration for Real App
```bash
sudo tee /etc/nginx/sites-available/relai-app > /dev/null << 'EOF'
server {
    listen 80;
    server_name 13.201.223.222;
    
    client_max_body_size 50M;
    
    # Serve property images
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

sudo nginx -t
sudo systemctl reload nginx
```

## Expected Results

After these commands, your application should show:
- Complete React frontend with property search
- MongoDB property database integration
- AI chatbot functionality
- Google Maps integration
- Zoho CRM connectivity
- All your custom features

## Troubleshooting

If TypeScript compilation fails:
```bash
# Install missing type definitions
npm install --save-dev @types/node @types/express

# Try alternative TypeScript execution
pm2 delete relai-app
pm2 start server/index.ts --name relai-app --interpreter ts-node
```