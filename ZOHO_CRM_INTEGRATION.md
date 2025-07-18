# Zoho CRM Integration Documentation

## Overview

The Relai website is now fully integrated with Zoho CRM for automatic lead capture. Every form submission across the website creates a lead in Zoho CRM with comprehensive property and user information.

## Integration Status: ✅ FULLY OPERATIONAL

Successfully creating leads in Zoho CRM with proper field mapping and error handling.

## Files Involved

### Backend Integration
- `server/zoho-service.ts` - Main service class for Zoho API operations
- `server/zoho-token-manager.ts` - Automated token refresh management
- `server/routes/zoho-routes.ts` - API endpoints for Zoho operations
- `server/routes/zoho-token-routes.ts` - Token management endpoints
- `.zoho-tokens.json` - Token storage (auto-generated)

### Frontend Integration
- `client/src/utils/zohoIntegration.ts` - Frontend utility functions
- All form components now include Zoho submission logic

### Tools & Testing
- `manual-token-refresh.js` - Manual token refresh helper
- `test-zoho-integration.js` - Comprehensive integration test suite

## Configuration

### Environment Variables Required
```
ZOHO_CLIENT_ID=1000.9IIMHF093P714UDRP127QMAOGBD0ZU
ZOHO_CLIENT_SECRET=e415242c0ebeae5661ad3aafcea4ae75d8b9da5bec
ZOHO_REFRESH_TOKEN=(managed automatically)
```

### API Domain
Using Zoho India API: `https://www.zohoapis.in`

## Form Integration

### Supported Forms
1. **PDFDownloadForm** - Property brochure downloads
2. **ContactUsPage** - General contact inquiries
3. **PropertyResultsNew** - Property search results inquiries
4. **PropertyExpertContact** - Expert consultation requests
5. **PropertyFormPage** - Property-specific inquiries
6. **UserInfoForm** - User information collection

### Field Mapping
All forms automatically map to Zoho lead fields:
- `Last_Name` (required) - Extracted from user name
- `First_Name` - First part of user name
- `Email` - User email address
- `Phone/Mobile` - User phone number
- `Lead_Source` - **Customized per form type** (see Lead Source Mapping below)
- `Lead_Status` - Form-specific status (Not Contacted, Interested, Hot Lead, etc.)
- `Form_Type` - Source form identifier
- `Description` - Form-specific details
- Custom fields for property preferences, budget, location, etc.

### Lead Source Mapping
Each form type has its own specific lead source for better tracking:
- `contact_us` → "Contact Us Form"
- `pdf_download` → "PDF Download Form"
- `expert_consultation` → "Expert Consultation Form"
- `property_wizard` → "Property Wizard Form"
- `schedule_visit` → "Schedule Visit Form"
- `property_expert_contact` → "Property Expert Contact Form"
- `property_results` → "Property Results Form"
- `investment_inquiry` → "Investment Inquiry Form"
- `home_loan_inquiry` → "Home Loan Inquiry Form"
- `rent_inquiry` → "Rent Inquiry Form"
- `sell_property` → "Sell Property Form"
- `agent_wizard` → "Agent Wizard Form"
- `nri_advisory` → "NRI Advisory Form"
- `user_info` → "User Information Form"
- `callback_request` → "Callback Request Form"
- `newsletter_signup` → "Newsletter Signup Form"
- Unknown forms → "Website - [form_type]"

## Token Management

### Automatic Refresh
- Tokens refresh automatically 15 minutes before expiry
- No manual intervention needed during normal operation
- Fallback to manual refresh if automatic fails

### Manual Refresh Process
1. Run: `node manual-token-refresh.js`
2. Visit the provided authorization URL
3. Complete OAuth flow in browser
4. Copy authorization code from redirect URL
5. Run: `node manual-token-refresh.js YOUR_CODE_HERE`

## Testing

### Run Integration Tests
```bash
node test-zoho-integration.js
```

### Test Results
- Direct lead creation: ✅ Working
- Form submission processing: ✅ Working
- Multiple form types: ✅ Working
- Token refresh: ✅ Working

## Monitoring

### Success Indicators
- Server logs show "Lead created successfully"
- Zoho response contains lead ID (e.g., 961380000000565018)
- No authentication errors in logs

### Common Issues
- **DUPLICATE_DATA**: Normal when testing with same data
- **OAUTH_SCOPE_MISMATCH**: Limited test API scope (doesn't affect core functionality)
- **Token refresh failures**: Use manual refresh helper

## Maintenance

### Regular Tasks
- Monitor token expiry (automated)
- Check integration test results monthly
- Update API credentials if needed

### Emergency Procedures
If integration fails:
1. Check server logs for error details
2. Verify token status
3. Run manual token refresh if needed
4. Contact Zoho support for API issues

## Lead Data in Zoho

### Lead Fields Populated
- Contact Information (Name, Email, Phone)
- Lead Source & Status
- Property Preferences (Type, Budget, Location)
- Form Context (Type, Description)
- Timestamps (Created/Modified)

### Lead Processing
- Leads appear in Zoho CRM "Leads" module
- Automatic workflow triggers available
- Integration with Zoho sales pipeline

## Success Metrics

- **100% Form Coverage**: All website forms integrated
- **Automatic Lead Creation**: Every form submission creates Zoho lead
- **Error Handling**: Graceful fallback if Zoho unavailable
- **Token Management**: Self-sustaining authentication
- **Comprehensive Testing**: Full integration test suite available

The integration is production-ready and requires no ongoing maintenance beyond occasional token refresh monitoring.