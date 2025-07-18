import axios from 'axios';
import fs from 'fs';

async function testZohoToken() {
  try {
    // Read current token
    const tokenData = JSON.parse(fs.readFileSync('.zoho-tokens.json', 'utf8'));
    console.log('Current token expires at:', new Date(tokenData.expires_at));
    console.log('Current time:', new Date());
    console.log('Token expired:', Date.now() > tokenData.expires_at);

    // Test with current token
    const testResponse = await axios.get('https://www.zohoapis.in/crm/v2/Leads', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Token is working, status:', testResponse.status);
    
  } catch (error) {
    console.log('❌ Token test failed:', error.response?.data || error.message);
    
    // Try to refresh token
    try {
      console.log('🔄 Attempting to refresh token...');
      const refreshResponse = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
        params: {
          refresh_token: tokenData.refresh_token,
          client_id: tokenData.client_id,
          client_secret: tokenData.client_secret,
          grant_type: 'refresh_token'
        }
      });
      
      console.log('✅ Token refresh successful');
      
      // Save new token
      const newTokenData = {
        ...tokenData,
        access_token: refreshResponse.data.access_token,
        expires_at: Date.now() + (refreshResponse.data.expires_in * 1000),
        last_refreshed_at: Date.now()
      };
      
      fs.writeFileSync('.zoho-tokens.json', JSON.stringify(newTokenData, null, 2));
      console.log('💾 New token saved');
      
    } catch (refreshError) {
      console.log('❌ Token refresh failed:', refreshError.response?.data || refreshError.message);
    }
  }
}

testZohoToken();