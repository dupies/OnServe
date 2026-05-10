import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    const fullPhone = `+27${phone.replace(/^0/, '')}`;
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (err) {
        setError(err.message);
      } else {
        router.push({ pathname: '/(auth)/verify', params: { phone: fullPhone } });
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.step}>Step 1 of 2</Text>
          <Text style={styles.heading}>Enter your number</Text>
          <Text style={styles.sub}>We'll send a one-time code to verify your number.</Text>

          <View style={styles.phoneRow}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>🇿🇦 +27</Text>
            </View>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="81 234 5678"
              placeholderTextColor={C.muted}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.btnWrap}>
            <Btn
              label="Send OTP"
              onPress={handleSendOtp}
              variant="accent"
              loading={loading}
              disabled={phone.length < 9}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { marginBottom: 32 },
  backText: { color: C.muted, fontSize: 15 },
  step: { fontSize: 13, color: C.accent, fontWeight: '600', marginBottom: 8 },
  heading: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8 },
  sub: { fontSize: 14, color: C.muted, marginBottom: 32, lineHeight: 20 },
  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  prefix: {
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  prefixText: { color: C.text, fontSize: 15 },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    color: C.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  error: { color: C.red, fontSize: 13, marginBottom: 12 },
  btnWrap: { marginTop: 8 },
});
