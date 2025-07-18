import { connectToMongoDB, BlogCategory } from './server/db';

async function setupBlogDatabase() {
  try {
    console.log('Setting up blog database...');
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Create default blog categories
    const defaultCategories = [
      {
        name: 'Real Estate',
        slug: 'real-estate',
        description: 'Articles about real estate market, trends, and insights'
      },
      {
        name: 'Property Investment',
        slug: 'property-investment',
        description: 'Investment tips and strategies for property buyers'
      },
      {
        name: 'Home Buying Guide',
        slug: 'home-buying-guide',
        description: 'Comprehensive guides for first-time and experienced home buyers'
      },
      {
        name: 'Market Analysis',
        slug: 'market-analysis',
        description: 'Real estate market analysis and predictions'
      },
      {
        name: 'Legal & Documentation',
        slug: 'legal-documentation',
        description: 'Legal aspects of property buying and documentation'
      }
    ];
    
    // Insert categories if they don't exist
    for (const category of defaultCategories) {
      const existingCategory = await BlogCategory.findOne({ slug: category.slug });
      
      if (!existingCategory) {
        await BlogCategory.create(category);
        console.log(`✓ Created category: ${category.name}`);
      } else {
        console.log(`- Category already exists: ${category.name}`);
      }
    }
    
    console.log('✓ Blog database setup completed successfully!');
    console.log('Admin Blog Details:');
    console.log('- URL: /admin/blog');
    console.log('- Default categories created');
    console.log('- Ready to create and publish blog posts');
    
  } catch (error) {
    console.error('Error setting up blog database:', error);
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupBlogDatabase();