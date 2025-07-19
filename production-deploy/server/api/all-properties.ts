import { Request, Response } from 'express';
import { Property } from '../../shared/mongodb-schemas';
import { getLocationFromCoordinates } from './property-geocoded-locations';
import { getMapImages } from './google-maps-images';
import { mongodbStorage } from '../mongodb-storage';
import * as fs from 'fs';
import * as path from 'path';

// Cache for geocoded location data to improve performance
const locationCache: Record<string, string[]> = {};

/**
 * Validate and correct property image paths using standardized naming convention
 * propertyname_20buildername_20areaname_0.jpg (case insensitive)
 */
function validateAndCorrectImagePaths(property: any): string[] {
  const validatedImages: string[] = [];
  let images = property.images || [];
  
  // Debug logging for the Hallmark Altus property
  const propertyId = property._id?.toString() || property.id?.toString();
  

  
  // NEW: Try to get images from Google Maps cache first
  try {
    const projectName = property.ProjectName || property.projectName || '';
    const areaName = property.AreaName || property.Area || property.location || '';
    
    if (projectName && areaName) {
      // Generate cache key similar to how Google Maps cache works
      const cacheKey = `${projectName.toLowerCase()}|${areaName.toLowerCase()}`;
      
      // Try to read from the image cache file
      const cacheFilePath = path.join(process.cwd(), 'property-images-cache.json');
      
      if (fs.existsSync(cacheFilePath)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
        
        // Check if we have cached images for this property
        if (cacheData[cacheKey] && cacheData[cacheKey].length > 0) {
          const cachedImages = cacheData[cacheKey];
          

          
          // Validate that the cached images actually exist and are local files
          const existingCachedImages = cachedImages.filter((imgPath: string) => {
            if (imgPath.startsWith('/property_images/')) {
              const fileName = imgPath.split('/').pop();
              const fullPath = path.join(process.cwd(), 'public', 'property_images', fileName);
              return fs.existsSync(fullPath);
            }
            return false; // Skip proxy URLs and other non-local paths
          });
          
          if (existingCachedImages.length > 0) {
            return existingCachedImages;
          }
        }
      }
    }
  } catch (error) {
    // If cache lookup fails, continue with the original logic
    console.log(`Cache lookup failed for property ${propertyId}:`, error);
  }
  
  // If images is not an array, make it one
  if (!Array.isArray(images)) {
    images = images ? [images] : [];
  }
  
  // Validate each image path
  for (const imageUrl of images) {
    try {
      let formattedUrl = imageUrl;
      
      // If it's already a full URL, add as is
      if (imageUrl.startsWith('http')) {
        validatedImages.push(imageUrl);
        continue;
      }
      
      // If it's a relative path, ensure it starts with /
      if (!imageUrl.startsWith('/')) {
        formattedUrl = `/${imageUrl}`;
      }
      
      // For local property images, check if file exists
      if (formattedUrl.startsWith('/property_images/')) {
        const imagePath = path.join(process.cwd(), 'public', formattedUrl);
        if (fs.existsSync(imagePath)) {
          validatedImages.push(formattedUrl);
        } else {
          // Generate fallback using standard naming convention
          const fallbackImage = generateStandardImagePath(property);
          if (fallbackImage) {
            validatedImages.push(fallbackImage);
            console.log(`[Property ${property.id}] ✅ Generated fallback image: ${fallbackImage}`);
          } else {
            console.log(`[Property ${property.id}] ❌ No fallback image found for: ${formattedUrl}`);
          }
        }
      } else {
        // For other paths, add as is
        validatedImages.push(formattedUrl);
      }
    } catch (error) {
      console.error(`Error validating image ${imageUrl}:`, error);
    }
  }
  
  // If no valid images found, try to generate one using standard naming
  if (validatedImages.length === 0) {
    const fallbackImage = generateStandardImagePath(property);
    if (fallbackImage) {
      validatedImages.push(fallbackImage);
    }
  }
  
  return validatedImages;
}

/**
 * Generate standard image path: propertyname_20buildername_20areaname_0.jpg
 */
