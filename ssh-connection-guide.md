# SSH Connection Guide for Windows

## Issue
You're getting "No such file or directory" for the PEM key file.

## Solutions

### Option 1: Locate Your PEM Key File
```cmd
# In Windows Command Prompt, find your PEM key:
dir /s *.pem

# Or search in common locations:
dir "C:\Users\DELL\Downloads\*.pem"
dir "C:\Users\DELL\Desktop\*.pem"
dir "C:\Users\DELL\Documents\*.pem"
```

### Option 2: Use Full Path to PEM Key
```cmd
# Use the full path (replace with your actual path):
ssh -i "C:\Users\DELL\Downloads\my-pem-key.pem" ubuntu@13.201.223.222
```

### Option 3: Navigate to Key Directory First
```cmd
# Change to the directory containing your PEM key:
cd C:\Users\DELL\Downloads
ssh -i my-pem-key.pem ubuntu@13.201.223.222
```

### Option 4: Use PowerShell Instead
```powershell
# Open PowerShell and use:
ssh -i ".\my-pem-key.pem" ubuntu@13.201.223.222
```

### Option 5: Alternative SSH Methods
```cmd
# If you have password authentication enabled:
ssh ubuntu@13.201.223.222

# Or use PuTTY if you prefer a GUI tool
```

## After Successful SSH Connection

Once connected, run these deployment commands:

```bash
# Check Node.js
node --version

# Download Relai code
wget https://github.com/Relai-World/Relai-Final-Website-Testing/archive/main.zip
unzip main.zip
cd Relai-Final-Website-Testing-main

# Install and build
npm install
npm run build

# Start production server
node production-server.js
```

## Common PEM Key Issues

1. **Wrong file extension**: Make sure it's `.pem` not `.ppk`
2. **Wrong permissions**: In PowerShell run: `icacls my-pem-key.pem /inheritance:r /grant:r "%username%:R"`
3. **Wrong location**: Check Downloads, Desktop, Documents folders
4. **File renamed**: AWS downloads keys with specific names like `MyKeyPair.pem`

Try finding your PEM key file first, then establish the SSH connection.