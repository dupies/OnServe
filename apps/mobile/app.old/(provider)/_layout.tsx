import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/lib/colors';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function ProviderLayout() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/splash');
    }
  }, [user, isLoading]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="(tabs)/jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: () => <TabIcon label="💼" />,
        }}
      />
      <Tabs.Screen
        name="(tabs)/earn"
        options={{
          title: 'Earn',
          tabBarIcon: () => <TabIcon label="💳" />,
        }}
      />
      <Tabs.Screen
        name="(tabs)/profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <TabIcon label="👤" />,
        }}
      />
    </Tabs>
  );
}
