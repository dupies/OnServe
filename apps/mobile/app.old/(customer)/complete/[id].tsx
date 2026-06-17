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
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';

export default function JobCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>

        <Text style={styles.heading}>Job complete!</Text>
        <Text style={styles.sub}>Sipho Dlamini · 1h 45min</Text>

        {/* Escrow card */}
        <Card style={styles.escrowCard}>
          <Text style={styles.escrowLabel}>Escrowed amount</Text>
          <Text style={styles.escrowAmount}>R 450.00</Text>
          <Text style={styles.escrowNotice}>
            Funds are held securely until you approve the job.
          </Text>
        </Card>

        <Btn
          label="Approve & release"
          onPress={() => router.push(`/(customer)/rate/${id}`)}
          variant="accent"
        />
        <View style={styles.gap} />
        <Btn
          label="Raise a dispute"
          onPress={() => router.push(`/(customer)/disputes/new/${id}`)}
          variant="danger"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${C.accent}22`,
    borderWidth: 3,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkMark: { fontSize: 36, color: C.accent },
  heading: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8 },
  sub: { fontSize: 15, color: C.muted, marginBottom: 32 },
  escrowCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
    gap: 6,
  },
  escrowLabel: { fontSize: 13, color: C.muted },
  escrowAmount: { fontSize: 32, fontWeight: '800', color: C.accent },
  escrowNotice: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 18 },
  gap: { height: 10, width: '100%' },
});
