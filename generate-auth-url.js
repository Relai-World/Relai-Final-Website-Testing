// Generate the correct Zoho authorization URL
const clientId = '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
const scope = 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL';
const responseType = 'code';
const accessType = 'offline';

// Try different redirect URIs that might be configured
const possibleRedirectUris = [
  'https://relai.world',
  'https://relai.world/',
  'https://relai.world/callback',
  'https://www.relai.world',
  'https://www.relai.world/',
  'https://localhost:5000',
  'https://localhost:5000/callback',
  'http://localhost:5000',
  'http://localhost:5000/callback'
];

console.log('Try these authorization URLs one by one:');
console.log('=====================================');

possibleRedirectUris.forEach((redirectUri, index) => {
  const authUrl = `https://accounts.zoho.in/oauth/v2/auth?scope=${encodeURIComponent(scope)}&client_id=${clientId}&response_type=${responseType}&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=${accessType}`;
  console.log(`${index + 1}. ${authUrl}`);
  console.log('');
});

console.log('Instructions:');
console.log('1. Try each URL above until one works (doesn\'t show "Invalid Redirect Uri")');
console.log('2. Authorize the application');
console.log('3. Copy the authorization code from the redirect URL');
console.log('4. Provide it as the ZOHO_NEW_AUTH_CODE secret');