import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Avatar } from '@/components/Avatar';
import { ProgressBar } from '@/components/ProgressBar';
import { useAuthStore } from '@/store/authStore';

const MENU_ITEMS = [
  { label: 'Edit profile', icon: '✏️', route: '/(customer)/profile/edit' },
  { label: 'Payment methods', icon: '💳', route: '/(customer)/payment' },
  { label: 'Saved locations', icon: '📍', route: '/(customer)/locations' },
  { label: 'Notifications', icon: '🔔', route: '/(customer)/notifications' },
  { label: 'Settings', icon: '⚙️', route: '/settings' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();

  const rawUser = user as unknown as Record<string, unknown> | null;
  const displayName = (rawUser?.['full_name'] as string | null) ?? user?.fullName ?? 'User';
  const phone = (rawUser?.['phone'] as string | null) ?? user?.phone ?? '';

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar name={displayName} size={72} color={C.accent} />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.phone}>{phone}</Text>
        </View>

        {/* Reputation bar */}
        <View style={styles.reputationCard}>
          <View style={styles.repRow}>
            <Text style={styles.repLabel}>Reputation score</Text>
            <Text style={styles.repScore}>80/100</Text>
          </View>
          <ProgressBar percent={80} color={C.accent} height={8} />
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuRow}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.menuRow, styles.signOutRow]} onPress={handleSignOut} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={[styles.menuLabel, styles.signOutLabel]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  name: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 12, marginBottom: 4 },
  phone: { fontSize: 14, color: C.muted },
  reputationCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  repRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  repLabel: { fontSize: 13, color: C.muted },
  repScore: { fontSize: 15, fontWeight: '700', color: C.accent },
  menu: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  menuIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: C.text },
  menuArrow: { color: C.muted, fontSize: 20 },
  signOutRow: { borderBottomWidth: 0 },
  signOutLabel: { color: C.red },
});
