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
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';

const MOCK_BOOKING = {
  id: 'b1',
  provider: { name: 'Sipho Dlamini', rating: 4.9 },
  service: 'Deep Cleaning',
  date: 'Today, 14:00',
  location: '12 Rivonia Rd, Sandton',
  amount: 'R 450',
  status: 'Checked in',
};

export default function BookingDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: fetch booking by id from supabase
  const booking = MOCK_BOOKING;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Booking Detail</Text>
          <Badge label={booking.status} variant="green" />
        </View>

        {/* Provider card */}
        <Card style={styles.providerCard}>
          <View style={styles.providerRow}>
            <Avatar name={booking.provider.name} size={52} color={C.purple} />
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{booking.provider.name}</Text>
              <Text style={styles.rating}>⭐ {booking.provider.rating}</Text>
            </View>
          </View>
        </Card>

        {/* Booking details */}
        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{booking.service}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & time</Text>
            <Text style={styles.detailValue}>{booking.date}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{booking.location}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={[styles.detailValue, styles.amount]}>{booking.amount}</Text>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Btn
            label="Message"
            onPress={() => router.push(`/(customer)/chat/${booking.id}`)}
            variant="outline"
          />
          <View style={styles.gap} />
          <Btn
            label="Track live"
            onPress={() => router.push(`/(customer)/tracking/${booking.id}`)}
            variant="accent"
          />
          <View style={styles.gap} />
          <Btn
            label="Cancel booking"
            onPress={() => {/* TODO: cancel booking */}}
            variant="danger"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: { marginBottom: 16 },
  backText: { color: C.muted, fontSize: 15 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  providerCard: { marginBottom: 12 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '700', color: C.text },
  rating: { color: C.amber, fontSize: 13, marginTop: 4 },
  detailsCard: { marginBottom: 24, gap: 0 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  detailLabel: { color: C.muted, fontSize: 14 },
  detailValue: { color: C.text, fontSize: 14, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  amount: { color: C.accent },
  divider: { height: 1, backgroundColor: C.border },
  actions: {},
  gap: { height: 10 },
});
