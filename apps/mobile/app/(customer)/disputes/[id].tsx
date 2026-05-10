import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Badge } from '@/components/Badge';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';

const TIMELINE = [
  { label: 'Raised', done: true, time: 'Today 12:15' },
  { label: 'Funds frozen', done: true, time: 'Today 12:15' },
  { label: 'Reviewing', done: false },
  { label: 'Resolved', done: false },
];

export default function DisputeStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <Text style={styles.heading}>Dispute #{id}</Text>
          <Badge label="Under review" variant="amber" />
        </View>

        {/* Booking summary */}
        <Card style={styles.bookingCard}>
          <Text style={styles.bookingLabel}>Booking</Text>
          <Text style={styles.bookingValue}>Deep Cleaning · Sipho Dlamini · R 450</Text>
        </Card>

        {/* Timeline */}
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.timeline}>
          {TIMELINE.map((step, i) => (
            <View key={step.label} style={styles.timelineItem}>
              <View style={[styles.dot, step.done && styles.dotDone]} />
              {i < TIMELINE.length - 1 && (
                <View style={[styles.line, step.done && styles.lineDone]} />
              )}
              <View style={styles.stepContent}>
                <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>{step.label}</Text>
                {step.time && <Text style={styles.stepTime}>{step.time}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Frozen notice */}
        <View style={styles.frozenNotice}>
          <Text style={styles.frozenIcon}>🔒</Text>
          <Text style={styles.frozenText}>
            Funds are frozen pending review. You'll be notified of the outcome within 48 hours.
          </Text>
        </View>

        <Btn
          label="Add more evidence"
          onPress={() => {/* TODO */}}
          variant="outline"
        />
        <View style={styles.gap} />
        <Btn
          label="Withdraw dispute"
          onPress={() => router.back()}
          variant="danger"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: { marginBottom: 12 },
  backText: { color: C.muted, fontSize: 15 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: '800', color: C.text },
  bookingCard: { marginBottom: 20, gap: 4 },
  bookingLabel: { fontSize: 12, color: C.muted },
  bookingValue: { fontSize: 14, fontWeight: '600', color: C.text },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },
  timeline: { marginBottom: 20 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.border, marginTop: 2, marginRight: 14, zIndex: 1 },
  dotDone: { backgroundColor: C.amber },
  line: { position: 'absolute', left: 6, top: 14, width: 2, height: 40, backgroundColor: C.border },
  lineDone: { backgroundColor: C.amber },
  stepContent: { flex: 1, paddingBottom: 12 },
  stepLabel: { fontSize: 14, color: C.muted },
  stepLabelDone: { color: C.text, fontWeight: '600' },
  stepTime: { fontSize: 12, color: C.muted, marginTop: 2 },
  frozenNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${C.amber}15`,
    borderWidth: 1,
    borderColor: `${C.amber}44`,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  frozenIcon: { fontSize: 16 },
  frozenText: { flex: 1, fontSize: 13, color: C.amber, lineHeight: 18 },
  gap: { height: 10 },
});
