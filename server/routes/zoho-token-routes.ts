import express from 'express';
import ZohoTokenManager from '../zoho-token-manager.js';

const router = express.Router();

// Get token status
router.get('/status', async (req, res) => {
  try {
    const status = ZohoTokenManager.getTokenStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get token status' });
  }
});

// Update tokens manually
router.post('/update', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    
    ZohoTokenManager.updateTokensManually(access_token, refresh_token);
    res.json({ message: 'Tokens updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tokens' });
  }
});

export default router;