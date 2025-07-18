import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { 
  MapPin, 
  IndianRupee, 
  Calendar, 
  Home, 
  TrendingUp, 
  Phone, 
  Mail, 
  Star, 
  Clock,
  CalendarIcon,
  Users,
  ArrowRight,
  Eye,
  MapPinIcon,
  ExternalLink,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { formatProjectName, formatBuilderName } from '@/utils/nameFormatter';
import { BrandLoader } from '@/components/ui/brand-loader';
import { submitToZoho, FORM_TYPES } from '@/utils/zohoIntegration';
import { emailSchema, phoneSchema, nameSchema, formatPhoneNumber, validateEmail } from '@/utils/validation';

interface Property {
  id: number;
  projectName: string;
  location: string;
  propertyType: string;
  communityType?: string;
  developerName: string;
  configurations?: any; // Can be string or array of objects
  possessionDate: string;
  minimumBudget?: number;
  maximumBudget?: number;
  area?: number;
  pricePerSqft?: number;
  images?: string[];
}

interface PropertyResultsNewProps {
  properties: Property[];
  preferences: any;
}

function PropertyResultsNew({ properties, preferences }: PropertyResultsNewProps) {
  const [, setLocation] = useLocation();
  const [showContactForm, setShowContactForm] = useState(false);
  const [showPDFForm, setShowPDFForm] = useState(false);
  const [showAllProperties, setShowAllProperties] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: { countryCode: '+91', phoneNumber: '' },
    email: '',
    date: undefined as Date | undefined,
    time: ''
  });
  
  const [pdfFormData, setPdfFormData] = useState({
    name: '',
    phone: { countryCode: '+91', phoneNumber: '' },
    email: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pdfErrors, setPdfErrors] = useState<Record<string, string>>({});
  
  const [formErrors, setFormErrors] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    time: ''
  });

  const [pdfFormErrors, setPdfFormErrors] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
    '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'
  ];

  const formatBudgetRange = (property: Property) => {
    if (property.minimumBudget && property.maximumBudget) {
      const minCrores = property.minimumBudget / 10000000;
      const maxCrores = property.maximumBudget / 10000000;
      
      if (minCrores < 1) {
        return `₹${(property.minimumBudget / 100000).toFixed(0)}L - ₹${(property.maximumBudget / 100000).toFixed(0)}L`;
      } else {
        return `₹${minCrores.toFixed(1)}Cr - ₹${maxCrores.toFixed(1)}Cr`;
      }
    }
    return 'Price on request';
  };

  const formatConfigurations = (configurations: any) => {
    if (!configurations) return 'Various Options';
    
    // If it's a string, return it directly
    if (typeof configurations === 'string') {
      return configurations;
    }
    
    // If it's an object, extract meaningful information
    if (typeof configurations === 'object') {
      if (configurations.type) {
        return configurations.type;
      }
      // If it's an array of configurations
      if (Array.isArray(configurations)) {
        const types = configurations.map(config => config.type || config);
        // Get unique values only
        const uniqueTypes = [...new Set(types)].filter(type => type);
        return uniqueTypes.length > 0 ? uniqueTypes.join(', ') : 'Various Options';
      }
    }
    
    return 'Various Options';
  };

  const calculateSmartRating = (property: Property) => {
    let score = 3.5;
    if (property.pricePerSqft && property.pricePerSqft < 6000) score += 0.5;
    if (property.possessionDate && new Date(property.possessionDate) < new Date('2025-12-31')) score += 0.3;
    if (property.communityType === 'gated-community') score += 0.2;
    return Math.min(5, Math.max(3.5, score));
  };

  const handleViewDetails = (property: Property) => {
    setLocation(`/property/${property.id}`);
  };

  const handleDownloadPDF = () => {
    setShowPDFForm(true);
  };

  const handlePDFFormSubmit = async () => {
    // Validate form using enhanced validation
    const errors: Record<string, string> = {};
    
    // Name validation
    try {
      nameSchema.parse(pdfFormData.name);
    } catch (error: any) {
      errors.name = error.errors[0].message;
    }
    
    // Phone validation
    try {
      phoneSchema.parse(pdfFormData.phone);
    } catch (error: any) {
      errors.phone = error.errors[0].message;
    }
    
    // Email validation
    try {
      emailSchema.parse(pdfFormData.email);
    } catch (error: any) {
      errors.email = error.errors[0].message;
    }

    setPdfErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsDownloadingPDF(true);
    try {
      // Format phone number for submission
      const formattedData = {
        ...pdfFormData,
        phone: formatPhoneNumber(pdfFormData.phone.countryCode, pdfFormData.phone.phoneNumber)
      };
      
      // Submit to Zoho CRM first
      const zohoResult = await submitToZoho(formattedData, FORM_TYPES.PDF_DOWNLOAD);
      
      if (zohoResult.success) {
        console.log('PDF download user submitted to Zoho CRM successfully');
      } else {
        console.warn('Failed to submit to Zoho CRM:', zohoResult.error);
      }

      // Import jsPDF and autoTable dynamically
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      // Create PDF with all properties
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const headerHeight = 30;
      const footerHeight = 30;
      const maxContentY = pageHeight - footerHeight - 10;
      let yPosition = headerHeight + 15;
      let pageNumber = 1;
      const totalPages = Math.ceil(properties.length / 5) + 1;
      
      // Add header and footer function
      const addHeaderFooter = (doc: any, pageNumber: number, totalPages: number) => {
        // Header background
        doc.setFillColor(23, 82, 255);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');
        
        // Header text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('RELAI', 20, 18);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Property Matches Report', 60, 18);
        
        // Header separator line
        doc.setDrawColor(23, 82, 255);
        doc.setLineWidth(1);
        doc.line(0, headerHeight, pageWidth, headerHeight);
        
        // Footer background
        const footerStartY = pageHeight - footerHeight;
        doc.setFillColor(248, 248, 248);
        doc.rect(0, footerStartY, pageWidth, footerHeight, 'F');
        
        // Footer separator line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(0, footerStartY, pageWidth, footerStartY);
        
        // Footer text
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        // Page number (right aligned)
        const pageText = `Page ${pageNumber} of ${totalPages}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        doc.text(pageText, pageWidth - 20 - pageTextWidth, footerStartY + 8);
        
        // Company information (left aligned)
        doc.text('Relai Technologies Pvt. Ltd. | Property Investment Advisory Services', 20, footerStartY + 8);
        doc.text('Email: connect@relai.world | Phone: +91 888 108 8890', 20, footerStartY + 15);
        
        // Reset text color to black for content
        doc.setTextColor(0, 0, 0);
      };
      
      // Add header and footer to first page
      addHeaderFooter(doc, pageNumber, totalPages);
      
      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      const title = 'PROPERTY MATCHES REPORT';
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, yPosition + 20);
      
      yPosition += 40;
      
      // Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Properties Found: ${properties.length}`, margin, yPosition);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition + 10);
      
      yPosition += 30;
      
      // Properties details
      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        
        // Check if we need a new page
        if (yPosition > maxContentY - 80) {
          doc.addPage();
          pageNumber++;
          addHeaderFooter(doc, pageNumber, totalPages);
          yPosition = headerHeight + 15;
        }
        
        // Property box
        const boxHeight = 70;
        doc.setDrawColor(23, 82, 255);
        doc.setLineWidth(1);
        doc.rect(margin, yPosition, pageWidth - (2 * margin), boxHeight);
        
        doc.setFillColor(248, 249, 250);
        doc.rect(margin + 1, yPosition + 1, pageWidth - (2 * margin) - 2, boxHeight - 2, 'F');
        
        // Property details
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const projectName = formatProjectName(property.projectName || property.name || 'Unknown Project');
        doc.text(projectName, margin + 10, yPosition + 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const detailsY = yPosition + 25;
        
        doc.text(`Developer: ${formatBuilderName(property.developerName || property.builder || 'Unknown')}`, margin + 10, detailsY);
        doc.text(`Location: ${property.location || 'Unknown'}`, margin + 10, detailsY + 8);
        doc.text(`Type: ${property.propertyType || 'Residential'}`, margin + 10, detailsY + 16);
        doc.text(`Configuration: ${formatConfigurations(property.configurations)}`, margin + 10, detailsY + 24);
        
        // Price information
        const budget = formatBudgetRange(property);
        doc.text(`Price: ${budget}`, margin + 10, detailsY + 32);
        
        if (property.possessionDate) {
          doc.text(`Possession: ${property.possessionDate}`, margin + 10, detailsY + 40);
        }
        
        yPosition += boxHeight + 15;
      }
      
      // Generate and download PDF
      const pdfBlob = doc.output('blob');
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `property-matches-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show all properties after PDF download
      setShowAllProperties(true);
      setShowPDFForm(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handlePDFInputChange = (field: string, value: string) => {
    setPdfFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (pdfFormErrors[field as keyof typeof pdfFormErrors]) {
      setPdfFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleScheduleVisit = () => {
    setShowContactForm(true);
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    
    // Name validation
    try {
      nameSchema.parse(formData.name);
    } catch (error: any) {
      errors.name = error.errors[0].message;
    }
    
    // Phone validation
    try {
      phoneSchema.parse(formData.phone);
    } catch (error: any) {
      errors.phone = error.errors[0].message;
    }
    
    // Email validation
    try {
      emailSchema.parse(formData.email);
    } catch (error: any) {
      errors.email = error.errors[0].message;
    }
    
    // Date validation
    if (!formData.date) {
      errors.date = 'Date is required';
    }
    
    // Time validation
    if (!formData.time) {
      errors.time = 'Time is required';
    }

    setErrors(errors);

    const hasErrors = Object.keys(errors).length > 0;
    if (!hasErrors) {
      try {
        // Format phone number for submission
        const formattedData = {
          ...formData,
          phone: formatPhoneNumber(formData.phone.countryCode, formData.phone.phoneNumber),
          date: formData.date ? format(formData.date, 'yyyy-MM-dd') : '',
          propertyCount: properties.length,
          preferences: JSON.stringify(preferences)
        };

        // Submit to Zoho CRM
        const zohoResult = await submitToZoho(formattedData, FORM_TYPES.PROPERTY_VISIT);
        
        if (zohoResult.success) {
          console.log('Property visit request submitted to Zoho CRM successfully');
        } else {
          console.warn('Failed to submit to Zoho CRM:', zohoResult.error);
        }

        setShowContactForm(false);
        setFormData({
          name: '',
          phone: '',
          email: '',
          date: undefined,
          time: ''
        });
        // Show all properties after scheduling visit
        setShowAllProperties(true);
      } catch (error) {
        console.error('Error during form submission:', error);
        // Still proceed with form closure
        setShowContactForm(false);
        setFormData({
          name: '',
          phone: '',
          email: '',
          date: undefined,
          time: ''
        });
        setShowAllProperties(true);
      }
    }
  };

  const allProperties = properties;
  const visibleProperties = showAllProperties ? allProperties : allProperties.slice(0, 6);
  const hiddenPropertiesCount = allProperties.length - 6;

  if (allProperties.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold mb-2">No Properties Found</h3>
          <p className="text-gray-600 mb-4">
            We couldn't find any properties matching your criteria. Try adjusting your filters or search terms.
          </p>
          <Button 
            onClick={() => setShowContactForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Phone className="h-4 w-4 mr-2" />
            Get Expert Help
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Your Perfect Property Match
            </h1>
            <p className="text-gray-600">
              We found {allProperties.length} properties that match your preferences
            </p>
          </motion.div>
        </div>

        <div className="grid gap-6 md:gap-8">
          {visibleProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -2 }}
              className="group"
            >
              <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-white border-0 group-hover:border-blue-200">
                <div className="p-6 space-y-6">
                  {/* Property Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                        {formatProjectName(property.projectName)}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <MapPinIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{property.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Home className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{formatBuilderName(property.developerName)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                        <Star className="h-3 w-3 text-yellow-600 fill-current" />
                        <span className="text-xs font-medium text-yellow-800">
                          {calculateSmartRating(property).toFixed(1)}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {property.propertyType}
                      </Badge>
                    </div>
                  </div>

                  {/* Property Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <IndianRupee className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Budget Range</span>
                      </div>
                      <p className="text-lg font-bold text-green-900">
                        {formatBudgetRange(property)}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Configuration</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {formatConfigurations(property.configurations)}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Possession</span>
                      </div>
                      <p className="text-lg font-bold text-purple-900">
                        {property.possessionDate || 'Ready to Move'}
                      </p>
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Price/sqft</span>
                      </div>
                      <p className="text-lg font-bold text-orange-900">
                        {property.pricePerSqft ? `₹${property.pricePerSqft.toLocaleString()}` : 'On Request'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button
                      onClick={() => handleViewDetails(property)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      onClick={() => setShowContactForm(true)}
                      variant="outline"
                      className="flex-1 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 transition-all duration-300"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Schedule Visit
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Blurred Properties Section */}
        {!showAllProperties && hiddenPropertiesCount > 0 && (
          <div className="mt-8 relative">
            {/* Gradient overlay for better visual separation */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white/80 z-10 pointer-events-none"></div>
            
            <div className="grid gap-6 md:gap-8 filter blur-[3px] md:blur-sm pointer-events-none relative">
              {allProperties.slice(6, 9).map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
                >
                  <Card className="overflow-hidden shadow-lg bg-white border-0 opacity-60">
                    <div className="p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                            {formatProjectName(property.projectName)}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <MapPinIcon className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">{property.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Home className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{formatBuilderName(property.developerName)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                            <Star className="h-3 w-3 text-yellow-600 fill-current" />
                            <span className="text-xs font-medium text-yellow-800">
                              {calculateSmartRating(property).toFixed(1)}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {property.propertyType}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <IndianRupee className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Budget Range</span>
                          </div>
                          <p className="text-lg font-bold text-green-900">
                            {formatBudgetRange(property)}
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Home className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Configuration</span>
                          </div>
                          <p className="text-lg font-bold text-blue-900">
                            {formatConfigurations(property.configurations)}
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">Possession</span>
                          </div>
                          <p className="text-lg font-bold text-purple-900">
                            {property.possessionDate || 'Ready to Move'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">Price/sqft</span>
                          </div>
                          <p className="text-lg font-bold text-orange-900">
                            {property.pricePerSqft ? `₹${property.pricePerSqft.toLocaleString()}` : 'On Request'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
            
            {/* Overlay with action buttons */}
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center min-h-[300px] z-20">
              <div className="text-center space-y-4 md:space-y-6 p-4 md:p-8 bg-white rounded-xl shadow-xl border-2 border-gray-200 max-w-sm md:max-w-md mx-auto">
                <div className="text-4xl md:text-6xl mb-2 md:mb-4">🏠</div>
                <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-2">
                  {hiddenPropertiesCount} More Properties Available
                </h3>
                <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                  Download all properties as PDF or schedule a visit to see complete details
                </p>
                <div className="flex flex-col gap-3 md:gap-4">
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPDF}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 py-3 md:py-4"
                  >
                    {isDownloadingPDF ? (
                      <BrandLoader size="sm" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isDownloadingPDF ? 'Generating PDF...' : 'Download PDF'}
                  </Button>
                  <Button
                    onClick={handleScheduleVisit}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 py-3 md:py-4"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Schedule Visit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download PDF Section - Always visible */}
        {allProperties.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 text-center"
          >
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">
                Download Property Report
              </h3>
              <p className="text-gray-600 mb-4 max-w-2xl mx-auto">
                Get a detailed PDF report with all {allProperties.length} property matches, 
                including pricing, location details, and developer information.
              </p>
              <Button
                onClick={handleDownloadPDF}
                disabled={isDownloadingPDF}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {isDownloadingPDF ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF Report
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Need Help Finding Your Perfect Property?
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Our property experts are here to help you make the right choice. 
              Get personalized recommendations based on your preferences and budget.
            </p>
            <Button
              onClick={() => setShowContactForm(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-3 rounded-full transition-all duration-300"
            >
              <Phone className="h-5 w-5 mr-2" />
              Talk to an Expert
            </Button>
          </div>
        </motion.div>

        {/* Empty State Message */}
        {allProperties.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                No Properties Found
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any properties matching your criteria. 
                Let our experts help you find the perfect property.
              </p>
              <Button
                onClick={() => setShowContactForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
              >
                <Phone className="h-4 w-4 mr-2" />
                Get Expert Help
              </Button>
            </div>
          </motion.div>
        )}

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h4 className="text-lg font-semibold mb-2 text-gray-900">
              Why Choose Relai?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <strong>✓ Verified Properties:</strong> All listings are verified and updated regularly
              </div>
              <div>
                <strong>✓ Expert Guidance:</strong> Get personalized advice from property experts
              </div>
              <div>
                <strong>✓ End-to-End Support:</strong> From search to possession, we're with you
              </div>
            </div>
          </div>
        </motion.div>

        {/* Expert Help CTA */}
        {allProperties.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 text-center"
          >
            <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-8 border border-orange-200">
              <h3 className="text-xl font-bold mb-4 text-orange-800">
                Still Confused? Let Our Experts Help!
              </h3>
              <p className="text-orange-700 mb-6 max-w-2xl mx-auto">
                Connect with our property experts for personalized guidance
              </p>
              <Button
                onClick={() => setShowContactForm(true)}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Phone className="h-4 w-4 mr-2" />
                Schedule Free Consultation
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-900">
              Get Expert Property Consultation
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 mt-2">
              Connect with our property experts for personalized guidance
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="text-sm font-medium">Your Name</Label>
              <Input
                id="contact-name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={`w-full ${formErrors.name ? 'border-red-500' : ''}`}
              />
              {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-phone" className="text-sm font-medium">WhatsApp Number</Label>
              <PhoneInput
                value={formData.phone}
                onChange={(value) => setFormData({...formData, phone: value})}
                placeholder="Enter your mobile number"
                error={errors.phone}
              />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
              <p className="text-xs text-gray-500">We'll send session details to this WhatsApp number</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className={`w-full ${formErrors.email ? 'border-red-500' : ''}`}
              />
              {formErrors.email && <p className="text-red-500 text-xs">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Session Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${formErrors.date ? 'border-red-500' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData({...formData, date})}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {formErrors.date && <p className="text-red-500 text-xs">{formErrors.date}</p>}
              <p className="text-xs text-gray-500">Select a date within the next 30 days (excluding Sundays)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Session Time
              </Label>
              <Select value={formData.time} onValueChange={(value) => setFormData({...formData, time: value})}>
                <SelectTrigger className={`w-full ${formErrors.time ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.time && <p className="text-red-500 text-xs">{formErrors.time}</p>}
              <p className="text-xs text-gray-500">Our property experts are available from 9 AM to 8 PM</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowContactForm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              >
                Schedule Session →
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Download Form Dialog */}
      {showPDFForm && (
        <Dialog open={showPDFForm} onOpenChange={setShowPDFForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Download Property Report
              </DialogTitle>
              <DialogDescription>
                Please provide your details to download the comprehensive property report.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pdf-name" className="text-sm font-medium">Your Name</Label>
                <Input
                  id="pdf-name"
                  placeholder="Enter your full name"
                  value={pdfFormData.name}
                  onChange={(e) => handlePDFInputChange('name', e.target.value)}
                  className={`w-full ${pdfFormErrors.name ? 'border-red-500' : ''}`}
                />
                {pdfFormErrors.name && <p className="text-red-500 text-xs">{pdfFormErrors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pdf-phone" className="text-sm font-medium">Phone Number</Label>
                <PhoneInput
                  value={pdfFormData.phone}
                  onChange={(value) => setPdfFormData({...pdfFormData, phone: value})}
                  placeholder="Enter your mobile number"
                  error={pdfErrors.phone}
                />
                {pdfErrors.phone && <p className="text-red-500 text-xs">{pdfErrors.phone}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pdf-email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="pdf-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={pdfFormData.email}
                  onChange={(e) => handlePDFInputChange('email', e.target.value)}
                  className={`w-full ${pdfFormErrors.email ? 'border-red-500' : ''}`}
                />
                {pdfFormErrors.email && <p className="text-red-500 text-xs">{pdfFormErrors.email}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowPDFForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePDFFormSubmit}
                  disabled={isDownloadingPDF}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isDownloadingPDF ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PropertyResultsNew;