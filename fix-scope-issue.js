import fs from 'fs';
import axios from 'axios';

// Fix the scope issue by generating correct authorization URL
async function fixScopeIssue() {
  console.log('🔧 Fixing OAuth Scope Issue');
  console.log('===========================');
  
  console.log('❌ Current token scope: Thrive.Referral.CREATE');
  console.log('✅ Required scope: ZohoCRM.modules.ALL');
  console.log('');
  
  // Generate correct authorization URL with CRM scope
  const clientId = '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
  const redirectUri = 'https://relai.world/auth/zoho/callback';
  const correctScope = 'ZohoCRM.modules.ALL';
  
  const correctAuthUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${correctScope}&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${redirectUri}`;
  
  console.log('📋 Steps to fix the scope issue:');
  console.log('');
  console.log('1. Visit this URL with the CORRECT scope:');
  console.log('   ' + correctAuthUrl);
  console.log('');
  console.log('2. Login to Zoho and approve the application');
  console.log('3. Copy the "code" parameter from the redirect URL');
  console.log('4. Run: node generate-fresh-tokens.js YOUR_NEW_AUTH_CODE');
  console.log('');
  
  // Check if we can get correct auth URL from server
  try {
    const serverAuthResponse = await axios.get('http://localhost:5000/api/zoho/auth-url');
    console.log('🔗 Server-generated auth URL (should have correct scope):');
    console.log('   ' + serverAuthResponse.data.authUrl);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to get server auth URL:', error.message);
  }
  
  console.log('⚠️  Important: The previous token cannot be used because it has wrong scope.');
  console.log('   We need a new authorization code with "ZohoCRM.modules.ALL" scope.');
  console.log('');
  
  // Show what the token should look like
  console.log('✅ New token should have:');
  console.log('   - scope: "ZohoCRM.modules.ALL"');
  console.log('   - access to CRM modules including Leads');
  console.log('   - ability to create, read, update leads');
  console.log('');
  
  // Test current token to confirm it's wrong scope
  console.log('🧪 Testing current token scope...');
  try {
    const currentToken = JSON.parse(fs.readFileSync('.zoho-tokens.json', 'utf8'));
    console.log('   Current scope:', currentToken.scope);
    console.log('   Expires at:', new Date(currentToken.expires_at).toLocaleString());
    
    if (currentToken.scope !== 'ZohoCRM.modules.ALL') {
      console.log('   ❌ Scope is incorrect - needs regeneration');
    } else {
      console.log('   ✅ Scope is correct');
    }
  } catch (error) {
    console.error('   ❌ Error reading current token:', error.message);
  }
  
  console.log('');
  console.log('🎯 Next steps:');
  console.log('1. Visit the authorization URL above');
  console.log('2. Get new authorization code with CRM scope');
  console.log('3. Generate new tokens using the code');
  console.log('4. Test lead creation with correct permissions');
}

fixScopeIssue().catch(console.error);