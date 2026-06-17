import React, { useState } from 'react';
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
import { Btn } from '@/components/Btn';

const INITIAL_SERVICES = [
  { id: 's1', name: 'Deep Clean (Full home)', price: 'R 650', active: true },
  { id: 's2', name: 'Bedroom Clean', price: 'R 250', active: true },
  { id: 's3', name: 'Kitchen Only', price: 'R 180', active: false },
];

export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [loading, setLoading] = useState(false);

  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => s.id === id ? { ...s, active: !s.active } : s)
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: save services to supabase
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
        <Text style={styles.title}>My services</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {services.map((svc) => (
          <TouchableOpacity
            key={svc.id}
            style={styles.serviceRow}
            onPress={() => toggleService(svc.id)}
            activeOpacity={0.7}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{svc.name}</Text>
              <Text style={styles.servicePrice}>{svc.price} fixed</Text>
            </View>
            <Badge label={svc.active ? 'Active' : 'Off'} variant={svc.active ? 'green' : 'gray'} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addServiceRow} activeOpacity={0.7}>
          <Text style={styles.addServiceText}>+ Add a service</Text>
        </TouchableOpacity>

        <View style={styles.btnWrap}>
          <Btn
            label="Save services"
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
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceName: { fontSize: 14, fontWeight: '700', color: C.text },
  servicePrice: { fontSize: 12, color: C.muted, marginTop: 4 },
  addServiceRow: {
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  addServiceText: { color: C.muted, fontSize: 14, fontWeight: '600' },
  btnWrap: {},
});
