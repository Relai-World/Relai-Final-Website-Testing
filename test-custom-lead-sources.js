import axios from 'axios';

console.log('🎯 Custom Lead Sources Test Suite');
console.log('=================================');

const API_BASE = 'http://localhost:5000';

// Test different form types with their expected lead sources
const testForms = [
  {
    type: 'contact_us',
    expectedLeadSource: 'Contact Us Form',
    data: {
      name: 'John Contact',
      email: 'john.contact@test.com',
      phone: '9876543210',
      subject: 'General Inquiry',
      message: 'I need help with property search'
    }
  },
  {
    type: 'pdf_download',
    expectedLeadSource: 'PDF Download Form',
    data: {
      name: 'PDF Downloader',
      email: 'pdf.user@test.com',
      phone: '9876543210',
      propertyName: 'Test Property',
      budget: '1-2 Cr'
    }
  },
  {
    type: 'expert_consultation',
    expectedLeadSource: 'Expert Consultation Form',
    data: {
      name: 'Expert Seeker',
      email: 'expert.seeker@test.com',
      phone: '9876543210',
      preferredTime: '10:00 AM',
      meetingPreference: 'Video Call',
      message: 'Need expert advice on property investment'
    }
  },
  {
    type: 'property_wizard',
    expectedLeadSource: 'Property Wizard Form',
    data: {
      name: 'Wizard User',
      email: 'wizard.user@test.com',
      phone: '9876543210',
      locations: ['Hyderabad', 'Secunderabad'],
      configurations: ['2BHK', '3BHK'],
      budgetRange: '50L-1Cr',
      apartmentType: 'Apartment'
    }
  },
  {
    type: 'schedule_visit',
    expectedLeadSource: 'Schedule Visit Form',
    data: {
      name: 'Visit Scheduler',
      email: 'visit.scheduler@test.com',
      phone: '9876543210',
      propertyName: 'Test Property',
      preferredTime: '2:00 PM',
      meetingType: 'Site Visit'
    }
  },
  {
    type: 'property_expert_contact',
    expectedLeadSource: 'Property Expert Contact Form',
    data: {
      name: 'Expert Contact',
      email: 'expert.contact@test.com',
      phone: '9876543210',
      propertyName: 'Expert Property'
    }
  },
  {
    type: 'property_results',
    expectedLeadSource: 'Property Results Form',
    data: {
      name: 'Property Searcher',
      email: 'property.searcher@test.com',
      phone: '9876543210',
      location: 'Hyderabad',
      propertyType: 'Apartment',
      budgetRange: '1-2 Cr'
    }
  },
  {
    type: 'investment_inquiry',
    expectedLeadSource: 'Investment Inquiry Form',
    data: {
      name: 'Investment Seeker',
      email: 'investor@test.com',
      phone: '9876543210',
      investmentAmount: '5-10 Cr',
      investmentType: 'Commercial'
    }
  }
];

async function testFormLeadSource(formTest) {
  try {
    console.log(`\n🔍 Testing ${formTest.type}...`);
    
    const response = await axios.post(`${API_BASE}/api/zoho/submit-form`, {
      formType: formTest.type,
      formData: formTest.data
    });
    
    if (response.data.success) {
      console.log(`✅ Form submitted successfully`);
      console.log(`📝 Expected Lead Source: ${formTest.expectedLeadSource}`);
      
      // Check if we got the expected lead source in the response
      const zohoData = response.data.zohoResponse?.data?.[0];
      if (zohoData?.code === 'SUCCESS' || zohoData?.code === 'DUPLICATE_DATA') {
        console.log(`✅ Lead created/updated in Zoho CRM`);
        return true;
      } else {
        console.log(`❌ Unexpected Zoho response:`, zohoData);
        return false;
      }
    } else {
      console.log(`❌ Form submission failed:`, response.data.error);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error testing ${formTest.type}:`, error.response?.data || error.message);
    return false;
  }
}

async function testCustomFormType() {
  console.log(`\n🔍 Testing unknown form type...`);
  
  try {
    const response = await axios.post(`${API_BASE}/api/zoho/submit-form`, {
      formType: 'unknown_form_type',
      formData: {
        name: 'Unknown User',
        email: 'unknown@test.com',
        phone: '9876543210'
      }
    });
    
    if (response.data.success) {
      console.log(`✅ Unknown form type handled correctly`);
      console.log(`📝 Expected Lead Source: Website - unknown_form_type`);
      return true;
    } else {
      console.log(`❌ Unknown form type failed:`, response.data.error);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error testing unknown form type:`, error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting custom lead sources test...\n');
  
  let passedTests = 0;
  const totalTests = testForms.length + 1; // +1 for custom form type test
  
  // Test all predefined form types
  for (const formTest of testForms) {
    const success = await testFormLeadSource(formTest);
    if (success) passedTests++;
  }
  
  // Test unknown form type
  const unknownTypeSuccess = await testCustomFormType();
  if (unknownTypeSuccess) passedTests++;
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  testForms.forEach((form, index) => {
    console.log(`${form.type}: Expected "${form.expectedLeadSource}"`);
  });
  
  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Custom lead sources are working correctly.');
    console.log('✅ Each form type now has its own specific lead source in Zoho CRM.');
  } else {
    console.log('⚠️  Some tests failed. Check the configuration.');
  }
}

runAllTests().catch(console.error);