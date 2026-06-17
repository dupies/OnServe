import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Badge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';

const MOCK_LOCATIONS = [
  {
    id: 'l1',
    name: 'Home',
    address: '12 Rivonia Rd, Sandton, 2196',
    trust: 92,
    isDefault: true,
  },
  {
    id: 'l2',
    name: 'Work',
    address: '5 Alice Lane, Sandton City, 2196',
    trust: 78,
    isDefault: false,
  },
];

export default function LocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved locations</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_LOCATIONS.map((loc) => (
          <View key={loc.id} style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationName}>{loc.name}</Text>
              {loc.isDefault && <Badge label="Default" variant="green" />}
            </View>
            <Text style={styles.locationAddress}>{loc.address}</Text>
            <View style={styles.trustRow}>
              <Text style={styles.trustLabel}>Trust score: {loc.trust}/100</Text>
            </View>
            <ProgressBar percent={loc.trust} color={C.accent} height={4} />
          </View>
        ))}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(customer)/locations/add')}
          activeOpacity={0.7}
        >
          <Text style={styles.addBtnText}>+ Add new location</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backText: { color: C.muted, fontSize: 15 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  locationCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  locationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationName: { fontSize: 16, fontWeight: '700', color: C.text },
  locationAddress: { fontSize: 13, color: C.muted, lineHeight: 18 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trustLabel: { fontSize: 12, color: C.muted },
  addBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  addBtnText: { color: C.muted, fontSize: 14, fontWeight: '600' },
});
