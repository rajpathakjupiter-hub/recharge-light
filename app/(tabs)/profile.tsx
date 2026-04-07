import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SUPPORT_EMAIL = 'support@rechargelight.in';
const SUPPORT_PHONE = '9876543210';
const DELETE_ACCOUNT_URL = 'https://rechargelight.in/delete-account';

export default function ProfileScreen() {
  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const apiKey = await getApiKey();
      const url = BACKEND_URL + '/api/external/balance?api_key=' + apiKey;
      const response = await axios.get(url);

      if (response.data) {
        const newBalance = response.data.balance || response.data.total_balance || 0;
        setUserData((prev: any) => ({ ...prev, wallet_balance: newBalance }));
        const storedData = await AsyncStorage.getItem('user_data');
        if (storedData) {
          const user = JSON.parse(storedData);
          user.wallet_balance = newBalance;
          await AsyncStorage.setItem('user_data', JSON.stringify(user));
        }
      }
    } catch (error) {
      console.error('Fetch balance error:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('user_data');
      if (data) {
        const user = JSON.parse(data);
        setUserData(user);
      }
    } catch (error) {
      console.error('Load user data error:', error);
    }
  };

  useEffect(() => { loadUserData(); }, []);
  useFocusEffect(useCallback(() => { loadUserData(); fetchBalance(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await fetchBalance();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: performLogout },
    ]);
  };

  const performLogout = async () => {
    try {
      await AsyncStorage.clear();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => Linking.openURL(DELETE_ACCOUNT_URL) },
      ]
    );
  };

  const MenuItem = ({ icon, title, subtitle, onPress, iconColor = '#10b981', iconBg = 'rgba(249,115,22,0.12)', danger = false }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? 'rgba(239,68,68,0.12)' : iconBg }]}>
        <Ionicons name={icon} size={20} color={danger ? '#ef4444' : iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, danger && { color: '#ef4444' }]}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ddd" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />}
      >
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image source={require('../../assets/images/rechargelight-logo.png')} style={styles.avatar} resizeMode="cover" />
          <Text style={styles.userName}>{userData?.name || 'User'}</Text>
          <Text style={styles.userMobile}>+91 {userData?.mobile}</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <TouchableOpacity style={styles.balanceContent} onPress={fetchBalance} activeOpacity={0.7}>
            <View style={styles.balanceIconRow}>
              <Ionicons name="wallet" size={26} color="#10b981" />
              {balanceLoading && <ActivityIndicator size="small" color="#10b981" style={{marginLeft: 8}} />}
            </View>
            <Text style={styles.balanceValue}>₹{userData?.wallet_balance?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.balanceLabel}>Wallet Balance (Tap to refresh)</Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="call-outline"
              title="Call Support"
              subtitle={SUPPORT_PHONE}
              onPress={handleCall}
              iconColor="#22c55e"
              iconBg="rgba(34,197,94,0.12)"
            />
            <MenuItem
              icon="mail-outline"
              title="Email Support"
              subtitle={SUPPORT_EMAIL}
              onPress={handleEmail}
              iconColor="#3b82f6"
              iconBg="rgba(59,130,246,0.12)"
            />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="document-text-outline"
              title="Terms & Conditions"
              onPress={() => router.push('/terms')}
              iconColor="#a855f7"
              iconBg="rgba(168,85,247,0.12)"
            />
            <MenuItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              onPress={() => router.push('/privacy-policy')}
              iconColor="#22c55e"
              iconBg="rgba(34,197,94,0.12)"
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="trash-outline"
              title="Delete Account"
              onPress={handleDeleteAccount}
              danger
            />
            <MenuItem
              icon="log-out-outline"
              title="Logout"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        {/* Footer Branding */}
        <View style={styles.footer}>
          <Image source={require('../../assets/images/rechargelight-logo.png')} style={styles.footerLogo} resizeMode="contain" />
          <Text style={styles.appName}>Recharge Light</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  scrollContent: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 110 : 100 },
  header: { alignItems: 'center', marginBottom: 20, paddingTop: 10 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 28,
    marginBottom: 14,
    borderWidth: 4,
    borderColor: '#10b981',
    ...Platform.select({
      ios: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  userName: { fontSize: 24, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  userMobile: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#bbf7d0',
    ...Platform.select({
      ios: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  balanceContent: { alignItems: 'center', gap: 8 },
  balanceIconRow: { flexDirection: 'row', alignItems: 'center' },
  balanceValue: { fontSize: 36, fontWeight: '900', color: '#10b981', marginTop: 8 },
  balanceLabel: { fontSize: 13, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  menuSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  menuIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  menuContent: { flex: 1, marginLeft: 14 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  menuSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 24, paddingVertical: 20 },
  footerLogo: { width: 70, height: 70, borderRadius: 18, marginBottom: 10 },
  appName: { fontSize: 20, fontWeight: '900', color: '#10b981', marginBottom: 4 },
  versionText: { fontSize: 12, color: '#94a3b8' },
});
