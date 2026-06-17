import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ActiveJobScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleEmergency = () => {
    Alert.alert(
      'Emergency',
      'This will alert OnServe support immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: () => { /* TODO */ } },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Badge label="● In Progress" variant="purple" />
        </View>

        {/* Mock map */}
        <View style={styles.mapBox}>
          <View style={styles.mapDot} />
          <Text style={styles.mapLabel}>Your location</Text>
        </View>

        {/* Job info */}
        <Card style={styles.jobCard}>
          <Text style={styles.customerLabel}>Customer</Text>
          <Text style={styles.customerName}>Thandi M.</Text>
          <View style={styles.divider} />
          <Text style={styles.serviceText}>Deep Cleaning</Text>
          <Text style={styles.startedText}>Started at 14:04</Text>
        </Card>

        {/* Timer */}
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>Time elapsed</Text>
          <Text style={styles.timerValue}>{formatElapsed(elapsed)}</Text>
        </View>

        {/* Escrow notice */}
        <View style={styles.escrowNotice}>
          <Text style={styles.escrowIcon}>🔒</Text>
          <Text style={styles.escrowText}>R 450 held in escrow — released on job completion.</Text>
        </View>

        <Btn
          label="Complete job"
          onPress={() => router.push(`/(provider)/jobs/${id}/checkout`)}
          variant="purple"
        />
        <View style={styles.gap} />
        <Btn
          label="Emergency"
          onPress={handleEmergency}
          variant="danger"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  header: { marginBottom: 14, alignItems: 'flex-start' },
  mapBox: {
    height: 160,
    backgroundColor: '#130D1F',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mapDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.purple,
    shadowColor: C.purple,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  mapLabel: { color: C.muted, fontSize: 13 },
  jobCard: { marginBottom: 14, gap: 4 },
  customerLabel: { fontSize: 12, color: C.muted },
  customerName: { fontSize: 16, fontWeight: '700', color: C.text },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  serviceText: { fontSize: 14, color: C.text },
  startedText: { fontSize: 13, color: C.muted },
  timerBox: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  timerLabel: { fontSize: 12, color: C.muted, marginBottom: 6 },
  timerValue: { fontSize: 40, fontWeight: '800', color: C.purple },
  escrowNotice: {
    flexDirection: 'row',
    backgroundColor: `${C.amber}15`,
    borderWidth: 1,
    borderColor: `${C.amber}44`,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  escrowIcon: { fontSize: 14 },
  escrowText: { flex: 1, fontSize: 13, color: C.amber },
  gap: { height: 10 },
});
