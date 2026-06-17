import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';

const DURATIONS = ['30 min', '1–2 hrs', 'Half day', 'Full day'];

export default function SubmitQuoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('1–2 hrs');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // TODO: submit quote to supabase
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Submit a quote</Text>

          {/* Request summary */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryService}>Deep Cleaning</Text>
              <Badge label="18h left" variant="amber" />
            </View>
            <Text style={styles.summaryMeta}>📍 Sandton · Customer ⭐ 4.8</Text>
            <Text style={styles.summaryDesc}>
              Full home deep clean required for 4-bedroom house. Please bring all equipment.
            </Text>
          </Card>

          {/* Price */}
          <Text style={styles.label}>Your price</Text>
          <View style={styles.priceRow}>
            <Text style={styles.pricePrefix}>R</Text>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={C.muted}
            />
          </View>

          {/* Duration */}
          <Text style={styles.label}>Estimated duration</Text>
          <View style={styles.durRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durChip, duration === d && styles.durChipActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durLabel, duration === d && styles.durLabelActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.textarea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any details for the customer..."
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Deposit preview */}
          {price ? (
            <View style={styles.depositNotice}>
              <Text style={styles.depositText}>
                💡 Customer pays a 30% deposit (R {Math.round(Number(price) * 0.3)}) on acceptance.
              </Text>
            </View>
          ) : null}

          <Btn
            label={`Submit quote${price ? ` · R ${price}` : ''}`}
            onPress={handleSubmit}
            variant="purple"
            loading={loading}
            disabled={!price || Number(price) <= 0}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: { marginBottom: 16 },
  backText: { color: C.muted, fontSize: 15 },
  heading: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 16 },
  summaryCard: { marginBottom: 16, gap: 8 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryService: { fontSize: 16, fontWeight: '700', color: C.text },
  summaryMeta: { fontSize: 13, color: C.muted },
  summaryDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  pricePrefix: { fontSize: 24, color: C.muted, marginRight: 8 },
  priceInput: { flex: 1, fontSize: 32, fontWeight: '800', color: C.text, paddingVertical: 14 },
  durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  durChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: C.surface,
  },
  durChipActive: { backgroundColor: `${C.purple}22`, borderColor: C.purple },
  durLabel: { color: C.muted, fontSize: 13, fontWeight: '500' },
  durLabelActive: { color: C.purple },
  textarea: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
  },
  depositNotice: {
    backgroundColor: `${C.purple}15`,
    borderWidth: 1,
    borderColor: `${C.purple}44`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  depositText: { fontSize: 13, color: C.purple, lineHeight: 18 },
});
