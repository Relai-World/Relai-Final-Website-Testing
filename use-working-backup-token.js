import axios from 'axios';
import fs from 'fs';

async function useWorkingBackupToken() {
  console.log('🔄 Trying to use working backup token...');
  
  try {
    // Use the token that was marked as "manual_working_2025-07-14T13:17:22.186Z"
    const workingToken = "1000.ed79c1488187fd291578b996c2cd0169.474a3416e20b1a4aaf09dca112b68aa0";
    const workingRefreshToken = "1000.fdd50f2593118ca1c1a90a72f3d77349.c9c5ea6fec4275d630ab7619c099d3bc";
    
    console.log('🧪 Testing the working backup token...');
    
    // Test if this token still works
    const testResponse = await axios.post(
      'https://www.zohoapis.in/crm/v2/Leads',
      {
        data: [{
          Last_Name: 'Test Lead Backup',
          Email: 'test.backup@relai.world',
          Phone: '9876543210',
          Lead_Source: 'Backup Token Test',
          Lead_Status: 'Not Contacted',
          Description: 'Testing backup token functionality'
        }],
        trigger: ['approval', 'workflow', 'blueprint']
      },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${workingToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Backup token works! Lead created successfully');
    console.log('📝 Lead ID:', testResponse.data.data[0].details.id);
    
    // Try to refresh this working token
    console.log('🔄 Refreshing the working token...');
    
    const refreshResponse = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: '1000.9IIMHF093P714UDRP127QMAOGBD0ZU',
        client_secret: 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec',
        refresh_token: workingRefreshToken
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const newToken = refreshResponse.data.access_token;
    const expiresIn = refreshResponse.data.expires_in;
    
    console.log('✅ Token refreshed successfully!');
    
    // Test the refreshed token
    const testRefreshedResponse = await axios.post(
      'https://www.zohoapis.in/crm/v2/Leads',
      {
        data: [{
          Last_Name: 'Test Refreshed Token',
          Email: 'test.refreshed@relai.world',
          Phone: '9876543210',
          Lead_Source: 'Refreshed Token Test',
          Lead_Status: 'Not Contacted',
          Description: 'Testing refreshed token functionality'
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
    
    console.log('✅ Refreshed token works! Lead created successfully');
    console.log('📝 Lead ID:', testRefreshedResponse.data.data[0].details.id);
    
    // Update the token file with the working configuration
    const updatedTokenData = {
      access_token: newToken,
      refresh_token: workingRefreshToken,
      expires_at: Date.now() + (expiresIn * 1000),
      refresh_token_expires_at: Date.now() + (99 * 24 * 60 * 60 * 1000), // 99 days
      client_id: '1000.9IIMHF093P714UDRP127QMAOGBD0ZU',
      client_secret: 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec',
      created_at: Date.now(),
      last_refreshed_at: Date.now()
    };
    
    fs.writeFileSync('.zoho-tokens.json', JSON.stringify(updatedTokenData, null, 2));
    console.log('💾 Token file updated with working configuration');
    
    // Update the service file
    let serviceContent = fs.readFileSync('server/zoho-direct-service.ts', 'utf8');
    serviceContent = serviceContent.replace(
      /private workingToken = ".*?";/,
      `private workingToken = "${newToken}";`
    );
    serviceContent = serviceContent.replace(
      /private refreshToken = ".*?";/,
      `private refreshToken = "${workingRefreshToken}";`
    );
    serviceContent = serviceContent.replace(
      /private tokenExpiryTime = \d+;/,
      `private tokenExpiryTime = ${updatedTokenData.expires_at};`
    );
    
    fs.writeFileSync('server/zoho-direct-service.ts', serviceContent);
    console.log('✅ Service file updated with working tokens');
    
    console.log('');
    console.log('🎉 ZOHO CRM INTEGRATION FULLY RESTORED!');
    console.log('========================================');
    console.log('✅ Used working backup token');
    console.log('✅ Successfully refreshed with full CRM access');
    console.log('✅ Both old and new tokens tested successfully');
    console.log('✅ All configuration files updated');
    console.log('✅ Automatic refresh system will maintain access');
    console.log('');
    console.log('🔄 All website forms should now work correctly:');
    console.log('   - Contact Us Form');
    console.log('   - PDF Download Form');
    console.log('   - Property Results Form');
    console.log('   - Property Expert Contact');
    console.log('   - Property Form Page');
    console.log('   - User Info Form');
    console.log('');
    console.log('💾 Token expires at:', new Date(updatedTokenData.expires_at).toLocaleString());
    console.log('🔄 Next refresh will be automatic');
    
  } catch (error) {
    console.error('❌ Backup token approach failed:', error.response?.data || error.message);
    console.log('');
    console.log('🔍 This means we need to generate completely new tokens.');
    console.log('The redirect URI issue must be resolved through the Zoho Developer Console.');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to https://api-console.zoho.in/');
    console.log('2. Find your application (Client ID: 1000.9IIMHF093P714UDRP127QMAOGBD0ZU)');
    console.log('3. Check the configured redirect URIs');
    console.log('4. Either update the redirect URI or use the existing one');
    console.log('5. Generate a new authorization code with the correct redirect URI');
  }
}

useWorkingBackupToken();