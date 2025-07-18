import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  client_id: string;
  client_secret: string;
}

class ZohoTokenManager {
  private tokenFile = path.join(process.cwd(), '.zoho-tokens.json');
  private tokenData: TokenData | null = null;

  constructor() {
    this.loadTokensFromFile();
    
    // Schedule automatic token refresh if tokens are available
    if (this.tokenData) {
      this.scheduleTokenRefresh();
    }
  }

  private loadTokensFromFile() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
        this.tokenData = data;
        console.log('Loaded Zoho tokens from file');
      }
    } catch (error) {
      console.error('Error loading tokens from file:', error);
    }
  }

  private saveTokensToFile() {
    try {
      if (this.tokenData) {
        fs.writeFileSync(this.tokenFile, JSON.stringify(this.tokenData, null, 2));
        console.log('Saved Zoho tokens to file');
      }
    } catch (error) {
      console.error('Error saving tokens to file:', error);
    }
  }

  // Initialize with manual tokens
  public initializeWithManualTokens(accessToken: string, refreshToken: string, clientId: string, clientSecret: string) {
    this.tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (3600 * 1000), // 1 hour from now
      client_id: clientId,
      client_secret: clientSecret
    };
    this.saveTokensToFile();
    console.log('Initialized with manual tokens');
  }

  // Get valid access token (refresh if needed)
  public async getValidAccessToken(): Promise<string> {
    if (!this.tokenData) {
      throw new Error('No token data available. Please initialize with manual tokens first.');
    }

    // If token is still valid, return it
    if (Date.now() < this.tokenData.expires_at - 60000) { // 1 minute buffer
      return this.tokenData.access_token;
    }

    // Try to refresh the token
    try {
      console.log('Attempting to refresh access token...');
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: this.tokenData.client_id,
          client_secret: this.tokenData.client_secret,
          refresh_token: this.tokenData.refresh_token
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.access_token) {
        this.tokenData.access_token = response.data.access_token;
        this.tokenData.expires_at = Date.now() + (response.data.expires_in * 1000);
        
        // Update refresh token if provided
        if (response.data.refresh_token) {
          this.tokenData.refresh_token = response.data.refresh_token;
        }
        
        this.saveTokensToFile();
        console.log('Access token refreshed successfully');
        return this.tokenData.access_token;
      }
    } catch (error: any) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      console.log('⚠️  Manual token refresh needed. Use: node manual-token-refresh.js');
      
      // If refresh fails, the token is invalid - need manual intervention
      throw new Error('Token refresh failed. Manual token update required.');
    }

    throw new Error('Unable to get valid access token');
  }

  // Update tokens manually (for when refresh fails)
  public updateTokensManually(accessToken: string, refreshToken?: string) {
    if (this.tokenData) {
      this.tokenData.access_token = accessToken;
      this.tokenData.expires_at = Date.now() + (3600 * 1000);
      
      if (refreshToken) {
        this.tokenData.refresh_token = refreshToken;
      }
      
      this.saveTokensToFile();
      console.log('Tokens updated manually');
    }
  }

  // Get token status
  public getTokenStatus() {
    if (!this.tokenData) {
      return { status: 'no_tokens', message: 'No tokens available' };
    }

    const timeToExpiry = this.tokenData.expires_at - Date.now();
    const minutesToExpiry = Math.floor(timeToExpiry / 60000);

    if (timeToExpiry <= 0) {
      return { status: 'expired', message: 'Token expired' };
    } else if (timeToExpiry < 300000) { // Less than 5 minutes
      return { status: 'expiring_soon', message: `Token expires in ${minutesToExpiry} minutes` };
    } else {
      return { status: 'valid', message: `Token valid for ${minutesToExpiry} minutes` };
    }
  }

  // Schedule automatic token refresh
  public scheduleTokenRefresh(): void {
    if (!this.tokenData) {
      console.log('⚠️  No token data available for scheduling refresh');
      return;
    }

    const now = Date.now();
    const tokenExpiry = this.tokenData.expires_at;
    const refreshTime = tokenExpiry - (15 * 60 * 1000); // Refresh 15 minutes before expiry
    const timeUntilRefresh = Math.max(0, refreshTime - now);

    if (timeUntilRefresh > 0) {
      console.log(`🕒 Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);

      setTimeout(async () => {
        try {
          await this.getValidAccessToken();
          console.log('✅ Scheduled token refresh completed');
          
          // Schedule next refresh
          this.scheduleTokenRefresh();
        } catch (error) {
          console.error('❌ Scheduled token refresh failed:', error);
          console.log('⚠️  Manual token refresh needed. Use: node manual-token-refresh.js');
        }
      }, timeUntilRefresh);
    } else {
      console.log('⚠️  Token already expired or expiring soon');
    }
  }
}

export default new ZohoTokenManager();