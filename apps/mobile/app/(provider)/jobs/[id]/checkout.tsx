import React, { useState } from 'react';
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
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // TODO: mark job complete in supabase, trigger escrow release request
      router.replace('/(provider)/(tabs)/jobs');
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

        <Text style={styles.heading}>Check out</Text>

        {/* Check circle */}
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
          <Text style={styles.holdLabel}>Hold to confirm</Text>
        </View>

        {/* Summary card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>1h 52min</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>Deep Cleaning</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment</Text>
            <Text style={[styles.summaryValue, styles.amount]}>R 450</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>Pending customer approval</Text>
          </View>
        </Card>

        <Btn
          label="Confirm check-out"
          onPress={handleCheckout}
          variant="purple"
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 12 },
  backText: { color: C.muted, fontSize: 15 },
  heading: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 24, alignSelf: 'flex-start' },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${C.purple}22`,
    borderWidth: 3,
    borderColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 4,
  },
  checkMark: { fontSize: 36, color: C.purple },
  holdLabel: { fontSize: 10, color: C.purple, fontWeight: '600' },
  summaryCard: { width: '100%', marginBottom: 28, gap: 0 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  summaryLabel: { color: C.muted, fontSize: 14 },
  summaryValue: { color: C.text, fontSize: 14, fontWeight: '600' },
  amount: { color: C.accent },
  divider: { height: 1, backgroundColor: C.border },
});
