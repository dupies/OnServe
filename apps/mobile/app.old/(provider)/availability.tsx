import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';

const DAYS = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

export default function AvailabilityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<Record<string, boolean>>({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: save availability to supabase
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Availability</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Mock map with service radius */}
        <View style={styles.mapBox}>
          <View style={styles.radiusCircle}>
            <View style={styles.centerDot} />
          </View>
          <Text style={styles.mapLabel}>Service radius · 10 km</Text>
        </View>

        {/* Day toggles */}
        <Text style={styles.sectionTitle}>Available days</Text>
        {DAYS.map((d) => (
          <View key={d.key} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{d.label}</Text>
            <Switch
              value={days[d.key]}
              onValueChange={(v) => setDays((prev) => ({ ...prev, [d.key]: v }))}
              trackColor={{ false: C.border, true: `${C.purple}88` }}
              thumbColor={days[d.key] ? C.purple : C.muted}
            />
          </View>
        ))}

        <View style={styles.btnWrap}>
          <Btn
            label="Save settings"
            onPress={handleSave}
            variant="purple"
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backText: { color: C.muted, fontSize: 15 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  mapBox: {
    height: 160,
    backgroundColor: '#130D1F',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 10,
  },
  radiusCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: `${C.purple}66`,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.purple },
  mapLabel: { color: C.muted, fontSize: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 8 },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dayLabel: { fontSize: 15, color: C.text },
  btnWrap: { marginTop: 24 },
});
