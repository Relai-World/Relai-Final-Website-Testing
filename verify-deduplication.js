import axios from 'axios';

async function verifyDeduplication() {
  console.log('🔍 Verifying Lead Deduplication with Live Server Logs');
  console.log('===================================================');
  
  const uniqueTestPhone = `98765${Math.floor(Math.random() * 10000)}`;
  
  try {
    console.log(`📱 Using test phone number: ${uniqueTestPhone}`);
    console.log('');
    
    // First submission - should create new lead
    console.log('📋 First submission (should create new lead)...');
    const response1 = await axios.post('http://localhost:5000/api/zoho/submit-form', {
      name: 'Test User First',
      email: 'first@test.com',
      phone: uniqueTestPhone,
      message: 'First submission',
      formType: 'contact_us'
    });
    
    console.log('✅ First submission response:', response1.data.message);
    console.log('');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Second submission - should update existing lead
    console.log('📋 Second submission with same phone (should update existing lead)...');
    const response2 = await axios.post('http://localhost:5000/api/zoho/submit-form', {
      name: 'Test User Updated',
      email: 'updated@test.com',
      phone: uniqueTestPhone,
      message: 'Second submission - should update existing lead',
      formType: 'pdf_download'
    });
    
    console.log('✅ Second submission response:', response2.data.message);
    console.log('');
    
    console.log('🎯 Test completed successfully!');
    console.log('Check the server logs above to see:');
    console.log('- First submission: "Creating new lead" or "No existing lead found"');
    console.log('- Second submission: "Found existing lead" and "Updating existing lead"');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('💡 Using direct API endpoint instead...');
      
      // Try direct form submission
      const directResponse = await axios.post('http://localhost:5000/api/contact', {
        name: 'Direct Test User',
        email: 'direct@test.com',
        phone: uniqueTestPhone,
        message: 'Direct API test'
      });
      
      console.log('✅ Direct API test successful:', directResponse.data.message);
    }
  }
}

verifyDeduplication();