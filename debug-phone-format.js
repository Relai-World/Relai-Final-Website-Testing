// Debug phone number formatting for Zoho CRM
const testPhoneFormats = [
  '+911234567890',
  '+919876543210',
  '1234567890',
  '919876543210',
  '91-9876543210',
  '+91 9876543210',
  '9876543210',
  '+1234567890',
  '447712345678'
];

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

console.log('Phone Number Formatting Test for Zoho CRM:');
console.log('===========================================');

testPhoneFormats.forEach(phone => {
  const formatted = formatPhoneForZoho(phone);
  console.log(`Input: ${phone.padEnd(16)} -> Output: ${formatted}`);
});

// Test with actual API call format
console.log('\n=== Testing with actual form data ===');
const testFormData = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '+911234567890'
};

const formattedPhone = formatPhoneForZoho(testFormData.phone);
console.log(`Original phone: ${testFormData.phone}`);
console.log(`Formatted phone: ${formattedPhone}`);
console.log(`Length: ${formattedPhone ? formattedPhone.length : 'N/A'}`);
console.log(`Starts with 91: ${formattedPhone ? formattedPhone.startsWith('91') : 'N/A'}`);