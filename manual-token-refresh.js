import axios from 'axios';

// Manual token refresh helper
const CLIENT_ID = '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
const CLIENT_SECRET = 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec';

console.log('🔄 Manual Token Refresh Helper');
console.log('===============================');

// Function to generate new tokens
async function generateNewTokens() {
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=https://relai.world/auth/zoho/callback`;
  
  console.log('1. Visit this URL to get a new authorization code:');
  console.log(authUrl);
  console.log('\n2. After authorization, get the code from the redirect URL');
  console.log('3. Then run: node manual-token-refresh.js YOUR_CODE_HERE');
  
  const authCode = process.argv[2];
  
  if (!authCode) {
    console.log('\nNo authorization code provided. Please follow the steps above.');
    return;
  }
  
  try {
    console.log('\n🔄 Exchanging authorization code for tokens...');
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', CLIENT_ID);
    formData.append('client_secret', CLIENT_SECRET);
    formData.append('redirect_uri', 'https://relai.world/auth/zoho/callback');
    formData.append('code', authCode);
    
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });
    
    if (response.data.access_token) {
      console.log('✅ Success! New tokens generated:');
      console.log('Access Token:', response.data.access_token);
      console.log('Refresh Token:', response.data.refresh_token);
      console.log('Expires In:', response.data.expires_in, 'seconds');
      
      // Update the server with new tokens
      try {
        const updateResponse = await axios.post('http://localhost:5000/api/zoho/tokens/update', {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token
        });
        
        console.log('\n✅ Server tokens updated successfully!');
        console.log('Zoho CRM integration is now active.');
      } catch (updateError) {
        console.log('\n⚠️ Could not update server tokens automatically.');
        console.log('Please update manually or restart the server.');
      }
      
    } else {
      console.log('❌ Failed to get tokens:', response.data);
    }
    
  } catch (error) {
    console.log('❌ Token exchange failed:', error.response?.data || error.message);
  }
}

// Function to check current token status
async function checkTokenStatus() {
  try {
    const response = await axios.get('http://localhost:5000/api/zoho/tokens/status');
    console.log('Current token status:', response.data);
  } catch (error) {
    console.log('Could not check token status:', error.message);
  }
}

// Run the appropriate function
if (process.argv.includes('--status')) {
  checkTokenStatus();
} else {
  generateNewTokens();
}