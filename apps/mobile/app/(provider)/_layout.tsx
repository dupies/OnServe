import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../src/../../../packages/ui-tokens/src';

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
  },
});

export default function ProviderLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.surface[1],
          borderTopColor: colors.surface[2],
          borderTopWidth: 1,
        },
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -8,
        },
      }}
    >
      <Tabs.Screen
        name="(tabs)/index"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>💼</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>💰</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
