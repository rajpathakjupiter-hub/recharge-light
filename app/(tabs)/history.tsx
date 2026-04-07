import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Transaction {
  type: string;
  transaction_id: string;
  number?: string;
  mobile_number?: string;
  operator?: string;
  operator_name?: string;
  amount: number;
  commission: number;
  status: string;
  date?: string;
  created_at?: string;
  message?: string;
}

export default function HistoryScreen() {
  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'recharge' | 'dth'>('all');

  const fetchHistory = async () => {
    try {
      const apiKey = await getApiKey();
      const response = await axios.get(`${BACKEND_URL}/api/external/recharge/history?api_key=${apiKey}&limit=50`);
      
      if (response.data.transactions) {
        setTransactions(response.data.transactions);
      } else if (response.data.recharges) {
        setTransactions(response.data.recharges);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return '#22c55e';
      case 'failed':
        return '#ef4444';
      case 'pending':
      case 'processing':
        return '#f59e0b';
      default:
        return '#666';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'MOBILE_RECHARGE':
        return 'phone-portrait';
      case 'DTH_RECHARGE':
        return 'tv';
      case 'UPI_LOAD':
        return 'card';
      case 'GIFTCARD':
        return 'gift';
      default:
        return 'swap-horizontal';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionIcon}>
        <Ionicons
          name={getTypeIcon(item.type) as any}
          size={24}
          color="#2E8B2B"
        />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionType}>
          {item.type?.replace('_', ' ') || 'Recharge'}
        </Text>
        <Text style={styles.transactionNumber}>
          {item.number || item.mobile_number} - {item.operator || item.operator_name}
        </Text>
        <Text style={styles.transactionDate}>
          {item.date || item.created_at}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={styles.transactionAmount}>₹{item.amount}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}15` },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status}
          </Text>
        </View>
        {item.status === 'success' && item.commission > 0 && (
          <Text style={styles.commission}>+₹{item.commission.toFixed(2)}</Text>
        )}
      </View>
    </View>
  );

  const FilterButton = ({
    label,
    value,
  }: {
    label: string;
    value: 'all' | 'recharge' | 'dth';
  }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
      </View>

      <View style={styles.filterContainer}>
        <FilterButton label="All" value="all" />
        <FilterButton label="Mobile" value="recharge" />
        <FilterButton label="DTH" value="dth" />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E8B2B" />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.transaction_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2E8B2B"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  filterButtonActive: {
    backgroundColor: '#2E8B2B',
    borderColor: '#2E8B2B',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 110 : 100,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(240, 138, 93, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    textTransform: 'capitalize',
  },
  transactionNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  commission: {
    fontSize: 11,
    color: '#22c55e',
    marginTop: 4,
  },
});
