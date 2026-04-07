import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Create axios instance with optimized settings
const apiClient: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request queue for offline support
interface QueuedRequest {
  id: string;
  url: string;
  params: any;
  timestamp: number;
}

let requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;

// Get API key with caching
let cachedApiKey: string | null = null;
let apiKeyTimestamp = 0;
const API_KEY_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getApiKey = async (): Promise<string> => {
  const now = Date.now();
  if (cachedApiKey && (now - apiKeyTimestamp) < API_KEY_CACHE_DURATION) {
    return cachedApiKey;
  }
  cachedApiKey = await AsyncStorage.getItem('api_key') || '';
  apiKeyTimestamp = now;
  return cachedApiKey;
};

export const clearApiKeyCache = () => {
  cachedApiKey = null;
  apiKeyTimestamp = 0;
};

// Check network connectivity
export const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true && netInfo.isInternetReachable === true;
  } catch {
    return true; // Assume connected if check fails
  }
};

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper with exponential backoff
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (i === retries - 1) break;
      
      // Exponential backoff
      await sleep(delay * Math.pow(2, i));
    }
  }
  
  throw lastError;
};

// Generate unique request ID
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryable?: boolean;
}

export interface RechargeResponse {
  number: string;
  status: string;
  amount: string;
  order_id: string;
  operator_id?: string;
  transaction_id?: string;
  remark?: string;
  message?: string;
  commission: number;
  balance: number;
}

export interface BalanceResponse {
  balance: number;
  total_balance?: number;
  hold_amount?: number;
}

export interface StatusResponse {
  status: string;
  order_id: string;
  transaction_id?: string;
  operator_ref?: string;
  message?: string;
  amount?: number;
}

export interface OperatorsResponse {
  prepaid: Array<{ code: string; name: string; commission: number }>;
  dth: Array<{ code: string; name: string; commission: number }>;
}

// ============ API FUNCTIONS ============

// Recharge API - Most critical, needs extra protection
export const doRecharge = async (
  mobileNumber: string,
  operatorCode: string,
  amount: number,
  requestOrderId?: string
): Promise<ApiResponse<RechargeResponse>> => {
  const networkAvailable = await isNetworkAvailable();
  if (!networkAvailable) {
    return { success: false, error: 'No internet connection', retryable: true };
  }

  try {
    const apiKey = await getApiKey();
    const orderId = requestOrderId || `ORD${Date.now()}${Math.random().toString(36).substr(2, 4)}`;
    
    const response = await withRetry(async () => {
      return apiClient.get('/api/external/recharge', {
        params: {
          api_key: apiKey,
          mobile_number: mobileNumber,
          operator_code: operatorCode,
          amount: amount,
          request_order_id: orderId,
        },
      });
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Recharge API Error:', error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.remark || error.message || 'Recharge failed',
      data: error.response?.data,
      retryable: !error.response || error.response.status >= 500,
    };
  }
};

// Check recharge status
export const checkStatus = async (orderId: string): Promise<ApiResponse<StatusResponse>> => {
  try {
    const apiKey = await getApiKey();
    
    const response = await withRetry(async () => {
      return apiClient.get('/api/external/status', {
        params: {
          api_key: apiKey,
          order_id: orderId,
        },
      });
    }, 2); // Less retries for status check

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Status API Error:', error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Status check failed',
      retryable: true,
    };
  }
};

// Get balance
export const getBalance = async (): Promise<ApiResponse<BalanceResponse>> => {
  try {
    const apiKey = await getApiKey();
    
    const response = await withRetry(async () => {
      return apiClient.get('/api/external/balance', {
        params: { api_key: apiKey },
      });
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Balance API Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to fetch balance',
      retryable: true,
    };
  }
};

// Get operators
export const getOperators = async (): Promise<ApiResponse<OperatorsResponse>> => {
  try {
    const apiKey = await getApiKey();
    
    const response = await withRetry(async () => {
      return apiClient.get('/api/external/operators', {
        params: { api_key: apiKey },
      });
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Operators API Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to fetch operators',
      retryable: true,
    };
  }
};

// Get plans
export const getPlans = async (operator: string, circle: string): Promise<ApiResponse<any>> => {
  try {
    const apiKey = await getApiKey();
    
    const response = await withRetry(async () => {
      return apiClient.get('/api/external/plans', {
        params: {
          api_key: apiKey,
          operator: operator,
          circle: circle,
        },
      });
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Plans API Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to fetch plans',
      retryable: true,
    };
  }
};

// Get transaction history
export const getTransactions = async (
  type: 'mobile' | 'dth' = 'mobile',
  limit: number = 50
): Promise<ApiResponse<any>> => {
  try {
    const apiKey = await getApiKey();
    
    const response = await withRetry(async () => {
      return apiClient.get('/api/external/transactions', {
        params: {
          api_key: apiKey,
          type: type,
          limit: limit,
        },
      });
    });

    return { success: true, data: response.data };
  } catch (error: any) {
    // Fallback to recharge history
    try {
      const apiKey = await getApiKey();
      const fallbackResponse = await apiClient.get('/api/external/recharge/history', {
        params: { api_key: apiKey, limit: limit },
      });
      return { success: true, data: fallbackResponse.data };
    } catch {
      console.error('Transactions API Error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to fetch transactions',
        retryable: true,
      };
    }
  }
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility - for preventing rapid repeated calls
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Request deduplication - prevent same request within time window
const recentRequests = new Map<string, number>();
const DEDUP_WINDOW = 5000; // 5 seconds

export const isDuplicateRequest = (key: string): boolean => {
  const now = Date.now();
  const lastRequest = recentRequests.get(key);
  
  if (lastRequest && (now - lastRequest) < DEDUP_WINDOW) {
    return true;
  }
  
  recentRequests.set(key, now);
  
  // Cleanup old entries
  if (recentRequests.size > 100) {
    for (const [k, v] of recentRequests) {
      if (now - v > DEDUP_WINDOW) {
        recentRequests.delete(k);
      }
    }
  }
  
  return false;
};

export default apiClient;
