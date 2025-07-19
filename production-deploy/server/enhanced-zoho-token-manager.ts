import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  client_id: string;
  client_secret: string;
  last_refresh_attempt: number;
}

class EnhancedZohoTokenManager {
  private tokenFile = path.join(process.cwd(), '.zoho-tokens.json');
  private tokenData: TokenData | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshAttempts = 0;
  private maxRefreshAttempts = 3;
  private rateLimitCooldown = 0;
  private lastApiCall = 0;
  private minApiInterval = 2000; // 2 seconds minimum between API calls

  constructor() {
    this.loadTokensFromFile();
    this.startAutoRefresh();
  }

  private loadTokensFromFile() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
        this.tokenData = {
          ...data,
          last_refresh_attempt: data.last_refresh_attempt || 0
        };
        console.log('✅ Loaded Zoho tokens from file');
      }
    } catch (error) {
      console.error('❌ Error loading tokens from file:', error);
    }
  }

  private saveTokensToFile() {
    try {
      if (this.tokenData) {
        fs.writeFileSync(this.tokenFile, JSON.stringify(this.tokenData, null, 2));
        console.log('💾 Saved Zoho tokens to file');
      }
    } catch (error) {
      console.error('❌ Error saving tokens to file:', error);
    }
  }

  private startAutoRefresh() {
    // Disable automatic refresh during rate limiting
    console.log('🔄 Auto-refresh disabled due to rate limiting. Manual token generation required.');
    // 
    // this.refreshInterval = setInterval(() => {
    //   this.checkAndRefreshTokens();
    // }, 60000); // 60 seconds

    // setTimeout(() => {
    //   this.checkAndRefreshTokens();
    // }, 1000);
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    
    // Check if we're in cooldown period
    if (this.rateLimitCooldown > now) {
      const remaining = Math.ceil((this.rateLimitCooldown - now) / 1000);
      console.log(`⏳ Rate limit cooldown: ${remaining} seconds remaining`);
      return true;
    }
    
    // Check minimum interval between API calls
    if (this.lastApiCall > 0 && (now - this.lastApiCall) < this.minApiInterval) {
      console.log(`⏳ Minimum API interval not met, waiting...`);
      return true;
    }
    
    return false;
  }

  private setRateLimitCooldown(seconds: number = 300) {
    this.rateLimitCooldown = Date.now() + (seconds * 1000);
    console.log(`🚨 Rate limit detected, cooldown set for ${seconds} seconds`);
  }

  private async checkAndRefreshTokens() {
    if (this.isRefreshing || !this.tokenData || this.isRateLimited()) return;

    const now = Date.now();
    const timeUntilExpiry = this.tokenData.expires_at - now;
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60000);

    // Refresh if token expires in less than 5 minutes or is already expired
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log(`🔄 Token expires in ${minutesUntilExpiry} minutes, refreshing...`);
      await this.refreshAccessToken();
    } else {
      console.log(`✅ Token valid for ${minutesUntilExpiry} minutes`);
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing || !this.tokenData || this.isRateLimited()) return false;

    this.isRefreshing = true;
    this.tokenData.last_refresh_attempt = Date.now();
    this.lastApiCall = Date.now();

    try {
      console.log('🔄 Attempting to refresh access token...');
      
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: this.tokenData.client_id,
          client_secret: this.tokenData.client_secret,
          refresh_token: this.tokenData.refresh_token
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data.access_token) {
        this.tokenData.access_token = response.data.access_token;
        this.tokenData.expires_at = Date.now() + (response.data.expires_in * 1000);
        
        // Update refresh token if provided
        if (response.data.refresh_token) {
          this.tokenData.refresh_token = response.data.refresh_token;
        }
        
        this.saveTokensToFile();
        this.refreshAttempts = 0; // Reset attempts on success
        
        console.log('✅ Access token refreshed successfully');
        console.log(`🕒 New token valid for ${response.data.expires_in} seconds`);
        
        return true;
      }
    } catch (error: any) {
      this.refreshAttempts++;
      const errorData = error.response?.data || error.message;
      console.error(`❌ Token refresh failed (attempt ${this.refreshAttempts}/${this.maxRefreshAttempts}):`, errorData);
      
      // Check for rate limiting
      if (typeof errorData === 'object' && errorData.error === 'Access Denied' && 
          errorData.error_description?.includes('too many requests')) {
        console.log('🚨 Rate limit detected during token refresh');
        this.setRateLimitCooldown(600); // 10 minutes cooldown
        this.refreshAttempts = 0; // Reset attempts to prevent immediate failure
        return false;
      }
      
      // If we've exceeded max attempts, try to get new tokens
      if (this.refreshAttempts >= this.maxRefreshAttempts) {
        console.log('🚨 Max refresh attempts reached. Token refresh system needs new authorization code.');
        await this.handleTokenExpiry();
      }
    } finally {
      this.isRefreshing = false;
    }

    return false;
  }

  private async handleTokenExpiry() {
    console.log('⚠️  Token refresh failed multiple times. Attempting fallback recovery...');
    
    // Try to use environment variables as fallback
    const fallbackAccessToken = process.env.ZOHO_ACCESS_TOKEN;
    const fallbackRefreshToken = process.env.ZOHO_REFRESH_TOKEN;
    
    if (fallbackAccessToken && fallbackRefreshToken) {
      console.log('🔄 Using fallback tokens from environment variables');
      this.initializeWithManualTokens(
        fallbackAccessToken, 
        fallbackRefreshToken, 
        this.tokenData?.client_id || process.env.ZOHO_CLIENT_ID || '',
        this.tokenData?.client_secret || process.env.ZOHO_CLIENT_SECRET || ''
      );
      this.refreshAttempts = 0;
    } else {
      console.log('💡 No fallback tokens available. Manual intervention required.');
    }
  }

  public initializeWithManualTokens(accessToken: string, refreshToken: string, clientId: string, clientSecret: string) {
    this.tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (3600 * 1000), // 1 hour from now
      client_id: clientId,
      client_secret: clientSecret,
      last_refresh_attempt: 0
    };
    this.saveTokensToFile();
    this.refreshAttempts = 0;
    console.log('✅ Initialized with manual tokens');
  }

  public async getValidAccessToken(): Promise<string> {
    if (!this.tokenData) {
      throw new Error('No token data available. Please initialize with manual tokens first.');
    }

    const now = Date.now();
    const timeUntilExpiry = this.tokenData.expires_at - now;

    // If token is expired or expires soon, try to refresh it
    if (timeUntilExpiry < 2 * 60 * 1000) { // Less than 2 minutes
      console.log('🔄 Token expires soon, attempting refresh...');
      const refreshSuccess = await this.refreshAccessToken();
      if (!refreshSuccess) {
        console.log('❌ Token refresh failed. Tokens may be invalid. Please generate new tokens.');
        throw new Error('Unable to refresh token. Please generate new tokens using the admin interface.');
      }
    }

    return this.tokenData.access_token;
  }

  public getTokenStatus() {
    if (!this.tokenData) {
      return { 
        status: 'no_tokens', 
        message: 'No tokens available',
        expires_in: 0,
        refresh_attempts: 0
      };
    }

    const timeToExpiry = this.tokenData.expires_at - Date.now();
    const minutesToExpiry = Math.floor(timeToExpiry / 60000);

    return {
      status: timeToExpiry <= 0 ? 'expired' : timeToExpiry < 5 * 60 * 1000 ? 'expiring_soon' : 'valid',
      message: timeToExpiry <= 0 ? 'Token expired' : `Token valid for ${minutesToExpiry} minutes`,
      expires_in: Math.max(0, minutesToExpiry),
      refresh_attempts: this.refreshAttempts,
      last_refresh_attempt: this.tokenData.last_refresh_attempt
    };
  }

  public async testTokenValidity(): Promise<boolean> {
    try {
      const token = await this.getValidAccessToken();
      
      const response = await axios.get('https://www.zohoapis.in/crm/v2/settings/modules', {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  public destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Create singleton instance
const enhancedZohoTokenManager = new EnhancedZohoTokenManager();

export default enhancedZohoTokenManager;