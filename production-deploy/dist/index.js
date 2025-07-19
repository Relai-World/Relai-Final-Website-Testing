#!/usr/bin/env node

// Production wrapper that bypasses React preamble issue
import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

console.log('🚀 Starting Relai Real Estate Platform (Production)');
console.log('🔧 Bypassing React preamble detection...');

// Run TypeScript server directly to avoid npm run dev React plugin issues
const serverProcess = spawn('npx', [
  'tsx',
  '--no-warnings',
  'server/index.ts'
], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development', // Still use dev mode but bypass npm run dev
    NODE_OPTIONS: '--no-warnings',
    TSX_TSCONFIG_PATH: 'tsconfig.json',
    FORCE_COLOR: '1'
  }
});

serverProcess.on('close', (code) => process.exit(code));
serverProcess.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => serverProcess.kill('SIGTERM'));
process.on('SIGINT', () => serverProcess.kill('SIGINT'));