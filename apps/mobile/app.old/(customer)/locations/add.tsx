import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';

const LABEL_OPTIONS = ['Home', 'Work', 'Other'];

export default function AddLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('Home');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: save location to supabase with GPS trust verification
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Add location</Text>

          {/* Mock map */}
          <View style={styles.mapBox}>
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text style={styles.mapLabel}>Tap to pin your location</Text>
          </View>

          {/* Address input */}
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter street address..."
            placeholderTextColor={C.muted}
          />

          {/* Label selector */}
          <Text style={styles.label}>Label</Text>
          <View style={styles.labelsRow}>
            {LABEL_OPTIONS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.labelChip, label === l && styles.labelChipActive]}
                onPress={() => setLabel(l)}
              >
                <Text style={[styles.labelText, label === l && styles.labelTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* GPS trust notice */}
          <View style={styles.gpsNotice}>
            <Text style={styles.gpsIcon}>📡</Text>
            <Text style={styles.gpsText}>
              We use GPS to build a trust score for this location, helping verify your address.
            </Text>
          </View>

          <Btn
            label="Save location"
            onPress={handleSave}
            variant="accent"
            loading={loading}
            disabled={address.length < 5}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: { marginBottom: 16 },
  backText: { color: C.muted, fontSize: 15 },
  heading: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 16 },
  mapBox: {
    height: 160,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  mapIcon: { fontSize: 36 },
  mapLabel: { color: C.muted, fontSize: 13 },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 14,
    marginBottom: 16,
  },
  labelsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  labelChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  labelChipActive: { backgroundColor: `${C.accent}22`, borderColor: C.accent },
  labelText: { color: C.muted, fontSize: 13, fontWeight: '500' },
  labelTextActive: { color: C.accent },
  gpsNotice: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 24,
  },
  gpsIcon: { fontSize: 16 },
  gpsText: { flex: 1, fontSize: 13, color: C.muted, lineHeight: 18 },
});
