// API Configuration - Direct Pay2Hub.in API (No Backend!)
// File: config/api.config.ts

/**
 * DIRECT PAY2HUB API INTEGRATION
 * 
 * App directly calls Pay2Hub.in API
 * No backend server needed!
 * 
 * ⚠️ Security Note: API keys are stored in app after login
 */

// ====== MAIN CONFIGURATION ======
export const API_CONFIG = {
  // Direct Pay2Hub API URL
  BASE_URL: 'https://pay2hub.in/api',
  
  // API Endpoints (Direct Pay2Hub routes)
  ENDPOINTS: {
    // Auth (JWT token based)
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    GENERATE_API_KEY: '/user/generate-api-key',
    
    // External API endpoints (require api_key)
    BALANCE: '/external/balance',
    OPERATORS: '/external/operators',
    PLANS: '/external/plans',
    RECHARGE: '/external/recharge',
    STATUS: '/external/status',
    TRANSACTIONS: '/external/transactions',
    RECHARGE_HISTORY: '/external/recharge/history',
    MARGIN: '/external/margin',
    COMMISSION: '/external/commission',
    
    // Gift Cards (require api_key)
    GIFTCARD_BRANDS: '/external/giftcards/brands',
    GIFTCARD_COMMISSION: '/external/giftcards/commission',
    GIFTCARD_PURCHASE: '/external/giftcards/purchase',
    GIFTCARD_HISTORY: '/external/giftcards/history',
    
    // Payment Gateway (require api_key)
    PAYMENT_CREATE: '/external/payment/create',
    PAYMENT_STATUS: '/external/payment/status',
    
    // User (JWT token based)
    USER_BALANCE: '/user/balance',
    WALLET_HISTORY: '/user/wallet-history',
  },
  
  // Timeouts
  TIMEOUT: 30000, // 30 seconds
  
  // Retry Configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// ====== HELPER FUNCTIONS ======

/**
 * Get full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Get API URL with api_key parameter
 * Use this for /external/* endpoints
 */
export const getApiUrlWithKey = (
  endpoint: string,
  apiKey: string,
  additionalParams?: Record<string, any>
): string => {
  const url = new URL(`${API_CONFIG.BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', apiKey);
  
  if (additionalParams) {
    Object.keys(additionalParams).forEach(key => {
      if (additionalParams[key] !== undefined && additionalParams[key] !== null) {
        url.searchParams.append(key, additionalParams[key].toString());
      }
    });
  }
  
  return url.toString();
};

/**
 * Get API URL with query params
 */
export const getApiUrlWithParams = (
  endpoint: string,
  params: Record<string, any>
): string => {
  const url = new URL(`${API_CONFIG.BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key].toString());
    }
  });
  return url.toString();
};

/**
 * Environment check
 */
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;

/**
 * Log API calls (only in development)
 */
export const logApiCall = (method: string, url: string, data?: any) => {
  if (isDevelopment) {
    console.log(`[API] ${method} ${url}`, data || '');
  }
};

// ====== EXPORT DEFAULT ======
export default API_CONFIG;
