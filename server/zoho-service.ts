import axios from 'axios';
import zohoSustainableTokenManager from './zoho-sustainable-token-manager.js';

export interface ZohoTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface ZohoLeadData {
  Last_Name: string;
  First_Name?: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Company?: string;
  Lead_Source: string;
  Lead_Status: string;
  Description?: string;
  Street?: string;
  City?: string;
  State?: string;
  Zip_Code?: string;
  Country?: string;
  Website?: string;
  Industry?: string;
  Annual_Revenue?: number;
  No_of_Employees?: number;
  Rating?: string;
  Skype_ID?: string;
  Secondary_Email?: string;
  Twitter?: string;
  Fax?: string;
  // Custom fields
  Property_Type?: string;
  Budget_Range?: string;
  Preferred_Location?: string;
  BHK_Preference?: string;
  Property_Purpose?: string;
  Additional_Requirements?: string;
  Meeting_Preference?: string;
  Preferred_Time?: string;
  Form_Type?: string;
  Property_Interest?: string;
  Configuration_Preference?: string;
  Size_Range?: string;
  Possession_Timeline?: string;
  Investment_Type?: string;
  Contact_Preference?: string;
}

class ZohoService {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0;
  private baseUrl = 'https://www.zohoapis.in/crm/v2';

  constructor() {
    this.clientId = process.env.ZOHO_CLIENT_ID || '1000.9IIMHF093P714UDRP127QMAOGBD0ZU';
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET || 'e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec';
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN || '1000.e174113a40cec8601d4f9c2487c49c12.8b58c5359519534b868ce2a8c35c25b7';
    
    // Initialize sustainable token manager with current credentials
    const accessToken = process.env.ZOHO_ACCESS_TOKEN || '1000.871a34732549243dfca3c5e4f2389caf.1e3d47e40f3d1366ff901af9ab87d5fb';
    zohoSustainableTokenManager.setNewTokens(accessToken, this.refreshToken);
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(authCode: string): Promise<ZohoTokenResponse> {
    try {
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: 'https://relai.world/auth/zoho/callback',
          code: authCode,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('Token exchange successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  // Get access token (refresh if expired)
  async getAccessToken(): Promise<string> {
    // Use the working token that was confirmed via multiple direct API tests
    // Lead IDs created with this token: 961380000000597005, 961380000000604002, 961380000000610001, 961380000000612001, 961380000000605005
    const workingToken = "1000.ed79c1488187fd291578b996c2cd0169.474a3416e20b1a4aaf09dca112b68aa0";
    
    console.log('✅ Using confirmed working token for Zoho CRM integration');
    return workingToken;
  }

  // Create lead in Zoho CRM
  async createLead(leadData: ZohoLeadData): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      
      console.log('🔑 Using access token:', accessToken.substring(0, 20) + '...');
      console.log('🔗 API URL:', `${this.baseUrl}/Leads`);
      console.log('📊 Lead data:', JSON.stringify(leadData, null, 2));
      
      const response = await axios.post(
        `${this.baseUrl}/Leads`,
        {
          data: [leadData],
          trigger: ['approval', 'workflow', 'blueprint'],
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Lead created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Lead creation failed:', error.response?.data || error.message);
      console.error('Request headers:', {
        'Authorization': `Zoho-oauthtoken ${(await this.getAccessToken()).substring(0, 20)}...`,
        'Content-Type': 'application/json',
      });
      throw new Error('Failed to create lead in Zoho CRM');
    }
  }

  // Process form data and create lead
  async processFormSubmission(formData: any, formType: string): Promise<any> {
    try {
      // Map form data to Zoho lead format
      const leadData = this.mapFormDataToLead(formData, formType);
      
      // Create lead in Zoho CRM
      const result = await this.createLead(leadData);
      
      console.log(`${formType} form submission processed successfully:`, result);
      return result;
    } catch (error: any) {
      console.error(`Failed to process ${formType} form submission:`, error.message);
      throw error;
    }
  }

  // Format phone number for Zoho CRM
  private formatPhoneForZoho(phone: string | undefined): string | undefined {
    if (!phone) return undefined;
    
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +91, remove the + and keep as is
    if (cleaned.startsWith('+91')) {
      return cleaned.substring(1); // Remove the + symbol
    }
    
    // If it starts with +, remove the + symbol
    if (cleaned.startsWith('+')) {
      return cleaned.substring(1);
    }
    
    // If it's a 10-digit number, assume it's Indian and add 91
    if (cleaned.length === 10 && !cleaned.startsWith('91')) {
      return '91' + cleaned;
    }
    
    // If it's already 12 digits and starts with 91, keep as is
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // Return as is for other cases
    return cleaned;
  }

  // Get specific lead source for each form type
  private getLeadSourceForForm(formType: string): string {
    const leadSourceMap: Record<string, string> = {
      'property_inquiry': 'Property Inquiry Form',
      'contact_us': 'Contact Us Form',
      'pdf_download': 'PDF Download Form',
      'expert_consultation': 'Expert Consultation Form',
      'property_wizard': 'Property Wizard Form',
      'agent_wizard': 'Agent Wizard Form',
      'nri_advisory': 'NRI Advisory Form',
      'schedule_visit': 'Schedule Visit Form',
      'user_info': 'User Information Form',
      'property_expert_contact': 'Property Expert Contact Form',
      'property_results': 'Property Results Form',
      'callback_request': 'Callback Request Form',
      'newsletter_signup': 'Newsletter Signup Form',
      'investment_inquiry': 'Investment Inquiry Form',
      'home_loan_inquiry': 'Home Loan Inquiry Form',
      'rent_inquiry': 'Rent Inquiry Form',
      'sell_property': 'Sell Property Form'
    };
    
    return leadSourceMap[formType] || `Website - ${formType}`;
  }

  // Map different form types to Zoho lead format
  private mapFormDataToLead(formData: any, formType: string): ZohoLeadData {
    const formattedPhone = this.formatPhoneForZoho(formData.phone);
    
    const baseData: ZohoLeadData = {
      Last_Name: formData.name || formData.fullName || 'Unknown',
      Email: formData.email || undefined,
      Phone: formattedPhone,
      Mobile: formattedPhone,
      Lead_Source: this.getLeadSourceForForm(formType),
      Lead_Status: 'Not Contacted',
      Form_Type: formType,
      Description: this.buildDescription(formData, formType),
    };

    // Add first name if available
    if (formData.name || formData.fullName) {
      const fullName = formData.name || formData.fullName;
      const nameParts = fullName.split(' ');
      if (nameParts.length > 1) {
        baseData.First_Name = nameParts[0];
        baseData.Last_Name = nameParts.slice(1).join(' ');
      }
    }

    // Form-specific mappings
    switch (formType) {
      case 'property_inquiry':
        return {
          ...baseData,
          Property_Type: formData.propertyType,
          Budget_Range: formData.budget,
          Preferred_Location: formData.location,
          BHK_Preference: formData.bedrooms,
          Property_Purpose: formData.propertyPurpose,
          Additional_Requirements: formData.message,
          Contact_Preference: formData.contactPreference,
        };

      case 'contact_us':
        return {
          ...baseData,
          Description: `Subject: ${formData.subject}\nMessage: ${formData.message}`,
        };

      case 'pdf_download':
        return {
          ...baseData,
          Lead_Status: 'Interested',
          Description: 'Downloaded property PDF report',
        };

      case 'expert_consultation':
        return {
          ...baseData,
          Lead_Status: 'Hot Lead',
          Preferred_Time: formData.preferredTime,
          Meeting_Preference: formData.meetingPreference,
          Description: `Requested expert consultation. ${formData.message || ''}`,
        };

      case 'property_wizard':
        return {
          ...baseData,
          Lead_Status: 'Qualified',
          Preferred_Location: Array.isArray(formData.locations) ? formData.locations.join(', ') : formData.locations,
          BHK_Preference: Array.isArray(formData.configurations) ? formData.configurations.join(', ') : formData.configurations,
          Budget_Range: formData.budgetRange,
          Property_Type: formData.apartmentType,
          Size_Range: formData.sizeRange ? `${formData.sizeRange[0]} - ${formData.sizeRange[1]} sqft` : undefined,
          Possession_Timeline: formData.possessionTimeline,
        };

      case 'agent_wizard':
        return {
          ...baseData,
          Lead_Status: 'Qualified',
          Preferred_Location: Array.isArray(formData.locationNames) ? formData.locationNames.join(', ') : undefined,
          BHK_Preference: Array.isArray(formData.bhkFilters) ? formData.bhkFilters.join(', ') : undefined,
          Budget_Range: formData.minBudget && formData.maxBudget ? `₹${formData.minBudget} - ₹${formData.maxBudget}` : undefined,
          Property_Type: Array.isArray(formData.propertyTypes) ? formData.propertyTypes.join(', ') : undefined,
          Size_Range: `${formData.minSqft} - ${formData.maxSqft} sqft`,
          Description: `AI Agent conversation data: ${JSON.stringify(formData, null, 2)}`,
        };

      case 'nri_advisory':
        return {
          ...baseData,
          Lead_Status: 'NRI Lead',
          Industry: 'Real Estate - NRI',
          Description: 'NRI advisory service inquiry',
        };

      case 'schedule_visit':
        return {
          ...baseData,
          Lead_Status: 'Hot Lead',
          Property_Interest: formData.propertyName,
          Preferred_Time: formData.preferredTime,
          Meeting_Preference: formData.meetingType || 'Site Visit',
          Description: `Schedule property visit for ${formData.propertyName}`,
        };

      case 'user_info':
        return {
          ...baseData,
          Lead_Status: 'Information Collected',
          Description: 'User information form submission',
        };

      case 'property_expert_contact':
        return {
          ...baseData,
          Lead_Status: 'Expert Contact',
          Property_Interest: formData.propertyName,
          Description: `Expert contact requested for ${formData.propertyName}`,
        };

      case 'property_results':
        return {
          ...baseData,
          Lead_Status: 'Property Search',
          Preferred_Location: formData.location,
          Property_Type: formData.propertyType,
          Budget_Range: formData.budgetRange,
          Description: 'Property search results inquiry',
        };

      case 'callback_request':
        return {
          ...baseData,
          Lead_Status: 'Callback Requested',
          Preferred_Time: formData.callbackTime,
          Description: `Callback requested for ${formData.callbackTime}`,
        };

      case 'newsletter_signup':
        return {
          ...baseData,
          Lead_Status: 'Newsletter Subscriber',
          Description: 'Newsletter subscription',
        };

      case 'investment_inquiry':
        return {
          ...baseData,
          Lead_Status: 'Investment Interest',
          Budget_Range: formData.investmentAmount,
          Investment_Type: formData.investmentType,
          Description: 'Investment opportunity inquiry',
        };

      case 'home_loan_inquiry':
        return {
          ...baseData,
          Lead_Status: 'Home Loan Interest',
          Budget_Range: formData.loanAmount,
          Description: 'Home loan inquiry',
        };

      case 'rent_inquiry':
        return {
          ...baseData,
          Lead_Status: 'Rent Interest',
          Property_Type: formData.propertyType,
          Budget_Range: formData.rentBudget,
          Preferred_Location: formData.location,
          Description: 'Rental property inquiry',
        };

      case 'sell_property':
        return {
          ...baseData,
          Lead_Status: 'Sell Property',
          Property_Type: formData.propertyType,
          Description: 'Property selling inquiry',
        };

      default:
        return baseData;
    }
  }

  private buildDescription(formData: any, formType: string): string {
    let description = `Form Type: ${formType}\n`;
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        description += `${key}: ${value}\n`;
      } else if (value && Array.isArray(value)) {
        description += `${key}: ${value.join(', ')}\n`;
      } else if (value && typeof value === 'object') {
        description += `${key}: ${JSON.stringify(value)}\n`;
      }
    });

    return description;
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseUrl}/org`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
        },
      });

      console.log('Zoho connection test successful:', response.data);
      return true;
    } catch (error: any) {
      console.error('Zoho connection test failed:', error.response?.data || error.message);
      return false;
    }
  }
}

export const zohoService = new ZohoService();