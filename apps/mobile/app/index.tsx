import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { C } from '@/lib/colors';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/splash" />;
  }

  if (role === 'provider') {
    return <Redirect href="/(provider)/jobs" />;
  }

  return <Redirect href="/(customer)/" />;
}
