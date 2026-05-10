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
import { Avatar } from '@/components/Avatar';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';

const TIMELINE = [
  { label: 'Confirmed', done: true },
  { label: 'Checked in', done: true, time: '10:04' },
  { label: 'In progress', done: false },
  { label: 'Complete', done: false },
];

export default function TrackingScreen() {
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
        <Text style={styles.title}>Live Tracking</Text>

        {/* Mock map */}
        <View style={styles.mapBox}>
          <View style={styles.mapDot} />
          <Text style={styles.mapLabel}>Live location</Text>
        </View>

        {/* Provider info */}
        <Card style={styles.providerCard}>
          <View style={styles.providerRow}>
            <Avatar name="Sipho Dlamini" size={48} color={C.purple} />
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>Sipho Dlamini</Text>
              <Text style={styles.checkinText}>✓ Checked in · 10:04</Text>
            </View>
          </View>
        </Card>

        {/* Timeline */}
        <View style={styles.timeline}>
          {TIMELINE.map((step, i) => (
            <View key={step.label} style={styles.timelineItem}>
              <View style={[styles.timelineDot, step.done && styles.timelineDotDone]} />
              {i < TIMELINE.length - 1 && (
                <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />
              )}
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone]}>
                  {step.label}
                </Text>
                {step.time && <Text style={styles.timelineTime}>{step.time}</Text>}
              </View>
            </View>
          ))}
        </View>

        <Btn
          label="Raise an issue"
          onPress={() => router.push(`/(customer)/disputes/new/${id}`)}
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
  title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 16 },
  mapBox: {
    height: 180,
    backgroundColor: '#0D1F1A',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  mapLabel: { color: C.muted, fontSize: 13 },
  providerCard: { marginBottom: 20 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '700', color: C.text },
  checkinText: { fontSize: 13, color: C.accent, marginTop: 4 },
  timeline: { marginBottom: 24, gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.border,
    marginTop: 2,
    marginRight: 14,
    zIndex: 1,
  },
  timelineDotDone: { backgroundColor: C.accent },
  timelineLine: {
    position: 'absolute',
    left: 6,
    top: 14,
    width: 2,
    height: 40,
    backgroundColor: C.border,
  },
  timelineLineDone: { backgroundColor: C.accent },
  timelineContent: { flex: 1, paddingBottom: 12 },
  timelineLabel: { fontSize: 14, color: C.muted },
  timelineLabelDone: { color: C.text, fontWeight: '600' },
  timelineTime: { fontSize: 12, color: C.accent, marginTop: 2 },
});
