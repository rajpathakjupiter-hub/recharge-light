import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Conditional WebView import - only for native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.log('WebView not available on this platform');
  }
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function PaymentStatusScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    amount: string;
    paymentUrl: string;
  }>();

  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [showWebView, setShowWebView] = useState(true);
  const [checking, setChecking] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  useEffect(() => {
    // Start status checking
    checkIntervalRef.current = setInterval(() => {
      checkPaymentStatus();
    }, 3000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // When status changes from pending
    if (status !== 'pending') {
      // Stop checking
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      // Hide WebView
      setShowWebView(false);
      // Play sound
      playStatusSound(status);
      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [status]);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playStatusSound = async (currentStatus: string) => {
    try {
      let soundUri = '';
      
      if (currentStatus === 'success') {
        soundUri = 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3';
      } else if (currentStatus === 'failed') {
        soundUri = 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3';
      } else {
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { shouldPlay: true }
      );
      setSound(newSound);
    } catch (error) {
      console.log('Sound playback error:', error);
    }
  };

  const checkPaymentStatus = async () => {
    if (!params.orderId || status !== 'pending') return;

    setChecking(true);
    try {
      const apiKey = await getApiKey();
      const url = BACKEND_URL + '/api/external/payment/status?api_key=' + apiKey + '&order_id=' + params.orderId;
      const response = await axios.get(url);

      const paymentStatus = response.data.payment_status?.toLowerCase();
      if (paymentStatus === 'success') {
        setStatus('success');
      } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
        setStatus('failed');
      }
    } catch (error) {
      console.error('Check payment status error:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleCloseWebView = () => {
    setShowWebView(false);
  };

  const handleOpenPaymentUrl = async () => {
    if (Platform.OS === 'web') {
      // Web pe new tab mein open karo
      if (params.paymentUrl) {
        window.open(params.paymentUrl, '_blank');
      }
    } else {
      // Mobile pe WebView dikhao
      setShowWebView(true);
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: '#22c55e',
          title: 'Payment Successful!',
          subtitle: 'Money added to your wallet',
          bgColor: 'rgba(34, 197, 94, 0.12)',
        };
      case 'failed':
        return {
          icon: 'close-circle',
          color: '#ef4444',
          title: 'Payment Failed',
          subtitle: 'Please try again',
          bgColor: 'rgba(239, 68, 68, 0.12)',
        };
      default:
        return {
          icon: 'time',
          color: '#f59e0b',
          title: 'Processing Payment',
          subtitle: 'Please complete payment',
          bgColor: 'rgba(245, 158, 11, 0.12)',
        };
    }
  };

  const config = getStatusConfig();

  // Web platform pe auto-redirect payment URL
  useEffect(() => {
    if (Platform.OS === 'web' && params.paymentUrl && showWebView && status === 'pending') {
      // Web pe payment URL open karo new tab mein
      window.open(params.paymentUrl, '_blank');
      // Aur WebView hide kar do
      setShowWebView(false);
    }
  }, [params.paymentUrl, showWebView, status]);

  // Show WebView when pending (Only for Native platforms)
  if (Platform.OS !== 'web' && WebView && showWebView && status === 'pending' && params.paymentUrl) {
    return (
      <SafeAreaView style={styles.container}>
        {/* WebView Header */}
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={handleCloseWebView} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Complete Payment</Text>
          <View style={styles.statusIndicator}>
            {checking && <ActivityIndicator size="small" color="#2E8B2B" />}
          </View>
        </View>

        {/* Amount Info */}
        <View style={styles.amountBar}>
          <Text style={styles.amountBarText}>Amount: ₹{params.amount}</Text>
        </View>

        {/* WebView */}
        <WebView
          source={{ uri: params.paymentUrl }}
          style={styles.webView}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color="#2E8B2B" />
              <Text style={styles.loadingText}>Loading payment page...</Text>
            </View>
          )}
        />

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCloseWebView}
          >
            <Text style={styles.cancelButtonText}>Cancel Payment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show Status Screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Status Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: config.bgColor },
            { transform: [{ scale: status === 'pending' ? 1 : scaleAnim }] },
          ]}
        >
          {status === 'pending' ? (
            <ActivityIndicator size={60} color={config.color} />
          ) : (
            <Ionicons name={config.icon as any} size={80} color={config.color} />
          )}
        </Animated.View>

        {/* Status Title */}
        <Text style={styles.statusTitle}>{config.title}</Text>
        <Text style={styles.statusSubtitle}>{config.subtitle}</Text>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>₹{params.amount}</Text>
          {params.orderId && (
            <Text style={styles.orderId}>Order: {params.orderId}</Text>
          )}
        </View>

        {/* Pending Actions */}
        {status === 'pending' && (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={styles.openWebViewButton}
              onPress={handleOpenPaymentUrl}
            >
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={styles.openWebViewText}>
                {Platform.OS === 'web' ? 'Open Payment (New Tab)' : 'Open Payment Page'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkButton}
              onPress={checkPaymentStatus}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color="#2E8B2B" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color="#2E8B2B" />
                  <Text style={styles.checkButtonText}>Check Status</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {status === 'failed' && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Ionicons name="refresh" size={20} color="#2E8B2B" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.homeButton, status !== 'failed' && { flex: 1 }]}
            onPress={() => router.replace('/(tabs)/wallet')}
          >
            <Ionicons name="wallet" size={20} color="#fff" />
            <Text style={styles.homeButtonText}>Go to Wallet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  // WebView Styles
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f7fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  statusIndicator: {
    width: 40,
    alignItems: 'center',
  },
  amountBar: {
    backgroundColor: '#2E8B2B',
    paddingVertical: 8,
    alignItems: 'center',
  },
  amountBarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  // Status Screen Styles
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  orderId: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  pendingActions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  openWebViewButton: {
    backgroundColor: '#2E8B2B',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openWebViewText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  checkButtonText: {
    fontSize: 14,
    color: '#2E8B2B',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#2E8B2B',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E8B2B',
  },
  homeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E8B2B',
    borderRadius: 12,
    paddingVertical: 16,
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
