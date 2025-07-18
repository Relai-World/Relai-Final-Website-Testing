import axios from 'axios';

// Final test to confirm server integration is working
async function testServerIntegration() {
  console.log('🔧 Final Server Integration Test');
  console.log('================================');
  
  // First confirm the working token directly
  const workingToken = "1000.ed79c1488187fd291578b996c2cd0169.474a3416e20b1a4aaf09dca112b68aa0";
  
  console.log('1. Testing working token directly...');
  try {
    const directResponse = await axios.post('https://www.zohoapis.in/crm/v2/Leads', {
      data: [{
        "Last_Name": "Direct Integration Test",
        "Email": "direct@test.com",
        "Phone": "911234567890",
        "Lead_Source": "Direct Integration Test"
      }]
    }, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${workingToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Direct token test successful');
    console.log('📄 Lead ID:', directResponse.data.data?.[0]?.details?.id);
  } catch (error) {
    console.log('❌ Direct token test failed:', error.response?.data);
    return;
  }
  
  // Now test the server endpoint
  console.log('\n2. Testing server endpoint...');
  try {
    const serverResponse = await axios.post('http://localhost:5000/api/zoho/submit-form', {
      formData: {
        name: "Server Integration Test",
        email: "server@test.com",
        phone: "+911234567890",
        subject: "Server Integration Test",
        message: "Testing server integration with working token"
      },
      formType: "contact_us"
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Server integration test successful');
    console.log('📄 Response:', serverResponse.data);
  } catch (error) {
    console.log('❌ Server integration test failed:', error.response?.data);
    console.log('Error details:', error.message);
  }
  
  // Test all form types quickly
  console.log('\n3. Testing all form types...');
  const formTypes = ['contact_us', 'pdf_download', 'property_results', 'property_expert', 'property_form', 'user_info'];
  
  for (const formType of formTypes) {
    try {
      const response = await axios.post('http://localhost:5000/api/zoho/submit-form', {
        formData: {
          name: `${formType} Test`,
          email: `${formType}@test.com`,
          phone: "+911234567890",
          message: `Testing ${formType} integration`
        },
        formType: formType
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ ${formType}: SUCCESS`);
      } else {
        console.log(`❌ ${formType}: FAILED -`, response.data.message);
      }
    } catch (error) {
      console.log(`❌ ${formType}: ERROR -`, error.response?.data?.message || error.message);
    }
  }
  
  console.log('\n4. Final diagnosis...');
  console.log('If direct token works but server fails, the issue is server-side token management');
  console.log('If both work, integration is complete');
  console.log('If both fail, token has expired and needs refresh');
}

testServerIntegration().catch(console.error);