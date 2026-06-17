import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { colors } from '@onserve/ui-tokens';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/(auth)/login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.primary,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: 16,
      marginTop: 8,
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>OnServe</Text>
      <Text style={styles.subtitle}>SDK 56 • Phase 1 Foundation</Text>
    </View>
  );
}
