# Complete Server Setup Commands

Run these commands one by one on your server (13.201.223.222):

## 1. First, clean up any incomplete files:
```bash
rm -f start-production.js
```

## 2. Download the GitHub repository:
```bash
wget https://github.com/Relai-World/Relai-Final-Website-Testing/archive/main.zip
unzip main.zip
cd Relai-Final-Website-Testing-main
```

## 3. Install Node.js if needed:
```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js 18:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 4. Install dependencies and build:
```bash
npm install
npm run build
```

## 5. Create the production server script:
```bash
cat > start-production.js << 'EOF'
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Serve built static files
const distPath = path.join(__dirname, 'dist', 'public');
app.use(express.static(distPath));

// Serve property images
const publicPath = path.join(__dirname, 'public');
app.use('/property_images', express.static(path.join(publicPath, 'property_images')));

// Import routes dynamically
const loadRoutes = async () => {
  try {
    const { registerRoutes } = await import('./server/routes.js');
    const { initializeDatabase } = await import('./server/db.js');
    
    console.log('🔄 Initializing MongoDB connection...');
    await initializeDatabase();
    console.log('✅ MongoDB connected successfully!');
    
    const server = await registerRoutes(app);
    
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    const port = 5000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Production server running on port ${port}`);
      console.log('🔗 External access: http://13.201.223.222:5000/');
      console.log('📁 Serving from:', distPath);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
};

loadRoutes();
EOF
```

## 6. Start the production server:
```bash
node start-production.js
```

## 7. If you want to run it in background:
```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start start-production.js --name relai-app

# Save configuration
pm2 save
pm2 startup
```