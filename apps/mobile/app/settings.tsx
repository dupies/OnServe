import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookingNotifs, setBookingNotifs] = useState(true);
  const [promoNotifs, setPromoNotifs] = useState(false);
  const [locationData, setLocationData] = useState(true);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This action is irreversible. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: delete account via supabase
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.section}>
          {[
            { label: 'Edit profile', onPress: () => router.push('/(customer)/profile/edit') },
            { label: 'Phone number', onPress: () => {} },
            { label: 'Payment methods', onPress: () => router.push('/(customer)/payment') },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, i < arr.length - 1 && styles.menuRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications section */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.section}>
          <View style={[styles.toggleRow, styles.menuRowBorder]}>
            <Text style={styles.menuLabel}>Booking updates</Text>
            <Switch
              value={bookingNotifs}
              onValueChange={setBookingNotifs}
              trackColor={{ false: C.border, true: `${C.accent}88` }}
              thumbColor={bookingNotifs ? C.accent : C.muted}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.menuLabel}>Promotions</Text>
            <Switch
              value={promoNotifs}
              onValueChange={setPromoNotifs}
              trackColor={{ false: C.border, true: `${C.accent}88` }}
              thumbColor={promoNotifs ? C.accent : C.muted}
            />
          </View>
        </View>

        {/* Privacy section */}
        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.section}>
          <View style={[styles.toggleRow, styles.menuRowBorder]}>
            <View>
              <Text style={styles.menuLabel}>Location data</Text>
              <Text style={styles.menuSub}>Used to build trust scores</Text>
            </View>
            <Switch
              value={locationData}
              onValueChange={setLocationData}
              trackColor={{ false: C.border, true: `${C.accent}88` }}
              thumbColor={locationData ? C.accent : C.muted}
            />
          </View>
          <TouchableOpacity style={styles.menuRow} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <Text style={[styles.menuLabel, styles.dangerLabel]}>Delete account</Text>
            <Text style={[styles.menuArrow, { color: C.red }]}>›</Text>
          </TouchableOpacity>
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
  sectionLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  section: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  menuLabel: { fontSize: 15, color: C.text },
  menuSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  menuArrow: { color: C.muted, fontSize: 20 },
  dangerLabel: { color: C.red },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
