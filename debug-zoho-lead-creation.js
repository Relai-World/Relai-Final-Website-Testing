import axios from 'axios';

// Test lead creation step by step
async function debugLeadCreation() {
  console.log('🔍 Debugging Zoho Lead Creation Process');
  console.log('=====================================');
  
  // Step 1: Check token status
  console.log('\n1. Checking token status...');
  try {
    const tokenResponse = await axios.get('http://localhost:5000/api/zoho/token-status');
    console.log('✅ Token Status:', JSON.stringify(tokenResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Token status check failed:', error.message);
    return;
  }
  
  // Step 2: Test direct token validation
  console.log('\n2. Testing direct token validation...');
  try {
    const healthResponse = await axios.get('http://localhost:5000/api/zoho/health');
    console.log('✅ Health Check:', JSON.stringify(healthResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
  
  // Step 3: Test phone number formatting
  console.log('\n3. Testing phone number formatting...');
  const testPhone = '+911234567890';
  
  function formatPhoneForZoho(phone) {
    if (!phone) return undefined;
    
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +91, remove the + and keep as is
    if (cleaned.startsWith('+91')) {
      return cleaned.substring(1); // Remove the + symbol
    }
    
    // If it starts with +, remove the + symbol
    if (cleaned.startsWith('+')) {
      return cleaned.substring(1);
    }
    
    // If it's a 10-digit number, assume it's Indian and add 91
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      return '91' + cleaned;
    }
    
    // If it's already 12 digits and starts with 91, keep as is
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // Return as is for other cases
    return cleaned;
  }
  
  const formattedPhone = formatPhoneForZoho(testPhone);
  console.log(`Original phone: ${testPhone}`);
  console.log(`Formatted phone: ${formattedPhone}`);
  console.log(`Length: ${formattedPhone.length}`);
  console.log(`Starts with 91: ${formattedPhone.startsWith('91')}`);
  
  // Step 4: Test form data preparation
  console.log('\n4. Testing form data preparation...');
  const testFormData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: testPhone,
    subject: 'Test Lead',
    message: 'Testing Zoho CRM integration'
  };
  
  const preparedData = {
    Last_Name: testFormData.name,
    Email: testFormData.email,
    Phone: formattedPhone,
    Mobile: formattedPhone,
    Lead_Source: 'Contact Us Form',
    Lead_Status: 'Not Contacted',
    Form_Type: 'contact_us',
    Description: `Subject: ${testFormData.subject}\nMessage: ${testFormData.message}`
  };
  
  console.log('Prepared lead data:', JSON.stringify(preparedData, null, 2));
  
  // Step 5: Test actual form submission
  console.log('\n5. Testing actual form submission...');
  try {
    const submitResponse = await axios.post('http://localhost:5000/api/zoho/submit-form', {
      formData: testFormData,
      formType: 'contact_us'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('✅ Form submission successful:', JSON.stringify(submitResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Form submission failed:', error.response?.data || error.message);
    
    // If it's a 500 error, let's check what the actual error details are
    if (error.response?.status === 500) {
      console.log('\n6. Analyzing server error...');
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // Step 6: Test connection health
  console.log('\n7. Testing Zoho connection health...');
  try {
    const connectionResponse = await axios.get('http://localhost:5000/api/zoho/test-connection');
    console.log('✅ Connection test:', JSON.stringify(connectionResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Connection test failed:', error.response?.data || error.message);
  }
}

debugLeadCreation().catch(console.error);