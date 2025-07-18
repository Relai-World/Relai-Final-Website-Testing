// Simple script to generate new authorization code and get refresh token
console.log('=== ZOHO CRM INTEGRATION SETUP ===\n');

const CLIENT_ID = '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
const REDIRECT_URI = 'https://relai.world/auth/zoho/callback';

// Generate new authorization URL
const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${REDIRECT_URI}`;

console.log('🔗 STEP 1: Visit this URL to get a new authorization code:');
console.log(authUrl);
console.log('\n📋 STEP 2: After authorizing, copy the "code" parameter from the redirect URL');
console.log('   Example: https://relai.world/auth/zoho/callback?code=YOUR_CODE_HERE');
console.log('\n🔧 STEP 3: Run this command with your new authorization code:');
console.log('   node get-refresh-token.js YOUR_NEW_CODE_HERE');

console.log('\n⚠️  Note: Authorization codes expire in 10 minutes, so complete the process quickly!');
console.log('\n=== CREDENTIALS TO SAVE ===');
console.log('ZOHO_CLIENT_ID:', CLIENT_ID);
console.log('ZOHO_CLIENT_SECRET: e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec');
console.log('ZOHO_REFRESH_TOKEN: [Will be generated in Step 3]');