import React from 'react';
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
import { Btn } from '@/components/Btn';
import { Badge } from '@/components/Badge';

const DAY_CHART = [
  { day: 'Mon', amount: 1200, max: 2000 },
  { day: 'Tue', amount: 0, max: 2000 },
  { day: 'Wed', amount: 950, max: 2000 },
  { day: 'Thu', amount: 0, max: 2000 },
  { day: 'Fri', amount: 1800, max: 2000 },
  { day: 'Sat', amount: 2000, max: 2000 },
  { day: 'Sun', amount: 450, max: 2000 },
];

export default function EarnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Earnings</Text>

        {/* This month card */}
        <View style={styles.monthCard}>
          <Text style={styles.monthLabel}>This month</Text>
          <Text style={styles.monthAmount}>R 8,400</Text>
          <Badge label="↑ 23% vs last month" variant="green" />
        </View>

        {/* Day chart */}
        <Text style={styles.sectionTitle}>This week</Text>
        <View style={styles.chartBox}>
          {DAY_CHART.map((item) => (
            <View key={item.day} style={styles.chartRow}>
              <Text style={styles.chartDay}>{item.day}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(item.amount / item.max) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.chartAmount}>
                {item.amount > 0 ? `R ${item.amount.toLocaleString()}` : '—'}
              </Text>
            </View>
          ))}
        </View>

        {/* Payout button */}
        <Btn
          label="Request payout"
          onPress={() => router.push('/(provider)/payout')}
          variant="purple"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 16 },
  monthCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 8,
  },
  monthLabel: { fontSize: 13, color: C.muted },
  monthAmount: { fontSize: 40, fontWeight: '800', color: C.purple },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  chartBox: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartDay: { width: 28, fontSize: 12, color: C.muted, fontWeight: '600' },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: C.purple, borderRadius: 4 },
  chartAmount: { width: 70, fontSize: 12, color: C.text, textAlign: 'right' },
});
