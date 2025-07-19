import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  client_id: string;
  client_secret: string;
  created_at: number;
  refresh_token_expires_at?: number;
}

interface BackupTokenSet {
  access_token: string;
  refresh_token: string;
  created_at: number;
  label: string;
}

class ZohoPersistentTokenManager {
  private tokenFile = path.join(process.cwd(), '.zoho-tokens.json');
  private backupTokensFile = path.join(process.cwd(), '.zoho-backup-tokens.json');
  private emergencyTokensFile = path.join(process.cwd(), '.zoho-emergency-tokens.json');
  
  private tokenData: TokenData | null = null;
  private backupTokens: BackupTokenSet[] = [];
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private rateLimitCooldown = 0;
  private lastApiCall = 0;
  private minApiInterval = 2000;
  
  private config = {
    clientId: process.env.ZOHO_CLIENT_ID || '1000.9IIMHF093P714UDRP127QMAOGBD0ZU',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec',
    redirectUri: 'https://relai.world/auth/zoho/callback',
    scope: 'ZohoCRM.modules.ALL'
  };

  constructor() {
    this.loadTokensFromFile();
    this.loadBackupTokens();
    this.startPersistentRefresh();
  }

  private loadTokensFromFile() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        this.tokenData = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
        console.log('✅ Loaded primary tokens from file');
      }
    } catch (error) {
      console.error('❌ Error loading primary tokens:', error);
    }
  }

  private loadBackupTokens() {
    try {
      if (fs.existsSync(this.backupTokensFile)) {
        this.backupTokens = JSON.parse(fs.readFileSync(this.backupTokensFile, 'utf8'));
        console.log(`✅ Loaded ${this.backupTokens.length} backup token sets`);
      }
    } catch (error) {
      console.error('❌ Error loading backup tokens:', error);
    }
  }

  private saveTokensToFile() {
    try {
      if (this.tokenData) {
        fs.writeFileSync(this.tokenFile, JSON.stringify(this.tokenData, null, 2));
        console.log('💾 Saved primary tokens to file');
      }
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
    }
  }

  private saveBackupTokens() {
    try {
      fs.writeFileSync(this.backupTokensFile, JSON.stringify(this.backupTokens, null, 2));
      console.log('💾 Saved backup tokens');
    } catch (error) {
      console.error('❌ Error saving backup tokens:', error);
    }
  }

  // Add current tokens to backup before they expire
  private addToBackup(label: string) {
    if (!this.tokenData) return;
    
    const backupToken: BackupTokenSet = {
      access_token: this.tokenData.access_token,
      refresh_token: this.tokenData.refresh_token,
      created_at: Date.now(),
      label
    };
    
    this.backupTokens.push(backupToken);
    
    // Keep only last 5 backup sets
    if (this.backupTokens.length > 5) {
      this.backupTokens = this.backupTokens.slice(-5);
    }
    
    this.saveBackupTokens();
    console.log(`✅ Added backup token set: ${label}`);
  }

  // Try to use backup tokens when primary tokens fail
  private async tryBackupTokens(): Promise<boolean> {
    console.log('🔄 Attempting to use backup tokens...');
    
    // Try backup tokens from newest to oldest
    for (let i = this.backupTokens.length - 1; i >= 0; i--) {
      const backup = this.backupTokens[i];
      console.log(`🔄 Trying backup token set: ${backup.label}`);
      
      try {
        // Test if this backup token works
        const response = await axios.get('https://www.zohoapis.in/crm/v2/settings/modules', {
          headers: {
            'Authorization': `Zoho-oauthtoken ${backup.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        if (response.status === 200) {
          console.log(`✅ Backup token set "${backup.label}" is working`);
          
          // Use this backup token as primary
          this.tokenData = {
            access_token: backup.access_token,
            refresh_token: backup.refresh_token,
            expires_at: Date.now() + (3600 * 1000), // 1 hour assumption
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            created_at: backup.created_at
          };
          
          this.saveTokensToFile();
          return true;
        }
      } catch (error) {
        console.log(`❌ Backup token set "${backup.label}" failed`);
        continue;
      }
    }
    
    return false;
  }

  // Try emergency tokens from environment variables
  private async tryEmergencyTokens(): Promise<boolean> {
    console.log('🚨 Attempting to use emergency tokens...');
    
    try {
      if (fs.existsSync(this.emergencyTokensFile)) {
        const emergencyTokens = JSON.parse(fs.readFileSync(this.emergencyTokensFile, 'utf8'));
        
        // Test emergency tokens
        const response = await axios.get('https://www.zohoapis.in/crm/v2/settings/modules', {
          headers: {
            'Authorization': `Zoho-oauthtoken ${emergencyTokens.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        if (response.status === 200) {
          console.log('✅ Emergency tokens are working');
          
          this.tokenData = {
            access_token: emergencyTokens.access_token,
            refresh_token: emergencyTokens.refresh_token,
            expires_at: Date.now() + (3600 * 1000),
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            created_at: Date.now()
          };
          
          this.saveTokensToFile();
          return true;
        }
      }
    } catch (error) {
      console.log('❌ Emergency tokens failed');
    }
    
    return false;
  }

  // Generate new tokens from stored authorization codes
  private async tryStoredAuthCodes(): Promise<boolean> {
    console.log('🔄 Attempting to use stored authorization codes...');
    
    const authCodeFile = path.join(process.cwd(), '.zoho-auth-codes.json');
    
    try {
      if (fs.existsSync(authCodeFile)) {
        const authCodes = JSON.parse(fs.readFileSync(authCodeFile, 'utf8'));
        
        // Try each stored auth code
        for (const authCodeData of authCodes) {
          if (Date.now() < authCodeData.expires_at) {
            console.log(`🔄 Trying stored auth code: ${authCodeData.label}`);
            
            const success = await this.generateTokensFromAuthCode(authCodeData.code);
            if (success) {
              console.log(`✅ Successfully generated tokens from stored auth code: ${authCodeData.label}`);
              return true;
            }
          }
        }
      }
    } catch (error) {
      console.log('❌ Stored auth codes failed');
    }
    
    return false;
  }

  // Generate tokens from authorization code
  private async generateTokensFromAuthCode(authCode: string): Promise<boolean> {
    try {
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
        timeout: 10000
      });

      if (response.data.access_token) {
        this.tokenData = {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          expires_at: Date.now() + (response.data.expires_in * 1000),
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          created_at: Date.now()
        };

        this.saveTokensToFile();
        console.log('✅ New tokens generated from auth code');
        return true;
      }
    } catch (error: any) {
      console.error('❌ Token generation from auth code failed:', error.response?.data || error.message);
    }
    
    return false;
  }

  // Comprehensive token recovery workflow
  private async recoverTokens(): Promise<boolean> {
    console.log('🔄 Starting comprehensive token recovery...');
    
    // Step 1: Try backup tokens
    if (await this.tryBackupTokens()) {
      return true;
    }
    
    // Step 2: Try emergency tokens
    if (await this.tryEmergencyTokens()) {
      return true;
    }
    
    // Step 3: Try stored auth codes
    if (await this.tryStoredAuthCodes()) {
      return true;
    }
    
    console.log('❌ All recovery methods failed. Manual intervention required.');
    return false;
  }

  // Start persistent refresh system
  private startPersistentRefresh() {
    // Check every 30 minutes instead of every minute to reduce API calls
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshTokens();
    }, 30 * 60 * 1000); // 30 minutes
    
    // Initial check after 30 seconds
    setTimeout(() => {
      this.checkAndRefreshTokens();
    }, 30000);
  }

  private async checkAndRefreshTokens() {
    if (this.isRefreshing || !this.tokenData) return;
    
    const now = Date.now();
    const timeUntilExpiry = this.tokenData.expires_at - now;
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / (60 * 60 * 1000));
    
    // Add to backup before expiry (when 2 hours left)
    if (timeUntilExpiry < 2 * 60 * 60 * 1000 && timeUntilExpiry > 1 * 60 * 60 * 1000) {
      this.addToBackup(`backup_${new Date().toISOString()}`);
    }
    
    // Refresh when 10 minutes left
    if (timeUntilExpiry < 10 * 60 * 1000) {
      console.log(`🔄 Token expires in ${Math.floor(timeUntilExpiry / 60000)} minutes, refreshing...`);
      
      const refreshSuccess = await this.refreshAccessToken();
      if (!refreshSuccess) {
        console.log('❌ Token refresh failed, attempting recovery...');
        await this.recoverTokens();
      }
    } else {
      console.log(`✅ Token valid for ${hoursUntilExpiry} hours`);
    }
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing || !this.tokenData) return false;
    
    // Check rate limiting
    if (this.rateLimitCooldown > Date.now()) {
      console.log('⏳ Rate limit cooldown active, skipping refresh');
      return false;
    }
    
    this.isRefreshing = true;
    this.lastApiCall = Date.now();
    
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: this.tokenData.client_id,
          client_secret: this.tokenData.client_secret,
          refresh_token: this.tokenData.refresh_token,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      });

      if (response.data.access_token) {
        this.tokenData.access_token = response.data.access_token;
        this.tokenData.expires_at = Date.now() + (response.data.expires_in * 1000);
        
        // Update refresh token if provided
        if (response.data.refresh_token) {
          this.tokenData.refresh_token = response.data.refresh_token;
        }
        
        this.saveTokensToFile();
        console.log('✅ Access token refreshed successfully');
        return true;
      }
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      console.error('❌ Token refresh failed:', errorData);
      
      // Handle rate limiting
      if (typeof errorData === 'object' && errorData.error === 'Access Denied' && 
          errorData.error_description?.includes('too many requests')) {
        this.rateLimitCooldown = Date.now() + (10 * 60 * 1000); // 10 minutes
        console.log('🚨 Rate limit detected, cooldown set for 10 minutes');
      }
    } finally {
      this.isRefreshing = false;
    }
    
    return false;
  }

  // Public method to get valid access token
  public async getValidAccessToken(): Promise<string> {
    if (!this.tokenData) {
      console.log('❌ No token data available, attempting recovery...');
      const recovered = await this.recoverTokens();
      if (!recovered) {
        throw new Error('No tokens available. Please generate new tokens using the admin interface.');
      }
    }
    
    const now = Date.now();
    const timeUntilExpiry = this.tokenData.expires_at - now;
    
    // If token expires in less than 5 minutes, try to refresh
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('🔄 Token expires soon, attempting refresh...');
      const refreshSuccess = await this.refreshAccessToken();
      
      if (!refreshSuccess) {
        console.log('❌ Token refresh failed, attempting recovery...');
        const recovered = await this.recoverTokens();
        if (!recovered) {
          throw new Error('Token refresh failed and recovery failed. Please generate new tokens.');
        }
      }
    }
    
    return this.tokenData.access_token;
  }

  // Public method to add new tokens
  public setNewTokens(accessToken: string, refreshToken: string): void {
    this.addToBackup(`manual_${new Date().toISOString()}`);
    
    this.tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (3600 * 1000), // 1 hour
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      created_at: Date.now()
    };
    
    this.saveTokensToFile();
    console.log('✅ New tokens set successfully');
  }

  // Public method to store auth codes for future use
  public storeAuthCode(authCode: string, label: string): void {
    const authCodeFile = path.join(process.cwd(), '.zoho-auth-codes.json');
    let authCodes = [];
    
    try {
      if (fs.existsSync(authCodeFile)) {
        authCodes = JSON.parse(fs.readFileSync(authCodeFile, 'utf8'));
      }
    } catch (error) {
      authCodes = [];
    }
    
    authCodes.push({
      code: authCode,
      label,
      created_at: Date.now(),
      expires_at: Date.now() + (10 * 60 * 1000) // 10 minutes
    });
    
    // Keep only last 3 auth codes
    if (authCodes.length > 3) {
      authCodes = authCodes.slice(-3);
    }
    
    fs.writeFileSync(authCodeFile, JSON.stringify(authCodes, null, 2));
    console.log(`✅ Stored auth code: ${label}`);
  }

  // Public method to get token status
  public getTokenStatus() {
    if (!this.tokenData) {
      return {
        status: 'no_tokens',
        message: 'No tokens available',
        expires_in: 0,
        backup_count: this.backupTokens.length
      };
    }
    
    const timeToExpiry = this.tokenData.expires_at - Date.now();
    const hoursToExpiry = Math.floor(timeToExpiry / (60 * 60 * 1000));
    
    return {
      status: timeToExpiry <= 0 ? 'expired' : timeToExpiry < 30 * 60 * 1000 ? 'expiring_soon' : 'valid',
      message: timeToExpiry <= 0 ? 'Token expired' : `Token valid for ${hoursToExpiry} hours`,
      expires_in: Math.floor(timeToExpiry / 60000),
      backup_count: this.backupTokens.length,
      created_at: this.tokenData.created_at
    };
  }

  // Cleanup method
  public destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

export default new ZohoPersistentTokenManager();