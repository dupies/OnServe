import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';

const MOCK_ACTIVE = [
  {
    id: 'b1',
    provider: 'Sipho Dlamini',
    service: 'Deep Cleaning',
    date: 'Today, 14:00',
    amount: 'R 450',
    status: 'Checked in',
  },
  {
    id: 'b2',
    provider: 'Nandi Mokoena',
    service: 'Garden Trim',
    date: 'Fri, 09:00',
    amount: 'R 320',
    status: 'Confirmed',
  },
];

const MOCK_PAST = [
  {
    id: 'b3',
    provider: 'Thabo Khumalo',
    service: 'Plumbing Fix',
    date: '28 Apr, 11:00',
    amount: 'R 750',
    status: 'Completed',
  },
  {
    id: 'b4',
    provider: 'Lerato Sithole',
    service: 'Haircut & Style',
    date: '22 Apr, 15:30',
    amount: 'R 280',
    status: 'Completed',
  },
];

const statusVariant: Record<string, 'green' | 'amber' | 'gray'> = {
  'Checked in': 'green',
  Confirmed: 'amber',
  Completed: 'gray',
};

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const bookings = tab === 'active' ? MOCK_ACTIVE : MOCK_PAST;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <View style={styles.tabs}>
          {(['active', 'past'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {bookings.length === 0 && (
          <Text style={styles.empty}>No {tab} bookings</Text>
        )}
        {bookings.map((b) => (
          <TouchableOpacity
            key={b.id}
            onPress={() => router.push(`/(customer)/bookings/${b.id}`)}
            activeOpacity={0.8}
          >
            <Card style={styles.bookingCard}>
              <View style={styles.cardHeader}>
                <Badge
                  label={b.status}
                  variant={statusVariant[b.status] ?? 'gray'}
                />
                <Text style={styles.amount}>{b.amount}</Text>
              </View>
              <View style={styles.providerRow}>
                <Avatar name={b.provider} size={40} color={C.purple} />
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{b.provider}</Text>
                  <Text style={styles.service}>{b.service}</Text>
                </View>
              </View>
              <Text style={styles.date}>📅 {b.date}</Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 14 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.card },
  tabLabel: { color: C.muted, fontWeight: '600', fontSize: 14 },
  tabLabelActive: { color: C.text },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  empty: { color: C.muted, textAlign: 'center', marginTop: 40 },
  bookingCard: { gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { color: C.accent, fontWeight: '700', fontSize: 15 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '700', color: C.text },
  service: { fontSize: 13, color: C.muted, marginTop: 2 },
  date: { fontSize: 13, color: C.muted },
});
