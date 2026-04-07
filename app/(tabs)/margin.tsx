import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function MarginScreen() {
  const [margins, setMargins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchMargins = async () => {
    try {
      const apiKey = await AsyncStorage.getItem('api_key');
      if (!apiKey) { setLoading(false); return; }
      const res = await axios.get(`${BACKEND_URL}/api/external/margin?api_key=${apiKey}`);
      if (res.data?.status === 'success' && res.data?.margins) {
        setMargins(res.data.margins);
      }
    } catch (error) {
      console.error('Fetch margins error:', error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchMargins(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMargins();
    setRefreshing(false);
  };

  const prepaidMargins = margins.filter((m: any) => m.type === 'prepaid');
  const dthMargins = margins.filter((m: any) => m.type === 'dth');

  const MarginCard = ({ title, icon, color, data }: any) => (
    <View style={styles.card}>
      <LinearGradient colors={[color, color + '99']} style={styles.cardIcon}>
        <Ionicons name={icon} size={24} color="#fff" />
      </LinearGradient>
      <Text style={styles.cardTitle}>{title}</Text>
      {data && data.length > 0 ? data.map((item: any, index: number) => (
        <View key={index} style={styles.marginRow}>
          <Text style={styles.marginKey}>{item.operator_name}</Text>
          <Text style={[styles.marginValue, { color }]}>{item.margin_percent}%</Text>
        </View>
      )) : <Text style={styles.noData}>No margin data</Text>}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading margins...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Margin Rates</Text>
        <Ionicons name="trending-up" size={24} color="#F97316" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <MarginCard title="Mobile Prepaid" icon="phone-portrait" color="#F97316" data={prepaidMargins} />
          <MarginCard title="DTH" icon="tv" color="#EA580C" data={dthMargins} />
        </Animated.View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#F97316" />
          <Text style={styles.infoText}>Margins are your profit on each recharge. Higher margin = more earnings!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#FDBA74' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#94a3b8' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  cardIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  marginRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  marginKey: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  marginValue: { fontSize: 16, fontWeight: '800' },
  noData: { fontSize: 14, color: '#94a3b8', textAlign: 'center', paddingVertical: 20 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(249,115,22,0.1)', padding: 16, borderRadius: 14, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 18 },
});
