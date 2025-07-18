import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Key,
  Shield,
  Database,
  Activity,
  Calendar,
  Settings,
  Download,
  Upload,
  Timer,
  Zap
} from 'lucide-react';

interface TokenStatus {
  status: string;
  refresh_status: string;
  message: string;
  expires_in: number;
  refresh_expires_in: number;
  backup_count: number;
  auth_codes_count: number;
  failure_count: number;
  rate_limit_cooldown: number;
  created_at: number;
  last_refreshed_at: number;
}

export default function SustainableZohoManager() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authCodeLabel, setAuthCodeLabel] = useState('');
  const [emergencyTokens, setEmergencyTokens] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load token status
  const loadTokenStatus = async () => {
    try {
      const response = await fetch('/api/zoho/sustainable-token-status');
      const data = await response.json();
      if (data.success) {
        setTokenStatus(data.tokenStatus);
      }
    } catch (error) {
      console.error('Failed to load token status:', error);
    }
  };

  // Store auth code
  const storeAuthCode = async () => {
    if (!authCode.trim()) {
      setMessage('Please enter an authorization code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/zoho/store-auth-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: authCode.trim(),
          label: authCodeLabel.trim() || 'manual'
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Authorization code stored successfully');
        setAuthCode('');
        setAuthCodeLabel('');
        loadTokenStatus();
      } else {
        setMessage(data.error || 'Failed to store authorization code');
      }
    } catch (error) {
      setMessage('Error storing authorization code');
    } finally {
      setLoading(false);
    }
  };

  // Generate tokens from stored auth codes
  const generateTokens = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zoho/generate-from-auth-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Tokens generated successfully');
        loadTokenStatus();
      } else {
        setMessage(data.error || 'Failed to generate tokens');
      }
    } catch (error) {
      setMessage('Error generating tokens');
    } finally {
      setLoading(false);
    }
  };

  // Force token refresh
  const forceRefresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/zoho/force-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Token refreshed successfully');
        loadTokenStatus();
      } else {
        setMessage(data.error || 'Failed to refresh token');
      }
    } catch (error) {
      setMessage('Error refreshing token');
    } finally {
      setLoading(false);
    }
  };

  // Store emergency tokens
  const storeEmergencyTokens = async () => {
    if (!emergencyTokens.trim()) {
      setMessage('Please enter emergency tokens JSON');
      return;
    }

    setLoading(true);
    try {
      const tokens = JSON.parse(emergencyTokens);
      const response = await fetch('/api/zoho/store-emergency-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens)
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Emergency tokens stored successfully');
        setEmergencyTokens('');
        loadTokenStatus();
      } else {
        setMessage(data.error || 'Failed to store emergency tokens');
      }
    } catch (error) {
      setMessage('Invalid JSON or error storing emergency tokens');
    } finally {
      setLoading(false);
    }
  };

  // Get auth URL
  const getAuthUrl = async () => {
    try {
      const response = await fetch('/api/zoho/auth-url');
      const data = await response.json();
      if (data.success) {
        window.open(data.authUrl, '_blank');
      }
    } catch (error) {
      setMessage('Failed to get authorization URL');
    }
  };

  // Auto-refresh status
  useEffect(() => {
    loadTokenStatus();
    
    if (autoRefresh) {
      const interval = setInterval(loadTokenStatus, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expiring_soon': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'expired': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressValue = (expiresIn: number, maxTime: number) => {
    return Math.max(0, Math.min(100, (expiresIn / maxTime) * 100));
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Sustainable Zoho Token Manager</h1>
        <p className="text-gray-600">
          Comprehensive token management system that handles refresh token expiry and provides multiple recovery mechanisms
        </p>
      </div>

      {message && (
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="auth-codes">Auth Codes</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Access Token
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {tokenStatus && getStatusIcon(tokenStatus.status)}
                  <Badge className={tokenStatus && getStatusColor(tokenStatus.status)}>
                    {tokenStatus?.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {tokenStatus ? `${tokenStatus.expires_in} minutes left` : 'Loading...'}
                </div>
                {tokenStatus && (
                  <Progress 
                    value={getProgressValue(tokenStatus.expires_in, 60)} 
                    className="mt-2"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Token
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {tokenStatus && getStatusIcon(tokenStatus.refresh_status)}
                  <Badge className={tokenStatus && getStatusColor(tokenStatus.refresh_status)}>
                    {tokenStatus?.refresh_status || 'Unknown'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {tokenStatus ? `${tokenStatus.refresh_expires_in} days left` : 'Loading...'}
                </div>
                {tokenStatus && (
                  <Progress 
                    value={getProgressValue(tokenStatus.refresh_expires_in, 100)} 
                    className="mt-2"
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Backup Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {tokenStatus?.backup_count || 0}
                </div>
                <div className="text-sm text-gray-600">
                  Token backups available
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Auth Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">
                  {tokenStatus?.auth_codes_count || 0}
                </div>
                <div className="text-sm text-gray-600">
                  Valid auth codes stored
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Current Status</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {tokenStatus?.message || 'Loading...'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Failure Count</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {tokenStatus?.failure_count || 0} failures
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Rate Limit</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {tokenStatus?.rate_limit_cooldown || 0} minutes cooldown
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Refreshed</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {tokenStatus?.last_refreshed_at 
                      ? new Date(tokenStatus.last_refreshed_at).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={getAuthUrl} variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Get Auth URL
                </Button>
                <Button onClick={forceRefresh} disabled={loading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Force Refresh
                </Button>
                <Button onClick={generateTokens} disabled={loading}>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate from Auth Codes
                </Button>
                <Button 
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  variant={autoRefresh ? "default" : "outline"}
                >
                  <Timer className="h-4 w-4 mr-2" />
                  Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Authorization Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="authCode">Authorization Code</Label>
                <Input
                  id="authCode"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Enter authorization code from Zoho"
                />
              </div>
              <div>
                <Label htmlFor="authCodeLabel">Label (optional)</Label>
                <Input
                  id="authCodeLabel"
                  value={authCodeLabel}
                  onChange={(e) => setAuthCodeLabel(e.target.value)}
                  placeholder="e.g., manual-2025-07-14"
                />
              </div>
              <Button onClick={storeAuthCode} disabled={loading}>
                <Upload className="h-4 w-4 mr-2" />
                Store Auth Code
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>How to get authorization codes:</strong><br/>
              1. Click "Get Auth URL" in the Status tab<br/>
              2. Login to Zoho and authorize the application<br/>
              3. Copy the 'code' parameter from the redirect URL<br/>
              4. Store multiple codes here for automatic recovery
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Token Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emergencyTokens">Emergency Tokens JSON</Label>
                <Textarea
                  id="emergencyTokens"
                  value={emergencyTokens}
                  onChange={(e) => setEmergencyTokens(e.target.value)}
                  placeholder='{"access_token": "...", "refresh_token": "..."}'
                  rows={4}
                />
              </div>
              <Button onClick={storeEmergencyTokens} disabled={loading}>
                <Shield className="h-4 w-4 mr-2" />
                Store Emergency Tokens
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Emergency tokens are used when:</strong><br/>
              • All primary tokens fail<br/>
              • All backup tokens are expired<br/>
              • All stored auth codes are used/expired<br/>
              • This is the last resort before manual intervention
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="backups" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Token Backup System</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Automatic Backups</p>
                    <p className="text-sm text-gray-600">
                      System automatically creates backups before token refresh
                    </p>
                  </div>
                  <Badge variant="outline">
                    {tokenStatus?.backup_count || 0} backups
                  </Badge>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Backups are created:
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Before each token refresh</li>
                    <li>• Before generating new tokens from auth codes</li>
                    <li>• Before setting new manual tokens</li>
                    <li>• Maximum 15 backups are kept</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Token Lifecycle</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Access Token:</span>
                      <span>{tokenStatus?.expires_in || 0} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Refresh Token:</span>
                      <span>{tokenStatus?.refresh_expires_in || 0} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>
                        {tokenStatus?.created_at 
                          ? new Date(tokenStatus.created_at).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Recovery Options</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Backup Tokens:</span>
                      <span>{tokenStatus?.backup_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auth Codes:</span>
                      <span>{tokenStatus?.auth_codes_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failures:</span>
                      <span>{tokenStatus?.failure_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sustainable Token Management Features:</strong><br/>
              ✓ Automatic token refresh before expiry<br/>
              ✓ Multiple backup token storage<br/>
              ✓ Auth code pre-storage for recovery<br/>
              ✓ Emergency token configuration<br/>
              ✓ Rate limiting protection<br/>
              ✓ Comprehensive failure recovery
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}