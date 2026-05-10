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
import { Avatar } from '@/components/Avatar';
import { Btn } from '@/components/Btn';
import { useAuthStore } from '@/store/authStore';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const phone = '+27 XX XXX XXXX'; // from auth — readonly

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: update user profile in supabase
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
          <Text style={styles.heading}>Edit profile</Text>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Avatar name={name || 'User'} size={72} color={C.accent} />
            <TouchableOpacity style={styles.changeAvatarBtn}>
              <Text style={styles.changeAvatarText}>Change photo</Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={C.muted}
          />

          <Text style={styles.label}>Phone number</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{phone}</Text>
            <Text style={styles.lockedIcon}>🔒</Text>
          </View>

          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={C.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* ID notice */}
          <View style={styles.idNotice}>
            <Text style={styles.idIcon}>🛡️</Text>
            <Text style={styles.idText}>ID encrypted and stored securely. Verified only, not shared.</Text>
          </View>

          <Btn
            label="Save changes"
            onPress={handleSave}
            variant="accent"
            loading={loading}
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
  avatarSection: { alignItems: 'center', marginBottom: 24, gap: 10 },
  changeAvatarBtn: {},
  changeAvatarText: { color: C.accent, fontSize: 14, fontWeight: '600' },
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
  readonlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    opacity: 0.6,
  },
  readonlyText: { color: C.text, fontSize: 15 },
  lockedIcon: { fontSize: 14 },
  idNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 12,
    marginBottom: 24,
  },
  idIcon: { fontSize: 16 },
  idText: { flex: 1, fontSize: 13, color: C.muted, lineHeight: 18 },
});