function generateStandardImagePath(property: any): string | null {
  const projectName = property.ProjectName || property.projectName || '';
  const builderName = property.BuilderName || property.developerName || property.builder || '';
  let area = property.Area || property.location || property.AreaName || '';
  
  // Special handling for specific properties where we know the area
  if ((property._id === '686f6a76ccc60e8642323e90' || property.id === '686f6a76ccc60e8642323e90') && projectName.toLowerCase().includes('hallmark altus')) {
    area = 'Kondapur';
    console.log(`[Property ${property._id || property.id}] Applied special area handling: ${area}`);
  }
  
  if (!projectName) return null;
  
  console.log(`[Property ${property.id}] Generating standard image path - ProjectName: ${projectName}, BuilderName: ${builderName}, Area: ${area}`);
  
  // Try the standard naming convention first
  if (builderName && area) {
    const standardName = `${projectName.toLowerCase().replace(/\s+/g, '_20')}_20${builderName.toLowerCase().replace(/\s+/g, '_20')}_20${area.toLowerCase().replace(/\s+/g, '_20')}_0.jpg`;
    const standardPath = `/property_images/${standardName}`;
    const standardImagePath = path.join(process.cwd(), 'public', standardPath);
    
    console.log(`[Property ${property.id}] Checking standard path: ${standardPath}`);
    
    if (fs.existsSync(standardImagePath)) {
      console.log(`[Property ${property.id}] ✅ Standard image found: ${standardPath}`);
      return standardPath;
    } else {
      console.log(`[Property ${property.id}] ❌ Standard image not found: ${standardImagePath}`);
    }
  }
  
  // Try alternative patterns
  const alternativePatterns = [];
  
  // Pattern: propertyname_20areaname_0.jpg (without builder)
  if (area) {
    alternativePatterns.push(`${projectName.toLowerCase().replace(/\s+/g, '_20')}_20${area.toLowerCase().replace(/\s+/g, '_20')}_0.jpg`);
  }
  
  // Pattern: propertyname_20buildername_0.jpg (without area)
  if (builderName) {
    alternativePatterns.push(`${projectName.toLowerCase().replace(/\s+/g, '_20')}_20${builderName.toLowerCase().replace(/\s+/g, '_20')}_0.jpg`);
  }
  
  // Pattern: propertyname_0.jpg (minimal)
  alternativePatterns.push(`${projectName.toLowerCase().replace(/\s+/g, '_20')}_0.jpg`);
  
  for (const pattern of alternativePatterns) {
    const altPath = `/property_images/${pattern}`;
    const altImagePath = path.join(process.cwd(), 'public', altPath);
    
    if (fs.existsSync(altImagePath)) {
      return altPath;
    }
  }
  
  return null;
}

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 * Returns Infinity if any coordinates are invalid to avoid false matches
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Check for invalid coordinates
  if (!lat1 || !lon1 || !lat2 || !lon2 ||
      lat1 === 0 || lon1 === 0 || lat2 === 0 || lon2 === 0 ||
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return Infinity;
  }
  
  // Check for identical coordinates (distance = 0)
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }
  
  // Validate coordinate ranges
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
    console.log(`Invalid coordinate range detected: (${lat1},${lon1}) - (${lat2},${lon2})`);
    return Infinity;
  }
  
  // Calculate using Haversine formula
  try {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Earth's radius in km
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    // Validate result - sometimes calculations can go wrong
    if (isNaN(distance) || !isFinite(distance) || distance < 0) {
      console.log(`Invalid distance calculation result for (${lat1},${lon1}) - (${lat2},${lon2}): ${distance}`);
      return Infinity;
    }
    
    return distance;
  } catch (error) {
    console.error(`Error calculating distance: ${error}`);
    return Infinity;
  }
}

// API handler for getting all properties directly from the database
export async function getAllPropertiesHandler(req: Request, res: Response) {
  try {
    // Parse query parameters for filtering
    const { 
      search, 
      location, 
      propertyType, 
      minPrice, 
      maxPrice, 
      bedrooms,
      minPricePerSqft,
      maxPricePerSqft,
      configurations,
      constructionStatus,
      possession,
      radiusKm
    } = req.query;

    // Build filters object for MongoDB
    const filters: any = {};

    // Apply filters
    if (search) {
      filters.search = String(search);
    }
    if (propertyType && String(propertyType) !== 'any') {
      filters.propertyType = String(propertyType);
    }
    if (minPrice) {
      filters.minPrice = Number(minPrice);
    }
    if (maxPrice) {
      filters.maxPrice = Number(maxPrice);
    }
    if (bedrooms) {
      filters.bedrooms = Number(bedrooms);
    }
    if (minPricePerSqft) {
      filters.minPricePerSqft = Number(minPricePerSqft);
    }
    if (maxPricePerSqft) {
      filters.maxPricePerSqft = Number(maxPricePerSqft);
    }
    if (configurations && String(configurations) !== 'any') {
      filters.configurations = String(configurations);
    }
    if (constructionStatus && String(constructionStatus) !== 'any') {
      filters.constructionStatus = String(constructionStatus);
    }
    if (location && String(location) !== 'any') {
      filters.location = String(location);
    }

    // Fetch all properties from MongoDB
    const allProperties = await mongodbStorage.getAllProperties(filters);

    if (!allProperties) {
      return res.status(200).json({ properties: [], total: 0 });
    }
    
    let filteredProperties: any[] = allProperties;
    
    // If there's a location filter, handle it specially using Google Maps data
    if (location && String(location) !== 'any') {
      // Parse location parameter - it could be a single location or a comma-separated list
      const locationFilters = String(location).toLowerCase().split(',').map(loc => loc.trim());
      console.log(`Filtering by locations: ${locationFilters.join(', ')}`);
      
      // Parse the radius parameter
      const radius = radiusKm ? Number(radiusKm) : 0;
      console.log(`Using radius filter: ${radius}km`);
      
      // Create an array to hold all properties that match any of the location filters
      const matchedProperties: any[] = [];
      
      // We need reference coordinates for the selected locations to calculate distance
      const referenceCoordinates: Array<{lat: number, lng: number, source?: string}> = [];
      
      // For each location in the filter
      for (const locationFilter of locationFilters) {
        // First add any properties that match the location in the original data (text match)
        const textMatchedProperties = filteredProperties.filter((p: any) => 
          p.location.toLowerCase().includes(locationFilter) &&
          !matchedProperties.some((mp: any) => mp._id === p._id) // Avoid duplicates
        );
        
        console.log(`Found ${textMatchedProperties.length} properties matching location text "${locationFilter}"`);
        matchedProperties.push(...textMatchedProperties);
        
        // Extract coordinates from text-matched properties (if they have valid coordinates)
        textMatchedProperties.forEach((p: any) => {
          if (p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0) {
            referenceCoordinates.push({
              lat: p.latitude,
              lng: p.longitude,
              source: `${p.projectName} (location match: ${locationFilter})`
            });
          }
        });
        
        // Next, process properties with coordinates to check for area matches
        const propertiesWithCoordinates = filteredProperties.filter((p: any) => 
          p.latitude !== 0 && 
          p.longitude !== 0 && 
          !matchedProperties.some((mp: any) => mp._id === p._id) // Skip properties already matched
        );
        
        console.log(`Checking geocoded locations for ${propertiesWithCoordinates.length} additional properties for location "${locationFilter}"`);
        
        // To avoid hammering the API, batch the geocoding requests
        // Process in smaller batches to reduce API load
        const BATCH_SIZE = 5;
        for (let i = 0; i < propertiesWithCoordinates.length; i += BATCH_SIZE) {
          const batch = propertiesWithCoordinates.slice(i, Math.min(i + BATCH_SIZE, propertiesWithCoordinates.length));
          
          // Process each property in the batch
          for (const property of batch) {
            const coordKey = `${property.latitude},${property.longitude}`;
            
            // Check if we already have cached data for this coordinate
            if (!locationCache[coordKey]) {
              if (property.latitude && property.longitude) {
                try {
                  // Get neighborhood/area name from coordinates
                  locationCache[coordKey] = await getLocationFromCoordinates(property.latitude, property.longitude);
                  console.log(`Retrieved area info for ${property.projectName}: ${locationCache[coordKey].join(', ')}`);
                } catch (error) {
                  console.error(`Error getting area from coordinates for property ${property._id}:`, error);
                  locationCache[coordKey] = [];
                }
              } else {
                locationCache[coordKey] = [];
              }
            }
            
            // Check if any of the geocoded location areas matches the filter
            const areas = locationCache[coordKey] || [];
            
            // Check if any area name matches the filter
            const hasAreaMatch = areas.some((area: string) => 
              area.toLowerCase().includes(locationFilter)
            );
            
            if (hasAreaMatch) {
              console.log(`Property "${property.projectName}" matched area filter "${locationFilter}" through coordinates`);
              matchedProperties.push(property);
              
              // Add this property's coordinates to our reference list
              if (property.latitude && property.longitude) {
                referenceCoordinates.push({
                  lat: property.latitude,
                  lng: property.longitude,
                  source: `${property.projectName} (area match: ${locationFilter})`
                });
              }
            }
          }
          
          // Small delay between batches to be respectful to the API
          if (i + BATCH_SIZE < propertiesWithCoordinates.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      // If we have reference coordinates and a radius filter, check for nearby properties
      if (referenceCoordinates.length > 0 && radius > 0) {
        console.log(`Checking for properties within ${radius}km of ${referenceCoordinates.length} reference points`);
        
        const nearbyProperties = filteredProperties.filter((property: any) => {
          if (!property.latitude || !property.longitude || property.latitude === 0 || property.longitude === 0) {
            return false;
          }
          
          // Check if this property is already matched
          if (matchedProperties.some((mp: any) => mp._id === property._id)) {
            return false;
          }
          
          // Check distance to any reference coordinate
          for (const refCoord of referenceCoordinates) {
            const distance = calculateDistance(
              property.latitude, property.longitude,
              refCoord.lat, refCoord.lng
            );
            
            if (distance <= radius) {
              console.log(`Property "${property.projectName}" is ${distance.toFixed(2)}km from ${refCoord.source}`);
              return true;
            }
          }
          
          return false;
        });
        
        console.log(`Found ${nearbyProperties.length} additional properties within ${radius}km radius`);
        matchedProperties.push(...nearbyProperties);
      }
      
      // Use the matched properties instead of all properties
      filteredProperties = matchedProperties;
    }

    // Transform properties to match the expected format
    const transformedProperties = await Promise.all(filteredProperties.map(async (property: any) => {
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
      
      // Process images - check for local files first
      let images = property.images || [];
      
      // If no images in database, check for local files using standard naming
      if (!images || images.length === 0) {
        const projectName = property.ProjectName || property.projectName || '';
        const builderName = property.BuilderName || property.developerName || property.builder || '';
        const area = property.AreaName || property.Area || property.location || 'Hyderabad';
        
        if (projectName) {
          // Convert names to match exact google-maps-images.ts naming convention
          const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const safeBuilderName = (builderName || 'builder').replace(/[^a-z0-9]/gi, '_').toLowerCase(); 
          const safeAreaName = (area || 'hyderabad').replace(/[^a-z0-9]/gi, '_').toLowerCase();
          
          // Try to find images with standard naming convention
          const baseImageName = `${safeProjectName}_20${safeBuilderName}_20${safeAreaName}`;
          
          // Check for up to 5 images
          for (let i = 0; i < 5; i++) {
            const imagePath = `/property_images/${baseImageName}_${i}.jpg`;
            const fullPath = path.join(process.cwd(), 'public', imagePath);
            
            if (fs.existsSync(fullPath)) {
              images.push(imagePath);
            }
          }
        }
      }
      
      // Images array already contains validated local files, use as is
      const validatedImages = images;
      
      return {
        id: property._id,
        // Map new schema fields to expected format
        developerName: property.BuilderName || '',
        reraNumber: property.RERA_Number || '',
        projectName: property.ProjectName || '',
        constructionStatus: '',
        propertyType: '',
        location: property.AreaName || '',
        possessionDate: property.Possession_Date || '',
        isGatedCommunity: false,
        totalUnits: 0,
        areaSizeAcres: 0,
        configurations: property.configurations || [],
        minSizeSqft: 0,
        maxSizeSqft: 0,
        pricePerSqft: property.PriceSheet || 0,
        pricePerSqftOTP: 0,
        price: property.PriceSheet || 0,
        longitude: longitude,
        latitude: latitude,
        projectDocumentsLink: '',
        source: '',
        builderContactInfo: '',
        listingType: '',
        loanApprovedBanks: [],
        nearbyLocations: [],
        remarksComments: '',
        amenities: [],
        faq: [],
        name: property.ProjectName || '',
        bedrooms: 0,
        bathrooms: 0,
        area: 0,
        description: '',
        features: [],
        images: validatedImages,
        builder: property.BuilderName || '',
        possession: property.Possession_Date || '',
        rating: property.google_place_rating || 0,
        legalClearance: '',
        constructionQuality: '',
        waterSupply: '',
        powerBackup: '',
        parkingFacilities: '',
        communityType: '',
        buildQuality: '',
        investmentPotential: '',
        propertyAge: '',
        environmentalFeatures: '',
        views: '',
        noiseLevel: '',
        connectivityAndTransit: '',
        medicalFacilities: '',
        educationalInstitutions: '',
        shoppingAndEntertainment: '',
        specialFeatures: [],
        videoTour: '',
        virtualTour: '',
        siteVisitSchedule: '',
        homeLoans: '',
        maintenanceCharges: '',
        taxAndCharges: '',
        legalDocuments: [],
        floorPlans: [],
        masterPlan: '',
        relaiRating: 0,
        relaiReview: '',
        discounts: '',
        bookingAmount: '',
        paymentSchedule: '',
        minimumBudget: minBudget,
        maximumBudget: maxBudget,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Include original new schema fields for frontend
        ProjectName: property.ProjectName,
        BuilderName: property.BuilderName,
        AreaName: property.AreaName,
        RERA_Number: property.RERA_Number,
        PriceSheet: property.PriceSheet,
        Possession_Date: property.Possession_Date,
        google_place_location: property.google_place_location,
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
    }));

    // Log the first few properties to verify sorting by Google reviews
    if (transformedProperties.length > 0) {
      console.log('Top 5 properties by Google reviews count:');
      transformedProperties.slice(0, 5).forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.ProjectName} - Reviews: ${prop.google_place_user_ratings_total || 0}`);
      });
    }

    console.log(`Returning ${transformedProperties.length} properties`);
    res.json({ 
      properties: transformedProperties, 
      total: transformedProperties.length 
    });

  } catch (error) {
    console.error('Error in getAllPropertiesHandler:', error);
    res.status(500).json({ 
      error: 'Failed to fetch properties', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}