import axios from 'axios';

const CLIENT_ID = '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
const CLIENT_SECRET = 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec';
const AUTH_CODE = '1000.76b84236105392943ff8b337f7f620f5.2b631a6f175732df75134114a4e54b61';

console.log('Testing Zoho token exchange with exact parameters...');

// Test with form-encoded data
const formData = new URLSearchParams();
formData.append('grant_type', 'authorization_code');
formData.append('client_id', CLIENT_ID);
formData.append('client_secret', CLIENT_SECRET);
formData.append('redirect_uri', 'https://relai.world/auth/zoho/callback');
formData.append('code', AUTH_CODE);

try {
  const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  });
  
  console.log('✅ SUCCESS!');
  console.log('Full response:', JSON.stringify(response.data, null, 2));
  
  if (response.data.access_token) {
    console.log('\n=== TOKENS RECEIVED ===');
    console.log('Access Token:', response.data.access_token);
    console.log('Refresh Token:', response.data.refresh_token);
    console.log('Expires In:', response.data.expires_in);
    
    console.log('\n=== SAVE THESE CREDENTIALS ===');
    console.log('ZOHO_CLIENT_ID:', CLIENT_ID);
    console.log('ZOHO_CLIENT_SECRET:', CLIENT_SECRET);
    console.log('ZOHO_REFRESH_TOKEN:', response.data.refresh_token);
    console.log('================================');
  }
  
} catch (error) {
  console.log('❌ FAILED');
  console.log('Status:', error.response?.status);
  console.log('Status Text:', error.response?.statusText);
  console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));
  console.log('Request Config:', {
    url: error.config?.url,
    method: error.config?.method,
    data: error.config?.data
  });
  
  if (error.response?.data?.error === 'invalid_client') {
    console.log('\n🔍 DEBUGGING invalid_client:');
    console.log('1. Client ID used in auth URL:', CLIENT_ID);
    console.log('2. Client ID used in token request:', CLIENT_ID);
    console.log('3. Client Secret used:', CLIENT_SECRET.substring(0, 10) + '...');
    console.log('4. Redirect URI used:', 'https://relai.world/auth/zoho/callback');
    console.log('5. Auth code used:', AUTH_CODE.substring(0, 20) + '...');
    
    console.log('\n💡 Check in Zoho Console:');
    console.log('- App type should be "Server-based Applications"');
    console.log('- Client Type should be "Confidential"');
    console.log('- Redirect URI should be exactly: https://relai.world/auth/zoho/callback');
  }
}