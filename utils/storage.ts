import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage wrapper that works on both web and mobile
const isWeb = Platform.OS === 'web';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb && typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb && typeof window !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  
  async removeItem(key: string): Promise<void> {
    if (isWeb && typeof window !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  },
  
  async clear(): Promise<void> {
    if (isWeb && typeof window !== 'undefined') {
      localStorage.clear();
      return;
    }
    return AsyncStorage.clear();
  }
};

export default storage;
