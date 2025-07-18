#!/usr/bin/env node

// Analyze what's causing the Vite build to hang
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔍 Analyzing build issues...');

function analyzeDirectory(dir, depth = 0) {
  if (depth > 3) return;
  
  const files = readdirSync(dir);
  let totalSize = 0;
  let fileCount = 0;
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stats = statSync(filePath);
    
    if (stats.isDirectory() && !file.includes('node_modules')) {
      analyzeDirectory(filePath, depth + 1);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      totalSize += stats.size;
      fileCount++;
      
      if (stats.size > 50000) {
        console.log(`📁 Large file: ${filePath} (${Math.round(stats.size/1024)}KB)`);
      }
    }
  });
  
  if (fileCount > 0) {
    console.log(`📊 ${dir}: ${fileCount} files, ${Math.round(totalSize/1024)}KB total`);
  }
}

// Check for circular dependencies and imports
function checkImports() {
  console.log('\n🔄 Checking for complex imports...');
  
  const files = readdirSync('client/src/pages');
  files.forEach(file => {
    if (file.endsWith('.tsx')) {
      const content = readFileSync(join('client/src/pages', file), 'utf8');
      const imports = content.match(/import.*from.*/g) || [];
      
      if (imports.length > 20) {
        console.log(`📦 Heavy imports in ${file}: ${imports.length} imports`);
      }
    }
  });
}

analyzeDirectory('client/src');
checkImports();

console.log('\n✅ Analysis complete');