# Fix 504 Gateway Timeout Issue

## The Problem
The browser shows "Error occurred while trying to proxy: 13.201.223.222:5000" and 504 Gateway Timeout. This means:
1. Nginx is running and configured correctly
2. But the application on port 5000 is not responding or is crashing

## Commands to Run on Server

### 1. Check Application Status
```bash
pm2 status
pm2 logs relai-app --lines 30
```

### 2. Check What's Actually Running on Port 5000
```bash
sudo netstat -tlnp | grep :5000
ps aux | grep node
```

### 3. If Application is Crashed, Restart It
```bash
pm2 restart relai-app
pm2 logs relai-app --lines 10
```

### 4. If Still Not Working, Start with Simple Server
```bash
pm2 delete relai-app

# Create a simple working server
cat > simple-server.mjs << 'EOF'
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static('client/public'));

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() });
});

app.get('*', (req, res) => {
  res.send(`
    <html>
      <head><title>Relai Real Estate Platform</title></head>
      <body>
        <h1>Relai Real Estate Platform</h1>
        <p>Application is running successfully!</p>
        <p>API Test: <a href="/api/test">/api/test</a></p>
      </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

pm2 start simple-server.mjs --name relai-app
pm2 save
```

### 5. Test the Fixed Application
```bash
curl http://localhost:5000/api/test
```

### 6. If Simple Server Works, Then Install Dependencies for Real App
```bash
npm install --production
pm2 delete relai-app
pm2 start server/index.ts --name relai-app --interpreter tsx
```

## Expected Fix
After running these commands, the 504 timeout should be resolved and your application should be accessible.