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
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      // TODO: initiate payment and create booking in supabase
      router.push('/(customer)/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Confirm & pay</Text>

        {/* Booking summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>Deep Cleaning</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Provider</Text>
            <Text style={styles.summaryValue}>Sipho Dlamini</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date & time</Text>
            <Text style={styles.summaryValue}>Today, 14:00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <View style={styles.locationValue}>
              <Text style={styles.summaryValue}>12 Rivonia Rd</Text>
              <Badge label="✓ Trust" variant="green" />
            </View>
          </View>
        </Card>

        {/* Fee breakdown */}
        <Card style={styles.feeCard}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Service fee</Text>
            <Text style={styles.feeValue}>R 415.00</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Platform fee</Text>
            <Text style={styles.feeValue}>R 35.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.feeRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R 450.00</Text>
          </View>
        </Card>

        {/* Escrow notice */}
        <View style={styles.escrowNotice}>
          <Text style={styles.escrowIcon}>🔒</Text>
          <Text style={styles.escrowText}>
            Payment is held in escrow and only released when you approve the job.
          </Text>
        </View>

        <Btn
          label="Pay R 450"
          onPress={handlePay}
          variant="accent"
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: { marginBottom: 16 },
  backText: { color: C.muted, fontSize: 15 },
  heading: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 16 },
  summaryCard: { marginBottom: 12, gap: 0 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  summaryLabel: { color: C.muted, fontSize: 14 },
  summaryValue: { color: C.text, fontSize: 14, fontWeight: '600' },
  locationValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: 1, backgroundColor: C.border },
  feeCard: { marginBottom: 14, gap: 10 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { color: C.muted, fontSize: 14 },
  feeValue: { color: C.text, fontSize: 14 },
  totalLabel: { color: C.text, fontSize: 16, fontWeight: '700' },
  totalValue: { color: C.accent, fontSize: 18, fontWeight: '800' },
  escrowNotice: {
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
  escrowIcon: { fontSize: 16 },
  escrowText: { flex: 1, fontSize: 13, color: C.amber, lineHeight: 18 },
});
