import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, TextField, Card } from '../../src/components';
import { colors } from '@onserve/ui-tokens';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    if (email.trim()) {
      router.push('/(auth)/role');
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
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <Card style={styles.cardSpacing}>
          <Text style={styles.labelText}>Email Address</Text>
          <TextField
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Card>

        <Button
          label="Continue"
          onPress={handleContinue}
          variant="primary"
          size="lg"
        />

        <Text style={styles.footerText}>
          Don't have an account? Create one during signup.
        </Text>
      </View>
    </ScrollView>
  );
}
