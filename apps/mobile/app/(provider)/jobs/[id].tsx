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
import { ProgressBar } from '@/components/ProgressBar';

const MOCK_JOB = {
  id: 'j1',
  service: 'Deep Cleaning',
  price: 'R 450',
  date: 'Today, 14:00',
  location: '12 Rivonia Rd, Sandton',
  duration: '2–3 hours',
  riskScore: 18,
  status: 'Pending',
};

export default function JobDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: fetch job by id from supabase
  const job = MOCK_JOB;

  const riskColor = job.riskScore < 30 ? C.accent : job.riskScore < 60 ? C.amber : C.red;

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
          <Text style={styles.heading}>{job.service}</Text>
          <Badge label={job.status} variant="amber" />
        </View>
        <Text style={styles.price}>{job.price}</Text>

        {/* Booking details */}
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & time</Text>
            <Text style={styles.detailValue}>{job.date}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{job.location}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{job.duration}</Text>
          </View>
        </Card>

        {/* Area safety */}
        <Card style={styles.safetyCard}>
          <View style={styles.safetyRow}>
            <Text style={styles.safetyLabel}>Area safety score</Text>
            <Text style={[styles.safetyValue, { color: riskColor }]}>
              Risk: {job.riskScore}/100
            </Text>
          </View>
          <ProgressBar percent={100 - job.riskScore} color={riskColor} height={6} />
          <Text style={styles.safetyNote}>
            {job.riskScore < 30 ? '✓ Safe area' : job.riskScore < 60 ? '⚠ Moderate area' : '⛔ High-risk area'}
          </Text>
        </Card>

        {/* Actions */}
        <Btn
          label="Accept job"
          onPress={() => router.push(`/(provider)/jobs/${id}/active`)}
          variant="purple"
        />
        <View style={styles.gap} />
        <Btn
          label="Decline"
          onPress={() => router.back()}
          variant="outline"
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  heading: { fontSize: 22, fontWeight: '800', color: C.text },
  price: { fontSize: 28, fontWeight: '800', color: C.accent, marginBottom: 16 },
  detailsCard: { marginBottom: 12, gap: 0 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  detailLabel: { color: C.muted, fontSize: 14 },
  detailValue: { color: C.text, fontSize: 14, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: C.border },
  safetyCard: { marginBottom: 24, gap: 10 },
  safetyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  safetyLabel: { fontSize: 13, color: C.muted },
  safetyValue: { fontSize: 13, fontWeight: '700' },
  safetyNote: { fontSize: 12, color: C.muted, marginTop: 2 },
  gap: { height: 10 },
});
