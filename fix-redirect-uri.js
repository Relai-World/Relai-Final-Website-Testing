console.log('🔧 ZOHO REDIRECT URI FIX');
console.log('========================');
console.log('');

console.log('📋 The issue: Zoho is rejecting "urn:ietf:wg:oauth:2.0:oob" as invalid');
console.log('📋 Solution: Use a standard HTTP redirect URI instead');
console.log('');

console.log('🔄 UPDATED INSTRUCTIONS:');
console.log('');

console.log('📝 In the "Authorized Redirect URIs" field, enter:');
console.log('   https://developer.zoho.in/callback');
console.log('');

console.log('📝 If that doesn\'t work, try:');
console.log('   https://api-console.zoho.in/callback');
console.log('');

console.log('📝 Or use this simple one:');
console.log('   https://httpbin.org/get');
console.log('');

console.log('✅ Then click CREATE to save your application');
console.log('');

console.log('🔗 AUTHORIZATION URL (after you create the app):');
console.log('   Replace YOUR_NEW_CLIENT_ID with your actual Client ID:');
console.log('');

console.log('   For https://developer.zoho.in/callback:');
console.log('   https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.ALL&client_id=YOUR_NEW_CLIENT_ID&response_type=code&redirect_uri=https%3A%2F%2Fdeveloper.zoho.in%2Fcallback&access_type=offline');
console.log('');

console.log('   For https://api-console.zoho.in/callback:');
console.log('   https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.ALL&client_id=YOUR_NEW_CLIENT_ID&response_type=code&redirect_uri=https%3A%2F%2Fapi-console.zoho.in%2Fcallback&access_type=offline');
console.log('');

console.log('   For https://httpbin.org/get:');
console.log('   https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.users.ALL&client_id=YOUR_NEW_CLIENT_ID&response_type=code&redirect_uri=https%3A%2F%2Fhttpbin.org%2Fget&access_type=offline');
console.log('');

console.log('📝 NEXT STEPS:');
console.log('1. Use one of the redirect URIs above in your Zoho application');
console.log('2. Click CREATE to save the application');
console.log('3. Copy your new Client ID and Client Secret');
console.log('4. Use the corresponding authorization URL with your Client ID');
console.log('5. Authorize the application');
console.log('6. Copy the authorization code from the URL parameters');
console.log('7. Provide all three as secrets (Client ID, Client Secret, Auth Code)');
console.log('');

console.log('💡 The redirect URI just needs to be a valid HTTPS URL that Zoho can redirect to.');
console.log('   We don\'t actually need to handle the redirect - we just need the code parameter.');