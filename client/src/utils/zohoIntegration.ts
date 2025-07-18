interface ZohoSubmissionData {
  formData: Record<string, any>;
  formType: string;
}

interface ZohoResponse {
  success: boolean;
  message: string;
  zohoResponse?: any;
  error?: string;
}

export const submitToZoho = async (formData: Record<string, any>, formType: string): Promise<ZohoResponse> => {
  try {
    const response = await fetch('/api/zoho/submit-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData,
        formType,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit to Zoho CRM');
    }

    return result;
  } catch (error: any) {
    console.error('Zoho submission error:', error);
    return {
      success: false,
      message: 'Failed to submit to CRM',
      error: error.message,
    };
  }
};

export const testZohoConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/zoho/test-connection');
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Zoho connection test failed:', error);
    return false;
  }
};

// Form type mappings for different forms
export const FORM_TYPES = {
  PROPERTY_INQUIRY: 'property_inquiry',
  CONTACT_US: 'contact_us',
  PDF_DOWNLOAD: 'pdf_download',
  EXPERT_CONSULTATION: 'expert_consultation',
  PROPERTY_WIZARD: 'property_wizard',
  AGENT_WIZARD: 'agent_wizard',
  NRI_ADVISORY: 'nri_advisory',
  SCHEDULE_VISIT: 'schedule_visit',
  USER_INFO: 'user_info',
  PROPERTY_EXPERT_CONTACT: 'property_expert_contact',
  PROPERTY_RESULTS: 'property_results',
  CALLBACK_REQUEST: 'callback_request',
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  INVESTMENT_INQUIRY: 'investment_inquiry',
  HOME_LOAN_INQUIRY: 'home_loan_inquiry',
  RENT_INQUIRY: 'rent_inquiry',
  SELL_PROPERTY: 'sell_property',
} as const;

export type FormType = typeof FORM_TYPES[keyof typeof FORM_TYPES];