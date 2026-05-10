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
import { ProgressBar } from '@/components/ProgressBar';

const BREAKDOWN = [
  { label: 'Average rating', value: '4.9/5', percent: 98, color: C.accent },
  { label: 'Completion rate', value: '98%', percent: 98, color: C.accent },
  { label: 'No-show rate', value: '0.3%', percent: 3, color: C.red, invert: true },
  { label: 'Dispute rate', value: '0.6%', percent: 6, color: C.amber, invert: true },
];

export default function ReputationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const overallScore = 92;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reputation</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Overall score</Text>
          <Text style={styles.scoreValue}>{overallScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
          <ProgressBar percent={overallScore} color={C.accent} height={10} />
        </View>

        {/* Breakdown */}
        <Text style={styles.sectionTitle}>Score breakdown</Text>
        {BREAKDOWN.map((item) => (
          <View key={item.label} style={styles.breakdownRow}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={[styles.breakdownValue, { color: item.invert ? item.color : C.accent }]}>
                {item.value}
              </Text>
            </View>
            <ProgressBar
              percent={item.invert ? 100 - item.percent : item.percent}
              color={item.invert ? item.color : item.color}
              height={5}
            />
          </View>
        ))}

        {/* Green notice */}
        <View style={styles.featuredNotice}>
          <Text style={styles.featuredIcon}>⭐</Text>
          <Text style={styles.featuredText}>
            High scores unlock featured placement in search results.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backText: { color: C.muted, fontSize: 15 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  scoreCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  scoreLabel: { fontSize: 13, color: C.muted },
  scoreValue: { fontSize: 60, fontWeight: '800', color: C.accent, lineHeight: 68 },
  scoreMax: { fontSize: 18, color: C.muted, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
  breakdownRow: {
    marginBottom: 16,
    gap: 8,
  },
  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 14, color: C.muted },
  breakdownValue: { fontSize: 14, fontWeight: '700' },
  featuredNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${C.accent}15`,
    borderWidth: 1,
    borderColor: `${C.accent}44`,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  featuredIcon: { fontSize: 16 },
  featuredText: { flex: 1, fontSize: 13, color: C.accent, lineHeight: 18 },
});
