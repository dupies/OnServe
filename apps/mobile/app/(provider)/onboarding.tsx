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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';
import { ProgressBar } from '@/components/ProgressBar';

const TOTAL_STEPS = 4;

const SERVICES = ['Cleaning', 'Plumbing', 'Electrical', 'Gardening', 'Beauty', 'Painting', 'Moving', 'Security'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ProviderOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  // Step 3
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Step 4
  const [availableDays, setAvailableDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const toggleService = (s: string) =>
    setSelectedServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleDay = (d: string) =>
    setAvailableDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      // TODO: save provider profile to supabase
      router.replace('/(provider)/jobs');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.progressHeader}>
          <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
          <ProgressBar percent={(step / TOTAL_STEPS) * 100} color={C.purple} height={6} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.heading}>Your profile</Text>
              <Text style={styles.sub}>Tell customers a bit about yourself.</Text>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={C.muted}
              />
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={styles.textarea}
                value={bio}
                onChangeText={setBio}
                placeholder="Briefly describe your experience and what makes you great..."
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.heading}>Verify your ID</Text>
              <Text style={styles.sub}>Upload your South African ID or passport for verification.</Text>
              <TouchableOpacity style={styles.uploadSlot}>
                <Text style={styles.uploadIcon}>📄</Text>
                <Text style={styles.uploadLabel}>Front of ID</Text>
                <Text style={styles.uploadHint}>Tap to upload</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadSlot}>
                <Text style={styles.uploadIcon}>📄</Text>
                <Text style={styles.uploadLabel}>Back of ID</Text>
                <Text style={styles.uploadHint}>Tap to upload</Text>
              </TouchableOpacity>
              <Text style={styles.idNotice}>Your ID is encrypted and only used for verification.</Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.heading}>What do you offer?</Text>
              <Text style={styles.sub}>Select all services you provide.</Text>
              <View style={styles.servicesGrid}>
                {SERVICES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.serviceChip, selectedServices.includes(s) && styles.serviceChipActive]}
                    onPress={() => toggleService(s)}
                  >
                    <Text style={[styles.serviceChipText, selectedServices.includes(s) && styles.serviceChipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.heading}>Availability</Text>
              <Text style={styles.sub}>When are you available to take jobs?</Text>
              {DAYS.map((d) => (
                <View key={d} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{d}</Text>
                  <Switch
                    value={availableDays.includes(d)}
                    onValueChange={() => toggleDay(d)}
                    trackColor={{ false: C.border, true: `${C.purple}88` }}
                    thumbColor={availableDays.includes(d) ? C.purple : C.muted}
                  />
                </View>
              ))}
            </View>
          )}

          <Btn
            label={step === TOTAL_STEPS ? 'Finish setup' : 'Next'}
            onPress={handleNext}
            variant="purple"
          />
          {step > 1 && (
            <>
              <View style={styles.gap} />
              <Btn
                label="Back"
                onPress={() => setStep((s) => s - 1)}
                variant="outline"
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  progressHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 8 },
  stepLabel: { fontSize: 13, color: C.purple, fontWeight: '600' },
  content: { paddingHorizontal: 20 },
  stepContent: { marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 6 },
  sub: { fontSize: 14, color: C.muted, marginBottom: 20 },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 15,
  },
  textarea: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 14,
    minHeight: 120,
  },
  uploadSlot: {
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    backgroundColor: C.surface,
    marginBottom: 12,
    gap: 6,
  },
  uploadIcon: { fontSize: 32 },
  uploadLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  uploadHint: { fontSize: 12, color: C.muted },
  idNotice: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: C.surface,
  },
  serviceChipActive: { backgroundColor: `${C.purple}22`, borderColor: C.purple },
  serviceChipText: { color: C.muted, fontSize: 13, fontWeight: '500' },
  serviceChipTextActive: { color: C.purple },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dayLabel: { fontSize: 15, color: C.text, fontWeight: '600' },
  gap: { height: 10 },
});
