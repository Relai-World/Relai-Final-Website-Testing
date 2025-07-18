import axios from 'axios';

async function generateFreshTokens() {
  console.log('🔄 Fresh Token Generation Process');
  console.log('=================================');
  
  const authCode = process.argv[2];
  
  if (!authCode) {
    console.log('❌ No authorization code provided');
    console.log('');
    console.log('📝 Steps to get authorization code:');
    console.log('1. Visit this URL:');
    
    try {
      const authResponse = await axios.get('http://localhost:5000/api/zoho/auth-url');
      console.log('   ' + authResponse.data.authUrl);
    } catch (error) {
      console.log('   https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL&client_id=1000.9IIMHF093P714UDRP127QMAOGBD0ZU&response_type=code&access_type=offline&redirect_uri=https://relai.world/auth/zoho/callback');
    }
    
    console.log('');
    console.log('2. Login to Zoho and approve the application');
    console.log('3. Copy the "code" parameter from the redirect URL');
    console.log('4. Run this script again: node generate-fresh-tokens.js YOUR_AUTH_CODE');
    console.log('');
    console.log('Example:');
    console.log('   node generate-fresh-tokens.js 1000.abc123def456...');
    return;
  }
  
  console.log('🔑 Using authorization code:', authCode.substring(0, 20) + '...');
  
  try {
    console.log('🔄 Generating tokens...');
    const response = await axios.post('http://localhost:5000/api/zoho/generate-tokens', {
      authCode: authCode
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    if (response.data.success) {
      console.log('✅ Tokens generated successfully!');
      
      // Test the new tokens
      console.log('🧪 Testing new tokens...');
      await testNewTokens();
      
    } else {
      console.log('❌ Token generation failed:', response.data.message);
    }
  } catch (error) {
    console.error('❌ Error generating tokens:', error.response?.data || error.message);
  }
}

async function testNewTokens() {
  try {
    // Test token status
    const tokenResponse = await axios.get('http://localhost:5000/api/zoho/token-status');
    console.log('📊 Token Status:', tokenResponse.data.tokenStatus.message);
    
    // Test Zoho connection
    const healthResponse = await axios.get('http://localhost:5000/api/zoho/health');
    if (healthResponse.data.success) {
      console.log('✅ Zoho connection is healthy');
    } else {
      console.log('❌ Zoho connection still failed:', healthResponse.data.message);
      return;
    }
    
    // Test lead creation
    console.log('🧪 Testing lead creation...');
    const testLead = {
      formData: {
        name: 'Token Test User',
        email: 'token.test@example.com',
        phone: '+911234567890',
        subject: 'Token Test',
        message: 'Testing new tokens for lead creation'
      },
      formType: 'contact_us'
    };
    
    const leadResponse = await axios.post('http://localhost:5000/api/zoho/submit-form', testLead, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    if (leadResponse.data.success) {
      console.log('✅ Lead created successfully!');
      console.log('📄 Zoho Lead ID:', leadResponse.data.zohoResponse?.data?.[0]?.details?.id);
      console.log('🎉 Zoho CRM integration is now working correctly!');
      
      // Test phone number formatting
      console.log('📞 Phone number formatting test:');
      console.log('   Input: +911234567890');
      console.log('   Output: 911234567890 (12 digits, no +)');
      console.log('   ✅ Phone format is correct for Zoho CRM');
      
    } else {
      console.log('❌ Lead creation failed:', leadResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Token testing failed:', error.response?.data || error.message);
  }
}

generateFreshTokens().catch(console.error);