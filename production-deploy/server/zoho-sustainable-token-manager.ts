import axios from 'axios';
import fs from 'fs';
import path from 'path';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_token_expires_at: number;
  client_id: string;
  client_secret: string;
  created_at: number;
  last_refreshed_at: number;
}

interface AuthCodeSet {
  code: string;
  label: string;
  created_at: number;
  expires_at: number;
  used: boolean;
}

interface TokenBackup {
  access_token: string;
  refresh_token: string;
  created_at: number;
  label: string;
  expires_at: number;
}

class ZohoSustainableTokenManager {
  private tokenFile = path.join(process.cwd(), '.zoho-tokens.json');
  private authCodesFile = path.join(process.cwd(), '.zoho-auth-codes.json');
  private backupTokensFile = path.join(process.cwd(), '.zoho-backup-tokens.json');
  private emergencyConfigFile = path.join(process.cwd(), '.zoho-emergency-config.json');
  
  private tokenData: TokenData | null = null;
  private authCodes: AuthCodeSet[] = [];
  private backupTokens: TokenBackup[] = [];
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private rateLimitCooldown = 0;
  private failureCount = 0;
  
  private config = {
    clientId: process.env.ZOHO_CLIENT_ID || '1000.9IIMHF093P714UDRP127QMAOGBD0ZU',
    clientSecret: process.env.ZOHO_CLIENT_SECRET || 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec',
    redirectUri: 'https://relai.world/auth/zoho/callback',
    scope: 'ZohoCRM.modules.ALL',
    // Refresh token typically expires in 100 days for Zoho
    refreshTokenLifetime: 100 * 24 * 60 * 60 * 1000 // 100 days in milliseconds
  };

  constructor() {
    this.loadAllTokenData();
    this.startSustainableRefresh();
  }

  private loadAllTokenData() {
    this.loadPrimaryTokens();
    this.loadAuthCodes();
    this.loadBackupTokens();
  }

