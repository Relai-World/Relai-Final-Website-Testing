# Relai Production Deployment

This folder contains everything needed to deploy Relai to your external server.

## Quick Start

1. Copy this entire `production-deploy` folder to your server (13.201.223.222)
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Access your app at: http://13.201.223.222:5000/

## What's Included

- `dist/public/` - Built frontend assets (HTML, CSS, JS)
- `server/` - Backend API routes and database connections
- `shared/` - Shared schemas and types
- `public/` - Static assets (property images, etc.)
- `start-production.js` - Production server script
- `package.json` - Production dependencies

## Environment Variables

Make sure your `.env` file contains:
- `MONGODB_URI` - Your MongoDB connection string
- `MAPS_API_KEY` - Google Maps API key
- Any other required API keys

## Differences from Replit

- **Replit**: Development mode with live reloading
- **Production**: Optimized static files for better performance

## Troubleshooting

If the external IP still shows a blank page:
1. Check that all files copied correctly
2. Verify MongoDB connection in logs
3. Ensure port 5000 is open and not blocked by firewall
4. Check that `dist/public/index.html` exists and is readable