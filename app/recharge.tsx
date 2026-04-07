import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform,
  Animated, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Plan { rs: number; validity: string; desc: string; category: string; }
interface PlanCategory { name: string; plans: Plan[]; }
interface Operator { code: string; name: string; commission: number; }
interface Circle { code: string; name: string; }

const CATEGORY_COLORS: { [key: string]: string[] } = {
  'popular': ['#2E8B2B', '#e67e4a'],
  '5g': ['#6366f1', '#8b5cf6'],
  'data': ['#22c55e', '#16a34a'],
  'talk': ['#3b82f6', '#2563eb'],
  'combo': ['#ec4899', '#db2777'],
  'roam': ['#f59e0b', '#d97706'],
  'valid': ['#14b8a6', '#0d9488'],
  'entertain': ['#a855f7', '#9333ea'],
  'unlimited': ['#ef4444', '#dc2626'],
  'default': ['#64748b', '#475569'],
};

const getCategoryColor = (name: string): string[] => {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return CATEGORY_COLORS.default;
};

export default function RechargeScreen() {
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
  const rechargeInProgress = useRef(false);
  const isDTH = (type || 'prepaid') === 'dth';

  useEffect(() => { fetchOperators(); fetchCircles(); }, []);
  useEffect(() => { if (selectedOperator && !isDTH) fetchPlans(selectedOperator, selectedCircle); }, [selectedOperator, selectedCircle]);

  const getApiKey = async () => (await AsyncStorage.getItem('api_key')) || '';

  const fetchOperators = async () => {
    try {
      const apiKey = await getApiKey();
      const res = await axios.get(`${BACKEND_URL}/api/external/operators?api_key=${apiKey}`);
      if (res.data) setOperators({ prepaid: res.data.prepaid || [], dth: res.data.dth || [] });
    } catch (e) { console.error(e); }
  };

  const fetchCircles = async () => {
    setCircles([
      { code: 'del', name: 'Delhi NCR' }, { code: 'mum', name: 'Mumbai' },
      { code: 'kar', name: 'Karnataka' }, { code: 'tn', name: 'Tamil Nadu' },
      { code: 'mah', name: 'Maharashtra' }, { code: 'guj', name: 'Gujarat' },
      { code: 'raj', name: 'Rajasthan' }, { code: 'pun', name: 'Punjab' },
      { code: 'har', name: 'Haryana' }, { code: 'upw', name: 'UP West' },
      { code: 'upe', name: 'UP East' }, { code: 'br', name: 'Bihar' },
      { code: 'wb', name: 'West Bengal' }, { code: 'ker', name: 'Kerala' },
    ]);
  };

  const fetchPlans = async (op: string, circle: string) => {
    setLoadingPlans(true);
    try {
      const apiKey = await getApiKey();
      const res = await axios.get(`${BACKEND_URL}/api/external/plans?operator=${op}&circle=${circle}&api_key=${apiKey}`);
      if (res.data?.categories && res.data.categories.length > 0) {
        setCategories(res.data.categories);
        setActiveCategory(res.data.categories[0].name);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingPlans(false); }
  };

  const selectOperator = (op: Operator) => {
    setSelectedOperator(op.code);
    setSelectedOperatorName(op.name);
    setStep('number');
  };

  const goToPlans = () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      Alert.alert('Error', isDTH ? 'Enter valid Subscriber ID' : 'Enter valid 10-digit number');
      return;
    }
    setStep('plan');
  };

  const selectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setAmount(plan.rs.toString());
  };

  const handleRecharge = async () => {
    if (rechargeInProgress.current) return;
    const amtNum = parseInt(amount);
    if (!amtNum || amtNum <= 0) { Alert.alert('Error', 'Enter valid amount'); return; }
    rechargeInProgress.current = true;
    setLoading(true);
    try {
      const apiKey = await getApiKey();
      const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const res = await axios.get(
        `${BACKEND_URL}/api/external/recharge?api_key=${apiKey}&mobile_number=${mobileNumber}&operator_code=${selectedOperator}&amount=${amtNum}&request_order_id=${orderId}`,
        { timeout: 120000 }
      );
      router.push({ pathname: '/status', params: { orderId: res.data.order_id || '', status: res.data.status || 'pending', amount, mobileNumber, operator: selectedOperatorName, transactionId: res.data.transaction_id || '', commission: res.data.commission?.toString() || '0', message: res.data.message || '' } });
    } catch (e: any) {
      router.push({ pathname: '/status', params: { orderId: '', status: 'pending', amount, mobileNumber, operator: selectedOperatorName, transactionId: '', commission: '0', message: 'Processing...' } });
    } finally {
      setLoading(false);
      setTimeout(() => { rechargeInProgress.current = false; }, 3000);
    }
  };

  const getOpIcon = (c: string) => ({ jio: '📱', airtel: '📶', vi: '📞', bsnl: '🔵', tatasky: '📺', airteldth: '📡', dishtv: '🛰️', d2h: '📺' }[c] || '📱');
  const getOpColor = (c: string): string[] => ({ jio: ['#1a73e8', '#0d5bbd'], airtel: ['#e40000', '#b80000'], vi: ['#6c2d91', '#5a2478'], bsnl: ['#2196f3', '#1976d2'] }[c] || ['#2E8B2B', '#e67e4a']);

  const categoryPlans = categories.find(c => c.name === activeCategory)?.plans || [];

  const formatValidity = (v: string) => v ? v.replace('days', ' Days').replace('day', ' Day').replace('calendarmonth', ' Month') : '';
  const cleanDesc = (d: string) => d.replace(/^benefits:\s*/i, '').replace(/^\d+\.\s*/, '').trim();

  const renderPlanCard = ({ item, index }: { item: Plan; index: number }) => {
    const isSelected = selectedPlan?.rs === item.rs && selectedPlan?.desc === item.desc;
    return (
      <TouchableOpacity style={[styles.planCard, isSelected && styles.planCardSelected]} onPress={() => selectPlan(item)} activeOpacity={0.7}>
        <LinearGradient colors={isSelected ? ['#2E8B2B', '#e67e4a'] : ['#f8fafc', '#f1f5f9']} style={styles.planAmount}>
          <Text style={[styles.planRs, isSelected && styles.planRsSelected]}>₹{item.rs}</Text>
        </LinearGradient>
        <View style={styles.planDetails}>
          <Text style={styles.planDesc} numberOfLines={2}>{cleanDesc(item.desc)}</Text>
          <View style={styles.planBadge}>
            <Ionicons name="calendar-outline" size={12} color="#0284c7" />
            <Text style={styles.planBadgeText}>{formatValidity(item.validity)}</Text>
          </View>
        </View>
        <View style={[styles.planCheck, isSelected && styles.planCheckActive]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <LinearGradient colors={['#2E8B2B', '#e67e4a']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => step === 'plan' ? setStep('number') : step === 'number' ? setStep('operator') : router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isDTH ? 'DTH Recharge' : 'Mobile Recharge'}</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Progress */}
        <View style={styles.progress}>
          {['Operator', 'Number', 'Plan'].map((label, i) => {
            const steps = ['operator', 'number', 'plan'];
            const isActive = step === steps[i];
            const isDone = (step === 'number' && i === 0) || (step === 'plan' && i <= 1);
            return (
              <View key={label} style={styles.progressItem}>
                <LinearGradient colors={isDone ? ['#22c55e', '#16a34a'] : isActive ? ['#2E8B2B', '#e67e4a'] : ['#e2e8f0', '#cbd5e1']} style={styles.progressDot}>
                  {isDone ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={styles.progressNum}>{i + 1}</Text>}
                </LinearGradient>
                <Text style={[styles.progressLabel, isActive && { color: '#2E8B2B', fontWeight: '700' }]}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* Step 1: Operator */}
        {step === 'operator' && (
          <ScrollView contentContainerStyle={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Operator</Text>
            <View style={styles.opGrid}>
              {(isDTH ? operators.dth : operators.prepaid).map(op => (
                <TouchableOpacity key={op.code} style={styles.opCard} onPress={() => selectOperator(op)} activeOpacity={0.7}>
                  <LinearGradient colors={getOpColor(op.code)} style={styles.opIcon}>
                    <Text style={{ fontSize: 28 }}>{getOpIcon(op.code)}</Text>
                  </LinearGradient>
                  <Text style={styles.opName}>{op.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Step 2: Number */}
        {step === 'number' && (
          <ScrollView contentContainerStyle={styles.stepContent} keyboardShouldPersistTaps="handled">
            <View style={styles.selectedOp}>
              <LinearGradient colors={getOpColor(selectedOperator)} style={styles.selectedOpIcon}>
                <Text style={{ fontSize: 24 }}>{getOpIcon(selectedOperator)}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedOpName}>{selectedOperatorName}</Text>
                <Text style={styles.selectedOpType}>{isDTH ? 'DTH' : 'Prepaid'}</Text>
              </View>
              <TouchableOpacity onPress={() => setStep('operator')}>
                <Text style={styles.changeBtn}>Change</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>{isDTH ? 'Subscriber ID' : 'Mobile Number'}</Text>
            <View style={styles.inputBox}>
              {!isDTH && <Text style={styles.prefix}>+91</Text>}
              <TextInput style={styles.input} value={mobileNumber} onChangeText={setMobileNumber} placeholder={isDTH ? 'Enter ID' : '10-digit number'} keyboardType="number-pad" maxLength={isDTH ? 12 : 10} placeholderTextColor="#bbb" />
            </View>
            <TouchableOpacity style={[styles.continueBtn, mobileNumber.length < 10 && { opacity: 0.4 }]} onPress={goToPlans} disabled={mobileNumber.length < 10}>
              <LinearGradient colors={['#2E8B2B', '#e67e4a']} style={styles.continueBtnInner}>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Step 3: Plans */}
        {step === 'plan' && (
          <View style={{ flex: 1 }}>
            {/* Top Info */}
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planHeaderNum}>{isDTH ? '' : '+91 '}{mobileNumber}</Text>
                <Text style={styles.planHeaderOp}>{selectedOperatorName}</Text>
              </View>
              {!isDTH && (
                <TouchableOpacity style={styles.circleBtn} onPress={() => setShowCircleModal(true)}>
                  <Ionicons name="location" size={14} color="#2E8B2B" />
                  <Text style={styles.circleBtnText}>{circles.find(c => c.code === selectedCircle)?.name || 'Select'}</Text>
                  <Ionicons name="chevron-down" size={14} color="#2E8B2B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Amount + Recharge */}
            <View style={styles.amountRow}>
              <View style={styles.amountBox}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput style={styles.amountInput} value={amount} onChangeText={(t) => { setAmount(t); setSelectedPlan(null); }} placeholder="Amount" keyboardType="numeric" placeholderTextColor="#bbb" />
              </View>
              <TouchableOpacity style={[styles.rechargeBtn, (!amount || loading) && { opacity: 0.4 }]} onPress={handleRecharge} disabled={!amount || loading}>
                <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.rechargeBtnInner}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="flash" size={16} color="#fff" /><Text style={styles.rechargeBtnText}>Recharge</Text></>}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Category Tabs - VISIBLE NOW */}
            {!isDTH && categories.length > 0 && (
              <View style={styles.catContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat.name;
                    const colors = getCategoryColor(cat.name);
                    return (
                      <TouchableOpacity key={cat.name} onPress={() => setActiveCategory(cat.name)} activeOpacity={0.8}>
                        <LinearGradient colors={isActive ? colors : ['#f1f5f9', '#e2e8f0']} style={styles.catTab}>
                          <Text style={[styles.catText, isActive && { color: '#fff' }]} numberOfLines={1}>
                            {cat.name.split(' ').slice(0, 2).join(' ')}
                          </Text>
                          <View style={[styles.catBadge, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                            <Text style={[styles.catBadgeText, isActive && { color: '#fff' }]}>{cat.plans.length}</Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Plans List */}
            {loadingPlans ? (
              <View style={styles.loadingBox}><ActivityIndicator color="#2E8B2B" size="large" /><Text style={styles.loadingText}>Loading plans...</Text></View>
            ) : (
              <FlatList
                data={categoryPlans}
                renderItem={renderPlanCard}
                keyExtractor={(item, i) => `${item.rs}-${i}`}
                contentContainerStyle={styles.plansList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<View style={styles.emptyBox}><Ionicons name="document-text-outline" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>No plans available</Text></View>}
              />
            )}

            {/* Circle Modal */}
            <Modal visible={showCircleModal} transparent animationType="slide">
              <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCircleModal(false)} activeOpacity={1}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Circle</Text>
                    <TouchableOpacity onPress={() => setShowCircleModal(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
                  </View>
                  <FlatList data={circles} keyExtractor={c => c.code} renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.circleItem, selectedCircle === item.code && styles.circleItemActive]} onPress={() => { setSelectedCircle(item.code); setShowCircleModal(false); }}>
                      <Text style={[styles.circleItemText, selectedCircle === item.code && { color: '#2E8B2B', fontWeight: '700' }]}>{item.name}</Text>
                      {selectedCircle === item.code && <Ionicons name="checkmark-circle" size={22} color="#2E8B2B" />}
                    </TouchableOpacity>
                  )} />
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  progressItem: { alignItems: 'center', gap: 6 },
  progressDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  progressNum: { fontSize: 14, fontWeight: '700', color: '#fff' },
  progressLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  stepContent: { padding: 16, paddingBottom: 40 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  opGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  opCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', gap: 12, elevation: 3 },
  opIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  opName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  selectedOp: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 14, marginBottom: 24, elevation: 2 },
  selectedOpIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  selectedOpName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  selectedOpType: { fontSize: 12, color: '#64748b' },
  changeBtn: { fontSize: 14, fontWeight: '600', color: '#2E8B2B' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, borderWidth: 2, borderColor: '#e2e8f0', marginBottom: 24 },
  prefix: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginRight: 10, paddingRight: 10, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  input: { flex: 1, fontSize: 20, fontWeight: '600', color: '#1e293b', paddingVertical: 16 },
  continueBtn: { borderRadius: 14, overflow: 'hidden' },
  continueBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  planHeaderNum: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  planHeaderOp: { fontSize: 13, color: '#64748b', marginTop: 2 },
  circleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(240,138,93,0.1)', borderRadius: 12 },
  circleBtnText: { fontSize: 13, fontWeight: '600', color: '#2E8B2B' },
  amountRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  amountBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, paddingHorizontal: 16, borderWidth: 2, borderColor: '#e2e8f0' },
  rupee: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700', color: '#1e293b', paddingVertical: 14 },
  rechargeBtn: { borderRadius: 14, overflow: 'hidden' },
  rechargeBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 8 },
  rechargeBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // CATEGORY TABS - FIXED VISIBILITY
  catContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12 },
  catScroll: { paddingHorizontal: 16, gap: 10 },
  catTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 25, marginRight: 10, gap: 8 },
  catText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  catBadge: { backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, minWidth: 28, alignItems: 'center' },
  catBadgeText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  loadingText: { fontSize: 14, color: '#64748b' },
  plansList: { padding: 16, paddingBottom: 100 },
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 2, borderColor: '#f1f5f9', elevation: 2 },
  planCardSelected: { borderColor: '#2E8B2B', backgroundColor: '#fffbf8' },
  planAmount: { width: 80, height: 80, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  planRs: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  planRsSelected: { color: '#fff' },
  planDetails: { flex: 1, marginLeft: 14, marginRight: 10 },
  planDesc: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 8 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
  planBadgeText: { fontSize: 12, color: '#0284c7', fontWeight: '600' },
  planCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  planCheckActive: { backgroundColor: '#2E8B2B', borderColor: '#2E8B2B' },
  emptyBox: { alignItems: 'center', paddingVertical: 80, gap: 16 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  circleItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  circleItemActive: { backgroundColor: '#fffbf8' },
  circleItemText: { fontSize: 16, color: '#334155' },
});
