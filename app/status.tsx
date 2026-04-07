import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function StatusScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    status: string;
    amount: string;
    mobileNumber: string;
    operator: string;
    transactionId: string;
    commission: string;
    message: string;
  }>();

  const [status, setStatus] = useState(params.status || 'pending');
  const [transactionId, setTransactionId] = useState(params.transactionId || '');
  const [commission, setCommission] = useState(parseFloat(params.commission || '0'));
  const [message, setMessage] = useState(params.message || '');
  const [checking, setChecking] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  useEffect(() => {
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

    playStatusSound(status);

    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(() => {
        checkStatus();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, []);

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

  const checkStatus = async () => {
    if (!params.orderId) return;

    setChecking(true);
    try {
      const apiKey = await getApiKey();
      const url = BACKEND_URL + '/api/external/recharge/status?api_key=' + apiKey + '&order_id=' + params.orderId;
      const response = await axios.get(url);

      const newStatus = response.data.status;
      if (newStatus !== status) {
        setStatus(newStatus);
        setTransactionId(response.data.transaction_id || transactionId);
        setCommission(response.data.commission || commission);
        setMessage(response.data.message || message);
        playStatusSound(newStatus);
      }
    } catch (error) {
      console.error('Check status error:', error);
    } finally {
      setChecking(false);
    }
  };

  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: '#22c55e',
          title: 'Recharge Successful!',
          bgColor: 'rgba(34, 197, 94, 0.12)',
        };
      case 'failed':
        return {
          icon: 'close-circle',
          color: '#ef4444',
          title: 'Recharge Failed',
          bgColor: 'rgba(239, 68, 68, 0.12)',
        };
      case 'pending':
      case 'processing':
      default:
        return {
          icon: 'time',
          color: '#f59e0b',
          title: 'Processing...',
          bgColor: 'rgba(245, 158, 11, 0.12)',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Status Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: config.bgColor },
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {(status === 'pending' || status === 'processing') ? (
            <ActivityIndicator size={60} color={config.color} />
          ) : (
            <Ionicons name={config.icon as any} size={80} color={config.color} />
          )}
        </Animated.View>

        {/* Status Title */}
        <Animated.Text style={[styles.statusTitle, { opacity: fadeAnim }]}>
          {config.title}
        </Animated.Text>

        {message && (
          <Text style={styles.message}>{message}</Text>
        )}

        {/* Transaction Details */}
        <Animated.View style={[styles.detailsCard, { opacity: fadeAnim }]}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>₹{params.amount}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Number</Text>
            <Text style={styles.detailValue}>{params.mobileNumber}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Operator</Text>
            <Text style={styles.detailValue}>{params.operator}</Text>
          </View>

          {transactionId && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction ID</Text>
                <Text style={[styles.detailValue, styles.transactionId]}>
                  {transactionId}
                </Text>
              </View>
            </>
          )}

          {params.orderId && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={[styles.detailValue, styles.transactionId]}>
                  {params.orderId}
                </Text>
              </View>
            </>
          )}

          {/* Show commission only for successful recharge */}
          {status === 'success' && commission > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.commissionRow}>
                <View style={styles.commissionIcon}>
                  <Ionicons name="gift" size={20} color="#22c55e" />
                </View>
                <View style={styles.commissionContent}>
                  <Text style={styles.commissionLabel}>Your Margin Earned</Text>
                  <Text style={styles.commissionValue}>+₹{commission.toFixed(2)}</Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>

        {/* Check Status Button (for pending) */}
        {(status === 'pending' || status === 'processing') && (
          <TouchableOpacity
            style={styles.checkButton}
            onPress={checkStatus}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#2E8B2B" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#2E8B2B" />
                <Text style={styles.checkButtonText}>Refresh Status</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(tabs)/history')}
          >
            <Ionicons name="receipt" size={20} color="#2E8B2B" />
            <Text style={styles.secondaryButtonText}>View History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Go Home</Text>
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
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  transactionId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    marginHorizontal: -20,
    marginBottom: -20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  commissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commissionContent: {
    flex: 1,
  },
  commissionLabel: {
    fontSize: 12,
    color: '#22c55e',
  },
  commissionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
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
  secondaryButton: {
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
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E8B2B',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2E8B2B',
    borderRadius: 12,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
