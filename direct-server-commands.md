# Direct Server Deployment Commands

Since you're already on the server (13.201.223.222), run these commands directly:

## Step 1: Check Prerequisites
```bash
# Check Node.js version
node --version
npm --version

# Check current directory
pwd
ls -la
```

## Step 2: Install Node.js if needed
```bash
# If Node.js not installed or version below 16:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required tools
sudo apt-get update
sudo apt-get install -y unzip wget
```

## Step 3: Download and Setup Relai
```bash
# Clean any existing files
rm -rf Relai-Final-Website-Testing-main* main.zip

# Download from GitHub
wget https://github.com/Relai-World/Relai-Final-Website-Testing/archive/main.zip

# Extract
unzip main.zip
cd Relai-Final-Website-Testing-main

# Verify files
ls -la
```

## Step 4: Configure Environment
```bash
# Create .env file
cat > .env << 'ENVEOF'
MONGODB_URI=mongodb+srv://subscriptions:Subcribe%40Mongodb@cluster0.vynzql2.mongodb.net/Relai?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
NODE_ENV=production
MAPS_API_KEY=AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ENVEOF
```

## Step 5: Install and Build
```bash
# Install dependencies
npm install

# Build production files
npm run build
```

## Step 6: Start Server
```bash
# Start the production server
node production-server.js
```

Run these commands one by one and let me know the output at each step.