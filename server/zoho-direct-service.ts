import axios from 'axios';

// Direct Zoho CRM service that bypasses token management issues
export class ZohoDirectService {
  private baseUrl = 'https://www.zohoapis.in/crm/v2';
  private workingToken = "1000.bd944771f1d0df1f206f84c56c6792a5.d04e9a043ce91fcc83a21e431907a419";
  private refreshToken = "1000.baf3549aceb4c647e5cc7b0ab13d4edd.0a6ef6f4269d908a5e62e985e569b556";
  private clientId = "1000.DF0I6DKAC06969GAWDPC1PVH0JTYSZ";
  private clientSecret = "116e214320b650d46ceeccacae5dccf7a565651de0";
  private tokenExpiryTime = 1752648892958;
  private tokenRefreshAttempts = 0;
  private maxRefreshAttempts = 3;

  // Get a valid access token, refreshing if needed
  private async getValidAccessToken(): Promise<string> {
    // Check if current token is still valid (with 5 min buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    
    if (now + bufferTime < this.tokenExpiryTime) {
      console.log('✅ Using existing valid token');
      return this.workingToken;
    }
    
    console.log('🔄 Token expired or expiring soon, attempting refresh...');
    
    // If we've exceeded max attempts, use current token and let error handling deal with it
    if (this.tokenRefreshAttempts >= this.maxRefreshAttempts) {
      console.log('⚠️  Max refresh attempts reached, using current token');
      return this.workingToken;
    }
    
    try {
      this.tokenRefreshAttempts++;
      
      const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data.access_token) {
        this.workingToken = response.data.access_token;
        this.tokenExpiryTime = Date.now() + (response.data.expires_in * 1000);
        this.tokenRefreshAttempts = 0; // Reset attempts on success
        
        console.log('✅ Token refreshed successfully');
        console.log(`🕒 New token expires at: ${new Date(this.tokenExpiryTime).toLocaleString()}`);
        
        return this.workingToken;
      } else {
        console.log('❌ No access token in refresh response:', response.data);
        return this.workingToken; // Fall back to current token
      }
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      console.log('⚠️  Continuing with current token, may require manual refresh later');
      return this.workingToken; // Fall back to current token
    }
  }

  // Search for existing lead by phone number
  async searchLeadByPhone(phoneNumber: string): Promise<any> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      console.log(`🔍 Searching for existing lead with phone: ${phoneNumber}`);
      
      const response = await axios.get(
        `${this.baseUrl}/Leads/search`,
        {
          params: {
            criteria: `((Phone:equals:${phoneNumber}) or (Mobile:equals:${phoneNumber}))`,
            fields: 'id,First_Name,Last_Name,Email,Phone,Mobile,Lead_Source,Lead_Status'
          },
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        console.log(`✅ Found existing lead:`, response.data.data[0]);
        return response.data.data[0];
      }
      
      console.log('ℹ️ No existing lead found for this phone number');
      return null;
    } catch (error: any) {
      console.error('❌ Lead search failed:', error.response?.data || error.message);
      return null; // Return null if search fails
    }
  }

  // Update existing lead
  async updateLead(leadId: string, leadData: any): Promise<any> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      console.log(`🔄 Updating existing lead ${leadId} with new data`);
      console.log('📊 Update data:', JSON.stringify(leadData, null, 2));
      
      const response = await axios.put(
        `${this.baseUrl}/Leads/${leadId}`,
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

      console.log('✅ Lead updated successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Lead update failed:', error.response?.data || error.message);
      throw new Error('Failed to update lead in Zoho CRM');
    }
  }

  // Create new lead
  async createLead(leadData: any): Promise<any> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      console.log('🚀 Creating new lead in Zoho CRM');
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

      console.log('✅ Lead created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Lead creation failed:', error.response?.data || error.message);
      throw new Error('Failed to create lead in Zoho CRM');
    }
  }

  async processFormSubmission(formData: any, formType: string): Promise<any> {
    try {
      // Map form data to Zoho lead format
      const leadData = this.mapFormDataToLead(formData, formType);
      
      // Get phone number for deduplication check
      const phoneNumber = leadData.Phone || leadData.Mobile;
      
      if (!phoneNumber) {
        console.log('⚠️  No phone number provided, creating new lead');
        const response = await this.createLead(leadData);
        console.log(`✅ Successfully processed ${formType} form submission (new lead)`);
        return response;
      }
      
      // Search for existing lead by phone number
      const existingLead = await this.searchLeadByPhone(phoneNumber);
      
      if (existingLead) {
        console.log(`🔄 Found existing lead for phone ${phoneNumber}, updating...`);
        
        // Merge new data with existing lead data
        const updateData = {
          ...leadData,
          // Keep existing lead status if it's more advanced
          Lead_Status: this.getUpdatedLeadStatus(existingLead.Lead_Status, leadData.Lead_Status),
          // Add form interaction history
          Description: this.mergeDescriptions(existingLead.Description, leadData.Description, formType)
        };
        
        const response = await this.updateLead(existingLead.id, updateData);
        console.log(`✅ Successfully updated existing lead for ${formType} form submission`);
        return response;
      } else {
        console.log(`🆕 No existing lead found for phone ${phoneNumber}, creating new lead`);
        const response = await this.createLead(leadData);
        console.log(`✅ Successfully created new lead for ${formType} form submission`);
        return response;
      }
    } catch (error: any) {
      console.error(`❌ Failed to process ${formType} form submission:`, error.message);
      throw error;
    }
  }

  private formatPhoneForZoho(phone: string | undefined): string | undefined {
    if (!phone) return undefined;
    
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If phone starts with country code, keep it as is
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      return cleanPhone;
    }
    
    // If phone starts with +91, remove the +
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      return cleanPhone;
    }
    
    // If phone is 10 digits, add India country code
    if (cleanPhone.length === 10) {
      return `91${cleanPhone}`;
    }
    
    return cleanPhone;
  }

  private getLeadSourceForForm(formType: string): string {
    const leadSources = {
      'contact_us': 'Contact Us Form',
      'pdf_download': 'PDF Download Form',
      'property_results': 'Property Results Inquiry',
      'property_expert': 'Property Expert Consultation',
      'property_form': 'Property Interest Form',
      'user_info': 'User Information Form'
    };
    
    return leadSources[formType] || `Website - ${formType}`;
  }

  private getUpdatedLeadStatus(existingStatus: string, newStatus: string): string {
    // Define lead status hierarchy (higher values = more advanced)
    const statusHierarchy = {
      'Not Contacted': 1,
      'Contacted': 2,
      'Hot Lead': 3,
      'Warm Lead': 2,
      'Cold Lead': 1,
      'Qualified': 4,
      'Unqualified': 0,
      'Converted': 5,
      'Lost': 0
    };
    
    const existingLevel = statusHierarchy[existingStatus] || 1;
    const newLevel = statusHierarchy[newStatus] || 1;
    
    // Keep the more advanced status
    return existingLevel >= newLevel ? existingStatus : newStatus;
  }

  private mergeDescriptions(existingDescription: string, newDescription: string, formType: string): string {
    const timestamp = new Date().toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      dateStyle: 'short',
      timeStyle: 'short'
    });
    
    let mergedDescription = '';
    
    if (existingDescription) {
      mergedDescription = existingDescription + '\n\n';
    }
    
    mergedDescription += `--- ${timestamp} - ${formType.toUpperCase()} FORM SUBMISSION ---\n`;
    mergedDescription += newDescription;
    
    return mergedDescription;
  }

  private mapFormDataToLead(formData: any, formType: string): any {
    const phone = this.formatPhoneForZoho(formData.phone);
    
    const baseData: any = {
      "Last_Name": formData.name || formData.lastName || "Unknown",
      "Email": formData.email,
      "Phone": phone,
      "Mobile": phone,
      "Lead_Source": this.getLeadSourceForForm(formType),
      "Lead_Status": "Not Contacted",
      "Form_Type": formType,
      "Description": this.buildDescription(formData, formType)
    };

    // Add first name if available
    if (formData.firstName) {
      baseData.First_Name = formData.firstName;
    } else if (formData.name && formData.name.includes(' ')) {
      const nameParts = formData.name.split(' ');
      baseData.First_Name = nameParts[0];
      baseData.Last_Name = nameParts.slice(1).join(' ');
    }

    // Add form-specific fields
    if (formType === 'property_results' || formType === 'property_expert') {
      baseData.Property_Type = formData.propertyType;
      baseData.Budget_Range = formData.budget;
      baseData.Preferred_Location = formData.location || formData.preferredLocation;
      baseData.BHK_Preference = formData.bhk || formData.configuration;
      baseData.Lead_Status = "Hot Lead";
    }

    if (formType === 'user_info') {
      baseData.Lead_Status = "Information Collected";
      baseData.Property_Purpose = formData.purpose;
      baseData.Budget_Range = formData.budget;
      baseData.Preferred_Location = formData.location;
      baseData.BHK_Preference = formData.configuration;
    }

    if (formType === 'pdf_download') {
      baseData.Lead_Status = "Document Downloaded";
      baseData.Property_Interest = formData.propertyName || formData.property;
    }

    return baseData;
  }

  private buildDescription(formData: any, formType: string): string {
    let description = '';
    
    if (formType === 'contact_us') {
      description = `Subject: ${formData.subject || 'General Inquiry'}\nMessage: ${formData.message || 'No message provided'}`;
    } else if (formType === 'pdf_download') {
      description = `PDF Download Request\nProperty: ${formData.propertyName || formData.property || 'General Property Info'}`;
    } else if (formType === 'property_results') {
      description = `Property Search Inquiry\nLocation: ${formData.location || 'Not specified'}\nBudget: ${formData.budget || 'Not specified'}\nConfiguration: ${formData.configuration || 'Not specified'}`;
    } else if (formType === 'user_info') {
      description = 'User information form submission';
    } else {
      description = `Form Type: ${formType}\n${Object.entries(formData).map(([key, value]) => `${key}: ${value}`).join('\n')}`;
    }

    return description;
  }

  async testConnection(): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken();
      
      const response = await axios.get(`${this.baseUrl}/org`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('✅ Direct Zoho service connection test successful');
      return true;
    } catch (error: any) {
      console.error('❌ Direct Zoho service connection test failed:', error.response?.data || error.message);
      return false;
    }
  }
}

export const zohoDirectService = new ZohoDirectService();