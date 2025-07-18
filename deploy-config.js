#!/usr/bin/env node

// Alternative deployment configuration that bypasses slow build
import { writeFileSync, existsSync } from 'fs';

console.log('🔧 Setting up fast deployment configuration...');

// Create a package.json override for deployment (temporary)
const fastPackage = {
  scripts: {
    "build": "node fast-build.js",
    "start": "NODE_ENV=production node dist/index.js"
  }
};

// This approach allows us to override the build command without editing package.json
const deployScript = `#!/bin/bash
echo "🚀 Starting fast deployment process..."
node fast-build.js
echo "✅ Build complete - starting production server..."
NODE_ENV=production node dist/index.js
`;

writeFileSync('deploy.sh', deployScript);

console.log('✅ Fast deployment configuration ready');
console.log('💡 Alternative: Use deploy.sh instead of npm run build + npm run start');