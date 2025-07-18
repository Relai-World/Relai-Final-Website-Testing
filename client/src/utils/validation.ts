import { z } from 'zod';

// Country codes with common international formats
export const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
];

// Phone validation patterns for different countries
const PHONE_PATTERNS = {
  '+91': /^[6-9]\d{9}$/, // India: 10 digits starting with 6-9
  '+1': /^\d{10}$/, // US/Canada: 10 digits
  '+44': /^[1-9]\d{8,9}$/, // UK: 9-10 digits
  '+971': /^[1-9]\d{7,8}$/, // UAE: 8-9 digits
  '+965': /^[1-9]\d{6,7}$/, // Kuwait: 7-8 digits
  '+966': /^[1-9]\d{7,8}$/, // Saudi Arabia: 8-9 digits
  '+974': /^[1-9]\d{6,7}$/, // Qatar: 7-8 digits
  '+973': /^[1-9]\d{6,7}$/, // Bahrain: 7-8 digits
  '+968': /^[1-9]\d{6,7}$/, // Oman: 7-8 digits
  '+60': /^[1-9]\d{7,9}$/, // Malaysia: 8-10 digits
  '+65': /^[1-9]\d{7}$/, // Singapore: 8 digits
  '+86': /^[1-9]\d{9,10}$/, // China: 10-11 digits
  '+81': /^[1-9]\d{9,10}$/, // Japan: 10-11 digits
  '+82': /^[1-9]\d{7,8}$/, // South Korea: 8-9 digits
  '+61': /^[1-9]\d{8}$/, // Australia: 9 digits
  '+64': /^[1-9]\d{7,8}$/, // New Zealand: 8-9 digits
  '+49': /^[1-9]\d{9,11}$/, // Germany: 10-12 digits
  '+33': /^[1-9]\d{8}$/, // France: 9 digits
  '+39': /^[1-9]\d{8,9}$/, // Italy: 9-10 digits
  '+34': /^[1-9]\d{8}$/, // Spain: 9 digits
  '+7': /^[1-9]\d{9}$/, // Russia: 10 digits
  '+55': /^[1-9]\d{9,10}$/, // Brazil: 10-11 digits
  '+52': /^[1-9]\d{9}$/, // Mexico: 10 digits
  '+27': /^[1-9]\d{8}$/, // South Africa: 9 digits
};

// Email validation schema
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .refine(
    (email) => {
      // Additional email validation rules
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(email);
    },
    'Please enter a valid email address'
  );

// Phone validation schema with country code
export const phoneSchema = z.object({
  countryCode: z.string().min(1, 'Country code is required'),
  phoneNumber: z.string().min(1, 'Phone number is required')
}).refine(
  (data) => {
    const pattern = PHONE_PATTERNS[data.countryCode as keyof typeof PHONE_PATTERNS];
    if (!pattern) return true; // Allow if pattern not defined
    return pattern.test(data.phoneNumber);
  },
  {
    message: 'Please enter a valid phone number for the selected country',
    path: ['phoneNumber']
  }
);

// Name validation schema
export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');

// Combined validation for common form fields
export const baseFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

// Utility functions for phone validation
export const validatePhone = (countryCode: string, phoneNumber: string): boolean => {
  const pattern = PHONE_PATTERNS[countryCode as keyof typeof PHONE_PATTERNS];
  if (!pattern) return true; // Allow if pattern not defined
  return pattern.test(phoneNumber);
};

export const formatPhoneNumber = (countryCode: string, phoneNumber: string): string => {
  return `${countryCode} ${phoneNumber}`;
};

// Get country info by code
export const getCountryByCode = (code: string) => {
  return COUNTRY_CODES.find(country => country.code === code);
};

// Validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Check if email domain is valid
export const isValidEmailDomain = (email: string): boolean => {
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'rediffmail.com', 'ymail.com', 'live.com', 'protonmail.com',
    'icloud.com', 'aol.com', 'zoho.com', 'mail.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return commonDomains.includes(domain) || domain?.includes('.');
};

// Phone number formatting helpers
export const formatPhoneDisplay = (countryCode: string, phoneNumber: string): string => {
  const country = getCountryByCode(countryCode);
  return `${country?.flag} ${countryCode} ${phoneNumber}`;
};

// Clean phone number (remove spaces, dashes, etc.)
export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/[\s-().]/g, '');
};