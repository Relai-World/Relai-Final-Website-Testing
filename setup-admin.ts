import { connectToMongoDB, BlogAdmin } from './server/db';
import bcrypt from 'bcrypt';

async function setupAdminUser() {
  try {
    console.log('Setting up admin user...');
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Check if admin user already exists
    const existingAdmin = await BlogAdmin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await BlogAdmin.create({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@relai.world',
      role: 'admin'
    });
    
    console.log('✓ Created default admin user');
    console.log('Admin Login Details:');
    console.log('- URL: /admin/login');
    console.log('- Username: admin');
    console.log('- Password: admin123');
    
  } catch (error) {
    console.error('Error setting up admin user:', error);
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupAdminUser();