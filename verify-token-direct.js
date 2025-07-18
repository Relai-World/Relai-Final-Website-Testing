import axios from 'axios';

// Direct test of the token to verify it works
async function verifyTokenDirect() {
  console.log('🔍 Direct Token Verification');
  console.log('============================');
  
  const token = "1000.ed79c1488187fd291578b996c2cd0169.474a3416e20b1a4aaf09dca112b68aa0";
  
  // Test 1: Simple org call
  console.log('1. Testing organization access...');
  try {
    const orgResponse = await axios.get('https://www.zohoapis.in/crm/v2/org', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Organization access successful');
    console.log('   Company:', orgResponse.data.org?.[0]?.company_name);
  } catch (error) {
    console.error('❌ Organization access failed:', error.response?.data);
    console.log('   Status:', error.response?.status);
    console.log('   This may indicate token issues');
  }
  
  // Test 2: Create a simple lead
  console.log('\n2. Testing lead creation...');
  const leadData = {
    data: [{
      "Last_Name": "Direct Token Test",
      "Email": "direct.token@test.com",
      "Phone": "911234567890",
      "Lead_Source": "Direct API Test"
    }]
  };
  
  try {
    const leadResponse = await axios.post('https://www.zohoapis.in/crm/v2/Leads', leadData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Lead creation successful!');
    console.log('   Lead ID:', leadResponse.data.data?.[0]?.details?.id);
    console.log('   Status:', leadResponse.data.data?.[0]?.status);
    return true;
  } catch (error) {
    console.error('❌ Lead creation failed:', error.response?.data);
    console.log('   Status:', error.response?.status);
    
    if (error.response?.status === 401) {
      console.log('   → Token is invalid or expired');
    } else if (error.response?.status === 403) {
      console.log('   → Insufficient permissions');
    }
    return false;
  }
}

verifyTokenDirect().catch(console.error);