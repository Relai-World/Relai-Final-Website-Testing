# AWS Session Manager Connection Guide

## Bypass SSH Issues with Session Manager

Since SSH is hanging, use AWS Systems Manager Session Manager instead:

### Step 1: Access Session Manager
1. Go to your AWS Console
2. Navigate to **Systems Manager** service
3. Click **Session Manager** in the left menu
4. Click **Start session**

### Step 2: Connect to Instance
1. Select your instance: `i-018d44dba9dd00241` (relai-real-estate-app)
2. Click **Start session**
3. This opens a browser-based terminal directly to your server

### Step 3: Deploy Relai (run these commands in the Session Manager terminal)
```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install required tools
sudo apt-get update
sudo apt-get install -y unzip wget

# Download Relai code
cd /home/ubuntu
wget https://github.com/Relai-World/Relai-Final-Website-Testing/archive/main.zip
unzip main.zip
cd Relai-Final-Website-Testing-main

# Create environment file
sudo tee .env << EOF
MONGODB_URI=mongodb+srv://subscriptions:Subcribe%40Mongodb@cluster0.vynzql2.mongodb.net/Relai?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
NODE_ENV=production
EOF

# Install dependencies and build
npm install
npm run build

# Start production server
node production-server.js
```

### Step 4: Test Access
After the server starts, visit: http://13.201.223.222:5000/

## Why This Works
- Session Manager uses AWS's internal network
- Bypasses SSH, firewall, and network connectivity issues
- More reliable than direct SSH connection
- Built into AWS Console - no additional tools needed

This should resolve all connection issues and get your Relai application running on the external IP address.