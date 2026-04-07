import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";

const { width } = Dimensions.get("window");
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://rechargelight.in';

type ScreenState = "main" | "loading" | "webview" | "success" | "failed";

interface GatewayStatus {
  gateway1: { name: string; code: string; enabled: boolean };
  gateway2: { name: string; code: string; enabled: boolean };
}

export default function AddMoneyScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("main");
  const [amount, setAmount] = useState("");
  const [orderId, setOrderId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [utr, setUtr] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<1 | 2>(1);
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [loadingGateway, setLoadingGateway] = useState(true);
  
  const webViewRef = useRef<WebView>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const quickAmounts = [100, 500, 1000, 2000, 5000, 10000];

  useEffect(() => {
    fetchGatewayStatus();
    fetchTransactionHistory();
    return () => stopStatusCheck();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screenState === "webview") { handleCancel(); return true; }
      if (screenState === "loading") { return true; }
      if (screenState === "main") { router.back(); return true; }
      return false;
    });
    return () => backHandler.remove();
  }, [screenState]);

  const getApiKey = async () => {
    try { return await AsyncStorage.getItem("api_key") || ""; } catch { return ""; }
  };

  const fetchGatewayStatus = async () => {
    setLoadingGateway(true);
    try {
      const res = await axios.get(BACKEND_URL + "/api/payment-gateway-status", { timeout: 10000 });
      if (res.data?.status === "success" && res.data?.gateways) {
        setGatewayStatus(res.data.gateways);
        if (res.data.gateways.gateway1?.enabled) {
          setSelectedGateway(1);
        } else if (res.data.gateways.gateway2?.enabled) {
          setSelectedGateway(2);
        }
      }
    } catch (e) {
      // Default to both enabled if API fails
      setGatewayStatus({
        gateway1: { name: "TezIndia", code: "tezindia", enabled: true },
        gateway2: { name: "ekQR", code: "ekqr", enabled: true }
      });
    }
    setLoadingGateway(false);
  };

  const fetchTransactionHistory = async () => {
    setLoadingHistory(true);
    try {
      const apiKey = await getApiKey();
      if (apiKey) {
        const res = await axios.get(BACKEND_URL + "/api/external/transactions?api_key=" + apiKey + "&type=upi&limit=10", { timeout: 15000 });
        if (res.data?.status === "success") setTransactions(res.data.transactions || []);
      }
    } catch {}
    setLoadingHistory(false);
  };

  const stopStatusCheck = () => {
    if (statusCheckInterval.current) { clearInterval(statusCheckInterval.current); statusCheckInterval.current = null; }
  };

  const startStatusCheck = (oid: string, gateway: 1 | 2) => {
    stopStatusCheck();
    const statusEndpoint = gateway === 2 
      ? "/api/external/payment2/status" 
      : "/api/external/payment/status";
    
    statusCheckInterval.current = setInterval(async () => {
      try {
        const apiKey = await getApiKey();
        const res = await axios.get(BACKEND_URL + statusEndpoint + "?api_key=" + apiKey + "&order_id=" + oid, { timeout: 10000 });
        const status = res.data?.payment_status?.toUpperCase();
        if (status === "SUCCESS") {
          stopStatusCheck();
          setUtr(res.data.utr || "");
          setScreenState("success");
          animateResult();
          fetchTransactionHistory();
        } else if (status === "FAILED") {
          stopStatusCheck();
          setErrorMessage(res.data.message || "Payment Failed");
          setScreenState("failed");
          animateResult();
        }
      } catch {}
    }, 2000);
  };

  const handlePay = async () => {
    const amt = parseInt(amount);
    const minAmount = selectedGateway === 2 ? 10 : 100;
    if (!amt || amt < minAmount) {
      Alert.alert("Error", `Minimum amount is ₹${minAmount}`);
      return;
    }

    setScreenState("loading");
    setErrorMessage("");

    try {
      const apiKey = await getApiKey();
      if (!apiKey) { Alert.alert("Error", "Please login again"); setScreenState("main"); return; }

      const endpoint = selectedGateway === 2 
        ? "/api/external/payment2/create" 
        : "/api/external/payment/create";

      const res = await axios.post(BACKEND_URL + endpoint, { api_key: apiKey, amount: amt }, { timeout: 30000 });

      if (res.data?.status === "success" && res.data?.payment_url) {
        setPaymentUrl(res.data.payment_url);
        setOrderId(res.data.order_id);
        setPaymentAmount(amt);
        setScreenState("webview");
        startStatusCheck(res.data.order_id, selectedGateway);
      } else {
        Alert.alert("Error", res.data?.message || "Failed to create payment");
        setScreenState("main");
      }
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || "Payment creation failed");
      setScreenState("main");
    }
  };

  const handleCancel = () => { 
    stopStatusCheck(); 
    setErrorMessage("Payment Cancelled"); 
    setScreenState("failed"); 
    animateResult(); 
  };

  const animateResult = () => {
    scaleAnim.setValue(0);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const reset = () => {
    stopStatusCheck();
    setScreenState("main");
    setPaymentUrl("");
    setOrderId("");
    setPaymentAmount(0);
    setAmount("");
    setUtr("");
    setErrorMessage("");
  };

  const openInChrome = () => {
    if (paymentUrl) {
      // Try to open in Chrome specifically
      const chromeUrl = `googlechrome://${paymentUrl.replace(/^https?:\/\//, '')}`;
      Linking.canOpenURL(chromeUrl).then(supported => {
        if (supported) {
          Linking.openURL(chromeUrl);
        } else {
          // Fallback to default browser with intent
          Linking.openURL(paymentUrl);
        }
      }).catch(() => {
        Linking.openURL(paymentUrl);
      });
    }
  };

  const openInBrowser = () => {
    if (paymentUrl) {
      Linking.openURL(paymentUrl).catch(() => {
        Alert.alert("Error", "Could not open browser");
      });
    }
  };

  const getStatusColor = (s: string) => {
    if (s === "success") return "#10b981";
    if (s === "pending") return "#f59e0b";
    if (s === "failed") return "#ef4444";
    return "#64748b";
  };

  // WEBVIEW SCREEN
  if (screenState === "webview") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.wvHeader}>
          <TouchableOpacity onPress={handleCancel} style={styles.wvCloseBtn}>
            <Ionicons name="close" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.wvHeaderCenter}>
            <Text style={styles.wvTitle}>Secure Payment</Text>
            <View style={styles.wvSecureBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10b981" />
              <Text style={styles.wvSecureText}>256-bit SSL</Text>
            </View>
          </View>
          <View style={styles.wvAmountBox}>
            <Text style={styles.wvAmount}>₹{paymentAmount}</Text>
          </View>
        </View>
        
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <WebView
            ref={webViewRef}
            source={{ uri: paymentUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            cacheEnabled={false}
            incognito
            onShouldStartLoadWithRequest={(request) => {
              if (request.url.startsWith("upi:") || request.url.startsWith("intent:") || 
                  request.url.startsWith("gpay:") || request.url.startsWith("phonepe:") || 
                  request.url.startsWith("paytm:")) {
                Linking.openURL(request.url).catch(() => {});
                return false;
              }
              return true;
            }}
            renderLoading={() => (
              <View style={styles.wvLoading}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.wvLoadingText}>Loading Payment Page...</Text>
              </View>
            )}
          />
        </View>

        <View style={styles.wvFooter}>
          <View style={styles.wvStatusRow}>
            <ActivityIndicator size="small" color="#10b981" />
            <Text style={styles.wvStatusText}>Auto-checking payment status...</Text>
          </View>
          
          {/* Browser Buttons */}
          <View style={styles.browserBtnRow}>
            <TouchableOpacity style={styles.chromeBtnLarge} onPress={openInChrome}>
              <LinearGradient colors={["#4285F4", "#34A853"]} style={styles.chromeBtnGrad}>
                <Ionicons name="logo-chrome" size={22} color="#fff" />
                <Text style={styles.chromeBtnText}>Open in Chrome</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.browserBtn} onPress={openInBrowser}>
              <Ionicons name="globe-outline" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.wvCancelBtn} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
            <Text style={styles.wvCancelText}>Cancel Payment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // SUCCESS SCREEN
  if (screenState === "success") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultBox}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <LinearGradient colors={["#10b981", "#059669"]} style={styles.resultIconBg}>
              <Ionicons name="checkmark-circle" size={60} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <Animated.View style={{ opacity: fadeAnim, alignItems: "center", width: "100%" }}>
            <Text style={[styles.resultTitle, { color: "#10b981" }]}>Payment Successful!</Text>
            <Text style={styles.resultSub}>Your wallet has been credited</Text>
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Amount</Text>
                <Text style={[styles.resultValue, { color: "#10b981" }]}>₹{paymentAmount}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Order ID</Text>
                <Text style={styles.resultSmall}>{orderId}</Text>
              </View>
              {utr ? (
                <>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>UTR</Text>
                    <Text style={styles.resultSmall}>{utr}</Text>
                  </View>
                </>
              ) : null}
            </View>
            <View style={styles.resultBtns}>
              <TouchableOpacity style={styles.btnOutlineGreen} onPress={reset}>
                <Text style={styles.btnOutlineGreenText}>Add More</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnFilledGreen} onPress={() => router.replace("/(tabs)")}>
                <Text style={styles.btnFilledText}>Go Home</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // FAILED SCREEN
  if (screenState === "failed") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultBox}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View style={[styles.resultIconBg, { backgroundColor: "#fef2f2" }]}>
              <Ionicons name="close-circle" size={60} color="#ef4444" />
            </View>
          </Animated.View>
          <Animated.View style={{ opacity: fadeAnim, alignItems: "center", width: "100%" }}>
            <Text style={[styles.resultTitle, { color: "#ef4444" }]}>Payment Failed</Text>
            <Text style={styles.resultSub}>{errorMessage || "Could not complete payment"}</Text>
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Amount</Text>
                <Text style={styles.resultValue}>₹{paymentAmount}</Text>
              </View>
              {orderId ? (
                <>
                  <View style={styles.resultDivider} />
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Order ID</Text>
                    <Text style={styles.resultSmall}>{orderId}</Text>
                  </View>
                </>
              ) : null}
            </View>
            <View style={styles.resultBtns}>
              <TouchableOpacity style={styles.btnOutlineGreen} onPress={() => router.replace("/(tabs)")}>
                <Text style={styles.btnOutlineGreenText}>Go Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnFilledGreen, { backgroundColor: "#ef4444" }]} onPress={reset}>
                <Text style={styles.btnFilledText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // LOADING SCREEN
  if (screenState === "loading") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.loadingIconBg}>
            <ActivityIndicator size="large" color="#fff" />
          </LinearGradient>
          <Text style={styles.loadingTitle}>Creating Payment...</Text>
          <Text style={styles.loadingSub}>Please wait a moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bothGatewaysOff = gatewayStatus && !gatewayStatus.gateway1?.enabled && !gatewayStatus.gateway2?.enabled;

  // MAIN SCREEN
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Image 
              source={require('../assets/images/rechargelight-logo.png')} 
              style={styles.headerLogo} 
              resizeMode="contain" 
            />
            <Text style={styles.headerTitle}>Add Money</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="wallet" size={24} color="#10b981" />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {loadingGateway ? (
            <View style={styles.gatewayLoading}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.gatewayLoadingText}>Loading payment gateways...</Text>
            </View>
          ) : bothGatewaysOff ? (
            <View style={styles.maintenanceBanner}>
              <Ionicons name="construct" size={50} color="#f59e0b" />
              <Text style={styles.maintenanceTitle}>Under Maintenance</Text>
              <Text style={styles.maintenanceText}>Payment gateways are temporarily unavailable. Please try again later.</Text>
            </View>
          ) : (
            <>
              {/* Payment Gateway Selection */}
              <Text style={styles.sectionTitle}>Select Payment Gateway</Text>
              <View style={styles.gatewayContainer}>
                
                {/* Gateway 1 - TezIndia */}
                {(gatewayStatus?.gateway1?.enabled ?? true) && (
                  <TouchableOpacity 
                    style={[styles.gatewayCard, selectedGateway === 1 && styles.gatewayCardSelected]}
                    onPress={() => setSelectedGateway(1)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient 
                      colors={selectedGateway === 1 ? ["#10b981", "#059669"] : ["#f8fafc", "#f1f5f9"]} 
                      style={styles.gatewayCardInner}
                    >
                      <View style={styles.gatewayIconBox}>
                        <Ionicons name="flash" size={28} color={selectedGateway === 1 ? "#fff" : "#10b981"} />
                      </View>
                      <View style={styles.gatewayInfo}>
                        <Text style={[styles.gatewayName, selectedGateway === 1 && styles.gatewayNameActive]}>
                          TezIndia Gateway
                        </Text>
                        <Text style={[styles.gatewayDesc, selectedGateway === 1 && styles.gatewayDescActive]}>
                          Fast UPI Payment • Min ₹100
                        </Text>
                      </View>
                      <View style={[styles.gatewayRadio, selectedGateway === 1 && styles.gatewayRadioActive]}>
                        {selectedGateway === 1 && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Gateway 2 - ekQR */}
                {(gatewayStatus?.gateway2?.enabled ?? true) && (
                  <TouchableOpacity 
                    style={[styles.gatewayCard, selectedGateway === 2 && styles.gatewayCardSelected2]}
                    onPress={() => setSelectedGateway(2)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient 
                      colors={selectedGateway === 2 ? ["#6366f1", "#8b5cf6"] : ["#f8fafc", "#f1f5f9"]} 
                      style={styles.gatewayCardInner}
                    >
                      <View style={[styles.gatewayIconBox, { backgroundColor: selectedGateway === 2 ? "rgba(255,255,255,0.2)" : "#ede9fe" }]}>
                        <Ionicons name="qr-code" size={28} color={selectedGateway === 2 ? "#fff" : "#6366f1"} />
                      </View>
                      <View style={styles.gatewayInfo}>
                        <Text style={[styles.gatewayName, selectedGateway === 2 && styles.gatewayNameActive]}>
                          ekQR Gateway
                        </Text>
                        <Text style={[styles.gatewayDesc, selectedGateway === 2 && styles.gatewayDescActive]}>
                          QR Code Payment • Min ₹10
                        </Text>
                      </View>
                      <View style={[styles.gatewayRadio, selectedGateway === 2 && styles.gatewayRadioActive2]}>
                        {selectedGateway === 2 && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              {/* Supported Apps */}
              <View style={styles.supportedApps}>
                <Text style={styles.supportedLabel}>Supported UPI Apps:</Text>
                <View style={styles.appBadges}>
                  <View style={styles.appBadge}><Text style={styles.appBadgeText}>GPay</Text></View>
                  <View style={styles.appBadge}><Text style={styles.appBadgeText}>PhonePe</Text></View>
                  <View style={styles.appBadge}><Text style={styles.appBadgeText}>Paytm</Text></View>
                  <View style={styles.appBadge}><Text style={styles.appBadgeText}>BHIM</Text></View>
                </View>
              </View>

              {/* Amount Input */}
              <Text style={styles.sectionTitle}>Enter Amount</Text>
              <View style={styles.inputBox}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder={selectedGateway === 2 ? "Min ₹10" : "Min ₹100"}
                  placeholderTextColor="#94a3b8" 
                  keyboardType="number-pad" 
                  value={amount} 
                  onChangeText={setAmount} 
                  maxLength={6} 
                />
                {amount ? (
                  <TouchableOpacity onPress={() => setAmount("")} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={22} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Quick Amounts */}
              <Text style={styles.sectionTitle}>Quick Select</Text>
              <View style={styles.quickGrid}>
                {quickAmounts.map(a => (
                  <TouchableOpacity 
                    key={a} 
                    style={[styles.quickBtn, amount === a.toString() && styles.quickBtnActive]} 
                    onPress={() => setAmount(a.toString())}
                  >
                    <Text style={[styles.quickText, amount === a.toString() && styles.quickTextActive]}>₹{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pay Button */}
              <TouchableOpacity 
                style={[styles.payBtn, (!amount || parseInt(amount) < (selectedGateway === 2 ? 10 : 100)) && styles.payBtnDisabled]} 
                onPress={handlePay} 
                disabled={!amount || parseInt(amount) < (selectedGateway === 2 ? 10 : 100)}
                activeOpacity={0.8}
              >
                <LinearGradient 
                  colors={selectedGateway === 2 ? ["#6366f1", "#8b5cf6"] : ["#10b981", "#059669"]} 
                  style={styles.payBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name={selectedGateway === 2 ? "qr-code" : "flash"} size={22} color="#fff" />
                  <Text style={styles.payBtnText}>
                    Pay ₹{amount || "0"} via {selectedGateway === 2 ? "QR Code" : "UPI"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Security */}
              <View style={styles.securityRow}>
                <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                <Text style={styles.securityText}>100% Secure Payment • 256-bit SSL Encrypted</Text>
              </View>
            </>
          )}

          {/* Recent Transactions */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Payments</Text>
              <TouchableOpacity onPress={fetchTransactionHistory}>
                <Ionicons name="refresh" size={18} color="#10b981" />
              </TouchableOpacity>
            </View>
            {loadingHistory ? (
              <ActivityIndicator color="#10b981" style={{ marginTop: 20 }} />
            ) : transactions.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>No recent payments</Text>
              </View>
            ) : (
              transactions.slice(0, 5).map((t, i) => (
                <View key={t.order_id || i} style={styles.historyItem}>
                  <View style={[styles.historyIcon, { backgroundColor: getStatusColor(t.status) + "15" }]}>
                    <Ionicons 
                      name={t.status === "success" ? "checkmark-circle" : t.status === "failed" ? "close-circle" : "time"} 
                      size={22} 
                      color={getStatusColor(t.status)} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyAmt}>+₹{t.amount}</Text>
                    <Text style={styles.historyDate}>{t.created_at || "Recently"}</Text>
                  </View>
                  <View style={[styles.historyBadge, { backgroundColor: getStatusColor(t.status) + "15" }]}>
                    <Text style={[styles.historyBadgeText, { color: getStatusColor(t.status) }]}>
                      {(t.status || "PENDING").toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0fdf4" },
  
  // Header
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: "#f0fdf4", 
    borderBottomWidth: 1, 
    borderBottomColor: "#bbf7d0" 
  },
  backBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: "#fff", 
    alignItems: "center", 
    justifyContent: "center", 
    elevation: 2,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b" },
  headerIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 14, 
    backgroundColor: "#dcfce7", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#64748b", marginBottom: 12, marginTop: 8 },
  
  // Gateway Selection
  gatewayLoading: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 30, gap: 10 },
  gatewayLoadingText: { fontSize: 14, color: "#64748b" },
  gatewayContainer: { gap: 12, marginBottom: 20 },
  gatewayCard: { 
    borderRadius: 16, 
    overflow: "hidden", 
    borderWidth: 2, 
    borderColor: "#e2e8f0",
  },
  gatewayCardSelected: { borderColor: "#10b981" },
  gatewayCardSelected2: { borderColor: "#6366f1" },
  gatewayCardInner: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 16, 
    gap: 14 
  },
  gatewayIconBox: { 
    width: 52, 
    height: 52, 
    borderRadius: 14, 
    backgroundColor: "#dcfce7", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  gatewayInfo: { flex: 1 },
  gatewayName: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  gatewayNameActive: { color: "#fff" },
  gatewayDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  gatewayDescActive: { color: "rgba(255,255,255,0.85)" },
  gatewayRadio: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  gatewayRadioActive: { backgroundColor: "#10b981", borderColor: "#10b981" },
  gatewayRadioActive2: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  
  // Maintenance
  maintenanceBanner: { 
    backgroundColor: "#fef3c7", 
    borderRadius: 20, 
    padding: 30, 
    alignItems: "center", 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  maintenanceTitle: { fontSize: 20, fontWeight: "800", color: "#b45309", marginTop: 12 },
  maintenanceText: { fontSize: 14, color: "#92400e", textAlign: "center", marginTop: 8, lineHeight: 20 },
  
  // Supported Apps
  supportedApps: { 
    flexDirection: "row", 
    alignItems: "center", 
    flexWrap: "wrap",
    gap: 8, 
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
  },
  supportedLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  appBadges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  appBadge: { 
    backgroundColor: "#dcfce7", 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  appBadgeText: { fontSize: 11, fontWeight: "700", color: "#10b981" },
  
  // Input
  inputBox: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    borderWidth: 2, 
    borderColor: "#bbf7d0", 
    paddingHorizontal: 16, 
    marginBottom: 20 
  },
  rupee: { fontSize: 28, fontWeight: "800", color: "#10b981", marginRight: 8 },
  input: { flex: 1, fontSize: 24, fontWeight: "700", color: "#1e293b", paddingVertical: 16 },
  clearBtn: { padding: 4 },
  
  // Quick amounts
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  quickBtn: { 
    paddingVertical: 14, 
    paddingHorizontal: 18, 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: "#bbf7d0" 
  },
  quickBtnActive: { borderColor: "#10b981", backgroundColor: "#dcfce7" },
  quickText: { fontSize: 15, fontWeight: "700", color: "#64748b" },
  quickTextActive: { color: "#10b981" },
  
  // Pay button
  payBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  payBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 10 },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  
  // Security
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 24 },
  securityText: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  
  // History
  historySection: { backgroundColor: "#fff", borderRadius: 20, padding: 18 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  historyTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  emptyHistory: { alignItems: "center", paddingVertical: 30 },
  emptyText: { fontSize: 13, color: "#94a3b8", marginTop: 10 },
  historyItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#f0fdf4", 
    borderRadius: 14, 
    padding: 14, 
    marginBottom: 8 
  },
  historyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  historyAmt: { fontSize: 16, fontWeight: "800", color: "#10b981" },
  historyDate: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  historyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  historyBadgeText: { fontSize: 10, fontWeight: "700" },
  
  // WebView
  wvHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: "#bbf7d0" 
  },
  wvCloseBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center" },
  wvHeaderCenter: { flex: 1, marginLeft: 12 },
  wvTitle: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  wvSecureBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  wvSecureText: { fontSize: 10, color: "#10b981", fontWeight: "600" },
  wvAmountBox: { backgroundColor: "#dcfce7", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  wvAmount: { fontSize: 18, fontWeight: "800", color: "#10b981" },
  wvLoading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  wvLoadingText: { fontSize: 14, color: "#64748b", marginTop: 12 },
  wvFooter: { backgroundColor: "#fff", padding: 16, borderTopWidth: 1, borderTopColor: "#bbf7d0", gap: 12 },
  wvStatusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  wvStatusText: { fontSize: 13, color: "#10b981", fontWeight: "600" },
  
  // Browser buttons
  browserBtnRow: { flexDirection: "row", gap: 10 },
  chromeBtnLarge: { flex: 1, borderRadius: 14, overflow: "hidden" },
  chromeBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  chromeBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  browserBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 14, 
    backgroundColor: "#eef2ff", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  
  wvCancelBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 6, 
    paddingVertical: 14, 
    backgroundColor: "#fef2f2", 
    borderRadius: 14 
  },
  wvCancelText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
  
  // Loading & Result
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingIconBg: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  loadingTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginTop: 20 },
  loadingSub: { fontSize: 14, color: "#64748b", marginTop: 4 },
  
  resultBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#f0fdf4" },
  resultIconBg: { width: 100, height: 100, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  resultTitle: { fontSize: 26, fontWeight: "900", marginBottom: 8 },
  resultSub: { fontSize: 14, color: "#64748b", marginBottom: 24 },
  resultCard: { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 24 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  resultLabel: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  resultValue: { fontSize: 24, fontWeight: "900", color: "#1e293b" },
  resultSmall: { fontSize: 12, color: "#475569", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  resultDivider: { height: 1, backgroundColor: "#f1f5f9" },
  resultBtns: { flexDirection: "row", gap: 14, width: "100%" },
  btnOutlineGreen: { flex: 1, alignItems: "center", paddingVertical: 16, backgroundColor: "#fff", borderRadius: 14, borderWidth: 2, borderColor: "#10b981" },
  btnOutlineGreenText: { fontSize: 15, fontWeight: "800", color: "#10b981" },
  btnFilledGreen: { flex: 1, alignItems: "center", paddingVertical: 16, backgroundColor: "#10b981", borderRadius: 14 },
  btnFilledText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
