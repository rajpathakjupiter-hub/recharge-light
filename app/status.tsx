import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  useWindowDimensions,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Audio } from 'expo-av';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function StatusScreen() {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 360;

  const params = useLocalSearchParams<{
    orderId: string;
    amount: string;
    mobile: string;
    type: string;
    initialStatus?: string;
    errorMessage?: string;
  }>();

  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>(
    params.initialStatus === 'success' ? 'success' : 
    params.initialStatus === 'failed' ? 'failed' : 'pending'
  );
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(params.errorMessage || '');
  const [operatorRef, setOperatorRef] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const soundRef = useRef<Audio.Sound | null>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef([...Array(8)].map(() => new Animated.Value(0))).current;
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getApiKey = async () => {
    return await AsyncStorage.getItem('api_key') || '';
  };

  // Play sound based on status
  const playSound = async (type: 'success' | 'failed') => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        type === 'success' 
          ? require('../assets/sounds/success.mp3')
          : require('../assets/sounds/failed.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.log('Sound error:', error);
      // Fallback to vibration if sound fails
      Vibration.vibrate(type === 'success' ? [0, 100, 50, 100] : [0, 300]);
    }
  };

  useEffect(() => {
    // Start checking status
    checkIntervalRef.current = setInterval(() => { checkStatus(); }, 3000);
    checkStatus();
    
    // Pulse animation for pending
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Rotate animation for pending
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    return () => { 
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (status !== 'pending') {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      
      // Play sound and vibrate
      playSound(status);
      Vibration.vibrate(status === 'success' ? [0, 100, 50, 100] : [0, 200, 100, 200]);
      
      // Animate icon
      Animated.spring(scaleAnim, { 
        toValue: 1, 
        useNativeDriver: true, 
        tension: 50, 
        friction: 5,
        velocity: 10
      }).start();
      
      // Fade in content
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 400, 
        useNativeDriver: true 
      }).start();
      
      // Slide up card
      Animated.spring(slideAnim, { 
        toValue: 0, 
        useNativeDriver: true,
        tension: 40,
        friction: 8
      }).start();

      // Confetti animation for success
      if (status === 'success') {
        confettiAnim.forEach((anim, i) => {
          Animated.sequence([
            Animated.delay(i * 50),
            Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 40, friction: 5 })
          ]).start();
        });
      }
    }
  }, [status]);

  const checkStatus = async () => {
    if (!params.orderId || status !== 'pending') return;
    setChecking(true);
    try {
      const apiKey = await getApiKey();
      const res = await axios.get(`${BACKEND_URL}/api/external/status?api_key=${apiKey}&order_id=${params.orderId}`);
      console.log('Status response:', res.data);
      
      const st = (res.data.status || '').toLowerCase();
      
      if (st === 'success' || st === 'completed' || st === 'done') { 
        setStatus('success'); 
        setMessage(res.data.message || 'Recharge completed successfully!'); 
        setOperatorRef(res.data.operator_ref || '');
        setTransactionId(res.data.transaction_id || res.data.order_id || '');
      }
      else if (st === 'failed' || st === 'failure' || st === 'error') { 
        setStatus('failed'); 
        setMessage(res.data.message || res.data.remark || 'Recharge could not be processed'); 
      }
      // If status is pending/processing, keep checking
    } catch (e: any) { 
      console.log('Status check error:', e);
      // If order not found, might be using wrong order_id format
      if (e.response?.status === 404 || e.response?.data?.status === 'not_found') {
        // Don't change status, keep pending
        console.log('Order not found, retrying...');
      }
    }
    setChecking(false);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const renderConfetti = () => {
    if (status !== 'success') return null;
    const colors = ['#F97316', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444'];
    return confettiAnim.map((anim, i) => (
      <Animated.View
        key={i}
        style={[
          styles.confetti,
          {
            backgroundColor: colors[i],
            left: `${10 + i * 12}%`,
            transform: [
              { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-50, -150 - Math.random() * 100] }) },
              { scale: anim },
              { rotate: `${i * 45}deg` }
            ],
            opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0.8] })
          }
        ]}
      />
    ));
  };

  const StatusIcon = () => {
    if (status === 'pending') {
      return (
        <Animated.View style={[styles.pendingIcon, { transform: [{ scale: pulseAnim }, { rotate: spin }] }]}>
          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.iconGradient}>
            <Ionicons name="time" size={isSmallDevice ? 50 : 60} color="#fff" />
          </LinearGradient>
        </Animated.View>
      );
    }
    
    if (status === 'success') {
      return (
        <Animated.View style={[styles.successIcon, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.iconGradient}>
            <Ionicons name="checkmark" size={isSmallDevice ? 60 : 80} color="#fff" />
          </LinearGradient>
        </Animated.View>
      );
    }
    
    return (
      <Animated.View style={[styles.failedIcon, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.iconGradient}>
          <Ionicons name="close" size={isSmallDevice ? 60 : 80} color="#fff" />
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient based on status */}
      <LinearGradient
        colors={
          status === 'success' ? ['#f0fdf4', '#dcfce7', '#FFF7ED'] :
          status === 'failed' ? ['#fef2f2', '#fee2e2', '#FFF7ED'] :
          ['#fffbeb', '#fef3c7', '#FFF7ED']
        }
        style={StyleSheet.absoluteFill}
      />
      
      {/* Confetti for success */}
      {renderConfetti()}

      <View style={styles.content}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <StatusIcon />
          {status !== 'pending' && (
            <Animated.View style={[styles.ringOuter, { 
              borderColor: status === 'success' ? '#22c55e' : '#ef4444',
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }]
            }]} />
          )}
        </View>

        {/* Title */}
        <Animated.Text style={[
          styles.title, 
          { fontSize: isSmallDevice ? 20 : 26 },
          status === 'success' && { color: '#16a34a' },
          status === 'failed' && { color: '#dc2626' },
          status !== 'pending' && { opacity: fadeAnim }
        ]}>
          {status === 'success' ? 'Recharge Successful!' : 
           status === 'failed' ? 'Recharge Failed' : 
           'Processing Recharge...'}
        </Animated.Text>

        {/* Message */}
        {message ? (
          <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>{message}</Animated.Text>
        ) : status === 'pending' ? (
          <Text style={styles.message}>Please wait while we process your recharge</Text>
        ) : null}

        {/* Details Card */}
        <Animated.View style={[
          styles.card, 
          { transform: [{ translateY: status !== 'pending' ? slideAnim : 0 }] }
        ]}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt" size={18} color="#F97316" />
            <Text style={styles.cardHeaderText}>Transaction Details</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <Text style={[styles.value, { color: '#F97316', fontSize: isSmallDevice ? 18 : 22 }]}>₹{params.amount}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>{params.type === 'dth' ? 'Subscriber ID' : 'Mobile Number'}</Text>
            <Text style={styles.value}>{params.mobile}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Order ID</Text>
            <Text style={styles.smallValue}>{params.orderId}</Text>
          </View>

          {transactionId ? (
            <View style={styles.row}>
              <Text style={styles.label}>Transaction ID</Text>
              <Text style={styles.smallValue}>{transactionId}</Text>
            </View>
          ) : null}

          {operatorRef ? (
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Operator Ref</Text>
              <Text style={styles.smallValue}>{operatorRef}</Text>
            </View>
          ) : null}

          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            status === 'success' && { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
            status === 'failed' && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
            status === 'pending' && { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
          ]}>
            <Ionicons 
              name={status === 'success' ? 'checkmark-circle' : status === 'failed' ? 'close-circle' : 'time'} 
              size={16} 
              color={status === 'success' ? '#22c55e' : status === 'failed' ? '#ef4444' : '#f59e0b'} 
            />
            <Text style={[
              styles.statusText,
              status === 'success' && { color: '#22c55e' },
              status === 'failed' && { color: '#ef4444' },
              status === 'pending' && { color: '#f59e0b' },
            ]}>
              {status === 'success' ? 'Completed' : status === 'failed' ? 'Failed' : 'Processing'}
            </Text>
          </View>
        </Animated.View>

        {/* Check Status Button (Pending) */}
        {status === 'pending' && (
          <TouchableOpacity style={styles.checkBtn} onPress={checkStatus} disabled={checking}>
            {checking ? (
              <ActivityIndicator color="#F97316" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#F97316" />
                <Text style={styles.checkText}>Refresh Status</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.buttons}>
          {status === 'failed' && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color="#F97316" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.homeBtn, status !== 'failed' && { flex: 1 }]} 
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#F97316', '#EA580C']} style={styles.homeBtnGradient}>
              <Ionicons name="home" size={18} color="#fff" />
              <Text style={styles.homeText}>Go to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* New Recharge Button (Success) */}
        {status === 'success' && (
          <TouchableOpacity style={styles.newRechargeBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="flash" size={16} color="#F97316" />
            <Text style={styles.newRechargeText}>New Recharge</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  iconContainer: { marginBottom: 24, alignItems: 'center', justifyContent: 'center' },
  pendingIcon: { },
  successIcon: { },
  failedIcon: { },
  iconGradient: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    alignItems: 'center', 
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  ringOuter: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
  },
  confetti: {
    position: 'absolute',
    top: '30%',
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  title: { 
    fontWeight: '900', 
    color: '#1e293b', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  message: { 
    fontSize: 14, 
    color: '#64748b', 
    marginBottom: 20, 
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    padding: 20, 
    width: '100%', 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDBA74',
    ...Platform.select({
      ios: { shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  label: { fontSize: 13, color: '#64748b' },
  value: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  smallValue: { 
    fontSize: 11, 
    color: '#64748b', 
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxWidth: 180,
    textAlign: 'right',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
  },
  checkText: { fontSize: 14, fontWeight: '700', color: '#F97316' },
  buttons: { flexDirection: 'row', gap: 12, width: '100%' },
  retryBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    paddingVertical: 16, 
    borderWidth: 2, 
    borderColor: '#F97316' 
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#F97316' },
  homeBtn: { 
    flex: 1, 
    borderRadius: 16, 
    overflow: 'hidden',
  },
  homeBtnGradient: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 16,
  },
  homeText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  newRechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  newRechargeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
});
