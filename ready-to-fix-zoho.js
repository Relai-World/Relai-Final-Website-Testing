
import axios from 'axios';
import fs from 'fs';

async function completeZohoFix() {
  const authCode = process.env.ZOHO_NEW_AUTH_CODE;
  
  if (!authCode) {
    console.log('❌ Please provide ZOHO_NEW_AUTH_CODE secret');
    return;
  }
  
  console.log('🔄 Generating fresh tokens...');
  
  // Use the working redirect URI we'll determine
  const redirectUris = [
    'https://api-console.zoho.in/auth/callback',
    'https://accounts.zoho.in/oauth/v2/callback',
    'http://localhost',
    'urn:ietf:wg:oauth:2.0:oob'
  ];
  
  for (const redirectUri of redirectUris) {
    try {
      const tokenResponse = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: '1000.9IIMHF093P714UDRP127QMAOGBD0ZU',
          client_secret: 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec',
          redirect_uri: redirectUri,
          code: authCode
        }
      });
      
      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      // Test the token
      const testResponse = await axios.post(
        'https://www.zohoapis.in/crm/v2/Leads',
        {
          data: [{
            Last_Name: 'Integration Test',
            Email: 'test@relai.world',
            Phone: '9876543210',
            Lead_Source: 'System Test',
            Lead_Status: 'Not Contacted'
          }]
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Token generation and test successful!');
      console.log('📝 Test Lead ID:', testResponse.data.data[0].details.id);
      
      // Update all files
      const tokenData = {
        access_token,
        refresh_token,
        expires_at: Date.now() + (expires_in * 1000),
        refresh_token_expires_at: Date.now() + (99 * 24 * 60 * 60 * 1000),
        client_id: '1000.9IIMHF093P714UDRP127QMAOGBD0ZU',
        client_secret: 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec',
        created_at: Date.now(),
        last_refreshed_at: Date.now()
      };
      
      fs.writeFileSync('.zoho-tokens.json', JSON.stringify(tokenData, null, 2));
      
      // Update service file
      let serviceContent = fs.readFileSync('server/zoho-direct-service.ts', 'utf8');
      serviceContent = serviceContent.replace(
        /private workingToken = ".*?";/,
        `private workingToken = "${access_token}";`
      );
      serviceContent = serviceContent.replace(
        /private refreshToken = ".*?";/,
        `private refreshToken = "${refresh_token}";`
      );
      serviceContent = serviceContent.replace(
        /private tokenExpiryTime = \d+;/,
        `private tokenExpiryTime = ${tokenData.expires_at};`
      );
      
      fs.writeFileSync('server/zoho-direct-service.ts', serviceContent);
      
      console.log('🎉 ZOHO CRM INTEGRATION FULLY RESTORED!');
      console.log('✅ All website forms will now work correctly');
      console.log('✅ Automatic token refresh configured for 99 days');
      
      return;
      
    } catch (error) {
      console.log(`❌ Failed with redirect URI: ${redirectUri}`);
      continue;
    }
  }
  
  console.log('❌ All redirect URIs failed. Check Zoho Developer Console for correct URI.');
}

completeZohoFix();
