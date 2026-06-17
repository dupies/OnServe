import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';

export default function SplashScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <View style={styles.personBody} />
            <View style={styles.personHead} />
          </View>
          <Text style={styles.appName}>OnServe</Text>
          <Text style={styles.tagline}>Services at your door</Text>
        </View>

        <View style={styles.actions}>
          <Btn
            label="Get started"
            onPress={() => router.push('/(auth)/login')}
            variant="accent"
            style={styles.btn}
          />
          <View style={styles.gap} />
          <Btn
            label="Sign in"
            onPress={() => router.push('/(auth)/login')}
            variant="outline"
            style={styles.btn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingTop: 60,
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${C.accent}22`,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  personHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.accent,
    marginBottom: 4,
  },
  personBody: {
    position: 'absolute',
    bottom: 20,
    width: 36,
    height: 28,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: C.accent,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: C.muted,
    letterSpacing: 0.3,
  },
  actions: {
    width: '100%',
  },
  btn: {
    marginBottom: 0,
  },
  gap: {
    height: 12,
  },
});
