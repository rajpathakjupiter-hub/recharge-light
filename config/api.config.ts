// API Configuration - Recharge Light API
/**
 * App directly calls Recharge Light API
 */
export const API_CONFIG = {
  // Direct Recharge Light API URL
  BASE_URL: 'https://rechargelight.in/api',
  
  // API Endpoints
  ENDPOINTS: {
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    BALANCE: '/external/balance',
    RECHARGE: '/external/recharge',
    STATUS: '/external/status',
    OPERATORS: '/external/operators',
    MARGIN: '/external/margin',
    COMMISSION: '/external/commission',
    WALLET_HISTORY: '/user/wallet-history',
    RECHARGE_HISTORY: '/external/recharge/history',
    TRANSACTIONS: '/external/transactions',
    // Gateway 1 (TezIndia)
    PAYMENT_CREATE: '/external/payment/create',
    PAYMENT_STATUS: '/external/payment/status',
    // Gateway 2 (ekQR)
    PAYMENT2_CREATE: '/external/payment2/create',
    PAYMENT2_STATUS: '/external/payment2/status',
    // Gateway Status
    GATEWAY_STATUS: '/payment-gateway-status',
    PLANS: '/external/plans',
  }
};
