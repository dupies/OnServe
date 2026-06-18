import { View, Text, ScrollView, StatusBar, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, TextField } from '../../src/components';
import { useAuth } from '../../src/hooks/useAuth';
import { showErrorToast } from '../../src/utils/toast';
import { colors } from '@onserve/ui-tokens';

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone || '';

  const { verifyOtp, loading, sendOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;

    countdownRef.current = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdown]);

  const handleVerify = async () => {
    if (!otp || otp.length !== OTP_LENGTH) {
      showErrorToast('Enter a 6-digit OTP');
      return;
    }

    const success = await verifyOtp(phone, otp);
    if (success) {
      // Navigation will be handled by the auth store
      router.replace('/(auth)/role');
    } else {
      showErrorToast('Invalid OTP. Please try again.');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    if (phone) {
      const success = await sendOtp(phone);
      if (success) {
        setCountdown(60);
        setOtp('');
      } else {
        showErrorToast('Failed to resend OTP');
      }
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    wrapper: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 48,
      justifyContent: 'center',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: 16,
      marginBottom: 8,
    },
    phoneNumber: {
      color: colors.text.primary,
      fontWeight: '600',
    },
    otpSection: {
      marginBottom: 24,
    },
    labelText: {
      color: colors.text.primary,
      fontWeight: '600',
      marginBottom: 12,
    },
    otpInput: {
      fontSize: 24,
      letterSpacing: 4,
      fontWeight: 'bold',
    },
    resendButton: {
      marginBottom: 24,
      alignItems: 'center',
    },
    resendText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    resendDisabled: {
      color: colors.text.muted,
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wrapper}
    >
      <ScrollView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.content}>
          <Text style={styles.title}>Verify your number</Text>
          <View style={{ flexDirection: 'row', marginBottom: 32 }}>
            <Text style={styles.subtitle}>We sent a code to </Text>
            <Text style={[styles.subtitle, styles.phoneNumber]}>{phone}</Text>
          </View>

          <View style={styles.otpSection}>
            <Text style={styles.labelText}>Enter Code</Text>
            <TextField
              placeholder="000000"
              value={otp}
              onChangeText={setOtp}
              maxLength={OTP_LENGTH}
              keyboardType="number-pad"
              editable={!loading}
              style={styles.otpInput}
            />
          </View>

          <Button
            label={loading ? 'Verifying...' : 'Verify'}
            onPress={handleVerify}
            variant="primary"
            size="lg"
            disabled={loading || otp.length !== OTP_LENGTH}
          />

          <Pressable
            onPress={handleResend}
            disabled={countdown > 0}
            style={styles.resendButton}
          >
            <Text
              style={[
                styles.resendText,
                countdown > 0 && styles.resendDisabled,
              ]}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </Text>
          </Pressable>

          <Text style={{ color: colors.text.tertiary, fontSize: 14, textAlign: 'center' }}>
            Didn't receive the code? Check your SMS inbox.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
