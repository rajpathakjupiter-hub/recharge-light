import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, BackHandler, Alert } from 'react-native';
import { OneSignal, LogLevel } from 'react-native-onesignal';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PermissionDisclosureScreen from './components/PermissionDisclosureScreen';

const ONESIGNAL_APP_ID = '6409d9e8-cb8b-4bf0-9327-2ec4c63f7fa0';
const PERMISSION_ACCEPTED_KEY = 'permissions_accepted';

export default function RootLayout() {
  const [showPermissionScreen, setShowPermissionScreen] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const accepted = await AsyncStorage.getItem(PERMISSION_ACCEPTED_KEY);
      
      if (!accepted) {
        // Show permission disclosure screen
        setShowPermissionScreen(true);
      } else {
        // Permissions already accepted, initialize OneSignal
        initializeOneSignal();
      }
      
      setPermissionChecked(true);
    } catch (error) {
      console.log('Permission check error:', error);
      setShowPermissionScreen(true);
      setPermissionChecked(true);
    }
  };

  const initializeOneSignal = () => {
    if (Platform.OS === 'web') return;
    
    // Set log level (remove Verbose in production build)
    OneSignal.Debug.setLogLevel(LogLevel.None);
    
    // Initialize with App ID
    OneSignal.initialize(ONESIGNAL_APP_ID);
    
    // Request notification permission
    OneSignal.Notifications.requestPermission(true);
    
    // Listen for notification clicks
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('Notification clicked:', event);
    });
    
    // Check for OTA updates
    checkForUpdates();
  };

  const handleAllowPermissions = async () => {
    // Store that user accepted permissions
    await AsyncStorage.setItem(PERMISSION_ACCEPTED_KEY, 'true');
    
    // Hide permission screen
    setShowPermissionScreen(false);
    
    // Initialize OneSignal and request actual permissions
    initializeOneSignal();
  };

  const handleDenyPermissions = () => {
    // Show alert and exit app
    Alert.alert(
      'Permissions Required',
      'Pay2Hub requires these permissions to function properly. The app cannot continue without these permissions.',
      [
        {
          text: 'Exit App',
          onPress: () => {
            // Exit the app
            if (Platform.OS === 'android') {
              BackHandler.exitApp();
            }
          },
        },
        {
          text: 'Allow Permissions',
          onPress: handleAllowPermissions,
          style: 'default',
        },
      ],
      { cancelable: false }
    );
  };

  const checkForUpdates = async () => {
    if (Platform.OS === 'web') return;
    
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (e) {
      console.log('Update check failed:', e);
    }
  };

  // Don't render anything until permission check is done
  if (!permissionChecked) {
    return null;
  }

  // Show permission disclosure screen if not accepted
  if (showPermissionScreen) {
    return (
      <PermissionDisclosureScreen
        visible={true}
        onAllow={handleAllowPermissions}
        onDeny={handleDenyPermissions}
      />
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f5f7fa' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recharge" />
        <Stack.Screen name="status" />
        <Stack.Screen name="add-money" />
        <Stack.Screen name="payment-status" />
        <Stack.Screen name="giftcards" />
        <Stack.Screen name="giftcard-purchase" />
        <Stack.Screen name="giftcard-status" />
        <Stack.Screen name="giftcard-history" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="terms" />
      </Stack>
    </>
  );
}
