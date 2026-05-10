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
import { Badge } from '@/components/Badge';
import { useAuthStore } from '@/store/authStore';

const MENU_ITEMS = [
  { label: 'Edit profile', icon: '✏️', route: '/(customer)/profile/edit' },
  { label: 'My services', icon: '🔧', route: '/(provider)/services' },
  { label: 'Availability', icon: '📅', route: '/(provider)/availability' },
  { label: 'Reputation', icon: '⭐', route: '/(provider)/reputation' },
  { label: 'Bank account', icon: '🏦', route: '/(provider)/payout' },
];

export default function ProviderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
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
          <Avatar name="Sipho Dlamini" size={72} color={C.purple} />
          <Text style={styles.name}>Sipho Dlamini</Text>
          <Text style={styles.specialty}>Deep Cleaning Specialist</Text>
          <View style={styles.badgeRow}>
            <Badge label="✓ Verified" variant="green" />
            <Text style={styles.rating}>⭐ 4.9</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>312</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>94</Text>
            <Text style={styles.statLabel}>Trust</Text>
          </View>
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
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  name: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 12, marginBottom: 4 },
  specialty: { fontSize: 13, color: C.muted, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rating: { fontSize: 14, color: C.amber },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: C.border },
  statValue: { fontSize: 20, fontWeight: '800', color: C.purple },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2 },
  menu: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
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
