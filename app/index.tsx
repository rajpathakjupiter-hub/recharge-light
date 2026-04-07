import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated, Text, Image } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate splash
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      setTimeout(() => {
        setIsLoading(false);
        if (token) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      }, 2500);
    } catch (error) {
      setIsLoading(false);
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/rechargelight-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.appName}>
          <Text style={styles.rechargeText}>Recharge</Text>
          <Text style={styles.lightText}>light</Text>
        </Text>
        <Text style={styles.tagline}>Mobile Recharge & Bill Payments</Text>
      </Animated.View>

      <Animated.View style={[styles.loaderContainer, { opacity: loaderOpacity }]}>
        {isLoading && (
          <ActivityIndicator size="large" color="#2E8B2B" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rechargeText: {
    color: '#2E8B2B',
  },
  lightText: {
    color: '#F7941D',
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  loaderContainer: {
    height: 50,
  },
});
