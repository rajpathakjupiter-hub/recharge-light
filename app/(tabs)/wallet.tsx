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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 360;

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
      <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.transactionIcon}>
        <Ionicons name="arrow-down" size={18} color="#fff" />
      </LinearGradient>
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: isSmallDevice ? 20 : 24 }]}>My Wallet</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="wallet" size={isSmallDevice ? 16 : 20} color="#F97316" />
          </View>
        </View>

        {/* Balance Card */}
        <LinearGradient 
          colors={['#F97316', '#EA580C', '#C2410C']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.balanceCard}
        >
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          <View style={styles.balanceTop}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="wallet" size={isSmallDevice ? 18 : 22} color="#fff" />
            </View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
          </View>
          <Text style={[styles.balanceAmount, { fontSize: isSmallDevice ? 28 : 42 }]}>₹{balance.toFixed(2)}</Text>
          <TouchableOpacity 
            style={styles.addMoneyButton}
            onPress={() => router.push('/add-money')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color="#F97316" />
            <Text style={styles.addMoneyText}>Add Money via UPI</Text>
            <Ionicons name="chevron-forward" size={18} color="#F97316" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.statIcon}>
              <Ionicons name="trending-up" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.statLabel}>Total Loaded</Text>
            <Text style={styles.statValue}>₹{(balance * 1.2).toFixed(0)}</Text>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.statIcon}>
              <Ionicons name="flash" size={18} color="#fff" />
            </LinearGradient>
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={styles.statValue}>{transactions.length}</Text>
          </View>
        </View>

        {/* UPI Transactions */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>UPI Load History</Text>
            <Ionicons name="time" size={18} color="#F97316" />
          </View>
          {loading ? (
            <ActivityIndicator color="#F97316" style={styles.loader} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient colors={['#F97316', '#EA580C']} style={styles.emptyIconBg}>
                <Ionicons name="card-outline" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.emptyText}>No UPI transactions yet</Text>
              <Text style={styles.emptySubtext}>Add money to see your history</Text>
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
    backgroundColor: '#FFF7ED',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  balanceCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  balanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  balanceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  addMoneyButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addMoneyText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#F97316',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDBA74',
    ...Platform.select({
      ios: { shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 4,
  },
  historySection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  loader: {
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
  },
  transactionList: {
    gap: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  transactionUtr: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#22c55e',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
