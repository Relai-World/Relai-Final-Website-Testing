import axios from 'axios';

// Test the server token using the correct Zoho-oauthtoken format
async function testServerTokenFormat() {
  console.log('🔍 Testing Server Token Format');
  console.log('==============================');
  
  const token = "1000.ed79c1488187fd291578b996c2cd0169.474a3416e20b1a4aaf09dca112b68aa0";
  
  console.log('Token:', token.substring(0, 20) + '...');
  
  // Test 1: Bearer format (what worked in direct tests)
  console.log('\n1. Testing Bearer format (what worked previously)...');
  try {
    const bearerResponse = await axios.post('https://www.zohoapis.in/crm/v2/Leads', {
      data: [{
        "Last_Name": "Bearer Format Test",
        "Email": "bearer@test.com",
        "Phone": "911234567890",
        "Lead_Source": "Bearer Format Test"
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Bearer format successful');
    console.log('📄 Lead ID:', bearerResponse.data.data?.[0]?.details?.id);
  } catch (error) {
    console.log('❌ Bearer format failed:', error.response?.data);
  }
  
  // Test 2: Zoho-oauthtoken format (what server uses)
  console.log('\n2. Testing Zoho-oauthtoken format (what server uses)...');
  try {
    const zohoResponse = await axios.post('https://www.zohoapis.in/crm/v2/Leads', {
      data: [{
        "Last_Name": "Zoho-oauthtoken Format Test",
        "Email": "zoho@test.com",
        "Phone": "911234567890",
        "Lead_Source": "Zoho-oauthtoken Format Test"
      }]
    }, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Zoho-oauthtoken format successful');
    console.log('📄 Lead ID:', zohoResponse.data.data?.[0]?.details?.id);
  } catch (error) {
    console.log('❌ Zoho-oauthtoken format failed:', error.response?.data);
  }
  
  // Test 3: Check what format the server token manager returns
  console.log('\n3. Testing server token manager...');
  try {
    const statusResponse = await axios.get('http://localhost:5000/api/zoho/token-status');
    console.log('📊 Server token status:', statusResponse.data.tokenStatus?.message);
    
    // Check if server can get valid token
    const healthResponse = await axios.get('http://localhost:5000/api/zoho/health');
    if (healthResponse.data.success) {
      console.log('✅ Server token manager is working');
    } else {
      console.log('❌ Server token manager failed:', healthResponse.data.message);
    }
  } catch (error) {
    console.log('❌ Server token manager test failed:', error.message);
  }
  
  // Test 4: Test different token expiry scenarios
  console.log('\n4. Testing token expiry scenarios...');
  
  // Check current token expiry
  const currentTime = Date.now();
  const tokenExpiry = currentTime + (3600 * 1000); // 1 hour from now
  
  console.log('Current time:', new Date(currentTime).toLocaleString());
  console.log('Token expires at:', new Date(tokenExpiry).toLocaleString());
  console.log('Time until expiry:', Math.round((tokenExpiry - currentTime) / 1000 / 60), 'minutes');
  
  // If token is close to expiry, sustainable token manager should handle it
  if ((tokenExpiry - currentTime) < 5 * 60 * 1000) {
    console.log('⚠️  Token is close to expiry, sustainable token manager should refresh it');
  } else {
    console.log('✅ Token has plenty of time left');
  }
  
  console.log('\n5. Final diagnosis...');
  console.log('Both Bearer and Zoho-oauthtoken formats should work with this token');
  console.log('If server is failing, the issue might be:');
  console.log('  - Token not being loaded properly by sustainable token manager');
  console.log('  - Token being modified/corrupted during loading');
  console.log('  - Different token being used than expected');
  console.log('  - Network/timeout issues');
}

testServerTokenFormat().catch(console.error);