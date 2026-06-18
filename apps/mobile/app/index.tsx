import { View, Text, StatusBar, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { colors } from '@onserve/ui-tokens';

export default function InitScreen() {
  const router = useRouter();
  const { user, session, isLoading, init } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      await init();
      setInitialized(true);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (!initialized || isLoading) return;

    // If user is logged in, check their role and route accordingly
    if (session && user) {
      // Navigate based on role, will be handled by auth middleware
      router.replace('/(customer)');
    } else {
      // No session, go to splash
      router.replace('/(auth)/splash');
    }
  }, [initialized, isLoading, session, user]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface[0],
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{
          color: colors.text.secondary,
          fontSize: 14,
          marginTop: 16,
        }}
      >
        Loading OnServe...
      </Text>
    </View>
  );
}
