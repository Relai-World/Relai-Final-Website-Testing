import enhancedZohoTokenManager from './server/enhanced-zoho-token-manager.ts';

async function forceRefresh() {
  try {
    console.log('🔄 Forcing token refresh...');
    
    // Get current token status
    const statusBefore = enhancedZohoTokenManager.getTokenStatus();
    console.log('Status before refresh:', statusBefore);
    
    // Try to get a valid token (this will trigger refresh if needed)
    const token = await enhancedZohoTokenManager.getValidAccessToken();
    console.log('✅ Got token:', token.substring(0, 20) + '...');
    
    // Test the token validity
    const isValid = await enhancedZohoTokenManager.testTokenValidity();
    console.log('Token validity test:', isValid);
    
    // Get status after refresh
    const statusAfter = enhancedZohoTokenManager.getTokenStatus();
    console.log('Status after refresh:', statusAfter);
    
  } catch (error) {
    console.error('❌ Force refresh failed:', error.message);
  }
}

forceRefresh();