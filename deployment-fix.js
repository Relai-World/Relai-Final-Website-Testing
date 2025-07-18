#!/usr/bin/env node

// Deployment fix for React preamble error
import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '.');

console.log('🚀 Starting Relai Real Estate Platform (Deployment Fix)');
console.log('🔧 Applying React preamble error fix...');

// Set environment variables to fix React plugin issues
process.env.DISABLE_REACT_REFRESH = 'true';
process.env.VITE_CJS_IGNORE_WARNING = 'true';

// Start the application with the development server
// This works around the React preamble issue
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    // Disable React Fast Refresh to avoid preamble errors
    VITE_REACT_FAST_REFRESH: 'false',
    // Force the server to run on the correct port
    PORT: process.env.PORT || '5000'
  },
  shell: true
});

serverProcess.on('close', (code) => process.exit(code));
serverProcess.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => serverProcess.kill('SIGTERM'));
process.on('SIGINT', () => serverProcess.kill('SIGINT'));