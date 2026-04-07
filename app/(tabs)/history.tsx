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
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Real operator logos
const OPERATOR_LOGOS: { [key: string]: string } = {
  jio: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/kws72f9c_download.png',
  airtel: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/bbb721ek_download.png',
  vi: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/2r80weeg_download.png',
  bsnl: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/8jpd8jcv_download.jpg',
  tatasky: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/m8ujpsnd_download.png',
  'tata sky': 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/m8ujpsnd_download.png',
  'tata play': 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/m8ujpsnd_download.png',
  airteldth: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/iecpj5mu_download.png',
  'airtel dth': 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/iecpj5mu_download.png',
  dishtv: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/qsifnpri_download.png',
  'dish tv': 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/qsifnpri_download.png',
  d2h: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/zclzjt2v_images.jpg',
  sundirect: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/y2gvhx9n_download.jpg',
  'sun direct': 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/y2gvhx9n_download.jpg',
};

const getOperatorLogo = (operator: string): string | null => {
  if (!operator) return null;
  const key = operator.toLowerCase().replace(/\s+/g, '');
  return OPERATOR_LOGOS[key] || OPERATOR_LOGOS[operator.toLowerCase()] || null;
};

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
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 360;

  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'mobile' | 'dth'>('mobile');

  const fetchHistory = async () => {
    try {
      const apiKey = await getApiKey();
      // Use the unified transactions API with type filter
      const typeParam = filter === 'mobile' ? 'mobile' : 'dth';
      const response = await axios.get(`${BACKEND_URL}/api/external/transactions?api_key=${apiKey}&limit=50&type=${typeParam}`);
      
      if (response.data.transactions) {
        setTransactions(response.data.transactions);
      } else if (response.data.recharges) {
        setTransactions(response.data.recharges);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
      // Fallback to recharge history API
      try {
        const apiKey = await getApiKey();
        const response = await axios.get(`${BACKEND_URL}/api/external/recharge/history?api_key=${apiKey}&limit=50`);
        if (response.data.transactions) {
          setTransactions(response.data.transactions);
        } else if (response.data.recharges) {
          setTransactions(response.data.recharges);
        }
      } catch (e) {
        console.error('Fallback history error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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

  const filteredTransactions = transactions.filter((txn) => {
    const txnType = txn.type?.toUpperCase() || '';
    if (filter === 'mobile') return txnType.includes('MOBILE') || txnType.includes('PREPAID') || (!txnType.includes('DTH'));
    if (filter === 'dth') return txnType.includes('DTH');
    return true;
  });

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const operatorName = item.operator || item.operator_name || '';
    const logo = getOperatorLogo(operatorName);
    const isDTH = item.type?.toUpperCase().includes('DTH');
    const isSuccess = item.status?.toLowerCase() === 'success';
    const hasCommission = isSuccess && item.commission > 0;
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionIcon}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.opLogo} resizeMode="contain" />
          ) : (
            <LinearGradient 
              colors={isDTH ? ['#6366f1', '#8b5cf6'] : ['#10b981', '#059669']} 
              style={styles.iconGradient}
            >
              <Ionicons
                name={isDTH ? 'tv' : 'phone-portrait'}
                size={18}
                color="#fff"
              />
            </LinearGradient>
          )}
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionType}>
            {operatorName || (isDTH ? 'DTH Recharge' : 'Mobile Recharge')}
          </Text>
          <Text style={styles.transactionNumber}>
            {item.number || item.mobile_number}
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
          {hasCommission && (
            <View style={styles.commissionBadge}>
              <Ionicons name="cash-outline" size={10} color="#22c55e" />
              <Text style={styles.commissionText}>+₹{item.commission.toFixed(2)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const FilterButton = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: 'mobile' | 'dth';
    icon: string;
  }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={filter === value ? '#fff' : '#64748b'} 
        style={{ marginRight: 6 }}
      />
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
        <Text style={[styles.title, { fontSize: isSmallDevice ? 20 : 24 }]}>Transaction History</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="receipt" size={isSmallDevice ? 16 : 20} color="#10b981" />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <FilterButton label="Mobile" value="mobile" icon="phone-portrait" />
        <FilterButton label="DTH" value="dth" icon="tv" />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.emptyIconBg}>
            <Ionicons name="receipt-outline" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyText}>No {filter === 'mobile' ? 'Mobile' : 'DTH'} transactions yet</Text>
          <Text style={styles.emptySubtext}>Your transactions will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item, index) => item.transaction_id || `txn-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
              colors={['#10b981']}
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
    backgroundColor: '#f0fdf4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
      ios: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#fff',
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
    gap: 12,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
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
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    ...Platform.select({
      ios: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  opLogo: {
    width: 40,
    height: 40,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
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
    textTransform: 'capitalize',
  },
  transactionNumber: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  commissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  commissionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22c55e',
  },
});
