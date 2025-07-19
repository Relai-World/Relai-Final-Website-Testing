import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes';
import { initializeDatabase } from './db';
import cors from 'cors';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

// Serve client files directly without Vite
const clientPath = path.resolve(__dirname, '../client');
const publicPath = path.resolve(__dirname, '../public');

// Serve static files
app.use(express.static(publicPath));
app.use('/src', express.static(path.join(clientPath, 'src')));
app.use('/assets', express.static(path.resolve(__dirname, '../attached_assets')));

// Start server
(async () => {
  try {
    console.log('🔄 Initializing MongoDB connection...');
    await initializeDatabase();
    console.log('✅ MongoDB connected successfully!');

    const server = await registerRoutes(app);

    // Serve index.html for all non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientPath, 'index.html'));
      }
    });

    const port = process.env.PORT || 5000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Production server running on port ${port}`);
      console.log('📊 Database: MongoDB');
      console.log('🌐 Environment: production (no Vite)');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();