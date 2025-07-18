import axios from 'axios';

// Test with the access token you provided directly
const ACCESS_TOKEN = '1000.871a34732549243dfca3c5e4f2389caf.1e3d47e40f3d1366ff901af9ab87d5fb';

console.log('🔍 Testing Zoho CRM with direct access token...');

async function testCreateLead() {
  try {
    const leadData = {
      data: [{
        Last_Name: 'Test Integration',
        First_Name: 'Relai',
        Email: 'test@relai.world',
        Phone: '9876543210',
        Company: 'Relai Real Estate',
        Lead_Source: 'Website',
        Lead_Status: 'Not Contacted',
        Description: 'Test lead from website form integration',
        Form_Type: 'Integration Test',
        Property_Type: 'Apartment',
        Budget_Range: '50L-1Cr',
        Preferred_Location: 'Hyderabad'
      }]
    };
    
    const response = await axios.post('https://www.zohoapis.in/crm/v2/Leads', leadData, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Lead created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.log('❌ Lead creation failed:');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    return false;
  }
}

// Test retrieving leads
async function testGetLeads() {
  try {
    const response = await axios.get('https://www.zohoapis.in/crm/v2/Leads', {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      }
    });
    
    console.log('✅ Successfully retrieved leads!');
    console.log('Number of leads:', response.data.data?.length || 0);
    
    return true;
  } catch (error) {
    console.log('❌ Failed to retrieve leads:');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    return false;
  }
}

async function runTests() {
  console.log('Testing lead creation...');
  const createSuccess = await testCreateLead();
  
  console.log('\nTesting lead retrieval...');
  const retrieveSuccess = await testGetLeads();
  
  if (createSuccess && retrieveSuccess) {
    console.log('\n🎉 Zoho CRM integration is working!');
    console.log('✅ Can create leads');
    console.log('✅ Can retrieve leads');
    console.log('\nNext step: Set up automatic token refresh');
  } else {
    console.log('\n❌ Some tests failed. Check the error messages above.');
  }
}

runTests();