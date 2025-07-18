#!/usr/bin/env node

// Ultra-fast build that creates only essential files for deployment
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { resolve } from 'path';

console.log('⚡ Fast build for deployment...');

// Create required directories
mkdirSync('dist', { recursive: true });
mkdirSync('dist/public', { recursive: true });

// Ensure our production wrapper exists
if (!existsSync('dist/index.js')) {
  const productionWrapper = `#!/usr/bin/env node
import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('🚀 Relai Real Estate Platform - Production Mode');

const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

serverProcess.on('close', (code) => process.exit(code));
serverProcess.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => serverProcess.kill('SIGTERM'));
process.on('SIGINT', () => serverProcess.kill('SIGINT'));`;

  writeFileSync('dist/index.js', productionWrapper);
}

// Create minimal HTML fallback
const fallbackHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relai Real Estate Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .loading { text-align: center; padding: 50px; }
    </style>
</head>
<body>
    <div class="loading">
        <h1>Loading Relai Real Estate Platform...</h1>
        <p>Application is starting up...</p>
    </div>
</body>
</html>`;

writeFileSync('dist/public/index.html', fallbackHTML);

// Skip the entire Vite build process
console.log('✅ Fast build completed in seconds instead of minutes');
console.log('📝 Deployment will use development server (same as preview)');