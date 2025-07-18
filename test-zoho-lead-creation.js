import axios from 'axios';

// Step-by-step lead creation testing
async function testLeadCreation() {
  console.log('🧪 Testing Zoho Lead Creation End-to-End');
  console.log('==========================================');
  
  // Test data with various phone formats
  const testCases = [
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+911234567890',
      subject: 'Test Lead 1',
      message: 'Testing with +91 format'
    },
    {
      name: 'Jane Smith', 
      email: 'jane.smith@example.com',
      phone: '9876543210',
      subject: 'Test Lead 2',
      message: 'Testing with 10-digit format'
    },
    {
      name: 'Test User',
      email: 'test.user@example.com',
      phone: '919876543210',
      subject: 'Test Lead 3',
      message: 'Testing with 91 prefix format'
    }
  ];
  
  console.log('\n1. Checking current token status...');
  try {
    const tokenResponse = await axios.get('http://localhost:5000/api/zoho/token-status');
    console.log('Token Status:', tokenResponse.data.tokenStatus.message);
    console.log('Access Token expires in:', tokenResponse.data.tokenStatus.expires_in, 'minutes');
    console.log('Refresh Token expires in:', tokenResponse.data.tokenStatus.refresh_expires_in, 'days');
    console.log('Backup count:', tokenResponse.data.tokenStatus.backup_count);
  } catch (error) {
    console.error('❌ Token status check failed:', error.message);
  }
  
  console.log('\n2. Testing Zoho API connection...');
  try {
    const healthResponse = await axios.get('http://localhost:5000/api/zoho/health');
    if (healthResponse.data.success) {
      console.log('✅ Zoho API connection is healthy');
    } else {
      console.log('❌ Zoho API connection failed:', healthResponse.data.message);
      console.log('Needs auth:', healthResponse.data.needsAuth);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
  
  console.log('\n3. Testing lead creation with different phone formats...');
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n--- Test Case ${i + 1}: ${testCase.name} ---`);
    console.log(`Phone: ${testCase.phone}`);
    
    try {
      const response = await axios.post('http://localhost:5000/api/zoho/submit-form', {
        formData: testCase,
        formType: 'contact_us'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      if (response.data.success) {
        console.log('✅ Lead created successfully!');
        console.log('Zoho Response:', JSON.stringify(response.data.zohoResponse, null, 2));
      } else {
        console.log('❌ Lead creation failed:', response.data.message);
      }
    } catch (error) {
      console.log('❌ Request failed:', error.response?.data?.error || error.message);
      
      // If it's a token issue, we need to regenerate
      if (error.response?.data?.error === 'Failed to create lead in Zoho CRM') {
        console.log('🔄 This appears to be a token issue. Tokens need to be regenerated.');
        break;
      }
    }
  }
  
  console.log('\n4. Phone number formatting validation...');
  
  // Test phone formatting function
  function formatPhoneForZoho(phone) {
    if (!phone) return undefined;
    
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    if (cleaned.startsWith('+91')) {
      return cleaned.substring(1);
    }
    
    if (cleaned.startsWith('+')) {
      return cleaned.substring(1);
    }
    
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      return '91' + cleaned;
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    return cleaned;
  }
  
  testCases.forEach(testCase => {
    const formatted = formatPhoneForZoho(testCase.phone);
    console.log(`${testCase.phone} → ${formatted} (${formatted.length} digits)`);
  });
  
  console.log('\n5. Next steps if tokens are invalid:');
  console.log('   a. Visit authorization URL to get new code');
  console.log('   b. Use admin interface to generate new tokens');
  console.log('   c. Test lead creation again');
  
  // Get auth URL for convenience
  try {
    const authResponse = await axios.get('http://localhost:5000/api/zoho/auth-url');
    if (authResponse.data.success) {
      console.log('\n🔗 Authorization URL:', authResponse.data.authUrl);
    }
  } catch (error) {
    console.error('❌ Failed to get auth URL:', error.message);
  }
}

testLeadCreation().catch(console.error);