import axios from 'axios';

// Verify client configuration
const CLIENT_ID = '1000.PWQRC6J77UOEGT4UTIVYH9SD4IPGHD';
const CLIENT_SECRET = '59c31f9d46098613280597a8d3c6232d3c1a9e6a40';

console.log('🔍 Verifying Zoho client configuration...');
console.log('Client ID:', CLIENT_ID);
console.log('Client Secret:', CLIENT_SECRET.substring(0, 10) + '...');

// Try to get a new authorization URL to verify the client exists
const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=https://relai.world/auth/zoho/callback`;

console.log('\n📋 Authorization URL:');
console.log(authUrl);

console.log('\n💡 Troubleshooting steps:');
console.log('1. Check if the Client ID matches exactly in your Zoho Console');
console.log('2. Verify the Client Secret is correct');
console.log('3. Ensure the redirect URI "https://relai.world/auth/zoho/callback" is registered in your Zoho app');
console.log('4. Make sure the authorization code was generated with the same Client ID');
console.log('5. Verify the authorization code hasn\'t expired (they expire in 10 minutes)');

// Try with a simple client credentials check (won't work for CRM but will verify client exists)
async function verifyClientExists() {
  try {
    console.log('\n🔄 Testing client credentials...');
    
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'ZohoCRM.modules.READ'
      }
    });
    
    console.log('✅ Client credentials are valid!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Client verification failed:');
    if (error.response?.data) {
      console.log('Error:', error.response.data);
      
      if (error.response.data.error === 'invalid_client') {
        console.log('\n🚨 INVALID CLIENT ERROR - This means:');
        console.log('- The Client ID or Client Secret is incorrect');
        console.log('- The app may not be configured for server-side authentication');
        console.log('- Double-check your Zoho Console settings');
      }
    } else {
      console.log('Error:', error.message);
    }
  }
}

await verifyClientExists();