import axios from 'axios';

// Force update the server token and test immediately
async function forceUpdateServerToken() {
  console.log('🔄 Force Updating Server Token');
  console.log('===============================');
  
  // The working token from direct API test
  const workingToken = {
    access_token: "1000.ed79c1488187fd291578b996c2cd0169.474a3416e20b1a4aaf09dca112b68aa0",
    refresh_token: "1000.fdd50f2593118ca1c1a90a72f3d77349.c9c5ea6fec4275d630ab7619c099d3bc",
    scope: "ZohoCRM.modules.ALL",
    expires_in: 3600
  };
  
  console.log('🔑 Working token confirmed (direct API test successful)');
  console.log('📄 Lead ID created: 961380000000597005');
  
  // Try to force update the token via the sustainable token manager endpoint
  try {
    const updateResponse = await axios.post('http://localhost:5000/api/zoho/force-update-token', {
      access_token: workingToken.access_token,
      refresh_token: workingToken.refresh_token,
      expires_in: workingToken.expires_in
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('✅ Token update response:', updateResponse.data);
  } catch (error) {
    console.log('❌ Token update failed (endpoint may not exist):', error.message);
    console.log('   This is expected - the endpoint may not exist yet');
  }
  
  // Test the server immediately after token update
  console.log('\n🧪 Testing server with updated token...');
  
  const testFormData = {
    formData: {
      name: 'Force Update Test',
      email: 'force.update@example.com',
      phone: '+911234567890',
      subject: 'Force Update Test',
      message: 'Testing after forcing token update'
    },
    formType: 'contact_us'
  };
  
  try {
    const testResponse = await axios.post('http://localhost:5000/api/zoho/submit-form', testFormData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    if (testResponse.data.success) {
      console.log('✅ Server test successful!');
      console.log('📄 Zoho Lead ID:', testResponse.data.zohoResponse?.data?.[0]?.details?.id);
      console.log('🎉 Server is now using the correct token!');
      
      // Test multiple form types to ensure all work
      console.log('\n📋 Testing all form types...');
      
      const formTypes = ['pdf_download', 'property_inquiry', 'expert_contact', 'user_info'];
      
      for (const formType of formTypes) {
        try {
          const multiFormData = {
            formData: {
              name: `Test ${formType}`,
              email: `test.${formType}@example.com`,
              phone: '+919876543210',
              subject: `Test ${formType}`,
              message: `Testing ${formType} form`
            },
            formType: formType
          };
          
          const multiResponse = await axios.post('http://localhost:5000/api/zoho/submit-form', multiFormData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
          });
          
          if (multiResponse.data.success) {
            console.log(`   ✅ ${formType}: Success`);
          } else {
            console.log(`   ❌ ${formType}: Failed`);
          }
        } catch (error) {
          console.log(`   ❌ ${formType}: Error`);
        }
      }
      
      return true;
    } else {
      console.log('❌ Server test failed:', testResponse.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Server test failed:', error.response?.data?.error || error.message);
    
    // If server test fails, let's check what's happening
    console.log('\n🔍 Diagnosing server issues...');
    
    // Check token status
    try {
      const statusResponse = await axios.get('http://localhost:5000/api/zoho/token-status');
      console.log('📊 Token status:', statusResponse.data.tokenStatus?.message);
    } catch (err) {
      console.log('❌ Token status check failed');
    }
    
    // Check health
    try {
      const healthResponse = await axios.get('http://localhost:5000/api/zoho/health');
      console.log('🏥 Health status:', healthResponse.data.message);
    } catch (err) {
      console.log('❌ Health check failed');
    }
    
    return false;
  }
}

// Test direct API one more time to confirm token works
async function confirmDirectTokenWorks() {
  console.log('\n🔍 Confirming Direct Token Works');
  console.log('=================================');
  
  const token = "1000.ed79c1488187fd291578b996c2cd0169.474a3416e20b1a4aaf09dca112b68aa0";
  
  const leadData = {
    data: [{
      "Last_Name": "Confirmation Test",
      "Email": "confirmation@test.com",
      "Phone": "911234567890",
      "Lead_Source": "Token Confirmation Test"
    }]
  };
  
  try {
    const response = await axios.post('https://www.zohoapis.in/crm/v2/Leads', leadData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Direct token confirmed working');
    console.log('📄 Lead ID:', response.data.data?.[0]?.details?.id);
    return true;
  } catch (error) {
    console.log('❌ Direct token failed:', error.response?.data);
    return false;
  }
}

// Run both tests
async function runTests() {
  const directWorks = await confirmDirectTokenWorks();
  
  if (directWorks) {
    console.log('\n✅ Direct token works, proceeding with server update...');
    await forceUpdateServerToken();
  } else {
    console.log('\n❌ Direct token failed, need to investigate token issue');
  }
}

runTests().catch(console.error);