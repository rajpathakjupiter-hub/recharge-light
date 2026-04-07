import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SUPPORT_EMAIL = 'support@rechargelight.in';

export default function PrivacyPolicyScreen() {
  const handleEmail = () => { Linking.openURL(`mailto:${SUPPORT_EMAIL}`); };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F97316" />
      <LinearGradient colors={['#F97316', '#EA580C']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>
        <Text style={styles.paragraph}>Welcome to Recharge Light. We are committed to protecting your privacy and ensuring the security of your personal information.</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}><Text style={styles.bold}>Personal Information:</Text> We collect your name, mobile number, and email address when you register.</Text>
        <Text style={styles.paragraph}><Text style={styles.bold}>Transaction Information:</Text> We collect details of your recharge and payment transactions.</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.bulletPoint}>• To process your mobile recharge and DTH recharge requests</Text>
        <Text style={styles.bulletPoint}>• To send transaction confirmations and important updates</Text>
        <Text style={styles.bulletPoint}>• To provide customer support and resolve issues</Text>
        <Text style={styles.bulletPoint}>• To prevent fraud and ensure security</Text>

        <Text style={styles.sectionTitle}>3. Data Security</Text>
        <Text style={styles.paragraph}>We implement industry-standard security measures. All data transmissions are encrypted using SSL/TLS protocols.</Text>

        <Text style={styles.sectionTitle}>4. Data Sharing</Text>
        <Text style={styles.paragraph}>We do not sell or rent your personal information to third parties.</Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>You have the right to access, update, or delete your personal information. Contact us to exercise these rights.</Text>

        <Text style={styles.sectionTitle}>6. Contact Us</Text>
        <Text style={styles.paragraph}>If you have questions about this Privacy Policy, please contact us at:</Text>
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
  bold: { fontWeight: '700', color: '#1e293b' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#F97316', marginTop: 20, marginBottom: 12 },
  bulletPoint: { fontSize: 14, color: '#475569', lineHeight: 24, marginLeft: 8, marginBottom: 8 },
  contactEmail: { fontSize: 14, color: '#F97316', fontWeight: '700', marginTop: 8 },
  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#94a3b8' },
});
