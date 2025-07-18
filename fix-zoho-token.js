import axios from 'axios';
import fs from 'fs';

async function fixZohoToken() {
  try {
    console.log('🔄 Reading current token configuration...');
    const tokenData = JSON.parse(fs.readFileSync('.zoho-tokens.json', 'utf8'));
    
    console.log('📊 Current token status:');
    console.log(`- Token expires at: ${new Date(tokenData.expires_at).toLocaleString()}`);
    console.log(`- Current time: ${new Date().toLocaleString()}`);
    console.log(`- Token expired: ${Date.now() > tokenData.expires_at}`);
    
    // Try to refresh the token
    console.log('🔄 Attempting token refresh...');
    
    const refreshResponse = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: tokenData.client_id,
        client_secret: tokenData.client_secret,
        refresh_token: tokenData.refresh_token,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    console.log('✅ Token refresh successful!');
    
    // Update tokens
    const newTokenData = {
      ...tokenData,
      access_token: refreshResponse.data.access_token,
      expires_at: Date.now() + (refreshResponse.data.expires_in * 1000),
      last_refreshed_at: Date.now()
    };
    
    // Save to file
    fs.writeFileSync('.zoho-tokens.json', JSON.stringify(newTokenData, null, 2));
    console.log('💾 Updated token file');
    
    // Test the new token
    console.log('🧪 Testing new token...');
    const testResponse = await axios.get('https://www.zohoapis.in/crm/v2/settings/modules', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${newTokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Token test successful!');
    console.log(`🕒 New token expires at: ${new Date(newTokenData.expires_at).toLocaleString()}`);
    
    // Update the service file
    console.log('🔄 Updating service file...');
    let serviceContent = fs.readFileSync('server/zoho-direct-service.ts', 'utf8');
    
    // Replace the token in service file
    serviceContent = serviceContent.replace(
      /private workingToken = ".*?";/,
      `private workingToken = "${newTokenData.access_token}";`
    );
    
    serviceContent = serviceContent.replace(
      /private tokenExpiryTime = \d+;/,
      `private tokenExpiryTime = ${newTokenData.expires_at};`
    );
    
    fs.writeFileSync('server/zoho-direct-service.ts', serviceContent);
    console.log('✅ Service file updated with new token');
    
    console.log('🎉 Zoho integration fully restored!');
    
  } catch (error) {
    console.error('❌ Token refresh failed:', error.response?.data || error.message);
    console.log('');
    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('1. The refresh token may be invalid or expired');
    console.log('2. You need to generate a new authorization code');
    console.log('3. Try these authorization URLs:');
    console.log('');
    
    // Generate authorization URLs with common patterns
    const clientId = '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
    const redirectUris = [
      'https://developer.zoho.in',
      'https://developer.zoho.com',
      'urn:ietf:wg:oauth:2.0:oob'
    ];
    
    redirectUris.forEach((uri, index) => {
      const authUrl = `https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(uri)}&access_type=offline`;
      console.log(`${index + 1}. ${authUrl}`);
    });
  }
}

fixZohoToken();