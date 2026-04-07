import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform,
  Modal, useWindowDimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Request timeout and retry config
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3;

interface Plan { rs: number; validity: string; desc: string; category: string; }
interface PlanCategory { name: string; plans: Plan[]; }
interface Operator { code: string; name: string; commission: number; }
interface Circle { code: string; name: string; }

// Real operator logos
const OPERATOR_LOGOS: { [key: string]: string } = {
  jio: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/kws72f9c_download.png',
  airtel: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/bbb721ek_download.png',
  vi: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/2r80weeg_download.png',
  bsnl: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/8jpd8jcv_download.jpg',
  tatasky: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/m8ujpsnd_download.png',
  tataplay: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/m8ujpsnd_download.png',
  airteldth: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/iecpj5mu_download.png',
  dishtv: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/qsifnpri_download.png',
  d2h: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/zclzjt2v_images.jpg',
  sundirect: 'https://customer-assets.emergentagent.com/job_recharge-app-28/artifacts/y2gvhx9n_download.jpg',
};

const getOpColor = (c: string): string[] => {
  const colors: { [key: string]: string[] } = {
    jio: ['#0a2885', '#1a3a9f'],
    airtel: ['#ed1c24', '#c41920'],
    vi: ['#f9d616', '#e5c414'],
    bsnl: ['#00a650', '#008c44'],
    tataplay: ['#1a1a2e', '#2d2d44'],
    tatasky: ['#1a1a2e', '#2d2d44'],
    airteldth: ['#ed1c24', '#c41920'],
    dishtv: ['#e31837', '#c41530'],
    d2h: ['#ed1c24', '#c41920'],
    sundirect: ['#e65100', '#bf4400'],
  };
  return colors[c.toLowerCase()] || ['#10b981', '#059669'];
};

// Retry wrapper with exponential backoff
const withRetry = async <T,>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        throw error;
      }
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
};

// Debounce for preventing double taps
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

