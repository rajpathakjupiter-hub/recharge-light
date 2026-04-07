import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SUPPORT_EMAIL = 'support@rechargelight.in';

export default function TermsScreen() {
  const handleEmail = () => { Linking.openURL(`mailto:${SUPPORT_EMAIL}`); };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F97316" />
      <LinearGradient colors={['#F97316', '#EA580C']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>
        <Text style={styles.paragraph}>Welcome to Recharge Light. By using our mobile recharge and DTH payment application, you agree to these Terms and Conditions.</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>By downloading, installing, or using Recharge Light, you agree to be bound by these Terms and Conditions.</Text>

        <Text style={styles.sectionTitle}>2. Services</Text>
        <Text style={styles.paragraph}>Recharge Light provides mobile recharge and DTH recharge services. We act as an intermediary between you and the service providers.</Text>

        <Text style={styles.sectionTitle}>3. User Registration</Text>
        <Text style={styles.bulletPoint}>• You must provide accurate and complete registration information</Text>
        <Text style={styles.bulletPoint}>• You are responsible for maintaining the confidentiality of your account</Text>
        <Text style={styles.bulletPoint}>• You must be at least 18 years old to use our services</Text>

        <Text style={styles.sectionTitle}>4. Payment Terms</Text>
        <Text style={styles.paragraph}>All payments are processed through secure payment gateways. Transaction charges, if any, will be displayed before confirmation.</Text>

        <Text style={styles.sectionTitle}>5. Refund Policy</Text>
        <Text style={styles.bulletPoint}>• Failed transactions are automatically refunded within 24-48 hours</Text>
        <Text style={styles.bulletPoint}>• Successful recharges cannot be reversed or refunded</Text>
        <Text style={styles.bulletPoint}>• Wrong number recharges are non-refundable</Text>

        <Text style={styles.sectionTitle}>6. Contact Us</Text>
        <Text style={styles.paragraph}>For any questions about these Terms, please contact us at:</Text>
        <TouchableOpacity onPress={handleEmail}>
          <Text style={styles.contactEmail}>Email: {SUPPORT_EMAIL}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Recharge Light. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7ED' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  lastUpdated: { fontSize: 12, color: '#94a3b8', marginBottom: 16, fontWeight: '500' },
  paragraph: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#F97316', marginTop: 20, marginBottom: 12 },
  bulletPoint: { fontSize: 14, color: '#475569', lineHeight: 24, marginLeft: 8, marginBottom: 8 },
  contactEmail: { fontSize: 14, color: '#F97316', fontWeight: '700', marginTop: 8 },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#94a3b8' },
});
