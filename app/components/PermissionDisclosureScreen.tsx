import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PermissionDisclosureScreenProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

const { width } = Dimensions.get('window');

export default function PermissionDisclosureScreen({
  visible,
  onAllow,
  onDeny,
}: PermissionDisclosureScreenProps) {
  if (!visible) return null;

  const permissions = [
    {
      icon: 'call-outline',
      title: 'Phone',
      description: 'We use your phone permission only to verify your mobile number and securely create your account using your device\'s phone number. This helps ensure a smooth and secure login experience.',
    },
    {
      icon: 'notifications-outline',
      title: 'Notification',
      description: 'We use notification permission to send you important alerts, such as transaction updates, offers, and account notifications. You\'re always in control, and you can turn off notifications anytime.',
    },
    {
      icon: 'apps-outline',
      title: 'Installed Apps',
      description: 'We collect the list of installed UPI/Payment apps to select a payment app for completing transactions. We do not collect or share any other apps data from your device.',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      {/* Header */}
      <LinearGradient
        colors={['#2563eb', '#1d4ed8']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Permissions and Data Disclosure</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationBg}>
            <Ionicons name="shield-checkmark" size={60} color="#2563eb" />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-outline" size={24} color="#475569" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            This app requires a few essential permissions to work smoothly. By granting these permissions, you allow all features to function seamlessly. Your data remains completely secure and is never shared with anyone.
          </Text>
        </View>

        {/* Permissions List */}
        {permissions.map((permission, index) => (
          <View key={index} style={styles.permissionItem}>
            <View style={styles.permissionHeader}>
              <Ionicons name={permission.icon as any} size={22} color="#1e293b" />
              <Text style={styles.permissionTitle}>{permission.title}</Text>
            </View>
            <Text style={styles.permissionDescription}>{permission.description}</Text>
          </View>
        ))}

        {/* Spacer for buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Buttons at Bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.denyButton}
          onPress={onDeny}
          activeOpacity={0.8}
        >
          <Text style={styles.denyButtonText}>Deny</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.allowButton}
          onPress={onAllow}
          activeOpacity={0.8}
        >
          <Text style={styles.allowButtonText}>Allow Permissions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  illustrationBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  permissionItem: {
    marginBottom: 20,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  permissionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
    paddingLeft: 32,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  denyButton: {
    flex: 0.35,
    backgroundColor: '#e2e8f0',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  allowButton: {
    flex: 0.65,
    backgroundColor: '#2563eb',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
