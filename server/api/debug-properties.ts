import { Request, Response } from 'express';
import { mongodbStorage } from '../mongodb-storage';

// Debug properties endpoint to see raw MongoDB structure
export async function debugPropertiesHandler(req: Request, res: Response) {
  try {
    console.log('Fetching properties for debugging...');
    
    // Get just the first property for debugging
    const allProperties = await mongodbStorage.getAllProperties({});
    
    if (!allProperties || allProperties.length === 0) {
      return res.status(200).json({ error: 'No properties found' });
    }
    
    // Return the first property in raw form
    const firstProperty = allProperties[0];
    
    // Extract the actual data from the Mongoose document
    const actualData = firstProperty.toJSON ? firstProperty.toJSON() : (firstProperty._doc || firstProperty);
    
    console.log('First property keys:', Object.keys(firstProperty));
    console.log('First property toJSON keys:', Object.keys(actualData));
    console.log('Sample fields from actualData:', {
      ProjectName: actualData.ProjectName,
      BuilderName: actualData.BuilderName,
      google_place_name: actualData.google_place_name,
      google_place_address: actualData.google_place_address,
      configurations: actualData.configurations ? actualData.configurations.slice(0, 1) : null
    });
    
    res.json({
      total: allProperties.length,
      firstPropertyKeys: Object.keys(firstProperty),
      firstPropertyDocKeys: Object.keys(actualData),
      firstPropertySample: actualData,
      locationFields: {
        AreaName: actualData.AreaName,
        Area: actualData.Area,
        location: actualData.location,
        google_place_name: actualData.google_place_name,
        google_place_address: actualData.google_place_address,
        google_place_location: actualData.google_place_location
      }
    });
    
  } catch (error) {
    console.error('Error in debugPropertiesHandler:', error);
    res.status(500).json({ 
      error: 'Failed to fetch properties', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}