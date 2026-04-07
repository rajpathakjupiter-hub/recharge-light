import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const badgeFloat = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry Animations
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(formSlide, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating badge animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(badgeFloat, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(badgeFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const sendOTP = async () => {
    if (mobile.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/send-otp`, {
        mobile: mobile,
      });
      
      if (response.data.message) {
        setIsNewUser(response.data.is_new_user || false);
        setStep('otp');
        Alert.alert('Success', 'OTP sent successfully!');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/verify-otp`, {
        mobile: mobile,
        otp: otp,
      });
      
      if (response.data.token) {
        await AsyncStorage.setItem('auth_token', response.data.token);
        if (response.data.user?.api_key) {
          await AsyncStorage.setItem('api_key', response.data.user.api_key);
        }
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        router.replace('/(tabs)');
      } else if (response.data.is_new_user === true) {
        router.push({
          pathname: '/register',
          params: { mobile, otp },
        });
      } else {
        Alert.alert('Error', response.data.message || 'OTP verification failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/images/rechargelight-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>Recharge Light</Text>
          <Text style={styles.appTagline}>Fast & Secure Recharges</Text>
          <Text style={styles.versionText}>v1</Text>

          {/* Trust Badges */}
          <Animated.View
            style={[
              styles.trustBadges,
              { transform: [{ translateY: badgeFloat }] },
            ]}
          >
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
              <Text style={styles.badgeText}>100% Secure</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="flash" size={14} color="#f59e0b" />
              <Text style={styles.badgeText}>Instant Recharge</Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          style={[
            styles.formCard,
            {
              opacity: formOpacity,
              transform: [{ translateY: formSlide }],
            },
          ]}
        >
          <LinearGradient
            colors={['#ffffff', '#fefefe']}
            style={styles.formGradient}
          >
            {step === 'mobile' ? (
              <>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Login / Sign Up</Text>
                  <Text style={styles.formSubtitle}>
                    Enter your mobile number to continue
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <View style={styles.modernInputContainer}>
                    <View style={styles.countryCodeBox}>
                      <Text style={styles.flagIcon}>🇮🇳</Text>
                      <Text style={styles.countryCodeText}>+91</Text>
                    </View>
                    <View style={styles.inputDivider} />
                    <TextInput
                      style={styles.modernInput}
                      placeholder="Enter mobile number"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={mobile}
                      onChangeText={setMobile}
                    />
                  </View>
                </View>

                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    onPress={sendOTP}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#2E8B2B', '#ff6b35']}
                      style={styles.modernButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Get OTP</Text>
                          <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setStep('mobile');
                    setOtp('');
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color="#64748b" />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Verify OTP</Text>
                  <Text style={styles.formSubtitle}>
                    Enter the 6-digit code sent to +91 {mobile}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>OTP Code</Text>
                  <View style={styles.otpInputContainer}>
                    <TextInput
                      style={[styles.modernInput, styles.otpInput]}
                      placeholder="● ● ● ● ● ●"
                      placeholderTextColor="#cbd5e1"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                      textAlign="center"
                    />
                  </View>
                </View>

                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    onPress={verifyOTP}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#2E8B2B', '#ff6b35']}
                      style={styles.modernButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Verify & Continue</Text>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity style={styles.resendButton} onPress={sendOTP}>
                  <Ionicons name="refresh" size={18} color="#2E8B2B" />
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.linkText}>Terms & Conditions</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>|</Text>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: SCREEN_HEIGHT * 0.08,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#2E8B2B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  versionText: { fontSize: 12, color: '#2E8B2B', fontWeight: '600', marginTop: 8, backgroundColor: 'rgba(240,138,93,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  appTagline: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 24,
  },
  trustBadges: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  badgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  formGradient: {
    padding: 28,
  },
  formHeader: {
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
    marginLeft: 4,
  },
  modernInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  flagIcon: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  inputDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontWeight: '500',
  },
  otpInputContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  otpInput: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 20,
    letterSpacing: 12,
  },
  modernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#ff6b35',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E8B2B',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 13,
    color: '#2E8B2B',
    fontWeight: '600',
  },
  linkDivider: {
    fontSize: 13,
    color: '#cbd5e1',
  },
});
