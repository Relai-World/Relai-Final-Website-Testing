import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, X, FileText, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { submitToZoho, FORM_TYPES } from '@/utils/zohoIntegration';
import { emailSchema, phoneSchema, nameSchema, formatPhoneNumber } from '@/utils/validation';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Property type interface
interface PropertyData {
  id?: number;
  projectName?: string | null;
  name?: string | null;
  location?: string | null;
  propertyType?: string | null;
  configurations?: string | null;
  minimumBudget?: number | null;
  maximumBudget?: number | null;
  pricePerSqft?: number | null;
  price_per_sqft?: number | null;
  area?: number | null;
  minSizeSqft?: number | null;
  maxSizeSqft?: number | null;
  possessionDate?: string | null;
  possession?: string | null;
  developerName?: string | null;
  builder?: string | null;
  reraNumber?: string | null;
  totalUnits?: number | null;
  amenities?: any[] | null; // Changed to any[] for robustness
  features?: any[] | null;  // Changed to any[] for robustness
  description?: string | null;
  remarksComments?: string | null;
  [key: string]: any;
}

const credentialSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
});

type CredentialFormData = z.infer<typeof credentialSchema>;

interface PDFDownloadFormProps {
  properties: PropertyData[];
  isOpen: boolean;
  onClose: () => void;
}

