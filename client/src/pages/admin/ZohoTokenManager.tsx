import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface TokenHealth {
  healthy: boolean;
  message: string;
  needsAuth: boolean;
}

interface TokenStatus {
  status: string;
  message: string;
  expires_in: number;
  refresh_attempts: number;
}

export default function ZohoTokenManager() {
  const [authCode, setAuthCode] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [tokenHealth, setTokenHealth] = useState<TokenHealth | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkTokenHealth();
    getAuthUrl();
  }, []);

  const checkTokenHealth = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/zoho/health');
      const data = await response.json();
      setTokenHealth(data);
      
      // Also get detailed token status
      const statusResponse = await fetch('/api/zoho/token-status');
      const statusData = await statusResponse.json();
      setTokenStatus(statusData.tokenStatus);
    } catch (error) {
      console.error('Error checking token health:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getAuthUrl = async () => {
    try {
      const response = await fetch('/api/zoho/auth-url');
      const data = await response.json();
      setAuthUrl(data.authUrl);
    } catch (error) {
      console.error('Error getting auth URL:', error);
    }
  };

  const generateTokens = async () => {
    if (!authCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the authorization code",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/zoho/generate-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authCode: authCode.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "New tokens generated successfully!",
        });
        setAuthCode('');
        checkTokenHealth();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to generate tokens",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const attemptRecovery = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/zoho/recover-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Tokens recovered successfully!",
        });
        checkTokenHealth();
      } else {
        toast({
          title: "Recovery Failed",
          description: data.message || "Manual intervention required",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Recovery attempt failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="h-5 w-5 animate-spin" />;
    if (tokenHealth?.healthy) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (tokenHealth?.needsAuth) return <XCircle className="h-5 w-5 text-red-600" />;
    return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  };

  const getStatusColor = () => {
    if (tokenHealth?.healthy) return "text-green-600";
    if (tokenHealth?.needsAuth) return "text-red-600";
    return "text-yellow-600";
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Zoho CRM Token Manager</h1>
        <p className="text-gray-600">
          Manage Zoho CRM integration tokens for automatic form submissions
        </p>
      </div>

      <div className="grid gap-6">
        {/* Token Health Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Token Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                <span className="font-semibold">Status:</span>
                <span>{tokenHealth?.message || 'Checking...'}</span>
              </div>
              
              {tokenStatus && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold">Token Status:</span>
                    <span className="ml-2">{tokenStatus.status}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Expires in:</span>
                    <span className="ml-2">{tokenStatus.expires_in} minutes</span>
                  </div>
                  <div>
                    <span className="font-semibold">Refresh Attempts:</span>
                    <span className="ml-2">{tokenStatus.refresh_attempts}</span>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={checkTokenHealth} 
                disabled={isChecking}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Token Generation */}
        {tokenHealth?.needsAuth && (
          <Card>
            <CardHeader>
              <CardTitle>Generate New Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Tokens are invalid or expired. Please generate new tokens using the steps below.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="auth-step">Step 1: Get Authorization Code</Label>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => window.open(authUrl, '_blank')}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Authorization Page
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Click the button above, log in to Zoho, and copy the authorization code from the redirect URL.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="auth-code">Step 2: Enter Authorization Code</Label>
                  <Input
                    id="auth-code"
                    placeholder="Paste your authorization code here"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                  />
                  <p className="text-sm text-gray-600">
                    The code should look like: 1000.abc123def456...
                  </p>
                </div>
                
                <Button 
                  onClick={generateTokens}
                  disabled={isGenerating || !authCode.trim()}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Tokens...
                    </>
                  ) : (
                    'Generate New Tokens'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recovery Options */}
        <Card>
          <CardHeader>
            <CardTitle>Recovery Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Try automatic recovery first. If that fails, you'll need to generate new tokens manually.
              </p>
              
              <Button 
                onClick={attemptRecovery}
                disabled={isGenerating}
                variant="outline"
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Attempting Recovery...
                  </>
                ) : (
                  'Attempt Automatic Recovery'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}