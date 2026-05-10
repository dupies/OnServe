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

const REASONS = [
  'Work not completed',
  'Quality not acceptable',
  'Provider no-show',
];

export default function NewDisputeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // TODO: create dispute record in supabase
      router.push(`/(customer)/disputes/d_${bookingId}`);
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
          <Text style={styles.heading}>Raise a dispute</Text>

          {/* Booking summary */}
          <Card style={styles.bookingCard}>
            <Text style={styles.bookingLabel}>Booking #{bookingId}</Text>
            <Text style={styles.bookingValue}>Deep Cleaning · Sipho Dlamini</Text>
          </Card>

          {/* Reasons */}
          <Text style={styles.label}>Reason for dispute</Text>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={styles.radioRow}
              onPress={() => setReason(r)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, reason === r && styles.radioOuterActive]}>
                {reason === r && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{r}</Text>
            </TouchableOpacity>
          ))}

          {/* Description */}
          <Text style={styles.label}>Describe the issue</Text>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            placeholder="Provide details about what happened..."
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Btn
            label="Submit dispute"
            onPress={handleSubmit}
            variant="danger"
            loading={loading}
            disabled={!reason || description.length < 10}
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
  bookingCard: { marginBottom: 20, gap: 4 },
  bookingLabel: { fontSize: 12, color: C.muted },
  bookingValue: { fontSize: 14, fontWeight: '600', color: C.text },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 10, marginTop: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: C.red },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.red },
  radioLabel: { fontSize: 14, color: C.text },
  textarea: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 24,
  },
});
