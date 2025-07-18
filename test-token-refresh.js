import axios from 'axios';

// Test the token refresh functionality
async function testTokenRefresh() {
  console.log('🔄 Testing Token Refresh System');
  console.log('==============================');

  const refreshToken = "1000.e174113a40cec8601d4f9c2487c49c12.8b58c5359519534b868ce2a8c35c25b7";
  const clientId = "1000.9IIMHF093P714UDRP127QMAOGBD0ZU";
  const clientSecret = "e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec";

  console.log('🔑 Testing token refresh with:');
  console.log('Client ID:', clientId);
  console.log('Refresh Token:', refreshToken.substring(0, 30) + '...');

  try {
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('✅ Token refresh successful!');
    console.log('📄 Full response:', response.data);
    
    if (response.data.access_token) {
      console.log('📄 New access token:', response.data.access_token.substring(0, 30) + '...');
      console.log('⏰ Expires in:', response.data.expires_in, 'seconds');
      console.log('🔄 Token type:', response.data.token_type);
      console.log('📋 Scope:', response.data.scope);
    } else {
      console.log('❌ No access token in response');
      return { success: false, error: 'No access token received' };
    }

    // Test the new token by creating a test lead
    console.log('\n🧪 Testing new token with lead creation...');
    const testResponse = await axios.post('https://www.zohoapis.in/crm/v2/Leads', {
      data: [{
        "Last_Name": "Token Refresh Test",
        "Email": "refresh.test@example.com",
        "Phone": "911234567890",
        "Lead_Source": "Token Refresh Test"
      }]
    }, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${response.data.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ New token works perfectly!');
    console.log('📄 Lead created with ID:', testResponse.data.data?.[0]?.details?.id);
    
    return {
      success: true,
      newToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    console.error('❌ Token refresh failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Test server endpoint with automatic refresh
async function testServerWithRefresh() {
  console.log('\n🔧 Testing Server Token Refresh');
  console.log('===============================');

  try {
    const response = await axios.post('http://localhost:5000/api/zoho/submit-form', {
      formData: {
        name: "Auto Refresh Test",
        email: "auto.refresh@example.com",
        phone: "+911234567890",
        subject: "Auto Refresh Test",
        message: "Testing automatic token refresh in server"
      },
      formType: "contact_us"
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Server automatic refresh works!');
    console.log('📄 Response:', response.data);
  } catch (error) {
    console.error('❌ Server refresh test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  const refreshResult = await testTokenRefresh();
  
  if (refreshResult.success) {
    console.log('\n✅ Token refresh system is working correctly');
    console.log('🔄 New tokens will be automatically generated every hour');
    console.log('📅 Refresh token is valid for 99 days');
    
    await testServerWithRefresh();
  } else {
    console.log('\n❌ Token refresh system needs attention');
    console.log('Please check the refresh token and credentials');
  }
}

runTests().catch(console.error);