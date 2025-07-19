# Upload PEM Key to Replit

If you want to SSH from Replit workspace:

1. Find your PEM key file on your local Windows computer
2. In Replit, click "Upload file" or drag and drop your PEM key
3. Set proper permissions: `chmod 600 your-key.pem`
4. Then SSH: `ssh -i your-key.pem ubuntu@13.201.223.222`

However, it's more secure to SSH from your local machine.