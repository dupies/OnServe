import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { C } from '@/lib/colors';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function CustomerLayout() {
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
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="(tabs)/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon label={focused ? '🏠' : '🏠'} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: () => <TabIcon label="📅" />,
        }}
      />
      <Tabs.Screen
        name="(tabs)/chat"
        options={{
          title: 'Chat',
          tabBarIcon: () => <TabIcon label="💬" />,
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
