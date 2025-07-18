#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';

console.log('🚀 Starting production build process...');

try {
  // 1. Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // 2. Build client with Vite
  console.log('📦 Building client with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // 3. Create production server wrapper that serves static files
  console.log('⚙️ Creating production server wrapper...');
  const productionWrapper = `#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('🚀 Starting Relai Real Estate Platform (Production Mode)');
console.log('📁 Serving pre-built static files');

// Run the server in production mode with static file serving
const serverProcess = spawn('node', [
  '--loader',
  'tsx',
  'server/index.ts'
], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production', // Force production mode to serve static files
    PORT: process.env.PORT || '5000'
  }
});

serverProcess.on('close', (code) => process.exit(code));
serverProcess.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => serverProcess.kill('SIGTERM'));
process.on('SIGINT', () => serverProcess.kill('SIGINT'));
`;

  writeFileSync('dist/index.js', productionWrapper);
  
  // 4. Create a modified server configuration for production
  console.log('🔧 Configuring production server...');
  const serverConfig = `#!/usr/bin/env node

// Production server configuration
import { existsSync } from 'fs';
import path from 'path';

// Override Replit detection for production deployment
process.env.NODE_ENV = 'production';
process.env.FORCE_PRODUCTION = 'true';

// Start the server
import('./server/index.js');
`;

  writeFileSync('dist/server.js', serverConfig);
  
  console.log('✅ Production build completed successfully!');
  console.log('📊 Build output:');
  execSync('ls -la dist/', { stdio: 'inherit' });
  
  if (existsSync('dist/public')) {
    console.log('📊 Static files:');
    execSync('ls -la dist/public/', { stdio: 'inherit' });
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}