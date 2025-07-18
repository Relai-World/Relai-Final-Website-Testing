import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import type { CorsOptionsDelegate, CorsRequest } from 'cors';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import zohoRoutes from "./routes/zoho-routes";
import zohoTokenRoutes from "./routes/zoho-token-routes";
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from "./db";
import { 
  createRateLimit, 
  validateUserAgent, 
  analyzeRequestPattern, 
  addRandomDelay, 
  validateRequest, 
  honeypot 
} from "./antiScraping";

// Fix for __dirname in ES modules with fallback
let __dirname: string;
try {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (error) {
  console.warn('⚠️ Could not resolve __dirname, using process.cwd() as fallback');
  __dirname = process.cwd();
}

// Try to load .env file with multiple fallback locations
const possibleEnvPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env')
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded env:', envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️ No .env file found in any of the expected locations');
  console.warn('⚠️ Expected locations:', possibleEnvPaths);
  // Still try to load from environment variables
  dotenv.config();
}

const app = express();

// CORS middleware to allow cross-origin requests for Replit and development
app.use(cors({
  origin: true, // Allow all origins for Replit environment
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control'],
  optionsSuccessStatus: 200
}));

// Additional CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Redirect www.relai.world to relai.world
app.use((req, res, next) => {
  const host = req.get('host');
  if (host && host.startsWith('www.')) {
    const newHost = host.slice(4); // Remove 'www.'
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const redirectUrl = `${protocol}://${newHost}${req.originalUrl}`;
    return res.redirect(301, redirectUrl);
  }
  next();
});

// Anti-scraping middleware (apply before other middleware) - gentle protection
// Temporarily disabled for Replit environment testing
// app.use(validateUserAgent); // Only blocks obvious scraping tools
app.use(createRateLimit(15 * 60 * 1000, 10000)); // 10000 requests per 15 minutes (very permissive for Replit)

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize MongoDB connection
    console.log('🔄 Initializing MongoDB connection...');
    await initializeDatabase();
    console.log('✅ MongoDB connected successfully!');

    const server = await registerRoutes(app);
    
    // Add Zoho routes
    app.use('/api/zoho', zohoRoutes);
    app.use('/api/zoho-tokens', zohoTokenRoutes);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    
    // Force development mode for ALL Replit environments to ensure proper routing
    // UNLESS explicitly set to production with FORCE_PRODUCTION flag
    const isReplit = process.env.REPLIT_DB_URL || process.env.REPL_ID || process.env.REPL_SLUG || 
                     process.env.REPLIT_ENVIRONMENT || process.env.REPL_OWNER;
    const forceProduction = process.env.FORCE_PRODUCTION === 'true';
    const forceDevMode = isReplit && !forceProduction; // Force dev mode for Replit unless production is forced
    const isDevelopment = process.env.NODE_ENV === "development" || (forceDevMode && !forceProduction);
    
    if (isDevelopment) {
      console.log("🚀 Running in Vite development mode");
      await setupVite(app, server);
    } else {
      console.log("🚀 Running in production mode with static files");
      serveStatic(app);
    }

    // Use port from environment or default to 5000
    // Listen on both ports for external routing compatibility
    const port = process.env.PORT || 5000;
    
    // Handle port conflicts by trying multiple times
    let retryCount = 0;
    const maxRetries = 3;
    
    const startServer = () => {
        server.listen(port, "0.0.0.0", () => {
        console.log(`🚀 Server is running on port ${port}`);
        console.log("📊 Database: MongoDB (Relai)");
        console.log("🌐 Environment:", app.get("env"));
        console.log("🔗 External URL: Available for deployment");
        console.log("🛠️  Deployment mode:", forceDevMode ? "Replit (forced development)" : "Standard");
        console.log("🔧 Environment detected:", process.env.REPLIT_ENVIRONMENT || "development");
        console.log("🔧 Port routing fix applied for external deployment");
      }).on('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && retryCount < maxRetries) {
          console.log(`⚠️ Port ${port} is busy, retrying in 2 seconds... (${retryCount + 1}/${maxRetries})`);
          retryCount++;
          setTimeout(() => {
            startServer();
          }, 2000);
        } else if (err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${port} is already in use after ${maxRetries} attempts`);
          console.error('❌ Killing any existing processes and retrying...');
          // Kill any existing processes on the port and retry
          setTimeout(() => {
            process.exit(1);
          }, 1000);
        } else {
          console.error('❌ Server error:', err);
          process.exit(1);
        }
      });
    };
    
    startServer();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🔄 Shutting down server gracefully...');
      await closeDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🔄 Shutting down server gracefully...');
      await closeDatabase();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();

