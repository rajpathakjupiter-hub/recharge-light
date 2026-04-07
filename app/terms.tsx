import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SUPPORT_NUMBER = '08069578370';

export default function TermsScreen() {
  const handleCall = () => {
    Linking.openURL(`tel:${SUPPORT_NUMBER}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E8B2B" />
      
      {/* Header */}
      <LinearGradient
        colors={['#2E8B2B', '#ff6b35']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>
        
        <Text style={styles.paragraph}>
          Welcome to Recharge Light. By using our mobile recharge and bill payment application, you agree to these Terms and Conditions. Please read them carefully before using our services.
        </Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By downloading, installing, or using Recharge Light, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.
        </Text>

        <Text style={styles.sectionTitle}>2. Services</Text>
        <Text style={styles.paragraph}>
          Recharge Light provides mobile recharge and bill payment services. We act as an intermediary between you and the service providers (telecom operators, utility companies).
        </Text>

        <Text style={styles.sectionTitle}>3. User Registration</Text>
        <Text style={styles.bulletPoint}>• You must provide accurate and complete registration information</Text>
        <Text style={styles.bulletPoint}>• You are responsible for maintaining the confidentiality of your account</Text>
        <Text style={styles.bulletPoint}>• You must be at least 18 years old to use our services</Text>

        <Text style={styles.sectionTitle}>4. Payment Terms</Text>
        <Text style={styles.paragraph}>
          All payments are processed through secure payment gateways. Transaction charges, if any, will be displayed before confirmation. Refunds are subject to our refund policy.
        </Text>

        <Text style={styles.sectionTitle}>5. Refund Policy</Text>
        <Text style={styles.bulletPoint}>• Failed transactions are automatically refunded within 24-48 hours</Text>
        <Text style={styles.bulletPoint}>• Successful recharges cannot be reversed or refunded</Text>
        <Text style={styles.bulletPoint}>• Wrong number recharges are non-refundable</Text>

        <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          Recharge Light is not liable for service disruptions from telecom operators or payment gateways. We are not responsible for incorrect information provided by users.
        </Text>

        <Text style={styles.sectionTitle}>7. Prohibited Activities</Text>
        <Text style={styles.bulletPoint}>• Using the app for fraudulent activities</Text>
        <Text style={styles.bulletPoint}>• Attempting to hack or manipulate the system</Text>
        <Text style={styles.bulletPoint}>• Violating applicable laws and regulations</Text>

        <Text style={styles.sectionTitle}>8. Contact Us</Text>
        <Text style={styles.paragraph}>
          For any questions or concerns about these Terms, please contact us at:
        </Text>
        <TouchableOpacity onPress={handleCall}>
          <Text style={styles.contactInfo}>Customer Care: 022 6971 0892</Text>
        </TouchableOpacity>
        <Text style={styles.contactEmail}>Email: support@rechargelight.in</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Recharge Light. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 24,
    paddingLeft: 8,
  },
  contactInfo: {
    fontSize: 16,
    color: '#2E8B2B',
    fontWeight: '600',
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
