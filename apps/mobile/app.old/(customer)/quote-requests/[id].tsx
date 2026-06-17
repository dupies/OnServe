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
import { Badge } from '@/components/Badge';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';

const MOCK_QUOTES = [
  {
    id: 'q1',
    provider: { name: 'Sipho Dlamini', rating: 4.9 },
    price: 'R 450',
    notes: 'I can come today after 2pm. Includes all cleaning products.',
  },
  {
    id: 'q2',
    provider: { name: 'Nomsa Dube', rating: 4.7 },
    price: 'R 380',
    notes: 'Available tomorrow morning. Eco-friendly products.',
  },
];

export default function QuoteReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: fetch quote request + quotes from supabase
  const quotes = MOCK_QUOTES;

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
          <Text style={styles.heading}>{quotes.length} quotes received</Text>
          <Badge label="23h left" variant="amber" />
        </View>

        {quotes.map((q) => (
          <Card key={q.id} style={styles.quoteCard}>
            <View style={styles.providerRow}>
              <Avatar name={q.provider.name} size={44} color={C.purple} />
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{q.provider.name}</Text>
                <Text style={styles.rating}>⭐ {q.provider.rating}</Text>
              </View>
              <Text style={styles.price}>{q.price}</Text>
            </View>
            <Text style={styles.notes}>{q.notes}</Text>
            <Btn
              label="Accept this quote"
              onPress={() => router.push('/(customer)/payment')}
              variant="accent"
            />
          </Card>
        ))}
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
  quoteCard: { marginBottom: 12, gap: 12 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '700', color: C.text },
  rating: { color: C.amber, fontSize: 13, marginTop: 2 },
  price: { fontSize: 18, fontWeight: '800', color: C.accent },
  notes: { fontSize: 13, color: C.muted, lineHeight: 18 },
});
