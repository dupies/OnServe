import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';
import { getProviderProfile } from '@/lib/providerService';
import { getSavedLocations } from '@/lib/locationService';
import { createQuoteRequest } from '@/lib/quoteService';
import { supabase } from '@/lib/supabase';

type ServiceType = { id: string; name: string };
const DURATIONS: Array<'24' | '48' | '72'> = ['24', '48', '72'];

export default function QuoteRequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();

  const [serviceTypeId, setServiceTypeId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<'24' | '48' | '72'>('48');
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: provider } = useQuery({
    queryKey: ['provider-profile', providerId],
    queryFn: () => getProviderProfile(providerId!),
    enabled: !!providerId,
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ['service-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_types')
        .select('id, name')
        .order('name');
      if (error) throw new Error(error.message);
      return (data ?? []) as ServiceType[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['saved-locations'],
    queryFn: getSavedLocations,
  });

  useEffect(() => {
    if (locations.length === 0 || locationId) return;
    const def = locations.find((l) => l.isDefault) ?? locations[0];
    setLocationId(def.id);
  }, [locations]);

  const selectedService = serviceTypes.find((s) => s.id === serviceTypeId);
  const selectedLocation = locations.find((l) => l.id === locationId);

  const canSubmit =
    !!serviceTypeId && !!locationId && description.trim().length >= 10 && !submitting;

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await createQuoteRequest({
        serviceTypeId,
        locationId,
        problemDescription: description.trim(),
        expiresInHours: duration,
      });
      router.back();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to post request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Request a quote</Text>

          {/* Provider context card */}
          {provider && (
            <Card style={styles.providerCard}>
              <View style={styles.providerRow}>
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerAvatarText}>
                    {provider.userId.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>Service Provider</Text>
                  {provider.bio ? (
                    <Text style={styles.providerBio} numberOfLines={2}>{provider.bio}</Text>
                  ) : null}
                  <Text style={styles.providerRating}>
                    ⭐ {provider.ratingAverage.toFixed(1)} · {provider.totalJobsCompleted} jobs
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Service type picker */}
          <Text style={styles.label}>Service type</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => { setShowServicePicker((v) => !v); setShowLocationPicker(false); }}
          >
            <Text style={[styles.pickerText, !selectedService && styles.pickerPlaceholder]}>
              {selectedService?.name ?? 'Select a service…'}
            </Text>
            <Text style={styles.pickerArrow}>{showServicePicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showServicePicker && (
            <View style={styles.dropdownList}>
              {serviceTypes.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <ActivityIndicator color={C.accent} size="small" />
                </View>
              ) : (
                serviceTypes.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.dropdownItem}
                    onPress={() => { setServiceTypeId(s.id); setShowServicePicker(false); }}
                  >
                    <Text style={[styles.dropdownLabel, s.id === serviceTypeId && styles.dropdownLabelActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Description */}
          <Text style={styles.label}>Describe the problem</Text>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            placeholder="Be specific — what needs to be done? How urgent?"
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* Location picker */}
          <Text style={styles.label}>Service location</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => { setShowLocationPicker((v) => !v); setShowServicePicker(false); }}
          >
            <Text style={[styles.pickerText, !selectedLocation && styles.pickerPlaceholder]}>
              {selectedLocation
                ? (selectedLocation.customName ?? selectedLocation.formattedAddress)
                : 'Select a location…'}
            </Text>
            <Text style={styles.pickerArrow}>{showLocationPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showLocationPicker && (
            <View style={styles.dropdownList}>
              {locations.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownLabel}>No saved locations</Text>
                </View>
              ) : (
                locations.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={styles.dropdownItem}
                    onPress={() => { setLocationId(l.id); setShowLocationPicker(false); }}
                  >
                    <Text style={[styles.dropdownLabel, l.id === locationId && styles.dropdownLabelActive]}>
                      {l.customName ?? l.formattedAddress}
                      {l.isDefault ? ' (default)' : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Duration */}
          <Text style={styles.label}>Closes in</Text>
          <View style={styles.durRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durChip, duration === d && styles.durChipActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durLabel, duration === d && styles.durLabelActive]}>{d}h</Text>
              </TouchableOpacity>
            ))}
          </View>

          {submitError ? (
            <Text style={styles.errorText}>{submitError}</Text>
          ) : null}

          <Btn
            label="Post job request"
            onPress={handleSubmit}
            variant="accent"
            loading={submitting}
            disabled={!canSubmit}
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
  heading: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 20 },
  providerCard: { marginBottom: 20 },
  providerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  providerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: `${C.accent}22`, borderWidth: 1, borderColor: `${C.accent}44`,
    alignItems: 'center', justifyContent: 'center',
  },
  providerAvatarText: { fontSize: 16, fontWeight: '700', color: C.accent },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '700', color: C.text },
  providerBio: { fontSize: 12, color: C.muted, marginTop: 2 },
  providerRating: { fontSize: 12, color: C.muted, marginTop: 4 },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  pickerText: { fontSize: 15, color: C.text },
  pickerPlaceholder: { color: C.muted },
  pickerArrow: { color: C.muted },
  dropdownList: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dropdownLabel: { fontSize: 15, color: C.text },
  dropdownLabelActive: { color: C.accent, fontWeight: '700' },
  textarea: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: C.text, fontSize: 14, minHeight: 120,
  },
  durRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  durChip: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', backgroundColor: C.surface,
  },
  durChipActive: { backgroundColor: `${C.accent}22`, borderColor: C.accent },
  durLabel: { color: C.muted, fontWeight: '600' },
  durLabelActive: { color: C.accent },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 12 },
});
