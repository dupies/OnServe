import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { C } from '@/lib/colors';
import { Btn } from '@/components/Btn';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type Role = 'customer' | 'provider' | 'both';

const ROLE_OPTIONS: { id: Role; label: string; description: string; emoji: string }[] = [
  {
    id: 'customer',
    label: 'I need services',
    description: 'Book trusted professionals near you for any home service.',
    emoji: '🏠',
  },
  {
    id: 'provider',
    label: 'I provide services',
    description: 'Earn money by offering your skills to customers in your area.',
    emoji: '🛠️',
  },
  {
    id: 'both',
    label: 'Both',
    description: 'Switch between booking services and offering your own.',
    emoji: '⚡',
  },
];

export default function RoleScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const { role: existingRole, isLoading: authLoading, setRole } = useAuthStore((s) => ({
    role: s.role,
    isLoading: s.isLoading,
    setRole: s.setRole,
  }));

  // Redirect users who already have a role (returning users after OTP)
  useEffect(() => {
    if (authLoading) return;
    if (existingRole === 'provider') router.replace('/(provider)/(tabs)/jobs');
    else if (existingRole === 'customer' || existingRole === 'admin') router.replace('/(customer)/');
  }, [existingRole, authLoading]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const effectiveRole = selected === 'both' ? 'customer' : selected;
        await supabase.from('users').upsert(
          { id: user.id, role: effectiveRole, phone: user.phone ?? null },
          { onConflict: 'id' },
        );
        setRole(effectiveRole);
        if (selected === 'provider') {
          router.replace('/(provider)/onboarding');
        } else {
          router.replace('/(customer)/');
        }
      }
    } catch {
      // handle error silently — user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>How will you use OnServe?</Text>
        <Text style={styles.sub}>You can change this any time in settings.</Text>

        <View style={styles.optionsWrap}>
          {ROLE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionCard,
                selected === opt.id && styles.optionSelected,
              ]}
              onPress={() => setSelected(opt.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <Text style={styles.optionDesc}>{opt.description}</Text>
              {selected === opt.id && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Btn
          label="Continue"
          onPress={handleContinue}
          variant="accent"
          loading={loading}
          disabled={!selected}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { padding: 24, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8 },
  sub: { fontSize: 14, color: C.muted, marginBottom: 32 },
  optionsWrap: { gap: 12, marginBottom: 32 },
  optionCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  optionSelected: {
    borderColor: C.accent,
    backgroundColor: `${C.accent}11`,
  },
  optionEmoji: { fontSize: 28, marginBottom: 10 },
  optionLabel: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 6 },
  optionDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
  checkBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#000', fontWeight: '800', fontSize: 12 },
});
