import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function AddMoneyScreen() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const getApiKey = async () => {
    const apiKey = await AsyncStorage.getItem('api_key');
    return apiKey || '';
  };

  const quickAmounts = [10, 50, 100, 500, 1000, 2000];

  const handleAddMoney = async () => {
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum < 10) {
      Alert.alert('Error', 'Minimum amount is ₹10');
      return;
    }

    setLoading(true);
    try {
      const apiKey = await getApiKey();
      const response = await axios.post(
        BACKEND_URL + '/api/external/payment/create',
        { 
          api_key: apiKey,
          amount: amountNum,
          redirect_url: 'https://pay2hub.in/payment-success'
        }
      );

      if (response.data.payment_url) {
        // Navigate to payment status screen with WebView
        router.push({
          pathname: '/payment-status',
          params: {
            orderId: response.data.order_id,
            amount: amount,
            paymentUrl: response.data.payment_url,
          },
        });
      } else {
        Alert.alert('Error', response.data.message || 'Failed to create payment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Money</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* UPI Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#22c55e" />
            </View>
            <Text style={styles.infoTitle}>Secure UPI Payment</Text>
            <Text style={styles.infoText}>
              Pay securely via any UPI app. Money will be added instantly.
            </Text>
          </View>

          {/* Amount Input */}
          <Text style={styles.label}>Enter Amount</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum ₹10"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Quick Amount Buttons */}
          <Text style={styles.label}>Quick Select</Text>
          <View style={styles.quickAmounts}>
            {quickAmounts.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.quickAmountButton,
                  amount === amt.toString() && styles.quickAmountButtonActive,
                ]}
                onPress={() => setAmount(amt.toString())}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === amt.toString() && styles.quickAmountTextActive,
                  ]}
                >
                  ₹{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pay Button */}
          <TouchableOpacity
            style={[styles.payButton, loading && styles.buttonDisabled]}
            onPress={handleAddMoney}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Pay via UPI</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Ionicons name="information-circle" size={16} color="#666" />
            <Text style={styles.noteText}>
              After payment, return to this app to check status
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a2e',
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a2e',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickAmountButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  quickAmountButtonActive: {
    borderColor: '#2E8B2B',
    backgroundColor: 'rgba(240, 138, 93, 0.08)',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  quickAmountTextActive: {
    color: '#2E8B2B',
  },
  payButton: {
    backgroundColor: '#2E8B2B',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  noteText: {
    fontSize: 12,
    color: '#666',
  },
});
