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

// CORS configuration for production
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

// Serve public assets (property images)
const publicPath = path.join(__dirname, 'public');
app.use('/property_images', express.static(path.join(publicPath, 'property_images')));

(async () => {
  try {
    console.log('🔄 Initializing MongoDB connection for production...');
    await initializeDatabase();
    console.log('✅ MongoDB connected successfully!');

    // Register API routes
    const server = await registerRoutes(app);

    // Serve index.html for all non-API routes (SPA fallback)
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
      console.log('📁 Serving from:', distPath);
      console.log('🔗 External access ready');
      console.log('🌍 Access via: http://13.201.223.222:5000/');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🔄 Shutting down production server...');
      await closeDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🔄 Shutting down production server...');
      await closeDatabase();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start production server:', error);
    process.exit(1);
  }
})();
