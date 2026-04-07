import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Animated, Dimensions, Image, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  const [balance, setBalance] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const headerAnim = useRef(new Animated.Value(0)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const quickAction1 = useRef(new Animated.Value(0)).current;
  const quickAction2 = useRef(new Animated.Value(0)).current;
  const servicesAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    try {
      const apiKey = await getApiKey();
      const balanceRes = await axios.get(`${BACKEND_URL}/api/external/balance?api_key=${apiKey}`);
      if (balanceRes.data.balance !== undefined) {
        setBalance(balanceRes.data.balance);
      }
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name || 'User');
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.clear();
        router.replace('/login');
      }
    }
  };

  const startAnimations = () => {
    headerAnim.setValue(0);
    balanceAnim.setValue(0);
    cardScale.setValue(0.9);
    quickAction1.setValue(0);
    quickAction2.setValue(0);
    servicesAnim.setValue(0);

    Animated.stagger(80, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.parallel([
        Animated.spring(balanceAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      ]),
      Animated.spring(quickAction1, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.spring(quickAction2, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.spring(servicesAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 10 }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // Shimmer animation
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();
  };

  useFocusEffect(useCallback(() => { fetchData(); startAnimations(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    startAnimations();
  };

  const handleRecharge = (type: 'prepaid' | 'dth') => {
    router.push({ pathname: '/recharge', params: { type } });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E8B2B" />}
      >
        {/* Header */}
        <Animated.View style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifButton}>
              <Ionicons name="notifications-outline" size={22} color="#1a1a2e" />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View style={{ opacity: balanceAnim, transform: [{ scale: cardScale }] }}>
          <LinearGradient colors={['#2E8B2B', '#e67e4a', '#d4723e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.balanceTop}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="wallet" size={20} color="#fff" />
              </View>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
            <View style={styles.balanceActions}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity style={styles.addMoneyButton} onPress={() => router.push('/add-money')} activeOpacity={0.8}>
                  <Ionicons name="add-circle" size={18} color="#2E8B2B" />
                  <Text style={styles.addMoneyText}>Add Money</Text>
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={styles.historyButton} onPress={() => router.push('/(tabs)/history')} activeOpacity={0.8}>
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={styles.historyButtonText}>History</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Recharge */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Recharge</Text>
            <Ionicons name="flash" size={18} color="#2E8B2B" />
          </View>
          <View style={styles.quickActions}>
            <Animated.View style={[styles.actionCardWrapper, {
              opacity: quickAction1,
              transform: [{ translateX: quickAction1.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }],
            }]}>
              <TouchableOpacity style={styles.actionCard} onPress={() => handleRecharge('prepaid')} activeOpacity={0.7}>
                <LinearGradient colors={['#ff6b6b', '#ee5a5a']} style={styles.actionIconGradient}>
                  <Ionicons name="phone-portrait" size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionText}>Mobile</Text>
                <Text style={styles.actionSubtext}>Prepaid Recharge</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[styles.actionCardWrapper, {
              opacity: quickAction2,
              transform: [{ translateX: quickAction2.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
            }]}>
              <TouchableOpacity style={styles.actionCard} onPress={() => handleRecharge('dth')} activeOpacity={0.7}>
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.actionIconGradient}>
                  <Ionicons name="tv" size={28} color="#fff" />
                </LinearGradient>
                <Text style={styles.actionText}>DTH</Text>
                <Text style={styles.actionSubtext}>TV Recharge</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Services Grid */}
        <Animated.View style={[styles.section, {
          opacity: servicesAnim,
          transform: [{ translateY: servicesAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.servicesGrid}>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(tabs)/wallet')}>
              <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.serviceIcon}>
                <Ionicons name="wallet-outline" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.serviceText}>Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(tabs)/margin')}>
              <LinearGradient colors={['#a855f7', '#9333ea']} style={styles.serviceIcon}>
                <Ionicons name="trending-up-outline" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.serviceText}>Margin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(tabs)/history')}>
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.serviceIcon}>
                <Ionicons name="receipt-outline" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.serviceText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(tabs)/profile')}>
              <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.serviceIcon}>
                <Ionicons name="person-outline" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.serviceText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, color: '#888', marginBottom: 2 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  notifDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' },
  balanceCard: { borderRadius: 24, padding: 24, marginBottom: 24, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' },
  decorCircle2: { position: 'absolute', bottom: -30, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  balanceIconContainer: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  balanceAmount: { fontSize: 38, fontWeight: 'bold', color: '#fff', marginBottom: 20, letterSpacing: 0.5 },
  balanceActions: { flexDirection: 'row', gap: 12 },
  addMoneyButton: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addMoneyText: { fontSize: 14, fontWeight: '700', color: '#2E8B2B' },
  historyButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  historyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  quickActions: { flexDirection: 'row', gap: 14 },
  actionCardWrapper: { flex: 1 },
  actionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 4 },
  actionIconGradient: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionText: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  actionSubtext: { fontSize: 12, color: '#888' },
  servicesGrid: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 3 },
  serviceItem: { flex: 1, alignItems: 'center', gap: 8 },
  serviceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  serviceText: { fontSize: 12, fontWeight: '600', color: '#666', textAlign: 'center' },
});
