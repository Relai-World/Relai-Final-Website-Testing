import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { 
  SearchIcon, FilterIcon, HomeIcon, MapPinIcon, BedDoubleIcon, Calendar as CalendarIcon, 
  X, ChevronLeft, ChevronRight, MapIcon, ListIcon, Target, AlertCircle, 
  SearchX, Loader2, ChevronDown, Building2, Ruler, Wallet, Calendar, MapPin 
} from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import PropertiesMap from '@/components/map/PropertiesMap';
import PropertyImage from '@/components/property/PropertyImage';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { formatProjectName, formatBuilderName } from '@/utils/nameFormatter';
import { BrandLoader, PropertyCardSkeleton } from '@/components/ui/brand-loader';

// Define a flexible type for property data from the API
type ApiProperty = {
  id: string;
  _id: string;
  [key: string]: any; // Allows for flexible property access (e.g., property.ProjectName)
};

// Helper function to extract property data from Mongoose document structure
const extractPropertyData = (property: any): any => {
  let extracted;
  
  // If it's a Mongoose document, extract the actual data from _doc
  if (property && property._doc) {
    extracted = { ...property._doc, id: property.id || property._id };
  } else {
    // If it's already a plain object, return as is
    extracted = { ...property };
  }
  
  // Handle new enhanced schema fields - prioritize new fields over legacy ones
  const projectName = extracted.ProjectName || extracted.projectName || extracted.name || 'Unknown Project';
  const builderName = extracted.BuilderName || extracted.builderName || extracted.builder || 'Unknown Builder';
  const areaName = extracted.AreaName || extracted.Area || extracted.location || extracted.area || 'Unknown Area';
  const pricePerSft = extracted.PriceSheet || extracted.Price_per_sft || extracted.pricePerSqft || 0;
  const possessionDate = extracted.Possession_Date || extracted.Possession_date || extracted.possessionDate || '';
  const reraNumber = extracted.RERA_Number || extracted.reraNumber || '';
  
  // Return enhanced property data with both legacy and new fields
  return {
    ...extracted,
    // Standardized field names for frontend consistency
    ProjectName: projectName,
    BuilderName: builderName,
    AreaName: areaName,
    Area: areaName, // Keep both for backward compatibility
    PriceSheet: typeof pricePerSft === 'number' ? pricePerSft : (typeof pricePerSft === 'string' ? parseFloat(pricePerSft) : 0),
    Price_per_sft: typeof pricePerSft === 'number' ? pricePerSft : (typeof pricePerSft === 'string' ? parseFloat(pricePerSft) : 0),
    Possession_Date: possessionDate,
    Possession_date: possessionDate, // Keep both for backward compatibility
    RERA_Number: reraNumber,
    id: extracted._id || extracted.id
  };
};

// Define the backend URL for constructing image paths
// Use the current window location for Replit environment
const API_BASE_URL_PROPERTIES = import.meta.env.VITE_API_URL_PROPERTIES || window.location.origin;
const API_BASE_URL_OTHERS = import.meta.env.VITE_API_URL_OTHERS || window.location.origin;

/**
 * Helper to get property image path with correct port
 */

function getPropertyImagePath(property: any): string {
  const API_URL = window.location.origin;
  if (property.images && property.images.length > 0) {
    if (property.images[0].startsWith('http')) return property.images[0];
    // Remove '/property_images/' if present
    const imgName = property.images[0].replace(/^\/property_images\//, '');
    return `${API_URL}/property_images/${imgName}`;
  }
  const name = (property.ProjectName || property.projectName || '').toLowerCase().replace(/\s+/g, '_20');
  const loc = (property.AreaName || property.location || property.Location || property.Area || '').toLowerCase().replace(/\s+/g, '_20');
  if (!name || !loc) return '/img/placeholder-property.png';
  // Remove '/property_images/' from the start if present
  const imgName = `${name}_${loc}_0.jpg`.replace(/^\/property_images\//, '');
  return `${API_URL}/property_images/${imgName}`;
}

// Helper function to format date from DD-MM-YYYY to MM-YY (e.g., "01-08-2028" -> "08-28")
const formatPossessionDate = (dateStr?: string): string => {
  if (!dateStr || typeof dateStr !== 'string') return "N/A";
  // Replace / with - for consistency
  const normalized = dateStr.replace(/\//g, '-');
  if (!/^\d{2}-\d{2}-\d{2,4}$/.test(normalized)) return "N/A";
  try {
    const parts = normalized.split('-'); // [DD, MM, YYYY]
    const month = parts[1];
    const year = parts[2].slice(-2); // last two digits of year
    return `${month}-${year}`;
  } catch (error) {
    return "N/A";
  }
};

// Helper to parse Possession_date (supports 'DD-MM-YYYY', 'MM-YYYY', 'MM-YY') to a comparable (year, month) tuple
function parsePossessionDateParts(dateStr: string): [number, number] | null {
  if (!dateStr) return null;
  let parts = dateStr.split('-');
  if (parts.length < 2) return null;
  let month: number, year: number;
  if (parts.length === 3) {
    // DD-MM-YYYY
    month = parseInt(parts[1], 10);
    year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
  } else {
    // MM-YYYY or MM-YY
    month = parseInt(parts[0], 10);
    year = parts[1].length === 2 ? 2000 + parseInt(parts[1], 10) : parseInt(parts[1], 10);
  }
  if (isNaN(month) || isNaN(year)) return null;
  return [year, month];
}

// Helper to compare (year, month) tuples
function compareYM(a: [number, number], b: [number, number]) {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

// Transform API property data to map-compatible format
const transformPropertyForMap = (apiProperty: ApiProperty) => {
  const property = extractPropertyData(apiProperty);
  return {
    id: property.id || property._id,
    property_id: property.id || property._id,
    projectName: property.ProjectName || property.projectName || "Unnamed Project",
    name: property.ProjectName || property.projectName || "Unnamed Project",
    longitude: property.longitude || property.lng || 0,
    latitude: property.latitude || property.lat || 0,
    location: property.AreaName || property.location || property.Location || property.Area || "Unknown Location",
    propertyType: property.propertyType || "Unknown",
    configurations: property.configurations || [],
    unitType: property.unitType || "N/A",
    unitTypes: property.unitTypes || "N/A",
    configurationDetails: property.configurationDetails || [],
    price: property.price || property.minimumBudget || 0,
    constructionStatus: property.constructionStatus,
    images: property.images || [],
    googleRating: property.rating || 4,
    totalGoogleRatings: property.totalRatings || 0,
    AreaName: property.AreaName || property.location || property.Area || '',
    Possession_Date: property.Possession_Date || property.possessionDate || property.Possession_date || '',
  };
};

export default function AllPropertiesPage() {
  // Hook for programmatic navigation and search params
  const [_, setLocation] = useLocation();
  const searchParams = useSearch();
  
  // Parse initial page from URL
  const getPageFromUrl = () => {
    const urlParams = new URLSearchParams(searchParams);
    return parseInt(urlParams.get('page') || '1', 10);
  };
  
  // Set page title when component mounts
  useEffect(() => {
    document.title = "All Properties | Relai";
    return () => {
      document.title = "Relai | The Ultimate Real Estate Buying Experience";
    };
  }, []);
  
  const handleCardClick = (propertyId: string) => {
    setLocation(`/property/${propertyId}`);
  };

  // Helper function to format the budget range for display
  const formatBudgetRange = (property: any): string => {
    const formatPriceValue = (price: number): string | null => {
      if (!price) return null;
      if (price >= 10000000) {
        return `₹${(price / 10000000).toFixed(2)} Cr`;
      } else if (price >= 100000) {
        return `₹${(price / 100000).toFixed(2)} Lac`;
      }
      return `₹${price.toLocaleString()}`;
    };

    // First try to use existing budget fields if available (these come from the simple API)
    const minBudget = property.minimumBudget || 0;
    const maxBudget = property.maximumBudget || 0;
    
    if (minBudget || maxBudget) {
      const formattedMin = formatPriceValue(minBudget);
      const formattedMax = formatPriceValue(maxBudget);
      
      if (formattedMin && formattedMax && formattedMin !== formattedMax) {
        return `${formattedMin} - ${formattedMax}`;
      }
      return formattedMin || formattedMax || "Price on Request";
    }

    // Try to get price from configurations array
    if (property.configurations && Array.isArray(property.configurations) && property.configurations.length > 0) {
      const prices = property.configurations
        .map((config: any) => config.BaseProjectPrice)
        .filter((price: number) => price && price > 0);
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        const formattedMin = formatPriceValue(minPrice);
        const formattedMax = formatPriceValue(maxPrice);
        
        if (formattedMin && formattedMax && minPrice !== maxPrice) {
          return `${formattedMin} - ${formattedMax}`;
        }
        return formattedMin || "Price on Request";
      }
    }

    // Try single price fields
    const singlePrice = property.price || 0;
    if (singlePrice) {
      return formatPriceValue(singlePrice) || "Price on Request";
    }

    return "Price on Request";
  };

  // State for filters and UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [propertyType, setPropertyType] = useState('any');
  const [configurations, setConfigurations] = useState('any');
  const [constructionStatus, setConstructionStatus] = useState('any');
  const [maxPricePerSqft, setMaxPricePerSqft] = useState(20000);
  const [radiusKm, setRadiusKm] = useState('exact');
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [currentPage, setCurrentPage] = useState(getPageFromUrl());
  const [propertiesPerPage] = useState(12);
  const [selectedConfiguration, setSelectedConfiguration] = useState('any');
  const [selectedApartmentType, setSelectedApartmentType] = useState('');
  const [selectedCommunityType, setSelectedCommunityType] = useState('');
  const [sizeRange, setSizeRange] = useState<[number, number]>([0, 10000]); // For Size Range
  const [budgetRange, setBudgetRange] = useState('any');
  const [possessionTimeline, setPossessionTimeline] = useState('any');
  const [selectedConfigurations, setSelectedConfigurations] = useState<string[]>([]);
  
  // Budget range options (hardcoded as in screenshots)
  const budgetOptions = [
    { label: 'Not decided yet', value: 'any' },
    { label: 'Under ₹50 Lakhs', value: 'under50' },
    { label: '₹50 Lakhs - ₹75 Lakhs', value: '50to75' },
    { label: '₹75 Lakhs - ₹1 Crore', value: '75to100' },
    { label: '₹1 Crore - ₹1.5 Crore', value: '100to150' },
    { label: '₹1.5 Crore - ₹2 Crore', value: '150to200' },
    { label: 'Above ₹2 Crore', value: 'above200' },
  ];
  
  // Possession timeline options (hardcoded as in screenshots)
  const possessionTimelineOptions = [
    { label: 'Not decided yet', value: 'any' },
    { label: 'Ready to Move In', value: 'ready' },
    { label: '3-6 Months', value: '3-6' },
    { label: '6-12 Months', value: '6-12' },
    { label: '1-2 Years', value: '1-2' },
    { label: 'More than 2 Years', value: '2plus' },
  ];
  
  // Function to update URL with page parameter
  const updatePageInUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page'); // Remove page param if it's page 1
    }
    const newSearch = params.toString();
    setLocation(`/all-properties${newSearch ? `?${newSearch}` : ''}`, { replace: true });
  };

  // Parse and update page from URL when it changes
  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams);
    const pageFromUrl = parseInt(urlParams.get('page') || '1', 10);
    setCurrentPage(pageFromUrl);
  }, [searchParams]);

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);
  
  // Fetch properties data from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['properties', debouncedSearchTerm, propertyType, configurations, constructionStatus, radiusKm, maxPricePerSqft],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (propertyType !== 'any') params.append('propertyType', propertyType);
      if (configurations !== 'any') params.append('configurations', configurations);
      if (constructionStatus !== 'any') params.append('constructionStatus', constructionStatus);
      // Add other filters as needed
      const endpoint = `${API_BASE_URL_PROPERTIES}/api/all-properties`;
      const url = `${endpoint}?${params.toString()}`;
      return apiRequest<{ properties: ApiProperty[] }>(url);
    },
  });

  // --- DEBUGGING LOGS ---
  console.log("1. API Query State:", { 
    isLoading, 
    error, 
    rawPropertiesCount: data?.properties?.length || 0,
    currentFilters: {
      searchTerm,
      selectedLocations,
      selectedConfigurations,
      selectedApartmentType,
      selectedCommunityType,
      maxPricePerSqft,
      sizeRange,
      possessionTimeline,
      budgetRange
    }
  });
  console.log("1.5. Sample property data:", data?.properties?.[0]);
  console.log("Raw API property:", data?.properties?.[0]);

  // Derived state from fetched data
  const allProperties = useMemo(() => {
    let props = data?.properties || [];
    
    // Filter by Search Term (searches in project name, builder name, area)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      props = props.filter((property: any) => {
        const propertyData = extractPropertyData(property);
        
        // Search in project name
        const projectName = (propertyData.ProjectName || propertyData.projectName || '').toLowerCase();
        if (projectName.includes(searchLower)) return true;
        
        // Search in builder name
        const builderName = (propertyData.BuilderName || propertyData.builderName || propertyData.builder || '').toLowerCase();
        if (builderName.includes(searchLower)) return true;
        
        // Search in area/location
        const area = (propertyData.AreaName || propertyData.Area || propertyData.location || propertyData.Location || '').toLowerCase();
        if (area.includes(searchLower)) return true;
        
        return false;
      });
    }
    
    // Filter by Location (multi-select, OR logic)
    if (selectedLocations.length > 0) {
      props = props.filter((property: any) => {
        const propertyData = extractPropertyData(property);
        return selectedLocations.some(loc =>
          propertyData.Location === loc ||
          propertyData.location === loc ||
          propertyData.AreaName === loc ||
          propertyData.Area === loc
        );
      });
    }
    // Filter by Configuration (multi-select, OR logic)
    if (selectedConfigurations.length > 0) {
      props = props.filter((property: any) => {
        const propertyData = extractPropertyData(property);
        // Check various possible configuration fields and arrays
        return selectedConfigurations.some(conf =>
          propertyData.configuration === conf ||
          propertyData.Configurations === conf ||
          propertyData.BHK === conf ||
          propertyData.bhk === conf ||
          (Array.isArray(propertyData.configurations) && propertyData.configurations.some((c: any) => c?.type === conf))
        );
      });
    }
    // Filter by Apartment Type
    if (selectedApartmentType) {
      props = props.filter((property: any) => {
        const propertyData = extractPropertyData(property);
        return (
          propertyData.propertyType === selectedApartmentType ||
          propertyData.PropertyType === selectedApartmentType
        );
      });
    }
    // Filter by Community Type
    if (selectedCommunityType) {
      props = props.filter((property: any) => {
        const propertyData = extractPropertyData(property);
        return (
          propertyData.communityType === selectedCommunityType ||
          propertyData['Type of Community'] === selectedCommunityType
        );
      });
    }
    // Filter by Price Per Sqft (min always 0, max is maxPricePerSqft)
    props = props.filter((property: any) => {
      const propertyData = extractPropertyData(property);
      const price = propertyData.Price_per_sft || propertyData.price_per_sft || 0;
      return price >= 0 && price <= maxPricePerSqft;
    });
    // Filter by Size Range
    props = props.filter((property: any) => {
      const propertyData = extractPropertyData(property);
      let sizes: number[] = [];
      if (Array.isArray(propertyData.configurations)) {
        sizes = propertyData.configurations
          .map((conf: any) =>
            conf?.sizeRange || conf?.size || conf?.area || conf?.Size || null
          )
          .filter((v: any) => typeof v === 'number');
      }
      // Fallback to minSizeSqft, area, or Size if no configurations
      if (sizes.length === 0) {
        const fallbackSize = propertyData.minSizeSqft || propertyData.area || propertyData.Size || 0;
        sizes = [fallbackSize];
      }
      // If any size is within the selected range, include the property
      // If slider is set to max 4000, show all properties where any size <= 4000
      return sizes.some(size => size >= sizeRange[0] && size <= sizeRange[1]);
    });
    // Filter by Possession Timeline
    if (possessionTimeline && possessionTimeline !== 'any') {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      let minYM: [number, number] | null = null;
      let maxYM: [number, number] | null = null;
      if (possessionTimeline === 'ready') {
        maxYM = [currentYear, currentMonth];
      } else if (possessionTimeline === '2plus') {
        let future = new Date(currentYear, currentMonth - 1 + 24, 1);
        minYM = [future.getFullYear(), future.getMonth() + 1];
      } else if (possessionTimeline === '3-6') {
        let minDate = new Date(currentYear, currentMonth - 1 + 3, 1);
        let maxDate = new Date(currentYear, currentMonth - 1 + 6, 1);
        minYM = [minDate.getFullYear(), minDate.getMonth() + 1];
        maxYM = [maxDate.getFullYear(), maxDate.getMonth() + 1];
      } else if (possessionTimeline === '6-12') {
        let minDate = new Date(currentYear, currentMonth - 1 + 6, 1);
        let maxDate = new Date(currentYear, currentMonth - 1 + 12, 1);
        minYM = [minDate.getFullYear(), minDate.getMonth() + 1];
        maxYM = [maxDate.getFullYear(), maxDate.getMonth() + 1];
      } else if (possessionTimeline === '1-2') {
        let minDate = new Date(currentYear, currentMonth - 1 + 12, 1);
        let maxDate = new Date(currentYear, currentMonth - 1 + 24, 1);
        minYM = [minDate.getFullYear(), minDate.getMonth() + 1];
        maxYM = [maxDate.getFullYear(), maxDate.getMonth() + 1];
      }
      props = props.filter((property: any) => {
        const propertyData = extractPropertyData(property);
        const possessionStr = propertyData.Possession_date || propertyData.possessionTimeline || '';
        const possessionYM = parsePossessionDateParts(possessionStr);
        if (!possessionYM) return false;
        if (possessionTimeline === 'ready') {
          return compareYM(possessionYM, maxYM!) <= 0;
        } else if (possessionTimeline === '2plus') {
          return compareYM(possessionYM, minYM!) > 0;
        } else if (minYM && maxYM) {
          return compareYM(possessionYM, minYM) >= 0 && compareYM(possessionYM, maxYM) <= 0;
        }
        return true;
      });
    }
    // Filter by Budget Range
    if (budgetRange && budgetRange !== 'any') {
      props = props.filter((property: any) => {
        const propertyData = extractPropertyData(property);
        // Try to get all base budgets from configurations
        let baseBudgets: number[] = [];
        if (Array.isArray(propertyData.configurations)) {
          baseBudgets = propertyData.configurations
            .map((conf: any) => conf?.BaseProjectPrice)
            .filter((v: any) => typeof v === 'number');
        }
        // Fallback to minimumBudget or price if no configurations
        if (baseBudgets.length === 0) {
          const fallbackBudget = propertyData.minimumBudget || propertyData.price || 0;
          baseBudgets = [fallbackBudget];
        }
        // Budget filter logic
        let inRange = false;
        switch (budgetRange) {
          case 'under50':
            inRange = baseBudgets.some(budget => budget > 0 && budget <= 5000000);
            break;
          case 'above200':
            inRange = baseBudgets.some(budget => budget >= 20000000);
            break;
          case '50to75':
            inRange = baseBudgets.some(budget => budget > 0 && budget <= 7500000);
            break;
          case '75to100':
            inRange = baseBudgets.some(budget => budget > 0 && budget <= 10000000);
            break;
          case '100to150':
            inRange = baseBudgets.some(budget => budget > 0 && budget <= 15000000);
            break;
          case '150to200':
            inRange = baseBudgets.some(budget => budget > 0 && budget <= 20000000);
            break;
          default:
            inRange = true;
        }
        return inRange;
      });
    }
    return props;
  }, [data, searchTerm, selectedLocations, selectedConfigurations, selectedApartmentType, selectedCommunityType, maxPricePerSqft, sizeRange, possessionTimeline, budgetRange]);
  const totalPages = Math.ceil(allProperties.length / propertiesPerPage);
  const startIndex = (currentPage - 1) * propertiesPerPage;
  const endIndex = startIndex + propertiesPerPage;
  const properties = useMemo(() => allProperties.slice(startIndex, endIndex), [allProperties, startIndex, endIndex]);
  
  // --- DEBUGGING LOGS ---
  console.log("2. Processed `allProperties`:", allProperties.length, "properties after filtering");
  console.log("3. Paginated `properties` for current page:", properties.length, "properties");
  console.log("3.5. Checking specific fields in first property:", properties[0] ? {
    Area: properties[0].Area || properties[0].AreaName || properties[0].Location || properties[0].location,
    AreaName: properties[0].AreaName,
    BaseProjectPrice: properties[0].BaseProjectPrice,
    PriceSheet: properties[0].PriceSheet,
    Possession_Date: properties[0].Possession_Date,
    Possession_date: properties[0].Possession_date,
    location: properties[0].location,
    configurations: properties[0].configurations,
    propertyData: properties[0], // Added for direct inspection
  } : 'No properties');
  console.log("propertyData keys:", properties[0] ? Object.keys(properties[0]) : 'No properties');
  console.log("propertyData.AreaName:", properties[0] ? properties[0].AreaName : 'No properties');

  // Transform properties for map view - use filtered properties to show only filtered results on map
  const mapProperties = useMemo(() => {
    const transformedProperties = allProperties.map(transformPropertyForMap);
    console.log("🗺️ MAP FILTERING RESULT:", {
      totalRawProperties: data?.properties?.length || 0,
      filteredProperties: transformedProperties.length,
      reduction: `${Math.round((1 - transformedProperties.length / (data?.properties?.length || 1)) * 100)}%`,
      activeFilters: {
        search: searchTerm,
        locations: selectedLocations,
        configurations: selectedConfigurations,
        priceRange: maxPricePerSqft,
        sizeRange: sizeRange,
        possession: possessionTimeline,
        budget: budgetRange
      }
    });
    return transformedProperties;
  }, [allProperties, data?.properties?.length, searchTerm, selectedLocations, selectedConfigurations, maxPricePerSqft, sizeRange, possessionTimeline, budgetRange]);
  
  // Reset current page when filters change (but not on initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentPage(1);
    updatePageInUrl(1);
  }, [debouncedSearchTerm, propertyType, configurations, constructionStatus, radiusKm]);
  


  const resetFilters = () => {
    setSearchTerm('');
    setSelectedLocations([]);
    setLocationSearch('');
    setPropertyType('any');
    setConfigurations('any');
    setConstructionStatus('any');
    setMaxPricePerSqft(20000);
    setRadiusKm('exact');
    setSelectedConfiguration('any');
    setSelectedApartmentType('');
    setSelectedCommunityType('');
    setSizeRange([0, 10000]);
    setBudgetRange('any');
    setPossessionTimeline('any');
    setSelectedConfigurations([]);
    setCurrentPage(1);
    updatePageInUrl(1);
  };

  // Compute unique locations (Areas/Locations) from the loaded properties
  const locationOptions = useMemo(() => {
    if (!data?.properties) return [];
    const areas = data.properties.map((property: any) => {
      const propertyData = extractPropertyData(property);
      return [propertyData.AreaName, propertyData.Location, propertyData.location, propertyData.Area]
        .filter(Boolean)
        .map((loc: string) => loc.trim());
    }).flat();
    // Get unique, non-empty, sorted locations
    return Array.from(new Set(areas.filter(loc => loc && loc.length > 0))).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Configuration options: 1 BHK to 5 BHK, plus Not decided yet
  const configurationOptions = [
    { label: 'Not decided yet', value: 'any' },
    { label: '1 BHK', value: '1 BHK' },
    { label: '2 BHK', value: '2 BHK' },
    { label: '3 BHK', value: '3 BHK' },
    { label: '4 BHK', value: '4 BHK' },
    { label: '5 BHK', value: '5 BHK' },
  ];

  return (
    <div className="container mx-auto px-4 pt-32 pb-8">
      {/* Note about property images */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> We're working on getting better property images for you. Some properties may show placeholder images while we enhance our image collection.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">All Properties</h1>
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
          <Button
            className="flex items-center gap-2 h-12 px-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold shadow-lg transition-transform transform hover:-translate-y-1 hover:shadow-xl hover:from-blue-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FilterIcon size={20} />
            Filters
          </Button>
        </div>
      </div>
      
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/70 backdrop-blur-lg p-8 rounded-2xl shadow-2xl mb-10 border border-blue-100 bg-gradient-to-br from-blue-50 to-white"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Budget Range Dropdown */}
            <div>
              <label className="flex items-center gap-2 text-base font-semibold text-blue-900 mb-2">
                <Wallet className="w-5 h-5 text-blue-500" /> ₹ Budget Range
              </label>
              <Select value={budgetRange} onValueChange={setBudgetRange}>
                <SelectTrigger className="w-full min-w-[260px] max-w-[320px] border-2 border-blue-100 rounded-full px-4 py-2 bg-white/80 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition hover:border-blue-300 hover:shadow-md text-gray-800 font-medium">
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <div className="min-w-[220px] w-full bg-white rounded-xl shadow-2xl border border-blue-100" style={{height: '220px', overflowY: 'auto'}}>
                    {budgetOptions.filter(opt => opt.value !== '').map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="hover:bg-blue-50 cursor-pointer h-11 flex items-center">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            {/* Possession Timeline Dropdown */}
            <div>
              <label className="flex items-center gap-2 text-base font-semibold text-blue-900 mb-2">
                <Calendar className="w-5 h-5 text-blue-500" /> Possession Timeline
              </label>
              <Select value={possessionTimeline} onValueChange={setPossessionTimeline}>
                <SelectTrigger className="w-full min-w-[220px] max-w-[320px] border-2 border-blue-100 rounded-full px-4 py-2 bg-white/80 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition hover:border-blue-300 hover:shadow-md text-gray-800 font-medium">
                  <SelectValue placeholder="When do you need possession?" />
                </SelectTrigger>
                <SelectContent>
                  <div className="min-w-[220px] w-full bg-white rounded-xl shadow-2xl border border-blue-100" style={{height: '220px', overflowY: 'auto'}}>
                    {possessionTimelineOptions.filter(opt => opt.value !== '').map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="hover:bg-blue-50 cursor-pointer h-11 flex items-center">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            {/* Location Dropdown */}
            <div>
              <label className="flex items-center gap-2 text-base font-semibold text-blue-900 mb-2">
                <MapPin className="w-5 h-5 text-blue-500" /> Location
              </label>
              <Select value={selectedLocations.join(',')} onValueChange={(value) => setSelectedLocations(value.split(','))}>
                <SelectTrigger className={`w-full rounded-full px-4 py-2 bg-white/80 border-2 border-blue-100 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition hover:border-blue-300 hover:shadow-md text-gray-800 font-medium min-h-[44px] flex items-center ${selectedLocations.length > 0 ? 'ring-2 ring-blue-300' : ''}`}> 
                  {selectedLocations.length === 0 ? (
                    <span className="text-gray-400">Select location</span>
                  ) : (
                    <div className="flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide w-full">
                      {selectedLocations.map(loc => (
                        <span key={loc} className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold flex items-center whitespace-nowrap">
                          {loc}
                          <button className="ml-1 text-blue-400 hover:text-blue-700" onClick={e => { e.stopPropagation(); setSelectedLocations(selectedLocations.filter(l => l !== loc)); }}>&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <div className="min-w-[220px] w-full bg-white rounded-xl shadow-2xl border border-blue-100" style={{height: '220px', overflowY: 'auto'}}>
                    <div className="p-2 sticky top-0 bg-white z-10">
                      <input
                        type="text"
                        placeholder="Search location..."
                        value={locationSearch}
                        onChange={e => setLocationSearch(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm mb-2"
                      />
                    </div>
                    {(locationOptions.filter(loc => loc && loc.toLowerCase().includes(locationSearch.toLowerCase()))).map(loc => (
                      <div key={loc} className="h-11 flex items-center px-3 cursor-pointer hover:bg-blue-50" onClick={() => {
                        setSelectedLocations(prev => prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]);
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedLocations.includes(loc)}
                          onChange={() => {}}
                          className="mr-2"
                        />
                        {loc}
                      </div>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            {/* Configuration Dropdown */}
            <div>
              <label className="flex items-center gap-2 text-base font-semibold text-blue-900 mb-2">
                <BedDoubleIcon className="w-5 h-5 text-blue-500" /> Configuration
              </label>
              <Select value={selectedConfigurations.join(',')} onValueChange={() => {}}>
                <SelectTrigger className={`w-full rounded-full px-4 py-2 bg-white/80 border-2 border-blue-100 shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition hover:border-blue-300 hover:shadow-md text-gray-800 font-medium min-h-[44px] flex items-center ${selectedConfigurations.length > 0 ? 'ring-2 ring-blue-300' : ''}`}> 
                  {selectedConfigurations.length === 0 ? (
                    <span className="text-gray-400">Select configuration</span>
                  ) : (
                    <div className="flex flex-nowrap gap-1 overflow-x-auto scrollbar-hide w-full">
                      {selectedConfigurations.map(conf => (
                        <span key={conf} className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold flex items-center whitespace-nowrap">
                          {conf}
                          <button className="ml-1 text-blue-400 hover:text-blue-700" onClick={e => { e.stopPropagation(); setSelectedConfigurations(selectedConfigurations.filter(c => c !== conf)); }}>&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <div className="min-w-[220px] w-full bg-white rounded-xl shadow-2xl border border-blue-100" style={{height: '220px', overflowY: 'auto'}}>
                    {configurationOptions.filter(opt => opt.value !== '').map(opt => (
                      <div key={opt.value} className="h-11 flex items-center px-3 cursor-pointer hover:bg-blue-50" onClick={e => {
                        e.stopPropagation();
                        setSelectedConfigurations(prev => prev.includes(opt.value) ? prev.filter(c => c !== opt.value) : [...prev, opt.value]);
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedConfigurations.includes(opt.value)}
                          onChange={() => {}}
                          className="mr-2"
                        />
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Size Range Slider */}
          <div className="col-span-1 md:col-span-2 mt-2">
            <label className="flex items-center gap-2 text-base font-semibold text-blue-900 mb-2">
              <Ruler className="w-5 h-5 text-blue-500" /> Size Range (sq.ft):
            </label>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-4 mb-2">
              <span className="text-blue-700 font-semibold">{sizeRange[0]}</span>
              <Slider
                min={0}
                max={10000}
                step={50}
                value={sizeRange}
                onValueChange={(value) => setSizeRange(value as [number, number])}
                className="flex-1"
              />
              <span className="text-blue-700 font-semibold">{sizeRange[1]}</span>
            </motion.div>
          </div>
        </motion.div>
      )}
      
      {!isLoading && !error && allProperties.length > 0 && (
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">
            Showing {Math.min(startIndex + 1, allProperties.length)}-{Math.min(endIndex, allProperties.length)} of {allProperties.length} properties
          </p>
          <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-md">
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              <ListIcon size={18} />
              List
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'map' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              <MapIcon size={18} />
              Map
            </button>
          </div>
        </div>
      )}
      
      {isLoading && (
        <div className="py-20">
          <BrandLoader size="lg" text="Loading Properties..." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[...Array(6)].map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}
      {error && <div className="text-center py-20 bg-red-50 p-8 rounded-lg"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-red-800">Failed to Load Properties</h3><p className="text-red-600">Please try again later.</p></div>}
      {!isLoading && !error && properties.length === 0 && <div className="text-center py-20 bg-gray-50 p-8 rounded-lg"><SearchX className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-800">No Properties Found</h3><p className="text-gray-500">Try adjusting your search filters.</p></div>}

      {viewMode === 'map' && <div className="mb-8 h-[600px]"><PropertiesMap properties={mapProperties} /></div>}

      {!isLoading && !error && properties.length > 0 && viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property: ApiProperty) => {
            const propertyData = extractPropertyData(property);
            console.log("Extracted propertyData:", propertyData);
            return (
              <div key={propertyData.id || propertyData._id} className="h-full cursor-pointer" onClick={() => handleCardClick(propertyData.id || propertyData._id)}>
                <Card className="h-full flex flex-col overflow-hidden border-gray-200 group-hover:shadow-xl group-hover:border-blue-300 transition-all duration-300">
                  <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                    <PropertyImage 
                      images={propertyData.images || []}
                      propertyName={propertyData.ProjectName || propertyData.projectName || 'Property Image'}
                      location={propertyData.AreaName || propertyData.Area || propertyData.location || 'Hyderabad'}
                      className="w-full h-full"
                    />
                    <div className="absolute top-3 left-3">
                      <div className="bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
                        <StarRating rating={propertyData.rating || propertyData.google_place_rating || 4} size="sm" showNumber={false} className="text-yellow-400" />
                        <span className="text-xs text-white font-medium">
                          {propertyData.google_place_user_ratings_total ? `${propertyData.google_place_user_ratings_total} reviews` : 'Google Rating'}
                        </span>
                      </div>
                    </div>
                    {propertyData.propertyType && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-white text-blue-600 font-semibold shadow-md border border-gray-100">
                          {propertyData.propertyType}
                        </Badge>
                      </div>
                    )}
                    {propertyData.Possession_date && (
                       <div className="absolute bottom-3 right-3">
                          <Badge className="bg-blue-600 text-white font-bold text-xs tracking-wider border-2 border-white/50">
                              {formatPossessionDate(propertyData.Possession_date)}
                          </Badge>
                       </div>
                    )}
                  </div>
                  <CardContent className="flex-1 flex flex-col p-4">
                    <h3 className="text-lg font-bold text-gray-800 truncate mb-1">{formatProjectName(propertyData.ProjectName || propertyData.projectName || "Unnamed Project")}</h3>
                    <p className="text-sm text-gray-600 mb-1">By {formatBuilderName(propertyData.BuilderName || "Unknown Builder")}</p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                      <MapPinIcon size={14} />
                      <span>{propertyData.Area || propertyData.Location || propertyData.location || propertyData.AreaName || "Location Not Available"}</span>
                    </div>
                    <div className="flex justify-between items-start border-t border-b border-gray-100 py-3 mb-auto">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Building2 size={12}/>Configuration</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {(() => {
                            let configs = propertyData.configurations;
                            if (Array.isArray(configs) && configs.length > 0) {
                              const configTypesSet = new Set(configs.map((conf: any) => conf && (conf.type || conf.Type || '')).filter(Boolean));
                              const configTypes = Array.from(configTypesSet);
                              return configTypes.length > 0 ? configTypes.join(', ') : 'N/A';
                            }
                            let configDetails = propertyData.configurationDetails;
                            if (typeof configDetails === 'string') {
                              try { configDetails = JSON.parse(configDetails); } catch (e) {}
                            }
                            if (Array.isArray(configDetails) && configDetails.length > 0) {
                              const configTypesSet = new Set(configDetails.map((conf: any) => conf && (conf.type || conf.Type || conf.bhkType || conf.bhk || conf.unitType || conf.configurationType || '')).filter(Boolean));
                              const configTypes = Array.from(configTypesSet);
                              return configTypes.length > 0 ? configTypes.join(', ') : 'N/A';
                            }
                            const possibleConfigFields = [propertyData.Configurations, propertyData.configuration, propertyData.Configuration, propertyData.bhk, propertyData.BHK, propertyData.unitType, propertyData.UnitType];
                            const configField = possibleConfigFields.find(field => field && typeof field === 'string' && field.trim() !== '');
                            if (configField) return configField;
                            if (propertyData.bedrooms) return `${propertyData.bedrooms} BHK`;
                            if (propertyData.propertyType) {
                              const type = propertyData.propertyType.toLowerCase();
                              if (type.includes('plot')) return 'Plot';
                              if (type.includes('villa')) return 'Villa';
                              if (type.includes('apartment')) return 'Apartment';
                              if (type.includes('house')) return 'House';
                            }
                            return 'N/A';
                          })()}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-xs text-gray-400 flex items-center gap-1 justify-end"><CalendarIcon size={12}/>Possession</span>
                        <span className="text-sm font-semibold text-gray-700">{formatPossessionDate(propertyData.Possession_Date || propertyData.Possession_date)}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 pt-3 pb-4 bg-gray-50 border-t mt-auto">
                    <div className="flex justify-between items-end w-full">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Price Per Sq.ft</p>
                        <p className="text-lg font-bold text-blue-600">
                          {propertyData.PriceSheet ? `₹${propertyData.PriceSheet.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Budget Price</p>
                        <p className="text-lg font-bold text-gray-800">{formatBudgetRange(propertyData)}</p>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            );
          })}
        </div>
      )}
      
    {!isLoading && !error && allProperties.length > propertiesPerPage && (
      <div className="flex justify-center items-center mt-10 space-x-2">
        <Button
          variant="outline"
          onClick={() => {
            const newPage = Math.max(currentPage - 1, 1);
            setCurrentPage(newPage);
            updatePageInUrl(newPage);
          }}
          disabled={currentPage === 1}
          className="flex items-center gap-2"
        >
          <ChevronLeft size={16} />
          Previous
        </Button>
        
        <span className="text-sm text-gray-600 px-2">Page {currentPage} of {totalPages}</span>
        
        <Button
          variant="outline"
          onClick={() => {
            const newPage = Math.min(currentPage + 1, totalPages);
            setCurrentPage(newPage);
            updatePageInUrl(newPage);
          }}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    )}
  </div>
);
}