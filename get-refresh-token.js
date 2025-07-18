import axios from 'axios';

// Your Zoho credentials and authorization code
const CLIENT_ID = '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
const CLIENT_SECRET = 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec';
const AUTH_CODE = process.argv[2] || '1000.fdecf559d0aba5a4a40cc63f7117cf96.3c0c515ae488960fc888b2ec9d440af1';
const REDIRECT_URI = 'https://relai.world/auth/zoho/callback';

if (!process.argv[2]) {
  console.log('⚠️  Using default authorization code (may be expired)');
  console.log('💡 To use a fresh code, run: node get-refresh-token.js YOUR_NEW_CODE');
}

async function getRefreshToken() {
  const redirectUris = [
    'https://relai.world/auth/zoho/callback',
    'https://relai.world/zoho/callback'
  ];

  for (const redirectUri of redirectUris) {
    try {
      console.log(`🔄 Trying redirect URI: ${redirectUri}`);
      
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: redirectUri,
          code: AUTH_CODE,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('✅ Token exchange successful!');
      console.log('📋 Response:', response.data);
      
      console.log('\n=== IMPORTANT: Save these credentials ===');
      console.log('ZOHO_CLIENT_ID:', CLIENT_ID);
      console.log('ZOHO_CLIENT_SECRET:', CLIENT_SECRET);
      console.log('ZOHO_REFRESH_TOKEN:', response.data.refresh_token);
      console.log('==========================================\n');
      
      return response.data;
    } catch (error) {
      console.error(`❌ Failed with redirect URI ${redirectUri}:`, error.response?.data || error.message);
      if (redirectUri === redirectUris[redirectUris.length - 1]) {
        throw error;
      }
    }
  }
}

// Run the function
getRefreshToken().catch(console.error);