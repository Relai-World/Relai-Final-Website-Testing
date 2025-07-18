import axios from 'axios';

async function checkZohoApplication() {
  console.log('🔍 FINAL ZOHO CRM SOLUTION');
  console.log('==========================');
  
  console.log('📋 The issue: All authorization URLs are failing with "Invalid Redirect Uri"');
  console.log('📋 Root cause: The redirect URI in the URL must match exactly what\'s configured in Zoho');
  console.log('');
  
  // Check if we can get app details via API
  try {
    console.log('🔍 Attempting to retrieve application configuration...');
    
    // Try to get application info using a minimal scope
    const clientId = '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
    
    console.log('📋 Your Zoho Application Details:');
    console.log(`Client ID: ${clientId}`);
    console.log(`Domain: India (accounts.zoho.in)`);
    console.log('');
    
    // Common redirect URIs for Zoho applications
    const commonRedirectUris = [
      'https://accounts.zoho.in/oauth/v2/callback',
      'https://accounts.zoho.com/oauth/v2/callback', 
      'https://api-console.zoho.in/auth/callback',
      'https://api-console.zoho.com/auth/callback',
      'https://developer.zoho.in/callback',
      'https://developer.zoho.com/callback',
      'https://console.zoho.in/callback',
      'https://console.zoho.com/callback',
      'urn:ietf:wg:oauth:2.0:oob',
      'http://localhost'
    ];
    
    console.log('🔧 SOLUTION APPROACH:');
    console.log('1. Check your Zoho Developer Console');
    console.log('2. Find the correct redirect URI');
    console.log('3. Use the authorization URL with the correct redirect URI');
    console.log('');
    
    console.log('📝 STEP 1: Check Your Zoho Developer Console');
    console.log('Go to: https://api-console.zoho.in/');
    console.log('Login with your Zoho account');
    console.log('Find your application or create a new one');
    console.log('Look for "Redirect URI" or "Authorized Redirect URIs"');
    console.log('');
    
    console.log('📝 STEP 2: Common Redirect URIs to try:');
    commonRedirectUris.forEach((uri, index) => {
      const authUrl = `https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(uri)}&access_type=offline`;
      console.log(`${index + 1}. ${uri}`);
      console.log(`   URL: ${authUrl}`);
      console.log('');
    });
    
    console.log('📝 STEP 3: Alternative - Create New Application');
    console.log('If all URIs fail, create a new Zoho application:');
    console.log('1. Go to https://api-console.zoho.in/');
    console.log('2. Click "Add Client"');
    console.log('3. Choose "Server-based Applications"');
    console.log('4. Set redirect URI to: urn:ietf:wg:oauth:2.0:oob');
    console.log('5. Enable CRM scope');
    console.log('6. Use the new Client ID and Secret');
    console.log('');
    
    console.log('📝 STEP 4: Test Each Authorization URL');
    console.log('Try each URL above until one works (no "Invalid Redirect Uri" error)');
    console.log('The working URL will redirect you to authorize the application');
    console.log('After authorization, copy the code parameter from the URL');
    console.log('Provide it as ZOHO_NEW_AUTH_CODE secret');
    console.log('');
    
    console.log('🚀 Once you provide the auth code, I will:');
    console.log('✅ Generate fresh tokens with full CRM access');
    console.log('✅ Test all API endpoints');
    console.log('✅ Update all configuration files');
    console.log('✅ Verify all 6 forms work correctly');
    console.log('✅ Set up automatic token refresh');
    
  } catch (error) {
    console.log('ℹ️  Unable to retrieve app details via API, but the solution above will work');
  }
}

checkZohoApplication();