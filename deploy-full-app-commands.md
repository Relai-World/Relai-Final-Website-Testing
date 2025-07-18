# Deploy Full Relai Application from GitHub Repository

## Commands to Run on Server

### 1. Stop Simple Server and Pull Latest Code
```bash
pm2 delete relai-app
cd ~/Relai-Final-Website-Testing
git pull origin main
```

### 2. Install All Dependencies (Including Development)
```bash
npm install
```

### 3. Check Key Files Exist
```bash
ls -la server/index.ts
ls -la client/src/main.tsx
ls -la package.json
```

### 4. Create Production Environment Configuration
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://subscriptions:Subcribe%40Mongodb@cluster0.vynzql2.mongodb.net/Relai?retryWrites=true&w=majority&appName=Cluster0
GOOGLE_MAPS_API_KEY=AIzaSyDKHC_bVedAir1Dl2w2ZV7-B3H5qgVPYng
ZOHO_CLIENT_ID=1000.6RTQRDP88L3F5F9T5TB3H2XRMU9BBE
ZOHO_CLIENT_SECRET=1b0e3f5935abcde6f5b9c1234567890abc123456
ZOHO_REDIRECT_URI=http://13.201.223.222/api/auth/zoho/callback
REPLIT_ENV=false
VITE_API_URL=http://13.201.223.222
EOF
```

### 5. Start Real Application with TypeScript Support
```bash
pm2 start server/index.ts --name relai-app --interpreter tsx
pm2 save
```

### 6. Monitor Application Startup
```bash
pm2 logs relai-app --lines 30
```

### 7. Test Real Application Features
```bash
# Test API endpoints
curl http://localhost:5000/api/properties | head -100
curl http://localhost:5000/api/test

# Check if MongoDB connection works
curl http://localhost:5000/api/health 2>/dev/null || echo "Health endpoint not available"
```

### 8. If TypeScript Issues, Try Alternative Start Method
```bash
# If tsx interpreter fails, try with ts-node
pm2 delete relai-app
pm2 start server/index.ts --name relai-app --interpreter ts-node

# Or compile TypeScript first
npm run build 2>/dev/null || npx tsc server/index.ts --outDir dist --target es2020 --module commonjs
pm2 start dist/index.js --name relai-app
```

### 9. Verify Full Application is Running
```bash
pm2 status
curl -s http://localhost:5000/api/properties | jq '.length' 2>/dev/null || echo "Properties API test"
```

## Expected Result
After these commands, your application should serve:
- Complete React frontend with property search
- MongoDB property database integration
- AI chatbot functionality
- Google Maps integration
- Zoho CRM connectivity
- All advanced features from your repository