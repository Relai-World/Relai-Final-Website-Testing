import axios from 'axios';
import fs from 'fs';

async function fixWithExistingSetup() {
  console.log('🔧 Attempting to fix Zoho with existing configuration...');
  
  try {
    // Read current token configuration
    const tokenData = JSON.parse(fs.readFileSync('.zoho-tokens.json', 'utf8'));
    
    // Try to use the existing refresh token with correct scope
    console.log('🔄 Attempting refresh with existing token...');
    
    const refreshResponse = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: tokenData.client_id,
        client_secret: tokenData.client_secret,
        refresh_token: tokenData.refresh_token,
        scope: 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL'
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const newToken = refreshResponse.data.access_token;
    const expiresIn = refreshResponse.data.expires_in;
    
    console.log('✅ Token refreshed successfully');
    
    // Update token data
    const updatedTokenData = {
      ...tokenData,
      access_token: newToken,
      expires_at: Date.now() + (expiresIn * 1000),
      last_refreshed_at: Date.now()
    };
    
    fs.writeFileSync('.zoho-tokens.json', JSON.stringify(updatedTokenData, null, 2));
    
    // Test the new token
    console.log('🧪 Testing new token capabilities...');
    
    const testResponse = await axios.post(
      'https://www.zohoapis.in/crm/v2/Leads',
      {
        data: [{
          Last_Name: 'Test Lead',
          Email: 'test@relai.world',
          Phone: '9876543210',
          Lead_Source: 'Test Fix',
          Lead_Status: 'Not Contacted'
        }],
        trigger: ['approval', 'workflow', 'blueprint']
      },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${newToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Test lead creation successful!');
    console.log('📝 Lead ID:', testResponse.data.data[0].details.id);
    
    // Update service file
    let serviceContent = fs.readFileSync('server/zoho-direct-service.ts', 'utf8');
    serviceContent = serviceContent.replace(
      /private workingToken = ".*?";/,
      `private workingToken = "${newToken}";`
    );
    serviceContent = serviceContent.replace(
      /private tokenExpiryTime = \d+;/,
      `private tokenExpiryTime = ${updatedTokenData.expires_at};`
    );
    
    fs.writeFileSync('server/zoho-direct-service.ts', serviceContent);
    console.log('✅ Service file updated');
    
    console.log('🎉 ZOHO INTEGRATION FIXED!');
    console.log('All forms should now work correctly.');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.response?.data || error.message);
    
    // If refresh fails, we need to generate authorization URLs with correct redirect URIs
    console.log('');
    console.log('🔍 Checking what redirect URIs might work...');
    
    // Check the original working configuration
    console.log('📋 Based on your existing setup, try these URLs:');
    
    const possibleUris = [
      'https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=1000.9IIMHF093P714UDRP127QMAOGBD0ZU&response_type=code&redirect_uri=https%3A%2F%2Faccounts.zoho.in%2Foauth%2Fv2%2Fauth&access_type=offline',
      'https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=1000.9IIMHF093P714UDRP127QMAOGBD0ZU&response_type=code&redirect_uri=https%3A%2F%2Fapi.zoho.in%2Fcrm%2Fv2%2Fauth&access_type=offline',
      'https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=1000.9IIMHF093P714UDRP127QMAOGBD0ZU&response_type=code&redirect_uri=https%3A%2F%2Fwww.zohoapis.in%2Fcrm%2Fv2%2Fauth&access_type=offline'
    ];
    
    console.log('Try these URLs one by one:');
    possibleUris.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });
    
    console.log('');
    console.log('Alternative: Check your Zoho Developer Console at:');
    console.log('https://api-console.zoho.in/');
    console.log('Look for the redirect URI configured for your application.');
  }
}

fixWithExistingSetup();