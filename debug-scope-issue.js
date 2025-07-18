import axios from 'axios';
import fs from 'fs';

async function debugScopeIssue() {
  console.log('🔍 DEBUGGING ZOHO SCOPE ISSUE');
  console.log('=============================');
  
  try {
    // Read current token
    const tokenData = JSON.parse(fs.readFileSync('.zoho-tokens.json', 'utf8'));
    
    // Test what the current token can access
    console.log('🧪 Testing current token capabilities...');
    
    const testEndpoints = [
      { name: 'Basic Info', url: 'https://www.zohoapis.in/crm/v2/org' },
      { name: 'Modules', url: 'https://www.zohoapis.in/crm/v2/settings/modules' },
      { name: 'Leads', url: 'https://www.zohoapis.in/crm/v2/Leads?per_page=1' },
      { name: 'Users', url: 'https://www.zohoapis.in/crm/v2/users' }
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await axios.get(endpoint.url, {
          headers: {
            'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`✅ ${endpoint.name}: SUCCESS`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.response?.data?.message || error.message}`);
      }
    }
    
    // Show what scopes were likely granted
    console.log('\n📋 DIAGNOSIS:');
    console.log('The current token was generated with insufficient scopes.');
    console.log('When you initially authorized the application, it may have had limited permissions.');
    console.log('\n🔧 SOLUTION:');
    console.log('You need to re-authorize with full CRM permissions using these URLs:');
    
    const authUrls = [
      'https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=1000.9IIMHF093P714UDRP127QMAOGBD0ZU&response_type=code&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob&access_type=offline',
      'https://accounts.zoho.in/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=1000.9IIMHF093P714UDRP127QMAOGBD0ZU&response_type=code&redirect_uri=https%3A%2F%2Fdeveloper.zoho.in&access_type=offline'
    ];
    
    authUrls.forEach((url, index) => {
      console.log(`\n${index + 1}. ${url}`);
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugScopeIssue();