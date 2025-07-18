import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Container from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Building, 
  MapPin, 
  X, 
  Plus, 
  CheckCircle, 
  Star,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Award,
  Crown,
  Shield,
  IndianRupee,
  ArrowUp,
  ArrowDown,
  Calendar
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useMobile } from '@/hooks/use-mobile';

// Format price helper function
const formatPriceRange = (min: number, max: number) => {
  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} Lac`;
    } else {
      return `₹${price.toLocaleString()}`;
    }
  };
  
  // Debug logging
  console.log('formatPriceRange called with:', { min, max });
  
  if (min > 0 && max > 0 && max !== min) {
    return `${formatPrice(min)} - ${formatPrice(max)}`;
  } else if (min > 0) {
    return formatPrice(min);
  } else if (max > 0) {
    return formatPrice(max);
  } else {
    return 'Price not available';
  }
};

// Helper function to determine best value for comparison
const getBestProperty = (properties: any[], getValue: (prop: any) => number, lowerIsBetter = false) => {
  if (properties.length === 0) return null;
  
  let bestIndex = 0;
  let bestValue = getValue(properties[0]);
  
  for (let i = 1; i < properties.length; i++) {
    const currentValue = getValue(properties[i]);
    if (lowerIsBetter ? currentValue < bestValue : currentValue > bestValue) {
      bestValue = currentValue;
      bestIndex = i;
    }
  }
  
  return bestIndex;
};

// Helper component for comparison indicator
const ComparisonIndicator = ({ isBest, isWorst }: { isBest: boolean; isWorst: boolean }) => {
  if (isBest) {
    return <Crown className="w-4 h-4 text-yellow-500 ml-2" />;
  }
  if (isWorst) {
    return <TrendingDown className="w-4 h-4 text-red-500 ml-2" />;
  }
  return null;
};

export default function PropertyComparisonTable() {
  const [selectedProperties, setSelectedProperties] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [, navigate] = useLocation();
  const isMobile = useMobile();

  // Fetch all properties for selection
  const { data: propertiesData, isLoading } = useQuery({
    queryKey: ['/api/all-properties-db'],
    enabled: true
  });

  const propertiesArray = (propertiesData as any)?.properties || [];

  // Filter available properties (exclude already selected ones)
  const availableProperties = propertiesArray.filter(
    (prop: any) => !selectedProperties.find(selected => selected.id === prop.id)
  ).filter((prop: any) => 
    searchTerm === '' || 
    (prop.ProjectName || prop.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prop.Location || prop.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug: Log properties data
  console.log('Total properties from Supabase:', propertiesArray.length);
  console.log('Available for comparison:', availableProperties.length);
  console.log('Selected properties count:', selectedProperties.length);
  if (propertiesArray.length > 0) {
    console.log('Sample property:', propertiesArray[0]);
    console.log('Property keys:', Object.keys(propertiesArray[0]));
  }

  const addPropertyToComparison = (property: any) => {
    if (selectedProperties.length < 3) {
      setSelectedProperties([...selectedProperties, property]);
    }
  };

  const removePropertyFromComparison = (propertyId: number) => {
    setSelectedProperties(selectedProperties.filter(prop => prop.id !== propertyId));
  };

  const handleViewDetails = (property: any) => {
    navigate(`/property/${property.id}`);
  };

  const handleWhatsApp = (property: any) => {
    const propertyName = property.ProjectName || property.projectName || 'this property';
    const location = property.Location || property.location || '';
    const priceInfo = property.minimumBudget ? `Price: ₹${(property.minimumBudget/100000).toFixed(1)} Lac` : 'Price on request';
    
    const message = `Hi! I'm interested in ${propertyName}${location ? ` located in ${location}` : ''}. ${priceInfo}. Could you please provide more details?`;
    const whatsappUrl = `https://wa.me/919390905151?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Helper to get property values for table rows
  const getRowValue = (property: any, key: string) => {
    switch (key) {
      case 'Price Range': {
        // Gather all BaseProjectPrice values from configurations/components
        let basePrices: number[] = [];
        const configs = property.configurations || property.Configurations;
        if (Array.isArray(configs)) {
          configs.forEach((conf: any) => {
            if (typeof conf === 'object' && conf !== null && 'BaseProjectPrice' in conf) {
              const val = Number(conf.BaseProjectPrice);
              if (!isNaN(val)) basePrices.push(val);
            }
          });
        }
        // Fallback to minimumBudget/maximumBudget if no BaseProjectPrice
        if (basePrices.length === 0) {
          if (typeof property.minimumBudget === 'number' && !isNaN(property.minimumBudget)) basePrices.push(property.minimumBudget);
          if (typeof property.maximumBudget === 'number' && !isNaN(property.maximumBudget)) basePrices.push(property.maximumBudget);
          if (typeof property.price === 'number' && !isNaN(property.price)) basePrices.push(property.price);
        }
        if (basePrices.length > 0) {
          const min = Math.min(...basePrices);
          const max = Math.max(...basePrices);
          if (min === max) {
            return `₹${min.toLocaleString()}`;
          } else {
            return `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`;
          }
        }
        return 'N/A';
      }
      case 'Price/sq ft': {
        let val = property.Price_per_sft || property.price_per_sft || 'N/A';
        if (typeof val === 'number') return `₹${val.toLocaleString()}`;
        return 'N/A';
      }
      case 'Size Range': {
        // Gather all size values from configurations/components
        let sizes: number[] = [];
        const configs = property.configurations || property.Configurations;
        if (Array.isArray(configs)) {
          configs.forEach((conf: any) => {
            if (typeof conf === 'object' && conf !== null) {
              const size = conf.sizeRange || conf.size || conf.area || conf.Size || conf.superBuiltupArea;
              if (typeof size === 'number' && !isNaN(size)) sizes.push(size);
            }
          });
        }
        if (sizes.length === 0) {
          const fallback = property.minSizeSqft || property.area || property.Size;
          if (typeof fallback === 'number' && !isNaN(fallback)) sizes.push(fallback);
        }
        if (sizes.length > 0) {
          const min = Math.min(...sizes);
          const max = Math.max(...sizes);
          if (min === max) {
            return `${min} sq ft`;
          } else {
            return `${min} - ${max} sq ft`;
          }
        }
        return 'N/A';
      }
      case 'Configurations': {
        let conf = property.Configurations || property.configurations;
        if (!conf) return 'N/A';
        let uniqueConfigs: string[] = [];
        if (typeof conf === 'string') {
          uniqueConfigs = conf.split(',').map(c => c.trim().toUpperCase());
        } else if (Array.isArray(conf)) {
          uniqueConfigs = conf.map((c: any) => {
            if (typeof c === 'string') return c.toUpperCase();
            if (typeof c === 'object' && c && c.type) return String(c.type).toUpperCase();
            return '';
          });
        } else if (typeof conf === 'object') {
          if (conf.type) uniqueConfigs = [String(conf.type).toUpperCase()];
          else uniqueConfigs = [JSON.stringify(conf)];
        }
        // Remove empty and duplicate values
        uniqueConfigs = Array.from(new Set(uniqueConfigs.filter(Boolean)));
        return uniqueConfigs.join(', ');
      }
      case 'Property Type': return property.PropertyType || 'Apartment';
      case 'Location': return property.Area || property.Location || property.location || 'N/A';
      case 'RERA Status': return 'Approved';
      case 'RERA Number': return property.RERA_Number || property['RERA_Number'] || property.reraNumber || 'N/A';
      case 'Builder Reputation': return property['Builder Reputation & Legal Compliance'] || 'N/A';
      case 'Possession': {
        const possessionRaw = property.Possession_date || property.PossessionDate || property.possessionDate || property['Possession_date'] || property['PossessionDate'];
        if (!possessionRaw) return 'TBD';
        if (typeof possessionRaw === 'string') {
          const parts = possessionRaw.split('-');
          if (parts.length === 3) {
            const month = parseInt(parts[1], 10);
            const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
            if (!isNaN(month) && !isNaN(year)) {
              return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]} ${year}`;
            }
          } else if (parts.length === 2) {
            const month = parseInt(parts[0], 10);
            const year = parts[1].length === 2 ? 2000 + parseInt(parts[1], 10) : parseInt(parts[1], 10);
            if (!isNaN(month) && !isNaN(year)) {
              return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month-1]} ${year}`;
            }
          } else {
            return possessionRaw;
          }
        }
        return 'TBD';
      }
      default: return 'N/A';
    }
  };

  // Table rows definition
  const tableRows = [
    { label: 'Price Range', icon: <TrendingUp className="w-4 h-4 mr-1 text-blue-600" /> },
    { label: 'Price/sq ft', icon: <IndianRupee className="w-4 h-4 mr-1 text-blue-600" /> },
    { label: 'Size Range', icon: <ArrowLeft className="w-4 h-4 mr-1 text-green-600" /> },
    { label: 'Configurations', icon: <Star className="w-4 h-4 mr-1 text-purple-600" /> },
    { label: 'Property Type', icon: <Building className="w-4 h-4 mr-1 text-indigo-600" /> },
    { label: 'Location', icon: <MapPin className="w-4 h-4 mr-1 text-blue-600" /> },
    { label: 'RERA Status', icon: <Shield className="w-4 h-4 mr-1 text-green-600" /> },
    { label: 'RERA Number', icon: <Award className="w-4 h-4 mr-1 text-slate-600" /> },
    { label: 'Builder Reputation', icon: <Star className="w-4 h-4 mr-1 text-yellow-600" /> },
    { label: 'Possession', icon: <Calendar className="w-4 h-4 mr-1 text-pink-600" /> },
  ];

  // Helper to render the property comparison table
  const renderComparisonTable = (isMobile: boolean) => {
    // Use a table for both mobile and desktop, but set all columns to width: auto for desktop
    return (
      <table
        className={isMobile ? "border-collapse text-sm" : "w-full border-collapse text-sm"}
        style={
          isMobile
            ? {
                minWidth: `${180 + 220 * selectedProperties.length}px`,
                width: 'max-content',
                tableLayout: 'fixed',
              }
            : {
                width: '100%',
                tableLayout: 'fixed',
              }
        }
      >
        <colgroup>
          <col style={{ width: isMobile ? '180px' : 'auto' }} />
          {selectedProperties.map((_, idx) => (
            <col key={idx} style={{ width: isMobile ? '220px' : 'auto' }} />
          ))}
        </colgroup>
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="p-4 text-left font-bold text-gray-700 w-48 min-w-[180px] sticky left-0 z-20 bg-gray-100 shadow-property-param-header" style={{ pointerEvents: 'none', boxShadow: '2px 0 8px -2px rgba(0,0,0,0.07)' }}>Property Parameters</th>
            {selectedProperties.map((property) => (
              <th key={property.id} className={isMobile ? "p-4 text-center font-bold text-gray-900 min-w-[220px] relative bg-gray-100" : "p-4 text-center font-bold text-gray-900 relative bg-gray-100"}>
                <button
                  onClick={() => removePropertyFromComparison(property.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-semibold text-xs mb-1 text-center">
                    {(property.ProjectName || property.projectName || property.name || '').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    By {property.BuilderName || property.builderName || property.DeveloperName || property.developerName || 'N/A'}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => (
            <tr key={row.label} className="border-b border-gray-200">
              <td className="p-4 font-medium text-gray-700 bg-gray-50 w-48 min-w-[180px] sticky left-0 z-10 bg-gray-50 align-middle shadow-property-param" style={{ pointerEvents: 'none', boxShadow: '2px 0 8px -2px rgba(0,0,0,0.07)' }}>
                <div className="flex items-center" style={{ pointerEvents: 'auto' }}>{row.icon}<span>{row.label}</span></div>
              </td>
              {selectedProperties.map((property) => (
                <td key={property.id + row.label} className="p-4 text-center align-middle">
                  {getRowValue(property, row.label)}
                </td>
              ))}
            </tr>
          ))}
          {/* Actions Row */}
          <tr className="bg-gray-50">
            <td className="p-4 font-medium text-gray-700 sticky left-0 z-10 bg-gray-50 align-middle shadow-property-param" style={{ pointerEvents: 'none', boxShadow: '2px 0 8px -2px rgba(0,0,0,0.07)' }}>
              <div style={{ pointerEvents: 'auto' }}>Actions</div>
            </td>
            {selectedProperties.map((property) => (
              <td key={property.id + 'actions'} className="p-4 text-center space-y-2">
                <button 
                  onClick={() => handleViewDetails(property)}
                  className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium mb-2"
                >
                  View Details
                </button>
                <button 
                  onClick={() => handleWhatsApp(property)}
                  className="w-full bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                >
                  WhatsApp
                </button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <Container className="pt-16 pb-8">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white shadow-xl mt-4">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/properties" className="text-white hover:text-blue-200 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">Property Comparison Table</h1>
            <p className="text-blue-100 text-lg">Compare properties side-by-side in a clear table format</p>
          </div>
          <div className="text-right">
            <Badge className="bg-white/20 text-white border-white/30 text-lg px-4 py-2">
              {selectedProperties.length}/3 Properties
            </Badge>
          </div>
        </div>
        
        {selectedProperties.length > 0 && (
          isMobile ? (
            <div className="flex gap-4 mt-6 overflow-x-auto scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
              {selectedProperties.map((property, index) => (
                <div key={property.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex-1 min-w-[180px] max-w-xs">
                  <div className="text-sm font-medium text-blue-100">Property {index + 1}</div>
                  <div className="font-bold text-white truncate">
                    {(property.ProjectName || property.projectName || property.name || '').toUpperCase()}
                  </div>
                  <div className="w-full mt-1">
                    <span className="block text-xs font-semibold text-white/80 drop-shadow-md text-left pl-0.5" style={{textShadow: '0 1px 6px rgba(30,41,59,0.18)'}}>
                      By {property.BuilderName || property.builderName || property.DeveloperName || property.developerName || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 mt-6">
              {selectedProperties.map((property, index) => (
                <div key={property.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex-1">
                  <div className="text-sm font-medium text-blue-100">Property {index + 1}</div>
                  <div className="font-bold text-white truncate">
                    {(property.ProjectName || property.projectName || property.name || '').toUpperCase()}
                  </div>
                  <div className="w-full mt-1">
                    <span className="block text-xs font-semibold text-white/80 drop-shadow-md text-left pl-0.5" style={{textShadow: '0 1px 6px rgba(30,41,59,0.18)'}}>
                      By {property.BuilderName || property.builderName || property.DeveloperName || property.developerName || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Property Selection - Smart Hiding when 3 properties selected */}
      {selectedProperties.length < 3 && (
        <div className="mb-8 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Add Properties to Compare</h2>
        
        <Input
          placeholder="Search properties by name or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        {/* Debug info */}
        {isLoading && (
          <div className="text-center py-4">
            <p className="text-gray-600">Loading properties...</p>
          </div>
        )}
        
        {!isLoading && availableProperties.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-600">No properties found. Total in database: {propertiesArray.length}</p>
            {propertiesArray.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Try clearing the search or check if all properties are already selected for comparison.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {!isLoading && availableProperties.map((property: any) => (
              <div key={property.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                  {(property.ProjectName || property.projectName || property.name || '').toUpperCase()}
                </h3>
                <p className="text-xs text-gray-600 mb-2">
                  By {property.BuilderName || property.builderName || property.DeveloperName || property.developerName || 'N/A'}
                </p>
                <Button
                  size="sm"
                  onClick={() => addPropertyToComparison(property)}
                  className="w-full text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add to Compare
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Comparison - only one table rendered at a time */}
      {selectedProperties.length > 0 && (
        isMobile ? (
          <div className="w-full">
            <div className="relative w-full rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-x-auto scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch', width: '100%' }}>
              {renderComparisonTable(true)}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="w-full bg-white rounded-2xl shadow-2xl border border-gray-200 p-0 m-0">
              {renderComparisonTable(false)}
            </div>
          </div>
        )
      )}

      {/* Empty State */}
      {selectedProperties.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Selected</h3>
          <p className="text-gray-600">Search and add properties above to start comparing them.</p>
        </div>
      )}
    </Container>
  );
}