export default function RechargeScreen() {
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 360;
  const numColumns = isSmallDevice ? 2 : 3;
  const cardWidth = (width - 32 - (numColumns - 1) * 12) / numColumns;
  const planCardWidth = (width - 44) / 2;

  const { type } = useLocalSearchParams<{ type?: string }>();
  const [step, setStep] = useState<'operator' | 'number' | 'plan'>('operator');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedOperatorName, setSelectedOperatorName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [operators, setOperators] = useState<{ prepaid: Operator[]; dth: Operator[] }>({ prepaid: [], dth: [] });
  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState('del');
  const [showCircleModal, setShowCircleModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Strong protection against double submission
  const rechargeInProgress = useRef(false);
  const lastRechargeTime = useRef(0);
  const RECHARGE_COOLDOWN = 5000; // 5 seconds cooldown between recharges
  
  const isDTH = (type || 'prepaid') === 'dth';
  
  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchOperators();
    fetchCircles();
    
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedOperator && !isDTH) {
      fetchPlans(selectedOperator, selectedCircle);
    }
  }, [selectedOperator, selectedCircle]);

  const getApiKey = async () => {
    try {
      return (await AsyncStorage.getItem('api_key')) || '';
    } catch {
      return '';
    }
  };

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const apiKey = await getApiKey();
      const res = await withRetry(() => 
        axios.get(`${BACKEND_URL}/api/external/operators`, {
          params: { api_key: apiKey },
          timeout: REQUEST_TIMEOUT,
        })
      );
      if (res.data) {
        setOperators({
          prepaid: res.data.prepaid || [],
          dth: res.data.dth || [],
        });
      }
    } catch (e: any) {
      console.error('Fetch operators error:', e.message);
      Alert.alert('Error', 'Failed to load operators. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCircles = () => {
    setCircles([
      { code: 'del', name: 'Delhi NCR' }, { code: 'mum', name: 'Mumbai' },
      { code: 'kar', name: 'Karnataka' }, { code: 'tn', name: 'Tamil Nadu' },
      { code: 'mah', name: 'Maharashtra' }, { code: 'guj', name: 'Gujarat' },
      { code: 'raj', name: 'Rajasthan' }, { code: 'pun', name: 'Punjab' },
      { code: 'har', name: 'Haryana' }, { code: 'upw', name: 'UP West' },
      { code: 'upe', name: 'UP East' }, { code: 'br', name: 'Bihar' },
      { code: 'wb', name: 'West Bengal' }, { code: 'ker', name: 'Kerala' },
      { code: 'ap', name: 'Andhra Pradesh' }, { code: 'mp', name: 'Madhya Pradesh' },
      { code: 'che', name: 'Chennai' }, { code: 'kol', name: 'Kolkata' },
      { code: 'ori', name: 'Orissa' }, { code: 'jh', name: 'Jharkhand' },
      { code: 'asm', name: 'Assam' }, { code: 'ne', name: 'North East' },
    ]);
  };

  const fetchPlans = async (op: string, circle: string) => {
    setLoadingPlans(true);
    try {
      const apiKey = await getApiKey();
      const res = await withRetry(() =>
        axios.get(`${BACKEND_URL}/api/external/plans`, {
          params: { api_key: apiKey, operator: op, circle: circle },
          timeout: REQUEST_TIMEOUT,
        })
      );
      if (res.data?.categories) {
        setCategories(res.data.categories);
        if (res.data.categories.length > 0) setActiveCategory(res.data.categories[0].name);
      }
    } catch (e: any) {
      console.error('Fetch plans error:', e.message);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleRecharge = async () => {
    // Multiple protection layers
    if (rechargeInProgress.current) {
      console.log('Recharge already in progress, ignoring...');
      return;
    }
    
    const now = Date.now();
    if (now - lastRechargeTime.current < RECHARGE_COOLDOWN) {
      Alert.alert('Please Wait', 'Please wait a few seconds before trying again.');
      return;
    }

    if (!selectedOperator || !mobileNumber || !amount) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    if (mobileNumber.length < 10) {
      Alert.alert('Error', isDTH ? 'Invalid Subscriber ID' : 'Invalid mobile number');
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmRecharge = async () => {
    setShowConfirmModal(false);
    
    // Double check protection
    if (rechargeInProgress.current) {
      console.log('Recharge already in progress, ignoring confirm...');
      return;
    }

    const now = Date.now();
    if (now - lastRechargeTime.current < RECHARGE_COOLDOWN) {
      Alert.alert('Please Wait', 'Transaction already submitted. Please wait.');
      return;
    }

    // Lock recharge
    rechargeInProgress.current = true;
    lastRechargeTime.current = now;
    setLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const apiKey = await getApiKey();
      
      // Generate unique order ID with timestamp and random component
      const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      console.log('Initiating recharge:', { orderId, mobile: mobileNumber, operator: selectedOperator, amount });

      const res = await axios.get(`${BACKEND_URL}/api/external/recharge`, {
        params: {
          api_key: apiKey,
          mobile_number: mobileNumber,
          operator_code: selectedOperator,
          amount: parseInt(amount),
          request_order_id: orderId,
        },
        timeout: REQUEST_TIMEOUT,
        signal: abortControllerRef.current.signal,
      });

      console.log('Recharge response:', res.data);

      // Get the correct order ID from response
      const statusOrderId = res.data.transaction_id || res.data.order_id || orderId;
      const status = res.data?.status?.toLowerCase();

      if (status === 'success') {
        router.push({
          pathname: '/status',
          params: {
            orderId: statusOrderId,
            amount,
            mobile: mobileNumber,
            type: isDTH ? 'dth' : 'prepaid',
            initialStatus: 'success',
          },
        });
      } else {
        // Failed - still go to status screen
        router.push({
          pathname: '/status',
          params: {
            orderId: statusOrderId,
            amount,
            mobile: mobileNumber,
            type: isDTH ? 'dth' : 'prepaid',
            initialStatus: 'failed',
            errorMessage: res.data?.message || res.data?.remark || 'Recharge failed',
          },
        });
      }
    } catch (e: any) {
      console.error('Recharge error:', e.message);
      
      if (axios.isCancel(e)) {
        console.log('Request was cancelled');
        return;
      }

      const errorMsg = e.response?.data?.message || e.response?.data?.remark || e.message || 'Recharge failed. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
      // Keep lock for cooldown period
      setTimeout(() => {
        rechargeInProgress.current = false;
      }, RECHARGE_COOLDOWN);
    }
  };

  const selectOperator = (op: Operator) => {
    setSelectedOperator(op.code);
    setSelectedOperatorName(op.name);
    setStep('number');
  };

  const currentOps = isDTH ? operators.dth : operators.prepaid;

  // OPERATOR SELECTION
  if (step === 'operator') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: isSmallDevice ? 16 : 18 }]}>{isDTH ? 'DTH Recharge' : 'Mobile Recharge'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionTitle}>Select Operator</Text>
          {loading ? <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} /> : (
            currentOps.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name={isDTH ? 'tv-outline' : 'phone-portrait-outline'} size={56} color="#bbf7d0" />
                <Text style={styles.emptyText}>No operators available</Text>
                <Text style={styles.emptySubtext}>Please check your internet connection</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchOperators}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.opGrid}>
                {currentOps.map((op) => (
                  <TouchableOpacity key={op.code} style={[styles.opCard, { width: cardWidth }]} onPress={() => selectOperator(op)} activeOpacity={0.7}>
                    <View style={styles.opLogoContainer}>
                      {OPERATOR_LOGOS[op.code.toLowerCase()] ? (
                        <Image 
                          source={{ uri: OPERATOR_LOGOS[op.code.toLowerCase()] }} 
                          style={styles.opLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <LinearGradient colors={getOpColor(op.code)} style={styles.opIcon}>
                          <Text style={styles.opInitial}>{op.name.charAt(0)}</Text>
                        </LinearGradient>
                      )}
                    </View>
                    <Text style={[styles.opName, { fontSize: isSmallDevice ? 11 : 12 }]} numberOfLines={1}>{op.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // NUMBER INPUT
  if (step === 'number') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep('operator')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#1e293b" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              {OPERATOR_LOGOS[selectedOperator.toLowerCase()] && (
                <Image 
                  source={{ uri: OPERATOR_LOGOS[selectedOperator.toLowerCase()] }} 
                  style={styles.headerOpLogo}
                  resizeMode="contain"
                />
              )}
              <Text style={[styles.headerTitle, { fontSize: isSmallDevice ? 14 : 16 }]} numberOfLines={1}>{selectedOperatorName}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionTitle}>{isDTH ? 'Subscriber ID' : 'Mobile Number'}</Text>
            <View style={styles.inputBox}>
              <Ionicons name={isDTH ? 'tv' : 'call'} size={18} color="#10b981" />
              <TextInput
                style={[styles.input, { fontSize: isSmallDevice ? 14 : 16 }]}
                placeholder={isDTH ? 'Enter Subscriber ID' : 'Enter 10-digit mobile'}
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={isDTH ? 12 : 10}
                value={mobileNumber}
                onChangeText={setMobileNumber}
              />
            </View>

            {!isDTH && (
              <TouchableOpacity style={styles.circleBtn} onPress={() => setShowCircleModal(true)}>
                <Ionicons name="location" size={16} color="#10b981" />
                <Text style={[styles.circleBtnText, { fontSize: isSmallDevice ? 12 : 14 }]} numberOfLines={1}>{circles.find(c => c.code === selectedCircle)?.name || 'Select Circle'}</Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Amount</Text>
            <View style={styles.inputBox}>
              <Text style={[styles.rupee, { fontSize: isSmallDevice ? 16 : 20 }]}>₹</Text>
              <TextInput
                style={[styles.input, { fontSize: isSmallDevice ? 14 : 16 }]}
                placeholder="Enter amount"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={5}
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <TouchableOpacity
              style={[styles.rechargeBtn, (!mobileNumber || !amount || loading) && styles.rechargeBtnDisabled]}
              onPress={handleRecharge}
              disabled={!mobileNumber || !amount || loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#10b981', '#059669']} style={styles.rechargeBtnGrad}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={[styles.rechargeBtnText, { fontSize: isSmallDevice ? 14 : 16 }]}>Recharge ₹{amount || '0'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {!isDTH && categories.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Browse Plans</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.name}
                      style={[styles.catBtn, activeCategory === cat.name && styles.catBtnActive]}
                      onPress={() => setActiveCategory(cat.name)}
                    >
                      <Text style={[styles.catBtnText, activeCategory === cat.name && styles.catBtnTextActive, { fontSize: isSmallDevice ? 10 : 12 }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {loadingPlans ? <ActivityIndicator color="#10b981" style={{ marginTop: 20 }} /> : (
                  <View style={styles.plansGrid}>
                    {categories.find(c => c.name === activeCategory)?.plans.slice(0, 10).map((plan, i) => (
                      <TouchableOpacity key={i} style={[styles.planCard, { width: planCardWidth }]} onPress={() => { setAmount(plan.rs.toString()); setSelectedPlan(plan); }}>
                        <Text style={[styles.planPrice, { fontSize: isSmallDevice ? 16 : 20 }]}>₹{plan.rs}</Text>
                        <Text style={[styles.planValidity, { fontSize: isSmallDevice ? 10 : 12 }]}>{plan.validity}</Text>
                        <Text style={[styles.planDesc, { fontSize: isSmallDevice ? 10 : 11 }]} numberOfLines={2}>{plan.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Circle Modal */}
        <Modal visible={showCircleModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Circle</Text>
                <TouchableOpacity onPress={() => setShowCircleModal(false)}><Ionicons name="close" size={24} color="#1e293b" /></TouchableOpacity>
              </View>
              <FlatList
                data={circles}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.circleItem} onPress={() => { setSelectedCircle(item.code); setShowCircleModal(false); }}>
                    <Text style={styles.circleItemText}>{item.name}</Text>
                    {selectedCircle === item.code && <Ionicons name="checkmark" size={20} color="#10b981" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Confirm Modal */}
        <Modal visible={showConfirmModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={[styles.confirmTitle, { fontSize: isSmallDevice ? 16 : 20 }]}>Confirm Recharge</Text>
              {OPERATOR_LOGOS[selectedOperator.toLowerCase()] && (
                <Image 
                  source={{ uri: OPERATOR_LOGOS[selectedOperator.toLowerCase()] }} 
                  style={styles.confirmOpLogo}
                  resizeMode="contain"
                />
              )}
              <View style={styles.confirmRow}><Text style={styles.confirmLabel}>{isDTH ? 'Subscriber ID' : 'Mobile'}</Text><Text style={styles.confirmValue}>{mobileNumber}</Text></View>
              <View style={styles.confirmRow}><Text style={styles.confirmLabel}>Operator</Text><Text style={styles.confirmValue}>{selectedOperatorName}</Text></View>
              <View style={styles.confirmRow}><Text style={styles.confirmLabel}>Amount</Text><Text style={[styles.confirmValue, { color: '#10b981' }]}>₹{amount}</Text></View>
              <View style={styles.confirmBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirmModal(false)} disabled={loading}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, loading && { opacity: 0.7 }]} onPress={confirmRecharge} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>Confirm</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#bbf7d0' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  headerOpLogo: { width: 24, height: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  headerTitle: { fontWeight: '800', color: '#1e293b' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 10 },
  opGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  opCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#bbf7d0' },
  opLogoContainer: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  opLogo: { width: 44, height: 44 },
  opIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  opInitial: { fontSize: 18, fontWeight: '900', color: '#fff' },
  opName: { fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#64748b', marginTop: 14 },
  emptySubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  retryBtn: { marginTop: 16, backgroundColor: '#10b981', paddingHorizontal: 28, paddingVertical: 10, borderRadius: 10 },
  retryBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#bbf7d0', paddingHorizontal: 12, marginBottom: 14, gap: 8 },
  input: { flex: 1, fontWeight: '600', color: '#1e293b', paddingVertical: 12 },
  rupee: { fontWeight: '800', color: '#10b981' },
  circleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, gap: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  circleBtnText: { flex: 1, fontWeight: '600', color: '#1e293b' },
  rechargeBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 6 },
  rechargeBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  rechargeBtnDisabled: { opacity: 0.5 },
  rechargeBtnText: { fontWeight: '800', color: '#fff' },
  catScroll: { marginBottom: 14 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  catBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  catBtnText: { fontWeight: '600', color: '#64748b' },
  catBtnTextActive: { color: '#fff' },
  plansGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  planCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  planPrice: { fontWeight: '900', color: '#10b981' },
  planValidity: { fontWeight: '600', color: '#22c55e', marginTop: 3 },
  planDesc: { color: '#64748b', marginTop: 4, lineHeight: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  circleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  circleItemText: { fontSize: 14, color: '#1e293b' },
  confirmModal: { backgroundColor: '#fff', margin: 16, borderRadius: 18, padding: 20, alignItems: 'center' },
  confirmTitle: { fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 12 },
  confirmOpLogo: { width: 50, height: 50, marginBottom: 12 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', width: '100%' },
  confirmLabel: { fontSize: 13, color: '#64748b' },
  confirmValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  confirmBtns: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  confirmBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#10b981', borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