  private loadPrimaryTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        this.tokenData = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
        console.log('✅ Loaded primary tokens');
      }
    } catch (error) {
      console.error('❌ Error loading primary tokens:', error);
    }
  }

  private loadAuthCodes() {
    try {
      if (fs.existsSync(this.authCodesFile)) {
        this.authCodes = JSON.parse(fs.readFileSync(this.authCodesFile, 'utf8'));
        console.log(`✅ Loaded ${this.authCodes.length} auth codes`);
      }
    } catch (error) {
      console.error('❌ Error loading auth codes:', error);
    }
  }

  private loadBackupTokens() {
    try {
      if (fs.existsSync(this.backupTokensFile)) {
        const backupData = JSON.parse(fs.readFileSync(this.backupTokensFile, 'utf8'));
        
        // Handle both array and object formats
        if (Array.isArray(backupData)) {
          this.backupTokens = backupData;
        } else {
          // Convert object format to array format
          this.backupTokens = Object.entries(backupData).map(([key, value]: [string, any]) => ({
            access_token: value.access_token,
            refresh_token: value.refresh_token,
            created_at: new Date(value.created_at).getTime(),
            expires_at: Date.now() + (3600 * 1000), // 1 hour default
            label: key
          }));
        }
        
        console.log(`✅ Loaded ${this.backupTokens.length} backup tokens`);
      } else {
        this.backupTokens = []; // Initialize as empty array if file doesn't exist
      }
    } catch (error) {
      console.error('❌ Error loading backup tokens:', error);
      this.backupTokens = []; // Initialize as empty array on error
    }
  }

  private saveTokenData() {
    try {
      if (this.tokenData) {
        fs.writeFileSync(this.tokenFile, JSON.stringify(this.tokenData, null, 2));
        console.log('💾 Saved primary tokens');
      }
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
    }
  }

  private saveAuthCodes() {
    try {
      fs.writeFileSync(this.authCodesFile, JSON.stringify(this.authCodes, null, 2));
      console.log('💾 Saved auth codes');
    } catch (error) {
      console.error('❌ Error saving auth codes:', error);
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

  // Store multiple auth codes for future use
  public storeAuthCode(code: string, label: string = 'manual'): void {
    const authCode: AuthCodeSet = {
      code,
      label,
      created_at: Date.now(),
      expires_at: Date.now() + (10 * 60 * 1000), // 10 minutes
      used: false
    };
    
    this.authCodes.push(authCode);
    
    // Keep only last 10 auth codes
    if (this.authCodes.length > 10) {
      this.authCodes = this.authCodes.slice(-10);
    }
    
    this.saveAuthCodes();
    console.log(`✅ Stored auth code: ${label}`);
  }

  // Generate tokens from auth code
  private async generateTokensFromAuthCode(authCode: AuthCodeSet): Promise<boolean> {
    try {
      console.log(`🔄 Generating tokens from auth code: ${authCode.label}`);
      
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          code: authCode.code,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000
      });

      if (response.data.access_token) {
        // Mark auth code as used
        authCode.used = true;
        this.saveAuthCodes();
        
        // Store current token as backup before replacing
        this.createBackupFromCurrent(`pre_${authCode.label}`);
        
        this.tokenData = {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          expires_at: Date.now() + (response.data.expires_in * 1000),
          refresh_token_expires_at: Date.now() + this.config.refreshTokenLifetime,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          created_at: Date.now(),
          last_refreshed_at: Date.now()
        };

        this.saveTokenData();
        this.failureCount = 0;
        console.log(`✅ Generated new tokens from auth code: ${authCode.label}`);
        return true;
      }
    } catch (error: any) {
      console.error(`❌ Failed to generate tokens from auth code ${authCode.label}:`, error.response?.data || error.message);
      authCode.used = true; // Mark as used even on failure to prevent retry
      this.saveAuthCodes();
    }
    
    return false;
  }

  // Create backup from current tokens
  private createBackupFromCurrent(label: string) {
    if (!this.tokenData) return;
    
    const backup: TokenBackup = {
      access_token: this.tokenData.access_token,
      refresh_token: this.tokenData.refresh_token,
      created_at: this.tokenData.created_at,
      expires_at: this.tokenData.expires_at,
      label
    };
    
    this.backupTokens.push(backup);
    
    // Keep only last 15 backups
    if (this.backupTokens.length > 15) {
      this.backupTokens = this.backupTokens.slice(-15);
    }
    
    this.saveBackupTokens();
    console.log(`✅ Created backup: ${label}`);
  }

  // Try to use backup tokens
  private async tryBackupTokens(): Promise<boolean> {
    console.log('🔄 Attempting to use backup tokens...');
    
    // Sort by creation date (newest first)
    const sortedBackups = this.backupTokens
      .filter(backup => backup.expires_at > Date.now())
      .sort((a, b) => b.created_at - a.created_at);
    
    for (const backup of sortedBackups) {
      try {
        console.log(`🔄 Testing backup token: ${backup.label}`);
        
        // Test if backup token works
        const response = await axios.get('https://www.zohoapis.in/crm/v2/settings/modules', {
          headers: {
            'Authorization': `Zoho-oauthtoken ${backup.access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        });
        
        if (response.status === 200) {
          console.log(`✅ Backup token "${backup.label}" is working`);
          
          // Use this backup as primary
          this.tokenData = {
            access_token: backup.access_token,
            refresh_token: backup.refresh_token,
            expires_at: backup.expires_at,
            refresh_token_expires_at: Date.now() + this.config.refreshTokenLifetime,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            created_at: backup.created_at,
            last_refreshed_at: Date.now()
          };
          
          this.saveTokenData();
          this.failureCount = 0;
          return true;
        }
      } catch (error) {
        console.log(`❌ Backup token "${backup.label}" failed`);
        continue;
      }
    }
    
    return false;
  }

  // Try to use stored auth codes
  private async tryStoredAuthCodes(): Promise<boolean> {
    console.log('🔄 Attempting to use stored auth codes...');
    
    const validAuthCodes = this.authCodes.filter(
      code => !code.used && code.expires_at > Date.now()
    );
    
    if (validAuthCodes.length === 0) {
      console.log('❌ No valid auth codes available');
      return false;
    }
    
    // Try each valid auth code
    for (const authCode of validAuthCodes) {
      const success = await this.generateTokensFromAuthCode(authCode);
      if (success) {
        return true;
      }
    }
    
    return false;
  }

  // Refresh access token using refresh token
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.tokenData) return false;
    
    console.log('🔄 Refreshing access token...');
    
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
        timeout: 15000
      });

      if (response.data.access_token) {
        // Create backup before updating
        this.createBackupFromCurrent(`refresh_${new Date().toISOString()}`);
        
        this.tokenData.access_token = response.data.access_token;
        this.tokenData.expires_at = Date.now() + (response.data.expires_in * 1000);
        this.tokenData.last_refreshed_at = Date.now();
        
        // Update refresh token if provided
        if (response.data.refresh_token) {
          this.tokenData.refresh_token = response.data.refresh_token;
          this.tokenData.refresh_token_expires_at = Date.now() + this.config.refreshTokenLifetime;
        }
        
        this.saveTokenData();
        this.failureCount = 0;
        console.log('✅ Access token refreshed successfully');
        return true;
      }
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      this.failureCount++;
      
      // Handle rate limiting
      if (error.response?.data?.error === 'Access Denied' && 
          error.response?.data?.error_description?.includes('too many requests')) {
        this.rateLimitCooldown = Date.now() + (15 * 60 * 1000); // 15 minutes
        console.log('🚨 Rate limit detected, cooldown set for 15 minutes');
      }
    }
    
    return false;
  }

  // Comprehensive recovery workflow
  private async recoverTokens(): Promise<boolean> {
    console.log('🔄 Starting comprehensive token recovery...');
    
    // Step 1: Try backup tokens
    if (await this.tryBackupTokens()) {
      console.log('✅ Recovered using backup tokens');
      return true;
    }
    
    // Step 2: Try stored auth codes
    if (await this.tryStoredAuthCodes()) {
      console.log('✅ Recovered using stored auth codes');
      return true;
    }
    
    // Step 3: Check for emergency configuration
    if (await this.tryEmergencyConfiguration()) {
      console.log('✅ Recovered using emergency configuration');
      return true;
    }
    
    console.log('❌ All recovery methods failed');
    return false;
  }

  // Emergency configuration for critical situations
  private async tryEmergencyConfiguration(): Promise<boolean> {
    try {
      if (fs.existsSync(this.emergencyConfigFile)) {
        const emergencyConfig = JSON.parse(fs.readFileSync(this.emergencyConfigFile, 'utf8'));
        
        if (emergencyConfig.access_token && emergencyConfig.refresh_token) {
          console.log('🚨 Using emergency configuration');
          
          this.tokenData = {
            access_token: emergencyConfig.access_token,
            refresh_token: emergencyConfig.refresh_token,
            expires_at: Date.now() + (3600 * 1000), // 1 hour
            refresh_token_expires_at: Date.now() + this.config.refreshTokenLifetime,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            created_at: Date.now(),
            last_refreshed_at: Date.now()
          };
          
          this.saveTokenData();
          return true;
        }
      }
    } catch (error) {
      console.error('❌ Emergency configuration failed:', error);
    }
    
    return false;
  }

  // Main token management loop
  private startSustainableRefresh() {
    // Check every 15 minutes
    this.refreshInterval = setInterval(() => {
      this.manageTokens();
    }, 15 * 60 * 1000);
    
    // Initial check after 30 seconds
    setTimeout(() => {
      this.manageTokens();
    }, 30000);
  }

  private async manageTokens() {
    if (this.isRefreshing) return;
    
    // Check rate limiting
    if (this.rateLimitCooldown > Date.now()) {
      console.log('⏳ Rate limit cooldown active, skipping token check');
      return;
    }
    
    if (!this.tokenData) {
      console.log('❌ No token data available, attempting recovery...');
      await this.recoverTokens();
      return;
    }
    
    const now = Date.now();
    const accessTokenTimeLeft = this.tokenData.expires_at - now;
    const refreshTokenTimeLeft = this.tokenData.refresh_token_expires_at - now;
    
    // Check if refresh token is expiring soon (within 7 days)
    if (refreshTokenTimeLeft < 7 * 24 * 60 * 60 * 1000) {
      console.log('⚠️ Refresh token expiring soon, attempting recovery...');
      await this.recoverTokens();
      return;
    }
    
    // Check if access token needs refresh (within 15 minutes)
    if (accessTokenTimeLeft < 15 * 60 * 1000) {
      console.log('🔄 Access token expiring soon, refreshing...');
      
      this.isRefreshing = true;
      const refreshed = await this.refreshAccessToken();
      this.isRefreshing = false;
      
      if (!refreshed) {
        console.log('❌ Access token refresh failed, attempting recovery...');
        await this.recoverTokens();
      }
    }
  }

  // Public method to get valid access token
  public async getValidAccessToken(): Promise<string> {
    if (!this.tokenData) {
      console.log('❌ No token data available, attempting recovery...');
      const recovered = await this.recoverTokens();
      if (!recovered) {
        throw new Error('No valid tokens available. Please provide new authorization code.');
      }
    }
    
    const now = Date.now();
    const accessTokenTimeLeft = this.tokenData.expires_at - now;
    
    // If token expires in less than 5 minutes, try to refresh
    if (accessTokenTimeLeft < 5 * 60 * 1000) {
      console.log('🔄 Access token expiring soon, attempting refresh...');
      
      this.isRefreshing = true;
      const refreshed = await this.refreshAccessToken();
      this.isRefreshing = false;
      
      if (!refreshed) {
        console.log('❌ Access token refresh failed, attempting recovery...');
        const recovered = await this.recoverTokens();
        if (!recovered) {
          throw new Error('Token refresh failed and recovery failed. Please provide new authorization code.');
        }
      }
    }
    
    return this.tokenData.access_token;
  }

  // Public method to set new tokens
  public setNewTokens(accessToken: string, refreshToken: string): void {
    this.createBackupFromCurrent(`manual_${new Date().toISOString()}`);
    
    this.tokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (3600 * 1000), // 1 hour
      refresh_token_expires_at: Date.now() + this.config.refreshTokenLifetime,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      created_at: Date.now(),
      last_refreshed_at: Date.now()
    };
    
    this.saveTokenData();
    this.failureCount = 0;
    console.log('✅ New tokens set successfully');
  }

  // Public method to get comprehensive status
  public getTokenStatus() {
    if (!this.tokenData) {
      return {
        status: 'no_tokens',
        message: 'No tokens available',
        expires_in: 0,
        backup_count: this.backupTokens.length,
        auth_codes_count: this.authCodes.filter(c => !c.used && c.expires_at > Date.now()).length,
        failure_count: this.failureCount,
        rate_limit_cooldown: this.rateLimitCooldown > Date.now() ? Math.floor((this.rateLimitCooldown - Date.now()) / 60000) : 0
      };
    }
    
    const accessTokenTimeLeft = this.tokenData.expires_at - Date.now();
    const refreshTokenTimeLeft = this.tokenData.refresh_token_expires_at - Date.now();
    
    const accessStatus = accessTokenTimeLeft <= 0 ? 'expired' : 
                        accessTokenTimeLeft < 30 * 60 * 1000 ? 'expiring_soon' : 'valid';
    const refreshStatus = refreshTokenTimeLeft <= 0 ? 'expired' : 
                         refreshTokenTimeLeft < 7 * 24 * 60 * 60 * 1000 ? 'expiring_soon' : 'valid';
    
    return {
      status: accessStatus,
      refresh_status: refreshStatus,
      message: `Access token: ${Math.floor(accessTokenTimeLeft / 60000)}min, Refresh token: ${Math.floor(refreshTokenTimeLeft / 86400000)}days`,
      expires_in: Math.floor(accessTokenTimeLeft / 60000),
      refresh_expires_in: Math.floor(refreshTokenTimeLeft / 86400000),
      backup_count: this.backupTokens.length,
      auth_codes_count: this.authCodes.filter(c => !c.used && c.expires_at > Date.now()).length,
      failure_count: this.failureCount,
      rate_limit_cooldown: this.rateLimitCooldown > Date.now() ? Math.floor((this.rateLimitCooldown - Date.now()) / 60000) : 0,
      created_at: this.tokenData.created_at,
      last_refreshed_at: this.tokenData.last_refreshed_at
    };
  }

  // Generate authorization URL
  public getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      scope: this.config.scope,
      client_id: this.config.clientId,
      response_type: 'code',
      access_type: 'offline',
      redirect_uri: this.config.redirectUri
    });
    
    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
  }

  // Cleanup method
  public destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

export default new ZohoSustainableTokenManager();