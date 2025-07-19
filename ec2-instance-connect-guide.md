# EC2 Instance Connect Solution

## Use EC2 Instance Connect (Browser-based SSH)

Since Session Manager isn't available, use EC2 Instance Connect from your first screenshot:

### Step 1: Connect via Browser
1. In AWS Console, go back to **EC2 Instance Connect** tab
2. Keep username as: `ubuntu`
3. Click the **orange "Connect" button**
4. This opens a browser-based terminal

### Step 2: Deploy Relai Commands
Once connected, run these commands:

```bash
# Check system and install Node.js
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs npm unzip wget

# Download Relai code
cd ~
wget https://github.com/Relai-World/Relai-Final-Website-Testing/archive/main.zip
unzip main.zip
cd Relai-Final-Website-Testing-main

# Create environment file
cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://subscriptions:Subcribe%40Mongodb@cluster0.vynzql2.mongodb.net/Relai?retryWrites=true&w=majority&appName=Cluster0
PORT=5000
NODE_ENV=production
EOF

# Install and build
npm install
npm run build

# Start server
node production-server.js
```

### Step 3: Test Access
After server starts, visit: http://13.201.223.222:5000/

## Why This Works
- EC2 Instance Connect uses AWS's infrastructure
- No SSH keys or network configuration needed
- Built into AWS Console
- More reliable than external SSH clients

The first screenshot shows this option is available and should work immediately.