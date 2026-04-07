import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface MarginItem {
  operator_code: string;
  operator_name: string;
  type: string;
  margin_percent: number;
}

export default function MarginScreen() {
  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  const [margins, setMargins] = useState<MarginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'prepaid' | 'dth'>('all');


  const fetchMargins = async () => {
    try {
      const apiKey = await getApiKey();
      const url = BACKEND_URL + '/api/external/margin?api_key=' + apiKey;
      const response = await axios.get(url);
      if (response.data?.margins) {
        setMargins(response.data.margins);
      }
    } catch (error) {
      console.error('Fetch margins error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMargins();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMargins();
    setRefreshing(false);
  };

  const filteredMargins = margins.filter((m) => {
    if (activeFilter === 'all') return true;
    return m.type === activeFilter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'prepaid': return 'phone-portrait';
      case 'dth': return 'tv';
      default: return 'card';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'prepaid': return '#2E8B2B';
      case 'dth': return '#6366f1';
      default: return '#22c55e';
    }
  };

  const renderItem = ({ item, index }: { item: MarginItem; index: number }) => (
    <View style={[styles.card, { marginTop: index === 0 ? 0 : 10 }]}> 
      <View style={[styles.cardIcon, { backgroundColor: `${getIconColor(item.type)}15` }]}>
        <Ionicons name={getIcon(item.type) as any} size={22} color={getIconColor(item.type)} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.operator_name}</Text>
        <Text style={styles.cardType}>{item.type === 'prepaid' ? 'Mobile Prepaid' : 'DTH Recharge'}</Text>
      </View>
      <View style={styles.cardMargin}>
        <Text style={styles.marginPercent}>{item.margin_percent}%</Text>
        <Text style={styles.marginExample}>₹{(item.margin_percent).toFixed(2)}/₹100</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E8B2B" />
          <Text style={styles.loadingText}>Loading margins...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2E8B2B', '#e67e4a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>My Margin</Text>
        <Text style={styles.headerSubtitle}>Commission rates per operator</Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'prepaid', 'dth'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {filter === 'all' ? 'All' : filter === 'prepaid' ? 'Mobile' : 'DTH'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredMargins}
        renderItem={renderItem}
        keyExtractor={(item) => item.operator_code}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E8B2B" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={56} color="#ccc" />
            <Text style={styles.emptyText}>No margin data available</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterTabActive: {
    backgroundColor: '#2E8B2B',
    borderColor: '#2E8B2B',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  cardType: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  cardMargin: {
    alignItems: 'flex-end',
  },
  marginPercent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  marginExample: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});
