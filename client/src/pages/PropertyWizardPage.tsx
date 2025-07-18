import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import PropertyPreferenceForm from "../components/property/PropertyPreferenceForm";
import PropertyResultsNew from "../components/property/PropertyResultsNew";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ArrowRight, 
  Search, 
  Home,
  CheckCircle,
  Sparkles,
  Target,
  Clock,
  Award,
  Shield,
  TrendingUp,
  Star,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatProjectName, formatBuilderName } from "@/utils/nameFormatter";
import { BrandLoader, FullPageLoader } from '@/components/ui/brand-loader';

// Types for our multi-step form data
export type PropertyPreference = {
  budget?: string;
  possession?: string;
  configuration?: string;
  locations?: string[];
  otherLocation?: string;
  minBudget?: number;
  maxBudget?: number;
};

export type UserInfo = {
  name: string;
  phone: string;
  appointmentDate: Date | undefined;
  appointmentTime: string;
};

// Step indicators for the wizard
const steps = [
  { id: "preferences", label: "Property Preferences", icon: Search },
  { id: "results", label: "Matching Properties", icon: Home },
];

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
    // Standardized field names for frontend consistency with proper formatting
    projectName: formatProjectName(projectName),
    ProjectName: formatProjectName(projectName),
    builderName: formatBuilderName(builderName),
    BuilderName: formatBuilderName(builderName),
    location: areaName,
    Location: areaName,
    area: areaName,
    Area: areaName,
    areaName: areaName,
    AreaName: areaName,
    PriceSheet: typeof pricePerSft === 'number' ? pricePerSft : (typeof pricePerSft === 'string' ? parseFloat(pricePerSft) : 0),
    Price_per_sft: typeof pricePerSft === 'number' ? pricePerSft : (typeof pricePerSft === 'string' ? parseFloat(pricePerSft) : 0),
    pricePerSqft: typeof pricePerSft === 'number' ? pricePerSft : (typeof pricePerSft === 'string' ? parseFloat(pricePerSft) : 0),
    Possession_Date: possessionDate,
    Possession_date: possessionDate,
    possessionDate: possessionDate,
    RERA_Number: reraNumber,
    reraNumber: reraNumber,
    minimumBudget: extracted.minimumBudget || extracted.price || 0,
    configurations: extracted.configurations || extracted.Configurations || [],
    Configurations: extracted.Configurations || extracted.configurations || [],
    id: extracted._id || extracted.id
  };
};

// Helper to parse Possession_date (supports 'DD/MM/YY', 'DD-MM-YYYY', 'MM-YYYY', 'MM-YY') to a comparable (year, month) tuple
function parsePossessionDateParts(dateStr: string): [number, number] | null {
  if (!dateStr) return null;
  
  // Try both '/' and '-' separators
  let parts = dateStr.split('/');
  if (parts.length < 2) {
    parts = dateStr.split('-');
  }
  if (parts.length < 2) return null;
  
  let month: number, year: number;
  if (parts.length === 3) {
    // Format: DD/MM/YY or DD-MM-YYYY
    month = parseInt(parts[1], 10);
    year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
  } else {
    // Format: MM/YY or MM-YYYY
    month = parseInt(parts[0], 10);
    year = parts[1].length === 2 ? 2000 + parseInt(parts[1], 10) : parseInt(parts[1], 10);
  }
  if (isNaN(month) || isNaN(year)) return null;
  return [year, month];
}