export default function PDFDownloadForm({ properties, isOpen, onClose }: PDFDownloadFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const form = useForm<CredentialFormData>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      name: '',
      phone: { countryCode: '+91', phoneNumber: '' },
      email: '',
    },
  });

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `Rs ${(price / 10000000).toFixed(1)} Cr`;
    } else if (price >= 100000) {
      return `Rs ${(price / 100000).toFixed(1)} L`;
    } else {
      return `Rs ${price.toLocaleString('en-IN')}`;
    }
  };

  const formatBudgetRange = (property: PropertyData) => {
    try {
      // Try multiple property field variations
      const minBudget = property.minimumBudget || property.MinimumBudget || 0;
      const maxBudget = property.maximumBudget || property.MaximumBudget || 0;
      
      // Calculate budget from configurations if available
      let calculatedMin = 0;
      let calculatedMax = 0;
      
      if (property.configurations && Array.isArray(property.configurations)) {
        const prices = property.configurations.map(config => config.BaseProjectPrice || 0).filter(p => p > 0);
        if (prices.length > 0) {
          calculatedMin = Math.min(...prices);
          calculatedMax = Math.max(...prices);
        }
      }
      
      const finalMinBudget = minBudget || calculatedMin;
      const finalMaxBudget = maxBudget || calculatedMax;
      
      if (finalMinBudget > 0 && finalMaxBudget > 0 && finalMinBudget !== finalMaxBudget) {
        return `${formatPrice(finalMinBudget)} - ${formatPrice(finalMaxBudget)}`;
      } else if (finalMinBudget > 0) {
        return `From ${formatPrice(finalMinBudget)}`;
      } else if (finalMaxBudget > 0) {
        return `Up to ${formatPrice(finalMaxBudget)}`;
      }
      
      return "Price on Request";
    } catch (error) {
      console.warn('Error formatting budget range:', error);
      return "Price on Request";
    }
  };

  // Professional header and footer function with proper spacing
  const addHeaderFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const headerHeight = 30;
    const footerHeight = 30;
    
    // Header with company branding
    doc.setFillColor(23, 82, 255);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RELAI', 20, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('The Ultimate Real Estate Buying Experience', 60, 18);
    
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
    doc.text('Email: connect@relai.world | Phone: +91 888 108 8890 | Website: www.relai.in', 20, footerStartY + 15);
    
    // Reset text color to black for content
    doc.setTextColor(0, 0, 0);
  };

  const generatePDF = async (data: CredentialFormData) => {
    setIsGenerating(true);
    try {
      console.log('Starting PDF generation with properties:', properties.length);
      console.log('Sample property data:', properties[0]);
      
      const doc = new jsPDF('portrait', 'mm', 'a4');
      let yPosition = 40; // Start after header
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const marginLeft = 20;
      const marginRight = 20;
      const availableWidth = pageWidth - marginLeft - marginRight;
      let currentPage = 1;
      
      // Add first page header
      addHeaderFooter(doc, currentPage, 1);
      
      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 82, 255);
      doc.text('Property Investment Report', marginLeft, yPosition);
      yPosition += 15;
      
      // Subtitle
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Prepared for ${data.name}`, marginLeft, yPosition);
      yPosition += 8;
      doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, marginLeft, yPosition);
      yPosition += 20;
      
      // Summary section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Investment Summary', marginLeft, yPosition);
      yPosition += 10;
      
      // Summary stats
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Properties: ${properties.length}`, marginLeft, yPosition);
      yPosition += 6;
      
      // Calculate average price safely
      const validPrices = properties.filter(prop => 
        (prop.pricePerSqft && !isNaN(prop.pricePerSqft)) || 
        (prop.price_per_sqft && !isNaN(prop.price_per_sqft))
      );
      const avgPricePerSqft = validPrices.length > 0 
        ? validPrices.reduce((sum, prop) => sum + (prop.pricePerSqft || prop.price_per_sqft || 0), 0) / validPrices.length
        : 0;
      
      doc.text(`Average Price per Sq.ft: ${formatPrice(avgPricePerSqft)}`, marginLeft, yPosition);
      yPosition += 6;
      
      // Get unique locations safely
      const locations = [...new Set(properties.map(p => {
        const location = p.location || p.area || p.Area || p.ProjectName;
        return typeof location === 'string' ? location : 'N/A';
      }).filter(loc => loc && loc !== 'N/A'))];
      
      const locationText = locations.length > 0 ? locations.slice(0, 5).join(', ') : 'Various Locations';
      doc.text(`Locations: ${locationText}${locations.length > 5 ? ' and more...' : ''}`, marginLeft, yPosition);
      yPosition += 20;
      
      // Properties table
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Property Details', marginLeft, yPosition);
      yPosition += 10;
      
      // Prepare table data safely
      const tableData = properties.slice(0, 50).map((property, index) => {
        // Safely extract property data
        const projectName = property.projectName || property.ProjectName || property.name || 'N/A';
        const location = property.location || property.area || property.Area || 'N/A';
        const config = property.configurations || 'N/A';
        const pricePerSqft = property.pricePerSqft || property.price_per_sqft || property.Price_per_sft || 0;
        const possession = property.possessionDate || property.possession || property.Possession_date || 'N/A';
        const rera = property.reraNumber || property.RERA_Number || 'N/A';
        
        return [
          (index + 1).toString(),
          typeof projectName === 'string' ? projectName.substring(0, 25) : 'N/A',
          typeof location === 'string' ? location.substring(0, 20) : 'N/A',
          typeof config === 'string' ? config.substring(0, 15) : 'N/A',
          formatPrice(pricePerSqft),
          formatBudgetRange(property),
          typeof possession === 'string' ? possession.substring(0, 15) : 'N/A',
          typeof rera === 'string' ? rera.substring(0, 20) : 'N/A'
        ];
      });
      
      // Only create table if we have data
      if (tableData.length > 0) {
        doc.autoTable({
          startY: yPosition,
          head: [['#', 'Project Name', 'Location', 'Config', 'Price/Sq.ft', 'Budget Range', 'Possession', 'RERA No.']],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2,
            textColor: [0, 0, 0],
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [23, 82, 255],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [248, 248, 248],
          },
          margin: { left: marginLeft, right: marginRight },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 30 },
            2: { cellWidth: 25 },
            3: { cellWidth: 20 },
            4: { cellWidth: 22 },
            5: { cellWidth: 25 },
            6: { cellWidth: 20 },
            7: { cellWidth: 25 },
          },
          didDrawPage: function (data) {
            if (data.pageNumber > 1) {
              addHeaderFooter(doc, data.pageNumber, 1);
            }
          }
        });
      } else {
        // If no properties, add a message
        doc.setFontSize(12);
        doc.text('No properties available for this report.', marginLeft, yPosition);
        yPosition += 20;
      }
      
      // Get total pages after table is rendered
      const totalPages = doc.internal.pages.length - 1;
      
      // Update all page headers and footers with correct total pages
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addHeaderFooter(doc, i, totalPages);
      }
      
      // Investment Advisory Section
      doc.setPage(totalPages);
      const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
      
      if (finalY > pageHeight - 80) {
        doc.addPage();
        currentPage++;
        addHeaderFooter(doc, currentPage, currentPage);
        yPosition = 40;
      } else {
        yPosition = finalY + 20;
      }
      
      // Investment advisory section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 82, 255);
      doc.text('Investment Advisory', marginLeft, yPosition);
      yPosition += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      const advisoryText = [
        '• Conduct thorough due diligence on all properties before making investment decisions',
        '• Verify all legal documents, approvals, and RERA registration details',
        '• Consider location connectivity, future development plans, and infrastructure projects',
        '• Evaluate builder reputation, project timeline, and completion track record',
        '• Factor in additional costs like registration, stamp duty, and maintenance charges',
        '• Consult with our property experts for personalized investment guidance'
      ];
      
      advisoryText.forEach(text => {
        doc.text(text, marginLeft, yPosition);
        yPosition += 6;
      });
      
      // Contact information
      yPosition += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 82, 255);
      doc.text('Contact Information', marginLeft, yPosition);
      yPosition += 8;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Name: ${data.name}`, marginLeft, yPosition);
      yPosition += 6;
      doc.text(`Phone: ${data.phone}`, marginLeft, yPosition);
      yPosition += 6;
      doc.text(`Email: ${data.email}`, marginLeft, yPosition);
      
      // Save the PDF
      const fileName = `Relai_Property_Report_${data.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF Generated Successfully!",
        description: `Your property report has been downloaded as ${fileName}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      toast({
        title: "Error Generating PDF",
        description: `There was an error generating your PDF report: ${error?.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data: CredentialFormData) => {
    try {
      // Format phone number for Zoho submission
      const formattedData = {
        ...data,
        phone: formatPhoneNumber(data.phone.countryCode, data.phone.phoneNumber)
      };
      
      // Submit to Zoho CRM first
      const zohoResult = await submitToZoho(formattedData, FORM_TYPES.PDF_DOWNLOAD);
      
      if (zohoResult.success) {
        console.log('PDF download user submitted to Zoho CRM successfully');
      } else {
        console.warn('Failed to submit to Zoho CRM:', zohoResult.error);
      }
      
      // Generate PDF regardless of Zoho success
      generatePDF(formattedData);
    } catch (error) {
      console.error('Error during form submission:', error);
      // Still generate PDF even if Zoho fails
      generatePDF(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Download Property Report
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 mt-2">
            Get a comprehensive PDF report of {properties.length} properties
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Your Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter your mobile number"
                      error={form.formState.errors.phone?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isGenerating}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isGenerating ? (
                  <motion.div
                    className="flex items-center gap-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FileText className="h-4 w-4" />
                    Generating PDF...
                  </motion.div>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}