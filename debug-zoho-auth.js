import axios from 'axios';

// Debug script to test different redirect URIs
const CLIENT_ID = '1000.PWQRC6J77UOEGT4UTIVYH9SD4IPGHD';
const CLIENT_SECRET = '59c31f9d46098613280597a8d3c6232d3c1a9e6a40';
const AUTH_CODE = '1000.b289d6cec7c34bf4f6f2863aa1444733.ee259e92be2e7c8bb76dbabd61198983';

const redirectUris = [
  'https://relai.world/auth/zoho/callback',
  'https://relai.world/auth/callback',
  'https://relai.world/callback',
  'https://relai.world/',
  'https://relai.world',
  'http://localhost:3000/auth/zoho/callback',
  'http://localhost:5000/auth/zoho/callback'
];

async function testRedirectUri(redirectUri) {
  console.log(`\n🔄 Testing redirect URI: ${redirectUri}`);
  
  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        code: AUTH_CODE
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ SUCCESS!');
    console.log('Response:', response.data);
    
    if (response.data.refresh_token) {
      console.log('\n=== SAVE THESE CREDENTIALS ===');
      console.log('ZOHO_CLIENT_ID:', CLIENT_ID);
      console.log('ZOHO_CLIENT_SECRET:', CLIENT_SECRET);
      console.log('ZOHO_REFRESH_TOKEN:', response.data.refresh_token);
      console.log('================================');
      return true;
    }
    
  } catch (error) {
    console.log('❌ FAILED');
    if (error.response?.data) {
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
  
  return false;
}

async function runTests() {
  console.log('🔍 Testing different redirect URIs...');
  
  for (const uri of redirectUris) {
    const success = await testRedirectUri(uri);
    if (success) {
      console.log('\n🎉 Found working redirect URI!');
      break;
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runTests();