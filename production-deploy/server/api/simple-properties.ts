import { Request, Response } from 'express';
import { mongodbStorage } from '../mongodb-storage';
import * as fs from 'fs';
import * as path from 'path';

// Simple properties endpoint without heavy image processing
export async function getSimplePropertiesHandler(req: Request, res: Response) {
  try {
    console.log('Fetching simple properties from database...');
    
    // Get search query if provided
    const { search } = req.query;
    const filters: any = {};
    
    if (search) {
      filters.search = String(search);
    }
    
    // Fetch all properties from MongoDB
    const allProperties = await mongodbStorage.getAllProperties(filters);
    
    if (!allProperties || allProperties.length === 0) {
      return res.status(200).json({ properties: [], total: 0 });
    }
    
    console.log(`Retrieved ${allProperties.length} properties from database`);
    
    // Simple transformation without heavy processing
    const transformedProperties = allProperties.map((property: any) => {
      // Extract coordinates from the new schema
      const coordinates = property.google_place_location || {};
      const latitude = coordinates.lat || 0;
      const longitude = coordinates.lng || 0;
      
      // Calculate budget from configurations
      let minBudget = 0;
      let maxBudget = 0;
      if (property.configurations && Array.isArray(property.configurations)) {
        const prices = property.configurations.map((config: any) => config.BaseProjectPrice).filter(Boolean);
        if (prices.length > 0) {
          minBudget = Math.min(...prices);
          maxBudget = Math.max(...prices);
        }
      }
      
      // Extract location: Use google_place_address if AreaName is null
      const extractedLocation = property.AreaName || 
        (property.google_place_address ? property.google_place_address.split(',')[0] : '') || 
        property.google_place_name || '';
      
      return {
        id: property._id,
        // Map new schema fields to expected format
        developerName: property.BuilderName || '',
        reraNumber: property.RERA_Number || '',
        projectName: property.ProjectName || '',
        location: extractedLocation,
        possessionDate: property.Possession_Date || '',
        configurations: property.configurations || [],
        pricePerSqft: property.PriceSheet || 0,
        longitude: longitude,
        latitude: latitude,
        rating: property.google_place_rating || 0,
        minimumBudget: minBudget,
        maximumBudget: maxBudget,
        images: (() => {
          // Check for local images using standard naming convention
          const images: string[] = [];
          const projectName = property.ProjectName || '';
          const builderName = property.BuilderName || '';
          const area = property.AreaName || property.location || 'Hyderabad';
          
          if (projectName) {
            // Match exact naming convention from google-maps-images.ts
            const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeBuilderName = (builderName || 'builder').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeAreaName = (area || 'hyderabad').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            
            // Also try the space-to-_20 conversion pattern that Google Maps API uses
            const altProjectName = projectName.toLowerCase().replace(/\s+/g, '_20').replace(/[^a-z0-9_]/gi, '_');
            const altBuilderName = (builderName || 'builder').toLowerCase().replace(/\s+/g, '_20').replace(/[^a-z0-9_]/gi, '_');
            const altAreaName = (area || 'hyderabad').toLowerCase().replace(/\s+/g, '_20').replace(/[^a-z0-9_]/gi, '_');
            
            const baseImageName = `${safeProjectName}_20${safeBuilderName}_20${safeAreaName}`;
            
            // Image naming convention: Google Maps API uses space-to-_20 conversion
            
            // First try the alternative naming pattern (space-to-_20)
            const altBaseImageName = `${altProjectName}_20${altBuilderName}_20${altAreaName}`;
            for (let i = 0; i < 5; i++) {
              const imagePath = `/property_images/${altBaseImageName}_${i}.jpg`;
              const fullPath = path.join(process.cwd(), 'public', imagePath);
              
              if (fs.existsSync(fullPath)) {
                images.push(imagePath);
              }
            }
            
            // Check for up to 5 images
            for (let i = 0; i < 5; i++) {
              const imagePath = `/property_images/${baseImageName}_${i}.jpg`;
              const fullPath = path.join(process.cwd(), 'public', imagePath);
              
              if (fs.existsSync(fullPath)) {
                images.push(imagePath);
                if (projectName.includes('Anandha') && i === 0) {
                  console.log(`[IMG DEBUG] Found image: ${imagePath}`);
                }
              }
            }
            
            // If no images found, try comprehensive fallback patterns
            if (images.length === 0) {
              const fallbackPatterns = [
                // Primary: project + hyderabad (Google Maps pattern)
                `${altProjectName}_20hyderabad`,
                // Secondary: project + actual area (for location-specific images)
                area && area.toLowerCase() !== 'hyderabad' ? `${altProjectName}_20${altAreaName}` : null,
                // Tertiary: safe pattern fallback
                `${safeProjectName}_20hyderabad`,
                // Final: project name only
                `${altProjectName}`
              ].filter(Boolean);
              
              for (const pattern of fallbackPatterns) {
                if (images.length > 0) break; // Stop when images are found
                
                for (let i = 0; i < 5; i++) {
                  const imagePath = `/property_images/${pattern}_${i}.jpg`;
                  const fullPath = path.join(process.cwd(), 'public', imagePath);
                  if (fs.existsSync(fullPath)) {
                    images.push(imagePath);
                  }
                }
              }
            }
            
            // If still no local images found, mark for Google Maps API fallback
            if (images.length === 0) {
              // Return special marker that will trigger Google Maps API request on frontend
              images.push('__FETCH_FROM_GOOGLE_MAPS__');
            }
          }
          
          return images;
        })(),
        // Include original new schema fields for frontend
        ProjectName: property.ProjectName,
        BuilderName: property.BuilderName,
        AreaName: property.AreaName,
        RERA_Number: property.RERA_Number,
        PriceSheet: property.PriceSheet,
        Possession_Date: property.Possession_Date,
        google_place_location: property.google_place_location,
        google_place_name: property.google_place_name,
        google_place_address: property.google_place_address,
        google_place_rating: property.google_place_rating,
        google_place_user_ratings_total: property.google_place_user_ratings_total,
        connectivity_score: property.connectivity_score,
        amenities_score: property.amenities_score,
        hospitals_count: property.hospitals_count,
        schools_count: property.schools_count,
        restaurants_count: property.restaurants_count,
        shopping_malls_count: property.shopping_malls_count,
        it_offices_count: property.it_offices_count,
        metro_stations_count: property.metro_stations_count,
        railway_stations_count: property.railway_stations_count,
        nearest_hospitals: property.nearest_hospitals,
        nearest_schools: property.nearest_schools,
        nearest_restaurants: property.nearest_restaurants,
        nearest_shopping_malls: property.nearest_shopping_malls,
        nearest_it_offices: property.nearest_it_offices,
        nearest_metro_station: property.nearest_metro_station,
        nearest_railway_station: property.nearest_railway_station
      };
    });
    
    console.log(`Returning ${transformedProperties.length} simple properties`);
    res.json({ 
      properties: transformedProperties, 
      total: transformedProperties.length 
    });
    
  } catch (error) {
    console.error('Error in getSimplePropertiesHandler:', error);
    res.status(500).json({ 
      error: 'Failed to fetch properties', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}