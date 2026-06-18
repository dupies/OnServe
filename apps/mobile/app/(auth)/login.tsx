import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, TextField, Card } from '../../src/components';
import { useAuth } from '../../src/hooks/useAuth';
import { showErrorToast } from '../../src/utils/toast';
import { colors } from '@onserve/ui-tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { sendOtp, loading } = useAuth();
  const [phone, setPhone] = useState('');

  const handleSendOtp = async () => {
    // Basic validation
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      showErrorToast('Enter a valid phone number');
      return;
    }

    const success = await sendOtp(phone);
    if (success) {
      router.push({
        pathname: '/(auth)/verify',
        params: { phone },
      });
    } else {
      showErrorToast('Failed to send OTP. Please try again.');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
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
      marginBottom: 32,
    },
    cardSpacing: {
      marginBottom: 24,
    },
    labelText: {
      color: colors.text.primary,
      fontWeight: '600',
      marginBottom: 12,
    },
    footerText: {
      color: colors.text.tertiary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 24,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your bookings</Text>

        <Card style={styles.cardSpacing}>
          <Text style={styles.labelText}>Phone Number</Text>
          <TextField
            placeholder="+27 123 456 789"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </Card>

        <Button
          label={loading ? 'Sending OTP...' : 'Send OTP'}
          onPress={handleSendOtp}
          variant="primary"
          size="lg"
          disabled={loading}
        />

        <Text style={styles.footerText}>
          We'll send a one-time code to verify your number
        </Text>
      </View>
    </ScrollView>
  );
}
