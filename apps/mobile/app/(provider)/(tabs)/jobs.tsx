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
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';

const MOCK_JOBS = [
  {
    id: 'j1',
    service: 'Deep Cleaning',
    price: 'R 450',
    area: 'Sandton',
    distance: '0.8 km',
    urgent: true,
  },
  {
    id: 'j2',
    service: 'Garden Trim',
    price: 'R 280',
    area: 'Rosebank',
    distance: '2.1 km',
    urgent: false,
  },
  {
    id: 'j3',
    service: 'Electrical Repair',
    price: 'R 650',
    area: 'Randburg',
    distance: '4.3 km',
    urgent: false,
  },
];

export default function JobBoardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // TODO: fetch jobs from supabase
  const jobs = MOCK_JOBS;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Job Board</Text>
        <Badge label="● Online" variant="green" />
      </View>

      {/* Today's stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Jobs today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>R 1,380</Text>
          <Text style={styles.statLabel}>Earned today</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>New requests</Text>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* TODO: fetch jobs from supabase */}
        {jobs.map((job) => (
          <Card key={job.id} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <Text style={styles.jobService}>{job.service}</Text>
              <Text style={styles.jobPrice}>{job.price}</Text>
            </View>
            <View style={styles.jobMeta}>
              <Badge label={job.area} variant="purple" />
              <Text style={styles.distance}>📍 {job.distance}</Text>
              {job.urgent && <Badge label="Urgent" variant="red" />}
            </View>
            <View style={styles.jobActions}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => router.push(`/(provider)/jobs/${job.id}`)}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: C.text },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: C.purple },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, paddingHorizontal: 20, marginBottom: 10 },
  list: { paddingHorizontal: 20, gap: 12 },
  jobCard: { gap: 12 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobService: { fontSize: 16, fontWeight: '700', color: C.text },
  jobPrice: { fontSize: 17, fontWeight: '800', color: C.accent },
  jobMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distance: { fontSize: 12, color: C.muted },
  jobActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1,
    backgroundColor: C.purple,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  declineText: { color: C.muted, fontWeight: '700', fontSize: 14 },
});
