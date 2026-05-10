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

const MOCK_QUOTE_REQUESTS = [
  {
    id: 'qr1',
    service: 'Deep Cleaning',
    timeLeft: '18h remaining',
    location: 'Sandton',
    customerRating: 4.8,
  },
  {
    id: 'qr2',
    service: 'Garden Maintenance',
    timeLeft: '6h remaining',
    location: 'Rosebank',
    customerRating: 4.5,
  },
  {
    id: 'qr3',
    service: 'Electrical Fault',
    timeLeft: '42h remaining',
    location: 'Midrand',
    customerRating: 4.9,
  },
];

export default function QuoteRequestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // TODO: fetch open quote requests from supabase

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quote Requests</Text>
        <Badge label={`${MOCK_QUOTE_REQUESTS.length} open`} variant="purple" />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_QUOTE_REQUESTS.map((qr) => (
          <Card key={qr.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestService}>{qr.service}</Text>
              <Badge label={qr.timeLeft} variant="amber" />
            </View>
            <View style={styles.requestMeta}>
              <Text style={styles.metaText}>📍 {qr.location}</Text>
              <Text style={styles.metaText}>⭐ Customer {qr.customerRating}</Text>
            </View>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => router.push(`/(provider)/quotes/${qr.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Submit a quote →</Text>
            </TouchableOpacity>
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
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  requestCard: { gap: 12 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestService: { fontSize: 16, fontWeight: '700', color: C.text },
  requestMeta: { flexDirection: 'row', gap: 16 },
  metaText: { fontSize: 13, color: C.muted },
  submitBtn: {
    backgroundColor: `${C.purple}22`,
    borderWidth: 1,
    borderColor: C.purple,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitBtnText: { color: C.purple, fontWeight: '700', fontSize: 14 },
});
