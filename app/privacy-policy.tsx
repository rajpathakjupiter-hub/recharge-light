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

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>
        
        <Text style={styles.paragraph}>
          Welcome to Recharge Light. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our mobile recharge and bill payment application.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Personal Information:</Text> We collect your name, mobile number, and email address when you register for our services.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Transaction Information:</Text> We collect details of your recharge and payment transactions to process your requests and maintain records.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Device Information:</Text> We may collect device identifiers and technical information to improve our services and prevent fraud.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.bulletPoint}>• To process your mobile recharge and bill payment requests</Text>
        <Text style={styles.bulletPoint}>• To send transaction confirmations and important updates</Text>
        <Text style={styles.bulletPoint}>• To provide customer support and resolve issues</Text>
        <Text style={styles.bulletPoint}>• To send promotional offers (with your consent)</Text>
        <Text style={styles.bulletPoint}>• To prevent fraud and ensure security</Text>

        <Text style={styles.sectionTitle}>3. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures to protect your personal information. All data transmissions are encrypted using SSL/TLS protocols. We regularly review and update our security practices.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell or rent your personal information to third parties. We may share your data with:
        </Text>
        <Text style={styles.bulletPoint}>• Payment processors to complete transactions</Text>
        <Text style={styles.bulletPoint}>• Telecom operators to process recharges</Text>
        <Text style={styles.bulletPoint}>• Law enforcement when required by law</Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to access, update, or delete your personal information. You can manage your notification preferences in the app settings. Contact us to exercise these rights.
        </Text>

        <Text style={styles.sectionTitle}>6. Cookies and Analytics</Text>
        <Text style={styles.paragraph}>
          We use analytics tools to understand app usage and improve our services. You can opt-out of analytics tracking in app settings.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Recharge Light is not intended for users under 18 years of age. We do not knowingly collect personal information from children.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or email.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy or our data practices, please contact us at:
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
  bold: {
    fontWeight: '600',
    color: '#334155',
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
