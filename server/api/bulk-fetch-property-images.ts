import { Property } from '../../shared/mongodb-schemas';
import { getMapImages } from './google-maps-images';
import fs from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'property_images');

export async function bulkFetchPropertyImages() {
  console.log('Starting bulk property image fetch...');
  
  try {
    // Fetch all properties from MongoDB
    const properties = await Property.find({}).lean();
    console.log(`Found ${properties.length} properties to process`);
    
    let processed = 0;
    let skipped = 0;
    let fetched = 0;
    let errors = 0;
    
    for (const property of properties) {
      try {
        const propertyName = property.ProjectName || property.projectName || '';
        const builderName = property.BuilderName || property.developerName || property.builder || '';
        const location = property.AreaName || property.Area || property.location || 'Hyderabad';
        
        if (!propertyName || !builderName) {
          console.log(`Skipping property ${property._id} - missing name or builder`);
          skipped++;
          continue;
        }
        
        // Check if images already exist with correct naming format
        const safeProjectName = propertyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeBuilderName = builderName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeLocation = location.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Check for at least 3 images
        let existingImages = 0;
        for (let i = 0; i < 3; i++) {
          const imageFileName = `${safeProjectName}_20${safeBuilderName}_20${safeLocation}_${i}.jpg`;
          const imagePath = path.join(IMAGES_DIR, imageFileName);
          if (fs.existsSync(imagePath)) {
            existingImages++;
          }
        }
        
        if (existingImages >= 3) {
          console.log(`Property "${propertyName}" already has ${existingImages} images, skipping...`);
          skipped++;
          continue;
        }
        
        // Fetch images from Google Maps
        console.log(`Fetching images for "${propertyName}" by "${builderName}" in "${location}"...`);
        const images = await getMapImages(propertyName, location, 5, false, builderName);
        
        if (images && images.length > 0) {
          console.log(`✓ Fetched ${images.length} images for "${propertyName}"`);
          fetched++;
        } else {
          console.log(`✗ No images found for "${propertyName}"`);
        }
        
        processed++;
        
        // Add delay to avoid rate limiting
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${properties.length} properties. Pausing for rate limit...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause every 10 properties
        }
        
      } catch (error) {
        console.error(`Error processing property ${property._id}:`, error);
        errors++;
      }
    }
    
    console.log('\n=== Bulk Fetch Complete ===');
    console.log(`Total properties: ${properties.length}`);
    console.log(`Processed: ${processed}`);
    console.log(`Skipped (already have images): ${skipped}`);
    console.log(`Successfully fetched: ${fetched}`);
    console.log(`Errors: ${errors}`);
    
    return {
      total: properties.length,
      processed,
      skipped,
      fetched,
      errors
    };
    
  } catch (error) {
    console.error('Error in bulk fetch:', error);
    throw error;
  }
}

// API endpoint handler
export async function bulkFetchPropertyImagesHandler(req: any, res: any) {
  try {
    const result = await bulkFetchPropertyImages();
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Bulk fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to bulk fetch property images'
    });
  }
}