import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Transaction {
  type: string;
  transaction_id: string;
  number?: string;
  amount: number;
  status: string;
  utr?: string;
  date: string;
}

export default function WalletScreen() {
  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  const fetchWalletData = async () => {
    try {
      const apiKey = await getApiKey();
      const balanceRes = await axios.get(`${BACKEND_URL}/api/external/balance?api_key=${apiKey}`);
      if (balanceRes.data) {
        setBalance(balanceRes.data.balance || 0);
      }

      // Fetch UPI transactions
      try {
        const txnUrl = BACKEND_URL + '/api/external/transactions?api_key=' + apiKey + '&limit=20&type=upi';
        const txnRes = await axios.get(txnUrl);
        if (txnRes.data && txnRes.data.transactions) {
          setTransactions(txnRes.data.transactions);
        }
      } catch (err) {
        console.log('Transactions not available');
      }
    } catch (error) {
      console.error('Fetch wallet error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWalletData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionIcon}>
        <Ionicons name="card" size={20} color="#22c55e" />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionType}>UPI Load</Text>
        {item.utr && <Text style={styles.transactionUtr}>UTR: {item.utr}</Text>}
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={styles.transactionAmount}>+₹{item.amount}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'success' ? '#22c55e' : '#f59e0b' }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2E8B2B"
          />
        }
      >
        <Text style={styles.title}>My Wallet</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
        </View>

        {/* Add Money Button */}
        <TouchableOpacity 
          style={styles.addMoneyButton}
          onPress={() => router.push('/add-money')}
        >
          <View style={styles.addMoneyIcon}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
          <Text style={styles.addMoneyText}>Add Money via UPI</Text>
          <Ionicons name="chevron-forward" size={20} color="#2E8B2B" />
        </TouchableOpacity>

        {/* UPI Transactions */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>UPI Load History</Text>
          {loading ? (
            <ActivityIndicator color="#2E8B2B" style={styles.loader} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No UPI transactions yet</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={(item) => item.transaction_id}
              scrollEnabled={false}
              contentContainerStyle={styles.transactionList}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  addMoneyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E8B2B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addMoneyText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  historySection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  loader: {
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  transactionList: {
    gap: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
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
  },
  transactionUtr: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
