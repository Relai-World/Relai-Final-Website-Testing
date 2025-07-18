import { Router } from 'express';
import { zohoService } from '../zoho-service';
import { zohoDirectService } from '../zoho-direct-service';
import zohoSustainableTokenManager from '../zoho-sustainable-token-manager';
import zohoAutoTokenGenerator from '../zoho-auto-token-generator';

const router = Router();

// Exchange authorization code for tokens
router.post('/auth/exchange-token', async (req, res) => {
  try {
    const { authCode } = req.body;
    
    if (!authCode) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const tokens = await zohoService.exchangeCodeForTokens(authCode);
    
    res.json({
      success: true,
      message: 'Tokens obtained successfully',
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Zoho connection
router.get('/test-connection', async (req, res) => {
  try {
    const isConnected = await zohoService.testConnection();
    const tokenStatus = zohoSustainableTokenManager.getTokenStatus();
    
    res.json({
      success: isConnected,
      message: isConnected ? 'Connected to Zoho CRM successfully' : 'Failed to connect to Zoho CRM',
      tokenStatus: tokenStatus,
    });
  } catch (error: any) {
    console.error('Connection test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get token status
router.get('/token-status', async (req, res) => {
  try {
    const tokenStatus = zohoSustainableTokenManager.getTokenStatus();
    
    res.json({
      success: true,
      tokenStatus: tokenStatus,
      message: `Token status: ${tokenStatus.status}`
    });
  } catch (error: any) {
    console.error('Token status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle form submissions
router.post('/submit-form', async (req, res) => {
  try {
    const { formData, formType } = req.body;
    
    if (!formData || !formType) {
      return res.status(400).json({ error: 'Form data and form type are required' });
    }

    // Use direct service to bypass token management issues
    const result = await zohoDirectService.processFormSubmission(formData, formType);
    
    res.json({
      success: true,
      message: 'Form submission processed successfully',
      zohoResponse: result,
    });
  } catch (error: any) {
    console.error('Form submission error:', error);
    res.status(500).json({ 
      error: error.message,
      success: false,
      message: 'Failed to process form submission'
    });
  }
});

// Create lead directly
router.post('/create-lead', async (req, res) => {
  try {
    const leadData = req.body;
    
    const result = await zohoService.createLead(leadData);
    
    res.json({
      success: true,
      message: 'Lead created successfully',
      zohoResponse: result,
    });
  } catch (error: any) {
    console.error('Lead creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate new tokens from authorization code
router.post('/generate-tokens', async (req, res) => {
  try {
    const { authCode } = req.body;
    
    if (!authCode) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const success = await zohoAutoTokenGenerator.generateTokensFromAuthCode(authCode);
    
    if (success) {
      res.json({
        success: true,
        message: 'New tokens generated successfully',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate tokens',
        authUrl: zohoAutoTokenGenerator.generateAuthURL()
      });
    }
  } catch (error: any) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get authorization URL
router.get('/auth-url', async (req, res) => {
  try {
    const authUrl = zohoAutoTokenGenerator.generateAuthURL();
    
    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Visit this URL to get authorization code'
    });
  } catch (error: any) {
    console.error('Auth URL error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Token health check
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await zohoAutoTokenGenerator.healthCheck();
    
    res.json({
      success: healthStatus.healthy,
      ...healthStatus
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recovery workflow
router.post('/recover-tokens', async (req, res) => {
  try {
    const success = await zohoAutoTokenGenerator.recoverTokens();
    
    res.json({
      success: success,
      message: success ? 'Tokens recovered successfully' : 'Manual intervention required',
      authUrl: success ? null : zohoAutoTokenGenerator.generateAuthURL()
    });
  } catch (error: any) {
    console.error('Token recovery error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;