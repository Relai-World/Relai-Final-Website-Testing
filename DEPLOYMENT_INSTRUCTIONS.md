# Relai Production Deployment Instructions

## Problem
- Replit URL works: https://5a1166e1-27ed-4032-bed5-a782bf4efd64-00-3szgwrqonspor.sisko.replit.dev:5000/
- External IP shows blank page: http://13.201.223.222:5000/

## Solution
The external server needs to serve the built static files instead of trying to run in development mode.

## Step-by-Step Deployment

### 1. Prepare Production Build
```bash
# Build the application (already done)
npm run build
```

### 2. Copy Production Files to External Server
Copy these files/folders to your external server (13.201.223.222):

- `dist/public/` (built frontend assets)
- `server/` (backend API routes)
- `shared/` (shared schemas)
- `public/` (static assets like property images)
- `.env` (environment variables)
- `package.json` (dependencies)

### 3. Create Production Server Script
On your external server, create `start-production.js`:

```javascript
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerRoutes } from './server/routes.js';
import { initializeDatabase, closeDatabase } from './server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
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

(async () => {
  try {
    console.log('🔄 Initializing MongoDB connection...');
    await initializeDatabase();
    console.log('✅ MongoDB connected successfully!');

    // Register API routes
    const server = await registerRoutes(app);

    // Serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });

    const port = process.env.PORT || 5000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Production server running on port ${port}`);
      console.log('📊 Database: MongoDB (Relai)');
      console.log('🌐 Environment: production');
      console.log('🔗 External access ready at http://13.201.223.222:5000/');
    });

  } catch (error) {
    console.error('❌ Failed to start production server:', error);
    process.exit(1);
  }
})();
```

### 4. Install Dependencies and Start
```bash
npm install
node start-production.js
```

## Alternative: Use PM2 for Process Management
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start start-production.js --name relai-app

# Save PM2 configuration
pm2 save
pm2 startup
```

## Key Differences from Replit
1. **Replit**: Runs in development mode with Vite serving live files
2. **Production**: Serves pre-built static files for faster loading

## Files Already Built and Ready
- ✅ `dist/public/` contains all built frontend assets
- ✅ `dist/public/index.html` is the main entry point
- ✅ All JavaScript and CSS files are bundled and optimized
- ✅ Property images are available in `public/property_images/`

## Verification
After deployment, test these URLs:
- http://13.201.223.222:5000/ (main website)
- http://13.201.223.222:5000/api/all-properties (API endpoint)
- http://13.201.223.222:5000/property_images/ (property images)

The external IP should now show the same content as the Replit URL.