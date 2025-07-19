import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface TokenGenerationConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

class ZohoAutoTokenGenerator {
  private config: TokenGenerationConfig;
  private tokenFile = path.join(process.cwd(), '.zoho-tokens.json');
  private authCodeFile = path.join(process.cwd(), '.zoho-auth-code.json');
  
  constructor() {
    this.config = {
      clientId: process.env.ZOHO_CLIENT_ID || '1000.9IIMHF093P714UDRP127QMAOGBD0ZU',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec',
      redirectUri: 'https://relai.world/auth/zoho/callback',
      scope: 'ZohoCRM.modules.ALL'
    };
  }

  // Generate authorization URL
  generateAuthURL(): string {
    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?` +
      `scope=${this.config.scope}&` +
      `client_id=${this.config.clientId}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `redirect_uri=${this.config.redirectUri}`;
    
    return authUrl;
  }

  // Save authorization code for later use
  saveAuthCode(authCode: string): void {
    const authData = {
      code: authCode,
      timestamp: Date.now(),
      expires_at: Date.now() + (10 * 60 * 1000) // 10 minutes
    };
    
    fs.writeFileSync(this.authCodeFile, JSON.stringify(authData, null, 2));
    console.log('✅ Authorization code saved');
  }

  // Get stored authorization code if still valid
  getStoredAuthCode(): string | null {
    try {
      if (fs.existsSync(this.authCodeFile)) {
        const authData = JSON.parse(fs.readFileSync(this.authCodeFile, 'utf8'));
        
        if (Date.now() < authData.expires_at) {
          return authData.code;
        } else {
          console.log('⚠️  Stored authorization code has expired');
        }
      }
    } catch (error) {
      console.error('Error reading stored auth code:', error);
    }
    
    return null;
  }

  // Generate new tokens from authorization code
  async generateTokensFromAuthCode(authCode: string): Promise<boolean> {
    try {
      console.log('🔄 Generating new tokens from authorization code...');
      
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          code: authCode,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data.access_token) {
        const tokenData = {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          expires_at: Date.now() + (response.data.expires_in * 1000),
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          last_refresh_attempt: 0
        };

        fs.writeFileSync(this.tokenFile, JSON.stringify(tokenData, null, 2));
        console.log('✅ New tokens generated and saved successfully');
        console.log('Access token:', response.data.access_token.substring(0, 20) + '...');
        console.log('Refresh token:', response.data.refresh_token.substring(0, 20) + '...');
        console.log('Expires in:', response.data.expires_in, 'seconds');
        
        return true;
      }
    } catch (error: any) {
      console.error('❌ Token generation failed:', error.response?.data || error.message);
      
      if (error.response?.data?.error === 'invalid_code') {
        console.log('💡 Authorization code is invalid or expired. Please get a new one.');
        this.printAuthInstructions();
      }
    }
    
    return false;
  }

  // Attempt automatic token generation using stored auth code
  async attemptAutoTokenGeneration(): Promise<boolean> {
    const storedAuthCode = this.getStoredAuthCode();
    
    if (storedAuthCode) {
      console.log('🔄 Found stored authorization code, attempting token generation...');
      return await this.generateTokensFromAuthCode(storedAuthCode);
    }
    
    return false;
  }

  // Check if we can use environment variables for emergency tokens
  async useEmergencyTokens(): Promise<boolean> {
    const emergencyAccessToken = process.env.ZOHO_EMERGENCY_ACCESS_TOKEN;
    const emergencyRefreshToken = process.env.ZOHO_EMERGENCY_REFRESH_TOKEN;
    
    if (emergencyAccessToken && emergencyRefreshToken) {
      console.log('🚨 Using emergency tokens from environment variables');
      
      const tokenData = {
        access_token: emergencyAccessToken,
        refresh_token: emergencyRefreshToken,
        expires_at: Date.now() + (3600 * 1000), // 1 hour
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        last_refresh_attempt: 0
      };

      fs.writeFileSync(this.tokenFile, JSON.stringify(tokenData, null, 2));
      console.log('✅ Emergency tokens applied');
      return true;
    }
    
    return false;
  }

  // Print instructions for manual token generation
  printAuthInstructions(): void {
    console.log('\n=== ZOHO TOKEN GENERATION INSTRUCTIONS ===');
    console.log('1. Visit this URL to get a new authorization code:');
    console.log(this.generateAuthURL());
    console.log('\n2. After authorization, copy the code from the redirect URL');
    console.log('   Example: https://relai.world/auth/zoho/callback?code=YOUR_CODE_HERE');
    console.log('\n3. Use the code to generate new tokens:');
    console.log('   - Call API: POST /api/zoho/generate-tokens with {authCode: "YOUR_CODE"}');
    console.log('   - Or run: node -e "import(\\"./server/zoho-auto-token-generator.ts\\").then(m => m.default.generateTokensFromAuthCode(\\"YOUR_CODE\\"))"');
    console.log('\n⚠️  Note: Authorization codes expire in 10 minutes!');
    console.log('============================================\n');
  }

  // Comprehensive token recovery workflow
  async recoverTokens(): Promise<boolean> {
    console.log('🔄 Starting token recovery workflow...');
    
    // Step 1: Try stored auth code
    if (await this.attemptAutoTokenGeneration()) {
      return true;
    }
    
    // Step 2: Try emergency tokens
    if (await this.useEmergencyTokens()) {
      return true;
    }
    
    // Step 3: Manual intervention needed
    console.log('⚠️  Automatic token recovery failed. Manual intervention required.');
    this.printAuthInstructions();
    return false;
  }

  // Health check method
  async healthCheck(): Promise<{healthy: boolean, message: string, needsAuth: boolean}> {
    try {
      if (!fs.existsSync(this.tokenFile)) {
        return {
          healthy: false,
          message: 'No token file found. Token generation needed.',
          needsAuth: true
        };
      }

      const tokenData = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
      const timeUntilExpiry = tokenData.expires_at - Date.now();
      
      if (timeUntilExpiry <= 0) {
        return {
          healthy: false,
          message: 'Tokens have expired. Refresh or regeneration needed.',
          needsAuth: false
        };
      }

      // Test token validity
      const response = await axios.get('https://www.zohoapis.in/crm/v2/settings/modules', {
        headers: {
          'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return {
        healthy: true,
        message: `Tokens are healthy. Valid for ${Math.floor(timeUntilExpiry / 60000)} minutes.`,
        needsAuth: false
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          healthy: false,
          message: 'Tokens are invalid or revoked. Regeneration needed.',
          needsAuth: true
        };
      }
      
      return {
        healthy: false,
        message: `Health check failed: ${error.message}`,
        needsAuth: false
      };
    }
  }
}

export default new ZohoAutoTokenGenerator();