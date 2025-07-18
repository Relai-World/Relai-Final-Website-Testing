#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, copyFileSync, existsSync, readFileSync } from 'fs';
import path from 'path';

console.log('🚀 Building production version without Vite issues...');

try {
  // 1. Clean directories
  console.log('📁 Cleaning directories...');
  execSync('rm -rf dist', { stdio: 'inherit' });
  mkdirSync('dist', { recursive: true });
  mkdirSync('dist/client', { recursive: true });
  
  // 2. Build React app with esbuild (no Vite, no preamble issues)
  console.log('⚡ Building React app with esbuild...');
  
  // First, create a simple entry point that doesn't need Vite transforms
  const entryContent = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './client/src/App';
import './client/src/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
`;
  
  writeFileSync('dist/entry.jsx', entryContent);
  
  // Build with esbuild
  execSync(`npx esbuild dist/entry.jsx --bundle --minify --format=esm --platform=browser --target=es2020 --jsx=automatic --loader:.css=css --outfile=dist/client/bundle.js`, { 
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: '.' }
  });
  
  // 3. Create production HTML
  const productionHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Relai Real Estate Platform</title>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body { margin: 0; font-family: 'Manrope', sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/bundle.js"></script>
  </body>
</html>`;
  
  writeFileSync('dist/client/index.html', productionHtml);
  
  // 4. Create production server wrapper
  const serverWrapper = `#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('🚀 Starting Relai Real Estate Platform (Production - No Vite)');

// Use the production server that serves static files
const serverProcess = spawn('npx', ['tsx', 'server/production.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

serverProcess.on('close', (code) => process.exit(code));
serverProcess.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => serverProcess.kill('SIGTERM'));
process.on('SIGINT', () => serverProcess.kill('SIGINT'));`;

  writeFileSync('dist/index.js', serverWrapper);
  
  console.log('✅ Production build completed successfully!');
  console.log('📦 Build output in dist/ directory');
  console.log('🎯 No Vite, no React preamble issues!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}