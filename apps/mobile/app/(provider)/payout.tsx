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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';

export default function PayoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('8400');
  const [loading, setLoading] = useState(false);

  const handlePayout = async () => {
    setLoading(true);
    try {
      // TODO: request payout via supabase edge function
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
          <Text style={styles.heading}>Request payout</Text>

          {/* Balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>R 8,400</Text>
          </View>

          {/* Amount input */}
          <Text style={styles.label}>Amount to withdraw</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencyPrefix}>R</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={C.muted}
            />
          </View>

          {/* Bank account */}
          <Card style={styles.bankCard}>
            <View style={styles.bankRow}>
              <View style={styles.bankLogo}>
                <Text style={styles.bankLogoText}>FNB</Text>
              </View>
              <View style={styles.bankInfo}>
                <Text style={styles.bankName}>FNB Cheque Account</Text>
                <Text style={styles.bankAccount}>•••• •••• 4521</Text>
              </View>
            </View>
          </Card>

          {/* Processing notice */}
          <View style={styles.processingNotice}>
            <Text style={styles.processingText}>
              ⏱ Payouts typically process within 1–2 business days.
            </Text>
          </View>

          <Btn
            label="Request payout"
            onPress={handlePayout}
            variant="purple"
            loading={loading}
            disabled={!amount || Number(amount) <= 0}
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
  heading: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 20 },
  balanceCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  balanceLabel: { fontSize: 13, color: C.muted },
  balanceAmount: { fontSize: 34, fontWeight: '800', color: C.purple },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 8 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencyPrefix: { fontSize: 22, color: C.muted, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '800', color: C.text, paddingVertical: 14 },
  bankCard: { marginBottom: 14 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bankLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#00463F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankLogoText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  bankInfo: { flex: 1 },
  bankName: { fontSize: 14, fontWeight: '700', color: C.text },
  bankAccount: { fontSize: 13, color: C.muted, marginTop: 2 },
  processingNotice: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  processingText: { fontSize: 13, color: C.muted, lineHeight: 18 },
});
