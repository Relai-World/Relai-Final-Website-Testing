import axios from 'axios';

// Test the new token directly with Zoho API
async function testTokenWithDirectAPI() {
  console.log('🔍 Testing Token with Direct Zoho API Call');
  console.log('===========================================');
  
  const accessToken = "1000.e83357aab4a898bfa8d200cda11060ba.7152daa67c7e01ddf735ac4c12adba28";
  const apiDomain = "https://www.zohoapis.in";
  
  console.log('🔑 Using access token:', accessToken.substring(0, 20) + '...');
  console.log('🌐 API Domain:', apiDomain);
  
  // Test 1: Check token validity with basic API call
  console.log('\n1. Testing token validity with basic API call...');
  try {
    const response = await axios.get(`${apiDomain}/crm/v2/org`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Token is valid for basic API calls');
    console.log('📊 Organization Info:', response.data.org?.[0]?.company_name || 'Unknown');
  } catch (error) {
    console.error('❌ Token validation failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔍 Token is invalid or has insufficient permissions');
    }
  }
  
  // Test 2: Check available modules/permissions
  console.log('\n2. Testing available modules...');
  try {
    const modulesResponse = await axios.get(`${apiDomain}/crm/v2/settings/modules`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Available modules retrieved');
    const modules = modulesResponse.data.modules || [];
    console.log('📋 Available modules:', modules.map(m => m.api_name).join(', '));
    
    const leadsModule = modules.find(m => m.api_name === 'Leads');
    if (leadsModule) {
      console.log('✅ Leads module is available');
    } else {
      console.log('❌ Leads module is not available');
    }
  } catch (error) {
    console.error('❌ Modules check failed:', error.response?.data || error.message);
  }
  
  // Test 3: Try to create a lead directly
  console.log('\n3. Testing lead creation directly...');
  
  const leadData = {
    data: [
      {
        "Last_Name": "Direct API Test",
        "First_Name": "Token",
        "Email": "token.test@example.com",
        "Phone": "911234567890",
        "Mobile": "911234567890",
        "Lead_Source": "API Test",
        "Lead_Status": "Not Contacted",
        "Description": "Testing lead creation with new token directly through API"
      }
    ]
  };
  
  try {
    const leadResponse = await axios.post(`${apiDomain}/crm/v2/Leads`, leadData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Lead created successfully via direct API!');
    console.log('📄 Lead ID:', leadResponse.data.data?.[0]?.details?.id);
    console.log('🎉 Token has correct permissions for lead creation');
    
    return true;
  } catch (error) {
    console.error('❌ Direct lead creation failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔍 Insufficient permissions for lead creation');
    } else if (error.response?.status === 400) {
      console.log('🔍 Bad request - check data format');
    }
    
    return false;
  }
}

// Test our server's implementation
async function testServerImplementation() {
  console.log('\n🏗️  Testing Server Implementation');
  console.log('=================================');
  
  const testFormData = {
    formData: {
      name: 'Server Test User',
      email: 'server.test@example.com',
      phone: '+911234567890',
      subject: 'Server Implementation Test',
      message: 'Testing server implementation with new token'
    },
    formType: 'contact_us'
  };
  
  try {
    const response = await axios.post('http://localhost:5000/api/zoho/submit-form', testFormData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    if (response.data.success) {
      console.log('✅ Server implementation working!');
      console.log('📄 Zoho Response:', response.data.zohoResponse);
    } else {
      console.log('❌ Server implementation failed:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Server test failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  const directAPIWorking = await testTokenWithDirectAPI();
  
  if (directAPIWorking) {
    await testServerImplementation();
  } else {
    console.log('\n🔄 Token may need different scope or regeneration');
    console.log('📋 Required scope: ZohoCRM.modules.ALL');
    console.log('📋 Current scope: Thrive.Referral.CREATE');
  }
}

runTests().catch(console.error);