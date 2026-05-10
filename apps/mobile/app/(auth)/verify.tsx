import React, { useState, useRef, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';
import { supabase } from '@/lib/supabase';

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const { phone: phoneParam } = useLocalSearchParams<{ phone: string }>();
  const phone = Array.isArray(phoneParam) ? phoneParam[0] : (phoneParam ?? '');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const token = digits.join('');
    if (token.length < OTP_LENGTH) return;
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        phone: phone ?? '',
        token,
        type: 'sms',
      });
      if (err) {
        setError(err.message);
      } else {
        // Let index.tsx decide routing based on existing role
        router.replace('/');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setCountdown(60);
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    if (err) setError(err.message);
  };

  const code = digits.join('');

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

          <Text style={styles.step}>Step 2 of 2</Text>
          <Text style={styles.heading}>Enter the code</Text>
          <Text style={styles.sub}>
            Sent to <Text style={styles.phoneHighlight}>{phone}</Text>
          </Text>

          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputs.current[i] = ref; }}
                style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
                value={d}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={handleResend} disabled={countdown > 0} style={styles.resendBtn}>
            <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>

          <View style={styles.btnWrap}>
            <Btn
              label="Verify"
              onPress={handleVerify}
              variant="accent"
              loading={loading}
              disabled={code.length < OTP_LENGTH}
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
  sub: { fontSize: 14, color: C.muted, marginBottom: 32 },
  phoneHighlight: { color: C.text, fontWeight: '600' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    color: C.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpBoxFilled: { borderColor: C.accent },
  error: { color: C.red, fontSize: 13, marginBottom: 8 },
  resendBtn: { marginBottom: 24 },
  resendText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  resendDisabled: { color: C.muted },
  btnWrap: {},
});
