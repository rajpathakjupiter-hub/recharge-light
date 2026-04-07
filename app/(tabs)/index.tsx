import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Animated, useWindowDimensions, Image, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const isSmallDevice = width < 360;
  const isMediumDevice = width >= 360 && width < 400;
  
  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  const [balance, setBalance] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const quickAction1 = useRef(new Animated.Value(0)).current;
  const quickAction2 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

    Animated.stagger(80, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }),
      Animated.parallel([
        Animated.spring(balanceAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      ]),
      Animated.spring(quickAction1, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
      Animated.spring(quickAction2, { toValue: 1, useNativeDriver: true, tension: 60, friction: 9 }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
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

  // Dynamic styles based on screen size
  const dynamicStyles = {
    headerLogo: { width: isSmallDevice ? 40 : 50, height: isSmallDevice ? 40 : 50 },
    userName: { fontSize: isSmallDevice ? 16 : 20 },
    balanceAmount: { fontSize: isSmallDevice ? 28 : isMediumDevice ? 34 : 42 },
    actionIcon: { width: isSmallDevice ? 50 : 70, height: isSmallDevice ? 50 : 70, borderRadius: isSmallDevice ? 16 : 22 },
    actionIconSize: isSmallDevice ? 24 : 32,
    actionCard: { padding: isSmallDevice ? 16 : 24, borderRadius: isSmallDevice ? 18 : 24 },
    actionText: { fontSize: isSmallDevice ? 14 : 18 },
    addMoneyBtn: { paddingVertical: isSmallDevice ? 10 : 14, paddingHorizontal: isSmallDevice ? 16 : 24 },
    historyBtn: { paddingVertical: isSmallDevice ? 10 : 14, paddingHorizontal: isSmallDevice ? 12 : 20 },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'ios' ? 100 : 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      >
        {/* Header with Logo */}
        <Animated.View style={[styles.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        }]}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/images/rechargelight-logo.png')} style={[styles.headerLogo, dynamicStyles.headerLogo]} resizeMode="contain" />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.greeting}>{getGreeting()} 👋</Text>
              <Text style={[styles.userName, { fontSize: dynamicStyles.userName.fontSize }]} numberOfLines={1}>{userName}</Text>
            </View>
          </View>
          <Image source={require('../../assets/images/rechargelight-logo.png')} style={styles.headerBrandLogo} resizeMode="contain" />
        </Animated.View>

        {/* Balance Card - Orange Theme */}
        <Animated.View style={{ opacity: balanceAnim, transform: [{ scale: cardScale }] }}>
          <LinearGradient colors={['#F97316', '#EA580C', '#C2410C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.balanceTop}>
              <View style={styles.balanceIconContainer}>
                <Ionicons name="wallet" size={isSmallDevice ? 18 : 22} color="#fff" />
              </View>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
            </View>
            <Text style={[styles.balanceAmount, { fontSize: dynamicStyles.balanceAmount.fontSize }]}>₹{balance.toFixed(2)}</Text>
            <View style={styles.balanceActions}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }], flex: 1 }}>
                <TouchableOpacity style={[styles.addMoneyButton, dynamicStyles.addMoneyBtn]} onPress={() => router.push('/add-money')} activeOpacity={0.8}>
                  <Ionicons name="add-circle" size={isSmallDevice ? 16 : 20} color="#F97316" />
                  <Text style={[styles.addMoneyText, { fontSize: isSmallDevice ? 12 : 15 }]}>Add Money</Text>
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity style={[styles.historyButton, dynamicStyles.historyBtn]} onPress={() => router.push('/(tabs)/history')} activeOpacity={0.8}>
                <Ionicons name="time-outline" size={isSmallDevice ? 14 : 18} color="#fff" />
                <Text style={[styles.historyButtonText, { fontSize: isSmallDevice ? 11 : 14 }]}>History</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Services - Only Mobile & DTH */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { fontSize: isSmallDevice ? 16 : 20 }]}>Recharge Services</Text>
            <Ionicons name="flash" size={isSmallDevice ? 14 : 18} color="#F97316" />
          </View>
          <View style={styles.quickActions}>
            <Animated.View style={[styles.actionCardWrapper, {
              opacity: quickAction1,
              transform: [{ translateX: quickAction1.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }],
            }]}>
              <TouchableOpacity style={[styles.actionCard, dynamicStyles.actionCard]} onPress={() => handleRecharge('prepaid')} activeOpacity={0.7}>
                <LinearGradient colors={['#F97316', '#EA580C']} style={[styles.actionIconGradient, dynamicStyles.actionIcon]}>
                  <Ionicons name="phone-portrait" size={dynamicStyles.actionIconSize} color="#fff" />
                </LinearGradient>
                <Text style={[styles.actionText, { fontSize: dynamicStyles.actionText.fontSize }]}>Mobile</Text>
                <Text style={[styles.actionSubtext, { fontSize: isSmallDevice ? 11 : 13 }]}>Prepaid Recharge</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[styles.actionCardWrapper, {
              opacity: quickAction2,
              transform: [{ translateX: quickAction2.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
            }]}>
              <TouchableOpacity style={[styles.actionCard, dynamicStyles.actionCard]} onPress={() => handleRecharge('dth')} activeOpacity={0.7}>
                <LinearGradient colors={['#F97316', '#EA580C']} style={[styles.actionIconGradient, dynamicStyles.actionIcon]}>
                  <Ionicons name="tv" size={dynamicStyles.actionIconSize} color="#fff" />
                </LinearGradient>
                <Text style={[styles.actionText, { fontSize: dynamicStyles.actionText.fontSize }]}>DTH</Text>
                <Text style={[styles.actionSubtext, { fontSize: isSmallDevice ? 11 : 13 }]}>TV Recharge</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Recharge Light Branding */}
        <View style={styles.brandingSection}>
          <Image source={require('../../assets/images/rechargelight-logo.png')} style={styles.brandingLogo} resizeMode="contain" />
          <Text style={styles.brandingText}>Recharge Light</Text>
          <Text style={styles.brandingSubtext}>Fast • Secure • Reliable</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerLogo: { borderRadius: 14 },
  greeting: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  userName: { fontWeight: 'bold', color: '#1e293b' },
  headerBrandLogo: { width: 40, height: 40, borderRadius: 12 },
  balanceCard: { borderRadius: 24, padding: 20, marginBottom: 20, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', top: -50, right: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)' },
  decorCircle2: { position: 'absolute', bottom: -40, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  balanceIconContainer: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  balanceAmount: { fontWeight: '900', color: '#fff', marginBottom: 16, letterSpacing: 0.5 },
  balanceActions: { flexDirection: 'row', gap: 10 },
  addMoneyButton: { backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 },
  addMoneyText: { fontWeight: '800', color: '#F97316' },
  historyButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  historyButtonText: { fontWeight: '700', color: '#fff' },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontWeight: '800', color: '#1e293b' },
  quickActions: { flexDirection: 'row', gap: 12 },
  actionCardWrapper: { flex: 1 },
  actionCard: { backgroundColor: '#fff', alignItems: 'center', elevation: 4, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
  actionIconGradient: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionText: { fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  actionSubtext: { color: '#94a3b8', fontWeight: '500' },
  brandingSection: { alignItems: 'center', marginTop: 16, paddingVertical: 20 },
  brandingLogo: { width: 50, height: 50, borderRadius: 14, marginBottom: 8 },
  brandingText: { fontSize: 18, fontWeight: '900', color: '#F97316' },
  brandingSubtext: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
});