function compareYM(a: [number, number], b: [number, number]) {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

export default function PropertyWizardPage() {
  // Set page title and meta description when component mounts
  useEffect(() => {
    document.title = "Find Your Ideal Property | Relai Real Estate Matchmaking Tool";

    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', ' Not sure what to buy? Use Relai\'s Property Wizard to match your budget and preferences with the best real estate options in Hyderabad.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = ' Not sure what to buy? Use Relai\'s Property Wizard to match your budget and preferences with the best real estate options in Hyderabad.';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }

    // Restore title when component unmounts
    return () => {
      document.title = "Genuine, Smarter, and End to End Real Estate Services in Hyderabad";
      // Restore original meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', 'Discover smarter real estate with Relai. Buy RERA verified properties with expert real estate guidance—all in one place');
      }
    };
  }, []);
  // State for tracking the current step
  const [currentStep, setCurrentStep] = useState<string>("preferences");
  
  // State for storing form data
  const [propertyPreference, setPropertyPreference] = useState<PropertyPreference>({
    budget: "",
    possession: "",
    configuration: "",
    locations: [],
    otherLocation: "",
  });
  
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: "",
    phone: "",
    appointmentDate: undefined,
    appointmentTime: "",
  });
  const API_BASE_URL_PROPERTIES = import.meta.env.VITE_API_URL_PROPERTIES || "http://localhost:5000";

  // Fetch all properties for filtering (not just filtered from backend)
  const { data: allPropertiesResponse, isLoading: isLoadingAllProperties, error: allPropertiesError } = useQuery({
    queryKey: ["/api/all-properties"],
    enabled: currentStep === "results",
    retry: 2,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Error fetching properties:", error);
    }
  });

  // Extract properties from the API response
  const allPropertiesData = allPropertiesResponse?.properties || [];
  
  // Handle loading and error states
  if (currentStep === "results" && isLoadingAllProperties) {
    return <FullPageLoader text="Loading properties..." />;
  }
  
  if (currentStep === "results" && allPropertiesError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <h2 className="text-xl font-semibold">Unable to load properties</h2>
            <p className="text-gray-600 mt-2">Please try refreshing the page or contact support if the problem persists.</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Debug: Log preferences
  console.log('PropertyWizard - Current preferences:', propertyPreference);
  console.log('PropertyWizard - Total properties:', allPropertiesData.length);

  // If no preferences are set, show all properties
  const hasActiveFilters = propertyPreference.budget || 
                          propertyPreference.possession || 
                          propertyPreference.configuration || 
                          (propertyPreference.locations && propertyPreference.locations.length > 0);

  // Filtering logic (copied from AllPropertiesPage)
  const filteredProperties = allPropertiesData.filter((property: any) => {
    const propertyData = extractPropertyData(property);
    
    // Debug each property
    if (allPropertiesData.indexOf(property) === 0) {
      console.log('PropertyWizard - Sample property data:', propertyData);
    }
    
    // Location filter
    if (propertyPreference.locations && propertyPreference.locations.length > 0) {
      const propertyLocation = propertyData.Location || propertyData.location || propertyData.Area || propertyData.AreaName;
      console.log(`PropertyWizard - Checking location: ${propertyLocation} against`, propertyPreference.locations);
      
      const matchesLocation = propertyPreference.locations.some(loc =>
        propertyData.Location === loc ||
        propertyData.location === loc ||
        propertyData.Area === loc ||
        propertyData.AreaName === loc
      );
      if (!matchesLocation) {
        console.log(`PropertyWizard - Property filtered out by location: ${propertyData.projectName}`);
        return false;
      }
    }
    // Possession Timeline filter
    if (propertyPreference.possession && propertyPreference.possession !== 'any') {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      let minYM: [number, number] | null = null;
      let maxYM: [number, number] | null = null;
      if (propertyPreference.possession === 'ready') {
        maxYM = [currentYear, currentMonth];
      } else if (propertyPreference.possession === '2plus') {
        let future = new Date(currentYear, currentMonth - 1 + 24, 1);
        minYM = [future.getFullYear(), future.getMonth() + 1];
      } else if (propertyPreference.possession === '3-6') {
        let minDate = new Date(currentYear, currentMonth - 1 + 3, 1);
        let maxDate = new Date(currentYear, currentMonth - 1 + 6, 1);
        minYM = [minDate.getFullYear(), minDate.getMonth() + 1];
        maxYM = [maxDate.getFullYear(), maxDate.getMonth() + 1];
      } else if (propertyPreference.possession === '6-12') {
        let minDate = new Date(currentYear, currentMonth - 1 + 6, 1);
        let maxDate = new Date(currentYear, currentMonth - 1 + 12, 1);
        minYM = [minDate.getFullYear(), minDate.getMonth() + 1];
        maxYM = [maxDate.getFullYear(), maxDate.getMonth() + 1];
        console.log(`PropertyWizard - 6-12 months range: ${minYM[1]}/${minYM[0]} to ${maxYM[1]}/${maxYM[0]}`);
      } else if (propertyPreference.possession === '1-2') {
        let minDate = new Date(currentYear, currentMonth - 1 + 12, 1);
        let maxDate = new Date(currentYear, currentMonth - 1 + 24, 1);
        minYM = [minDate.getFullYear(), minDate.getMonth() + 1];
        maxYM = [maxDate.getFullYear(), maxDate.getMonth() + 1];
      }
      const possessionStr = propertyData.possessionDate || propertyData.Possession_date || propertyData.Possession_Date || propertyData.possessionTimeline || '';
      console.log(`PropertyWizard - Property ${propertyData.projectName} possession: "${possessionStr}"`);
      const possessionYM = parsePossessionDateParts(possessionStr);
      console.log(`PropertyWizard - Property ${propertyData.projectName} parsed possession:`, possessionYM);
      if (!possessionYM) {
        console.log(`PropertyWizard - Property ${propertyData.projectName} filtered out: no valid possession date`);
        return false;
      }
      if (propertyPreference.possession === 'ready') {
        if (compareYM(possessionYM, maxYM!) > 0) return false;
      } else if (propertyPreference.possession === '2plus') {
        if (compareYM(possessionYM, minYM!) <= 0) return false;
      } else if (minYM && maxYM) {
        if (compareYM(possessionYM, minYM) < 0 || compareYM(possessionYM, maxYM) > 0) return false;
      }
    }
    // Budget Range filter
    if (propertyPreference.budget && propertyPreference.budget !== 'any') {
      // Get all possible budget values for this property
      let baseBudgets: number[] = [];
      
      // Get configuration prices
      if (Array.isArray(propertyData.configurations)) {
        const configBudgets = propertyData.configurations
          .map((conf: any) => conf?.BaseProjectPrice)
          .filter((v: any) => typeof v === 'number');
        baseBudgets = baseBudgets.concat(configBudgets);
      }
      
      // Also include minimum/maximum budget and price fields for more options
      const additionalBudgets = [
        propertyData.minimumBudget,
        propertyData.maximumBudget, 
        propertyData.price,
        propertyData.pricePerSqft ? propertyData.pricePerSqft * 1000 : null, // Estimate for 1000 sqft
        propertyData.Price_per_sft ? propertyData.Price_per_sft * 1000 : null
      ].filter(v => typeof v === 'number' && v > 0);
      
      baseBudgets = baseBudgets.concat(additionalBudgets);
      
      // Remove duplicates and ensure we have some budget values
      baseBudgets = [...new Set(baseBudgets)];
      if (baseBudgets.length === 0) {
        baseBudgets = [propertyData.pricePerSqft ? propertyData.pricePerSqft * 1200 : 10000000]; // Default estimate
      }
      
      console.log(`PropertyWizard - Property ${propertyData.projectName} budgets:`, baseBudgets, 'Checking against budget:', propertyPreference.budget);
      
      let inRange = false;
      const budget = propertyPreference.budget;
      
      // Handle different budget formats
      if (budget.includes('under-50-lakhs')) {
        inRange = baseBudgets.some(b => b > 0 && b <= 5000000);
      } else if (budget.includes('50-75-lakhs')) {
        inRange = baseBudgets.some(b => b >= 5000000 && b <= 7500000);
      } else if (budget.includes('75-1-crore')) {
        inRange = baseBudgets.some(b => b >= 7500000 && b <= 10000000);
      } else if (budget.includes('1-1.5-crore')) {
        inRange = baseBudgets.some(b => b >= 10000000 && b <= 15000000);
      } else if (budget.includes('1.5-2-crore')) {
        // Allow some flexibility in budget range
        inRange = baseBudgets.some(b => b >= 12000000 && b <= 25000000);
      } else if (budget.includes('2-2.5-crore')) {
        inRange = baseBudgets.some(b => b >= 20000000 && b <= 25000000);
      } else if (budget.includes('2.5-3-crore')) {
        inRange = baseBudgets.some(b => b >= 25000000 && b <= 30000000);
      } else if (budget.includes('above-3-crore')) {
        inRange = baseBudgets.some(b => b >= 30000000);
      } else if (budget.includes('above-2-crore')) {
        inRange = baseBudgets.some(b => b >= 20000000);
      } else if (budget.includes('-')) {
        // Handle dynamic price ranges (format: "min-max")
        const parts = budget.split('-');
        if (parts.length === 2) {
          const min = parseFloat(parts[0]);
          const max = parseFloat(parts[1]);
          if (!isNaN(min) && !isNaN(max)) {
            inRange = baseBudgets.some(b => b >= min && b <= max);
          }
        }
      } else {
        // Default to true if format not recognized
        inRange = true;
      }
      
      console.log(`PropertyWizard - Property ${propertyData.projectName} budget in range:`, inRange);
      if (!inRange) return false;
    }
    
    // Configuration filter
    if (propertyPreference.configuration && propertyPreference.configuration !== '') {
      const targetConfig = propertyPreference.configuration.replace(' BHK', '').trim();
      
      // Check if property has this configuration
      let hasConfig = false;
      if (Array.isArray(propertyData.configurations)) {
        hasConfig = propertyData.configurations.some((conf: any) => {
          if (typeof conf === 'object' && conf.type) {
            const confType = conf.type.toString().replace(' BHK', '').replace('BHK', '').trim();
            return confType === targetConfig;
          }
          return false;
        });
      }
      
      // Check legacy configuration fields
      if (!hasConfig && propertyData.Configurations) {
        if (typeof propertyData.Configurations === 'string') {
          const configs = propertyData.Configurations.split(',').map((c: string) => c.trim().replace(' BHK', '').replace('BHK', ''));
          hasConfig = configs.includes(targetConfig);
        }
      }
      
      if (!hasConfig) return false;
    }
    
    return true;
  });

  console.log(`PropertyWizard - Filtered ${filteredProperties.length} properties out of ${allPropertiesData.length}`);

  // Handler functions for form submissions
  const handlePropertyPreferenceSubmit = (data: PropertyPreference) => {
    // Process the budget range to convert it to minBudget and maxBudget for database filtering
    const processedData = {...data};
    
    // Handle different budget formats
    if (data.budget && data.budget.includes('-') && !data.budget.includes('above') && !data.budget.includes('under')) {
      // Handle formats like "75-1-crore" meaning "75 lakhs to 1 crore"
      if (data.budget.includes('-crore')) {
        const budgetParts = data.budget.split('-');
        if (budgetParts.length >= 3 && budgetParts[2] === 'crore') {
          // Handle "75-1-crore" format (lakhs to crores)
          if (budgetParts[0] === '75' && budgetParts[1] === '1') {
            const minBudgetL = parseFloat(budgetParts[0].trim()); // 75 lakhs
            const maxBudgetCr = parseFloat(budgetParts[1].trim()); // 1 crore
            
            // Convert to rupees: 1 lakh = 100,000, 1 crore = 10,000,000
            processedData.minBudget = minBudgetL * 100000;
            processedData.maxBudget = maxBudgetCr * 10000000;
            
            console.log(`Budget converted: ${minBudgetL}L-${maxBudgetCr}Cr = ${processedData.minBudget}-${processedData.maxBudget} rupees`);
          } else {
            // Handle "1-1.5-crore" and "1.5-2-crore" formats (both in crores)
            const minBudgetCr = parseFloat(budgetParts[0].trim());
            const maxBudgetCr = parseFloat(budgetParts[1].trim());
            
            // Convert crores to rupees
            processedData.minBudget = minBudgetCr * 10000000;
            processedData.maxBudget = maxBudgetCr * 10000000;
            
            console.log(`Budget converted: ${minBudgetCr}Cr-${maxBudgetCr}Cr = ${processedData.minBudget}-${processedData.maxBudget} rupees`);
          }
        }
      } else if (data.budget.includes('-lakhs')) {
        // Handle formats like "50-75-lakhs"
        const budgetParts = data.budget.split('-');
        if (budgetParts.length >= 2) {
          const minBudgetL = parseFloat(budgetParts[0].trim());
          const maxBudgetL = parseFloat(budgetParts[1].trim());
          
          // Convert lakhs to rupees
          processedData.minBudget = minBudgetL * 100000;
          processedData.maxBudget = maxBudgetL * 100000;
          
          console.log(`Budget converted: ${minBudgetL}L-${maxBudgetL}L = ${processedData.minBudget}-${processedData.maxBudget} rupees`);
        }
      }
    } else if (data.budget && data.budget.includes('above')) {
      // Handle "above-2-crore" format
      const match = data.budget.match(/above-(\d+(?:\.\d+)?)-crore/);
      if (match) {
        const minBudgetCr = parseFloat(match[1]);
        processedData.minBudget = minBudgetCr * 10000000;
        processedData.maxBudget = undefined; // No upper limit
        console.log(`Budget Above ${minBudgetCr}Cr = ${processedData.minBudget}+ rupees`);
      }
    } else if (data.budget && data.budget.includes('under')) {
      // Handle "under-50-lakhs" format  
      const match = data.budget.match(/under-(\d+)-lakhs/);
      if (match) {
        const maxBudgetL = parseFloat(match[1]);
        processedData.minBudget = undefined; // No lower limit
        processedData.maxBudget = maxBudgetL * 100000; // Convert lakhs to rupees
        console.log(`Budget Under ${maxBudgetL}L = up to ${processedData.maxBudget} rupees`);
      }
    }
    
    console.log('PropertyWizard - Setting preferences:', processedData);
    setPropertyPreference(processedData);
    setCurrentStep("results"); // Show matching properties directly
    window.scrollTo(0, 0); // Scroll to top for results
  };

  const handleUserInfoSubmit = (data: UserInfo) => {
    setUserInfo(data);
    setCurrentStep("confirmation");
    window.scrollTo(0, 0); // Scroll to top for confirmation

    // Send WhatsApp message with appointment details
    if (data.phone && data.appointmentDate) {
      const formattedDate = new Date(data.appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long', 
        month: 'long', 
        day: 'numeric'
      });
      
      // Format time from 24-hour format to 12-hour format
      const formatTimeSlot = (timeStr: string) => {
        const [hour, minute] = timeStr.split(':');
        const hourNum = parseInt(hour, 10);
        const amPm = hourNum < 12 ? 'AM' : 'PM';
        const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
        return `${hour12}:${minute} ${amPm}`;
      };
      
      const formattedTime = formatTimeSlot(data.appointmentTime);

      // Prepare WhatsApp message
      const message = encodeURIComponent(
        `Hello ${data.name}, your property consultation with relai is confirmed for ${formattedDate} at ${formattedTime}. Our property expert will contact you shortly with the meeting details. Thank you for choosing relai!`
      );
      
      // Ensure phone number format is correct (remove any + prefix if present)
      const phoneNumber = data.phone.startsWith('+') 
        ? data.phone.substring(1) 
        : data.phone;
      
      // Open WhatsApp with the message
      window.open(`https://wa.me/918881088890?text=${message}`, '_blank');
    }
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full pt-20 sm:pt-28 pb-8 sm:pb-16 px-4 sm:px-6">
        {/* Breadcrumb navigation */}
        <div className="mb-4 sm:mb-6">
          <Link href="/">
            <button className="flex items-center text-sm text-gray-600 hover:text-[#1752FF] transition-colors">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Home
            </button>
          </Link>
        </div>

        {/* Hero Section */}
        <motion.div 
          className="text-center mb-8 sm:mb-12 max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center mb-4 flex-wrap">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-[#1752FF] mr-2 sm:mr-3" />
            <Badge className="bg-blue-100 text-blue-800 text-xs sm:text-sm px-2 sm:px-3 py-1">
              AI-Powered Property Matching
            </Badge>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-[#1752FF] to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4 px-2">
            Find Your Dream Property
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-2">
            Complete our intelligent wizard to match your budget and preferences with the perfect property in Hyderabad. Get instant results powered by advanced AI.
          </p>
        </motion.div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Property Preferences */}
          {currentStep === "preferences" && (
            <motion.div
              key="preferences"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="grid lg:grid-cols-12 gap-6 sm:gap-8 max-w-7xl mx-auto"
            >
              {/* Left Benefits & Trust Section */}
              <motion.div 
                className="lg:col-span-3 space-y-4 sm:space-y-6 order-2 lg:order-1"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <div className="space-y-3 sm:space-y-4">
                  <motion.h3 
                    className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Why Choose Relai?
                  </motion.h3>
                  
                  {/* Benefit 1 */}
                  <motion.div 
                    className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-white/50 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="mt-1">
                      <Target className="h-5 w-5 text-[#1752FF] group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">Perfect Match</h4>
                      <p className="text-xs text-gray-600">AI finds properties that match your exact preferences</p>
                    </div>
                  </motion.div>

                  {/* Benefit 2 */}
                  <motion.div 
                    className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-white/50 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="mt-1">
                      <Clock className="h-5 w-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">Save Time</h4>
                      <p className="text-xs text-gray-600">Get results in seconds, not hours of searching</p>
                    </div>
                  </motion.div>

                  {/* Benefit 3 */}
                  <motion.div 
                    className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-white/50 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="mt-1">
                      <Shield className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">Verified Properties</h4>
                      <p className="text-xs text-gray-600">All properties are RERA verified and genuine</p>
                    </div>
                  </motion.div>

                  {/* Benefit 4 */}
                  <motion.div 
                    className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-white/50 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="mt-1">
                      <TrendingUp className="h-5 w-5 text-purple-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">Expert Guidance</h4>
                      <p className="text-xs text-gray-600">Get personalized advice from property experts</p>
                    </div>
                  </motion.div>
                </div>

                {/* Trust indicator */}
                <motion.div
                  className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-200 mt-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                >
                  <div className="text-center">
                    <div className="flex justify-center mb-3">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ scale: 1.2, rotate: 360 }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                        >
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-700 italic">"Found my dream home in just 2 weeks!"</p>
                    <p className="text-xs text-gray-500 mt-2">- Happy Customer</p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Main Form Section */}
              <div className="lg:col-span-6 order-1 lg:order-2">
                <Card className="border-0 shadow-2xl shadow-blue-100/50 w-full bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12">
                    <PropertyPreferenceForm 
                      initialValues={propertyPreference} 
                      onSubmit={handlePropertyPreferenceSubmit} 
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Process Steps Section */}
              <motion.div 
                className="lg:col-span-3 order-3 lg:order-3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <motion.div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-2xl text-white text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.02, y: -3 }}
                  >
                    <motion.div 
                      className="text-2xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
                    >
                      ⚡ Instant
                    </motion.div>
                    <div className="text-sm opacity-90">Property Matching</div>
                  </motion.div>

                  <motion.h3 
                    className="text-lg font-semibold text-gray-900 mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    How It Works
                  </motion.h3>
                  
                  {/* Step 1 */}
                  <motion.div 
                    className="group flex items-start space-x-4 p-4 rounded-lg hover:bg-white/50 transition-all duration-300 cursor-pointer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div 
                      className="w-8 h-8 bg-[#1752FF] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      1
                    </motion.div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">Set Your Preferences</h4>
                      <p className="text-xs text-gray-600 mt-1">Tell us your budget, location, and requirements</p>
                    </div>
                  </motion.div>

                  {/* Step 2 */}
                  <motion.div 
                    className="group flex items-start space-x-4 p-4 rounded-lg hover:bg-white/50 transition-all duration-300 cursor-pointer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div 
                      className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      2
                    </motion.div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">AI Matches Properties</h4>
                      <p className="text-xs text-gray-600 mt-1">Our AI finds the best matches instantly</p>
                    </div>
                  </motion.div>

                  {/* Step 3 */}
                  <motion.div 
                    className="group flex items-start space-x-4 p-4 rounded-lg hover:bg-white/50 transition-all duration-300 cursor-pointer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div 
                      className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      3
                    </motion.div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">Connect & Visit</h4>
                      <p className="text-xs text-gray-600 mt-1">Schedule visits with our property experts</p>
                    </div>
                  </motion.div>

                  {/* Trust badges */}
                  <motion.div 
                    className="mt-6 space-y-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                  >
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span>RERA Verified Properties</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span>Legal Due Diligence</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span>End-to-End Support</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: Results */}
          {currentStep === "results" && (
            <motion.div
              key="results"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.5 }}
              className="max-w-7xl mx-auto"
            >
              {isLoadingAllProperties ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Finding Perfect Properties</h3>
                  <p className="text-gray-600">We're searching for properties that match your preferences...</p>
                </div>
              ) : (
                <PropertyResultsNew 
                  properties={filteredProperties} 
                  preferences={propertyPreference} 
                />
              )}
              
              {/* Back button */}
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep("preferences")}
                  className="text-sm text-gray-600 hover:text-[#1752FF] flex items-center mx-auto transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to modify preferences
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next steps prompt */}
        {currentStep === "preferences" && (
          <motion.div 
            className="mt-8 sm:mt-12 text-center px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-blue-100">
              <p className="text-gray-700 mb-3 text-sm sm:text-base">After submitting your preferences, we'll show you all properties that match your criteria!</p>
              <div className="flex items-center justify-center text-[#1752FF] font-medium text-sm sm:text-base">
                <span>Next: View Matching Properties</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}