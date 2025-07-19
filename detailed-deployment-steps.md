# Detailed Deployment Steps for External Server

## Step 1: Connect to Your Server
```bash
ssh ubuntu@13.201.223.222
```

## Step 2: Install Prerequisites (if not already installed)

### Check if Node.js is installed:
```bash
node --version
npm --version
```

### If Node.js is not installed or version is below 16:
```bash
# Install Node.js 18 (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Install other required tools:
```bash
# Install unzip if not present
sudo apt-get update
sudo apt-get install -y unzip wget
```

## Step 3: Download the Relai Codebase
```bash
# Go to home directory
cd ~

# Remove any existing files
rm -rf Relai-Final-Website-Testing-main*
rm -f main.zip

# Download the latest code from GitHub
wget https://github.com/Relai-World/Relai-Final-Website-Testing/archive/main.zip

# Extract the archive
unzip main.zip

# Navigate to the project directory
cd Relai-Final-Website-Testing-main

# Verify you're in the right directory
ls -la
```

## Step 4: Set Up Environment Variables
```bash
# Create .env file with your configuration
cat > .env << 'EOF'
# MongoDB Configuration
MONGODB_URI=mongodb+srv://subscriptions:Subcribe%40Mongodb@cluster0.vynzql2.mongodb.net/Relai?retryWrites=true&w=majority&appName=Cluster0

# Google Maps API Key (replace with your actual key)
MAPS_API_KEY=your_google_maps_api_key_here

# Server Configuration
PORT=5000
NODE_ENV=production

# Other API Keys (add as needed)
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_API_KEY=your_n8n_api_key
EOF

# Important: Edit the .env file to add your actual API keys
nano .env
```

## Step 5: Install Dependencies
```bash
# Install all npm packages
npm install

# This may take a few minutes - wait for completion
```

## Step 6: Build the Production Application
```bash
# Build the frontend for production
npm run build

# Verify the build was successful
ls -la dist/public/
```

## Step 7: Test the Production Server
```bash
# Start the production server
node production-server.js
```

You should see output like:
```
🔄 Initializing MongoDB connection for production...
✅ MongoDB connected successfully!
🚀 Production server running on port 5000
📊 Database: MongoDB (Relai)
🌐 Environment: production
🔗 External access ready
```

## Step 8: Test Your Deployment

### Open a new terminal and test:
```bash
# Test the main page
curl -I http://13.201.223.222:5000/

# Test an API endpoint
curl http://13.201.223.222:5000/api/all-properties | head -c 200
```

### Test in browser:
- Visit: http://13.201.223.222:5000/
- You should see the full Relai website

## Step 9: Run in Background (Optional)

### Option A: Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start production-server.js --name relai-app

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above

# View logs
pm2 logs relai-app

# Check status
pm2 status
```

### Option B: Using nohup
```bash
# Run in background with nohup
nohup node production-server.js > relai.log 2>&1 &

# Check if it's running
ps aux | grep node

# View logs
tail -f relai.log
```

## Step 10: Verify Everything Works

### Test these URLs in your browser:
1. **Main website**: http://13.201.223.222:5000/
2. **All properties**: http://13.201.223.222:5000/all-properties
3. **API endpoint**: http://13.201.223.222:5000/api/all-properties
4. **Property images**: http://13.201.223.222:5000/property_images/

### Expected results:
- Main website should load with the Relai homepage
- All properties page should show property listings
- API should return JSON data
- Property images should display correctly

## Troubleshooting

### If the server doesn't start:
```bash
# Check the logs
cat relai.log

# Check if port 5000 is in use
sudo netstat -tulpn | grep :5000

# Kill any existing processes
sudo pkill -f "node.*production-server"
```

### If MongoDB connection fails:
- Verify your MONGODB_URI in the .env file
- Check if your IP is whitelisted in MongoDB Atlas

### If API endpoints return errors:
- Check the server logs for detailed error messages
- Verify all environment variables are set correctly

## Success Indicators

When everything is working correctly, you should see:
- ✅ Server starts without errors
- ✅ MongoDB connects successfully  
- ✅ Website loads at http://13.201.223.222:5000/
- ✅ Property data displays correctly
- ✅ All navigation works properly

The external IP should now serve the same Relai website as your Replit URL, but optimized for production.