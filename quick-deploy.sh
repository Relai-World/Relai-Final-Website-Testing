#!/bin/bash

echo "🚀 Quick deployment without slow build process..."

# Ensure production wrapper exists
if [ ! -f "dist/index.js" ]; then
    echo "Creating production wrapper..."
    node fast-build.js
fi

# Start production server directly
echo "✅ Starting production server (bypasses 30+ minute build)..."
NODE_ENV=production node dist/index.js