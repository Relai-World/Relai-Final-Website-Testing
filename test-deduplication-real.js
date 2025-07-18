import axios from 'axios';

async function testRealDeduplication() {
  console.log('🧪 Testing Real Lead Deduplication');
  console.log('=================================');
  
  const testPhone = '9876543210';
  
  try {
    // Test 1: First contact form submission (should create new lead)
    console.log('📋 Test 1: First contact form submission...');
    const response1 = await axios.post('http://localhost:5000/api/contact', {
      name: 'First Contact Test',
      email: 'first@test.com',
      phone: testPhone,
      message: 'First contact form submission'
    });
    
    console.log('✅ First submission successful');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Second contact form submission with same phone (should update existing lead)
    console.log('📋 Test 2: Second contact form submission with same phone...');
    const response2 = await axios.post('http://localhost:5000/api/contact', {
      name: 'Second Contact Test',
      email: 'second@test.com',
      phone: testPhone,
      message: 'Second contact form submission - should update existing lead'
    });
    
    console.log('✅ Second submission successful');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: PDF form submission with same phone (should update existing lead)
    console.log('📋 Test 3: PDF form submission with same phone...');
    const response3 = await axios.post('http://localhost:5000/api/pdf-download', {
      name: 'PDF Test User',
      email: 'pdf@test.com',
      phone: testPhone
    });
    
    console.log('✅ PDF submission successful');
    
    console.log('');
    console.log('🎉 Deduplication test completed!');
    console.log('✅ All three submissions processed successfully');
    console.log('🔍 Check server logs to confirm deduplication behavior');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRealDeduplication();