import { Request, Response } from 'express';
import { Property } from '../mongodb-schemas';

interface PlaceDetail {
  name: string;
  distance: string;
  duration: string;
  rating?: number;
}

interface PlaceCategory {
  type: string;
  count: number;
  places: PlaceDetail[];
}

interface TransitInfo {
  name: string;
  distance: string;
  duration: string;
  type: string;
}

interface NearbyPlacesData {
  amenities: PlaceCategory[];
  transitPoints: TransitInfo[];
}

export async function getPropertyNearbyPlaces(req: Request, res: Response) {
  try {
    const { lat, lng, propertyName, location } = req.query;
    
    let property = null;
    
    // If we have coordinates, try to find property by coordinates
    if (lat && lng) {
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      
      console.log(`🗺️ Finding property near coordinates: ${latitude}, ${longitude}`);
      
      // Find property with matching coordinates (within a small range)
      property = await Property.findOne({
        'google_place_location.lat': { $gte: latitude - 0.01, $lte: latitude + 0.01 },
        'google_place_location.lng': { $gte: longitude - 0.01, $lte: longitude + 0.01 }
      }).lean();
      
      // If no exact match, find by property name
      if (!property && propertyName) {
        property = await Property.findOne({
          $or: [
            { ProjectName: { $regex: propertyName, $options: 'i' } },
            { projectName: { $regex: propertyName, $options: 'i' } }
          ]
        }).lean();
      }
    }
    // If no coordinates, find by property name
    else if (propertyName) {
      console.log(`🗺️ Finding property by name: ${propertyName}`);
      property = await Property.findOne({
        $or: [
          { ProjectName: { $regex: propertyName, $options: 'i' } },
          { projectName: { $regex: propertyName, $options: 'i' } }
        ]
      }).lean();
    }
    
    if (!property) {
      return res.status(404).json({
        error: 'Property not found'
      });
    }
    
    console.log(`🗺️ Found property: ${property.ProjectName || property.projectName}`);
    
    // Extract nearby places data from MongoDB
    const nearbyPlacesData: NearbyPlacesData = {
      amenities: [],
      transitPoints: []
    };
    
    // Process hospitals
    if (property.nearest_hospitals && Array.isArray(property.nearest_hospitals)) {
      const hospitals = property.nearest_hospitals.map(h => ({
        name: h.name,
        distance: `${h.distance} km`,
        duration: `${Math.round(parseFloat(h.distance) * 2)} min`,
        rating: h.rating
      }));
      nearbyPlacesData.amenities.push({
        type: 'Hospitals',
        count: property.hospitals_count || hospitals.length,
        places: hospitals
      });
    }
    
    // Process shopping malls
    if (property.nearest_shopping_malls && Array.isArray(property.nearest_shopping_malls)) {
      const malls = property.nearest_shopping_malls.map(m => ({
        name: m.name,
        distance: `${m.distance} km`,
        duration: `${Math.round(parseFloat(m.distance) * 2)} min`,
        rating: m.rating
      }));
      nearbyPlacesData.amenities.push({
        type: 'Shopping Malls',
        count: property.shopping_malls_count || malls.length,
        places: malls
      });
    }
    
    // Process schools
    if (property.nearest_schools && Array.isArray(property.nearest_schools)) {
      const schools = property.nearest_schools.map(s => ({
        name: s.name,
        distance: `${s.distance} km`,
        duration: `${Math.round(parseFloat(s.distance) * 2)} min`,
        rating: s.rating
      }));
      nearbyPlacesData.amenities.push({
        type: 'Schools',
        count: property.schools_count || schools.length,
        places: schools
      });
    }
    
    // Process restaurants
    if (property.nearest_restaurants && Array.isArray(property.nearest_restaurants)) {
      const restaurants = property.nearest_restaurants.map(r => ({
        name: r.name,
        distance: `${r.distance} km`,
        duration: `${Math.round(parseFloat(r.distance) * 2)} min`,
        rating: r.rating
      }));
      nearbyPlacesData.amenities.push({
        type: 'Restaurants',
        count: property.restaurants_count || restaurants.length,
        places: restaurants
      });
    }
    
    // Process supermarkets
    if (property.nearest_supermarkets && Array.isArray(property.nearest_supermarkets)) {
      const supermarkets = property.nearest_supermarkets.map(s => ({
        name: s.name,
        distance: `${s.distance} km`,
        duration: `${Math.round(parseFloat(s.distance) * 2)} min`,
        rating: s.rating
      }));
      nearbyPlacesData.amenities.push({
        type: 'Supermarkets',
        count: property.supermarkets_count || supermarkets.length,
        places: supermarkets
      });
    }
    
    // Process IT offices
    if (property.nearest_it_offices && Array.isArray(property.nearest_it_offices)) {
      const itOffices = property.nearest_it_offices.map(it => ({
        name: it.name,
        distance: `${it.distance} km`,
        duration: `${Math.round(parseFloat(it.distance) * 2)} min`,
        rating: it.rating
      }));
      nearbyPlacesData.amenities.push({
        type: 'IT Companies',
        count: property.it_offices_count || itOffices.length,
        places: itOffices
      });
    }
    
    // Process transit points
    if (property.nearest_metro_station && Array.isArray(property.nearest_metro_station)) {
      property.nearest_metro_station.forEach(metro => {
        nearbyPlacesData.transitPoints.push({
          name: metro.name,
          distance: `${metro.distance} km`,
          duration: `${Math.round(parseFloat(metro.distance) * 2)} min`,
          type: 'metro'
        });
      });
    }
    
    if (property.nearest_railway_station && Array.isArray(property.nearest_railway_station)) {
      property.nearest_railway_station.forEach(railway => {
        nearbyPlacesData.transitPoints.push({
          name: railway.name,
          distance: `${railway.distance} km`,
          duration: `${Math.round(parseFloat(railway.distance) * 2)} min`,
          type: 'train'
        });
      });
    }
    
    if (property.nearest_orr_access && Array.isArray(property.nearest_orr_access)) {
      property.nearest_orr_access.forEach(orr => {
        nearbyPlacesData.transitPoints.push({
          name: orr.name,
          distance: `${orr.distance} km`,
          duration: `${Math.round(parseFloat(orr.distance) * 2)} min`,
          type: 'highway'
        });
      });
    }
    
    console.log(`🗺️ Returning nearby places data for ${property.ProjectName || property.projectName}`);
    console.log(`🗺️ Amenities found: ${nearbyPlacesData.amenities.length} categories`);
    console.log(`🗺️ Transit points found: ${nearbyPlacesData.transitPoints.length} points`);
    
    res.json(nearbyPlacesData);
    
  } catch (error: any) {
    console.error('Error fetching nearby places:', error);
    res.status(500).json({
      error: 'Failed to fetch nearby places',
      details: error.message
    });
  }
}