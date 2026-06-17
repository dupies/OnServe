import { View, Text, ScrollView, StatusBar, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components';
import { colors } from '@onserve/ui-tokens';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider' | null>(null);

  const handleContinue = () => {
    if (selectedRole === 'customer') {
      router.push('/(customer)');
    } else if (selectedRole === 'provider') {
      router.push('/(provider)');
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
    roleCard: {
      marginBottom: 16,
      borderRadius: 8,
      borderWidth: 2,
      padding: 24,
    },
    roleCardSelected: {
      backgroundColor: colors.surface[2],
      borderColor: colors.primary,
    },
    roleCardUnselected: {
      backgroundColor: colors.surface[1],
      borderColor: colors.surface[2],
    },
    roleCardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 8,
    },
    roleCardDescription: {
      color: colors.text.secondary,
      fontSize: 14,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>Select how you'd like to use OnServe</Text>

        <Pressable
          onPress={() => setSelectedRole('customer')}
          style={[
            styles.roleCard,
            selectedRole === 'customer'
              ? styles.roleCardSelected
              : styles.roleCardUnselected,
          ]}
        >
          <Text style={styles.roleCardTitle}>Customer</Text>
          <Text style={styles.roleCardDescription}>
            Book and manage home services from professionals
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelectedRole('provider')}
          style={[
            styles.roleCard,
            selectedRole === 'provider'
              ? styles.roleCardSelected
              : styles.roleCardUnselected,
          ]}
        >
          <Text style={styles.roleCardTitle}>Service Provider</Text>
          <Text style={styles.roleCardDescription}>
            Offer your services and grow your business
          </Text>
        </Pressable>

        <View style={{ marginBottom: 32 }} />
        <Button
          label="Continue"
          onPress={handleContinue}
          variant="primary"
          size="lg"
          disabled={!selectedRole}
        />
      </View>
    </ScrollView>
  );
}
