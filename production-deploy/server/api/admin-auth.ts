import { Router } from "express";
import { BlogAdmin, AdminSession } from "../db";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

export const adminAuthRouter = Router();

// Admin login
adminAuthRouter.post('/login', async (req, res) => {
  try {
    console.log('Admin login request received:', { body: req.body });
    const { username, password } = req.body;

    console.log('Extracted credentials:', { username, password: password ? '***' : 'undefined' });

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(401).json({ message: 'Username and password are required' });
    }

    // Find admin user
    console.log('Looking for admin user:', username);
    const admin = await BlogAdmin.findOne({ username });

    console.log('Found admin user:', admin ? { id: admin._id, username: admin.username } : 'null');

    if (!admin) {
      console.log('Admin user not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    console.log('Comparing password with hash');
    const isValid = await bcrypt.compare(password, admin.password);
    console.log('Password comparison result:', isValid);
    
    if (!isValid) {
      console.log('Password validation failed');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create session
    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    console.log('Creating session:', { sessionId: sessionId.substring(0, 8) + '...', expiresAt });

    await AdminSession.create({
      sessionId,
      userId: admin._id,
      expiresAt,
    });

    console.log('Login successful for user:', admin.username);
    res.json({ token: sessionId, user: { id: admin._id, username: admin.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Middleware to check admin authentication
export const requireAuth = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    const session = await AdminSession.findOne({
      sessionId: token,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Admin logout
adminAuthRouter.post('/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await AdminSession.deleteOne({ sessionId: token });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});