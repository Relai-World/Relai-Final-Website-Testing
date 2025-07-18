import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, AlertCircle, SearchX, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { formatProjectName } from '@/utils/nameFormatter';
import { BrandLoader } from '@/components/ui/brand-loader';

// Define the type for property data
type Property = {
  id: string;
  property_id?: string; // Adding property_id field which is used for routing
  projectName: string;
  name: string;
  longitude: number;
  latitude: number;
  location: string;
  propertyType: string;
  price: number;
  constructionStatus?: string;
  images?: string[];
  googleRating?: number; // Real Google Maps rating
  totalGoogleRatings?: number; // Number of Google reviews
};

interface PropertiesMapProps {
  properties: Property[];
}

// Map container styles
const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
  marginBottom: '2rem'
};

// Default center (Hyderabad)
const defaultCenter = {
  lat: 17.4065, 
  lng: 78.4772
};

// Format price for display
const formatPrice = (price: number): string => {
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(2)} Cr`;
  } else if (price >= 100000) {
    return `₹${(price / 100000).toFixed(2)} Lac`;
  } else {
    return `₹${price.toLocaleString()}`;
  }
};

// Get Google Maps rating for property (will be fetched from API)
const getGoogleRating = (property: Property): number | null => {
  // Return the actual Google Maps rating if available
  return property.googleRating || null;
};

// Render star rating component
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        if (index < fullStars) {
          return <Star key={index} className="w-3 h-3 fill-yellow-400 text-yellow-400" />;
        } else if (index === fullStars && hasHalfStar) {
          return (
            <div key={index} className="relative w-3 h-3">
              <Star className="w-3 h-3 text-gray-300 absolute" />
              <div className="w-1.5 h-3 overflow-hidden absolute">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          );
        } else {
          return <Star key={index} className="w-3 h-3 text-gray-300" />;
        }
      })}
      <span className="text-xs font-medium text-gray-700 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
};

const PropertiesMap: React.FC<PropertiesMapProps> = ({ properties }) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [, navigate] = useLocation();
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Fetch the Google Maps API key using React Query
  const { data: mapsApiKeyData, isLoading: isLoadingApiKey, error: apiKeyError } = useQuery({
    queryKey: ['/api/maps-api-key'],
    queryFn: async () => {
      console.log('Fetching Maps API key...');
      try {
        const result = await apiRequest<{ apiKey: string }>('/api/maps-api-key');
        console.log('Maps API key fetched successfully:', !!result?.apiKey);
        return result;
      } catch (error) {
        console.error('Error fetching Maps API key:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: Infinity, // The API key shouldn't change during the session
  });

  const mapsApiKey = mapsApiKeyData?.apiKey || '';
  
  // Log key variables for debugging
  useEffect(() => {
    console.log('Map component state:', {
      hasApiKey: !!mapsApiKey,
      apiKeyLength: mapsApiKey?.length || 0,
      isLoadingApiKey,
      hasApiKeyError: !!apiKeyError,
      propertiesCount: properties.length,
      propertiesWithCoords: properties.filter(p => p.latitude && p.longitude).length
    });
  }, [mapsApiKey, isLoadingApiKey, apiKeyError, properties]);

  // Handle loading state
  if (isLoadingApiKey) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-lg flex flex-col items-center justify-center">
        <BrandLoader size="lg" text="Loading map..." />
      </div>
    );
  }
  
  // Handle API key error
  if (apiKeyError) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-lg flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
        <p className="text-red-600 font-medium mb-2">Unable to load Google Maps</p>
        <p className="text-gray-600 max-w-md">There was an error loading the map. Please try again later.</p>
      </div>
    );
  }
  
  // Handle when API key isn't available
  if (!mapsApiKey) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-lg flex flex-col items-center justify-center">
        <BrandLoader size="lg" text="Initializing map..." />
      </div>
    );
  }
  
  // Verify we have properties with coordinates
  if (properties.length === 0 || properties.every(p => !p.latitude || !p.longitude)) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-lg flex flex-col items-center justify-center p-4 text-center">
        <SearchX className="h-8 w-8 text-gray-400 mb-3" />
        <p className="text-gray-700 font-medium mb-2">No properties to display on map</p>
        <p className="text-gray-600 max-w-md">No properties with location data were found.</p>
      </div>
    );
  }

  // Filter out properties without valid coordinates
  const validProperties = properties.filter(property => 
    property.latitude && property.longitude && 
    property.latitude !== 0 && property.longitude !== 0
  );

  // Handle map load - defining this function outside of useCallback to avoid the hooks error
  function handleMapLoad(map: google.maps.Map) {
    setMapInstance(map);
    
    // Fit bounds to show all properties
    if (validProperties.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      
      validProperties.forEach(property => {
        bounds.extend({
          lat: property.latitude,
          lng: property.longitude
        });
      });
      
      map.fitBounds(bounds);
      
      // Set a minimum zoom level to prevent excessive zooming in when there are few properties
      const zoom = map.getZoom();
      if (zoom && zoom > 14) {
        map.setZoom(14);
      }
    }
  }

  // Navigate to property detail page
  const handlePropertyClick = (propertyId: string, e?: React.MouseEvent) => {
    console.log('Navigating to property detail:', propertyId);
    // First prevent event bubbling
    e?.stopPropagation?.();
    
    if (propertyId) {
      // Simply use the ID directly for routing to ensure consistency
      console.log(`Navigating to property with ID: ${propertyId}`);
      navigate(`/property/${propertyId}`);
    }
  };

  // Create a custom marker icon
  const getMarkerIcon = () => {
    return {
      path: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
      fillColor: "#1752FF",
      fillOpacity: 1,
      strokeWeight: 1,
      strokeColor: "#FFFFFF",
      scale: 1
    };
  };

  return (
    <div className="relative w-full mb-8">
      <LoadScript
        googleMapsApiKey={mapsApiKey}
        loadingElement={
          <div className="h-[500px] bg-gray-100 rounded-lg flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-gray-600">Loading Google Maps...</p>
          </div>
        }
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={defaultCenter}
          zoom={10}
          onLoad={handleMapLoad}
          options={{
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            zoomControl: true,
            disableDefaultUI: false,
            restriction: {
              latLngBounds: {
                north: 17.8,
                south: 17.2,
                east: 78.7,
                west: 78.2
              }
            },
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              },
              {
                featureType: "transit",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }]
              },
              {
                featureType: "administrative",
                elementType: "labels.text",
                stylers: [{ visibility: "simplified" }]
              },
              {
                featureType: "water",
                elementType: "labels.text",
                stylers: [{ visibility: "off" }]
              }
            ]
          }}
        >
          {validProperties.map((property) => (
            <Marker
              key={property.id}
              position={{
                lat: property.latitude,
                lng: property.longitude
              }}
              onClick={() => setSelectedProperty(property)}
              icon={getMarkerIcon()}
            />
          ))}

          {selectedProperty && (
            <InfoWindow
              position={{
                lat: selectedProperty.latitude,
                lng: selectedProperty.longitude
              }}
              onCloseClick={() => setSelectedProperty(null)}
            >
              <div className="max-w-[320px] p-4 bg-white rounded-lg shadow-lg">
                {/* Header Section */}
                <div className="border-b border-gray-200 pb-3 mb-3">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {formatProjectName(selectedProperty.projectName || selectedProperty.name)}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {selectedProperty.location}
                  </div>
                  {selectedProperty.googleRating && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={selectedProperty.googleRating} size="sm" />
                      <span className="text-xs text-gray-500">Google Rating</span>
                    </div>
                  )}
                </div>

                {/* Property Details Grid */}
                <div className="space-y-2 mb-4">
                  {/* Configuration and Possession */}
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">Configuration</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {(() => {
                          // Extract configuration from configurations array
                          if (selectedProperty.configurations && Array.isArray(selectedProperty.configurations) && selectedProperty.configurations.length > 0) {
                            const configTypesSet = new Set(selectedProperty.configurations.map((conf: any) => conf && (conf.type || conf.Type || '')).filter(Boolean));
                            const configTypes = Array.from(configTypesSet);
                            return configTypes.length > 0 ? configTypes.join(', ') : 'N/A';
                          }
                          // Fallback to other fields
                          return selectedProperty.unitType || selectedProperty.unitTypes || 'N/A';
                        })()}
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-xs text-gray-500 mb-1">Possession</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {selectedProperty.Possession_Date || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Price Information */}
                  <div className="bg-blue-50 rounded-lg p-3 mt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Price Range</div>
                        <div className="text-lg font-bold text-blue-600">
                          {selectedProperty.price > 0 ? formatPrice(selectedProperty.price) : 'Price on Request'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Price Per Sq.ft</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {(() => {
                            // Get price per sqft from property data - try multiple field names
                            const pricePerSqft = selectedProperty.pricePerSqft || 
                                               (selectedProperty as any).PriceSheet || 
                                               (selectedProperty as any).priceSheet ||
                                               (selectedProperty as any).Price_per_sft;
                            return pricePerSqft && pricePerSqft > 0 ? `₹${pricePerSqft.toLocaleString()}` : 'N/A';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Construction Status */}
                  {selectedProperty.constructionStatus && (
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">Construction Status</div>
                      <div className="text-sm font-medium text-gray-800">
                        {selectedProperty.constructionStatus}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-3 border-t border-gray-200">
                  <button 
                    onClick={(e) => handlePropertyClick(selectedProperty.id, e)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Full Details
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white px-3 py-2 rounded-md shadow-md text-xs">
          <strong>{validProperties.length}</strong> properties shown on map
        </div>
      </div>
    </div>
  );
};

export default PropertiesMap;