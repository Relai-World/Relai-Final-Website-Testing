# Fix PM2 Configuration and Start Application

## Run These Commands on Your Server

### 1. Create Correct PM2 Configuration
```bash
cd ~/Relai-Final-Website-Testing
rm -f ecosystem.config.js

cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'relai-app',
    script: './start-production.js',
    interpreter: 'node',
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

### 2. Check if start-production.js exists
```bash
ls -la start-production.js
```

### 3. If it doesn't exist, create it:
```bash
cat > start-production.js << 'EOF'
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: ['http://13.201.223.222', 'http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'client/public')));
app.use('/property_images', express.static(path.join(__dirname, 'public/property_images')));

// Simple API test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date() });
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client/index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>Relai Real Estate Platform</h1><p>Application is starting...</p>');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Application URL: http://13.201.223.222`);
});
EOF
```

### 4. Start with PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### 5. Check Status
```bash
pm2 status
pm2 logs relai-app --lines 10
```

### 6. Test Application
```bash
curl http://localhost:5000/api/test
```

## Alternative: Start Directly with PM2

If the config file still has issues, start directly:

```bash
pm2 delete relai-app
pm2 start start-production.js --name relai-app
pm2 save
```

## Expected Output

After running these commands, you should see:
- PM2 status shows "online"
- Logs show "Server running on port 5000"
- curl test returns JSON response
- Application accessible at http://13.201.223.222