import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { useAuthStore } from '@/store/authStore';
import { useGPS } from '@/hooks/useGPS';

const CATEGORIES = [
  { id: 'cleaning', label: 'Cleaning', emoji: '🧹' },
  { id: 'beauty', label: 'Beauty', emoji: '💅' },
  { id: 'plumbing', label: 'Plumbing', emoji: '🔧' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡' },
  { id: 'gardening', label: 'Gardening', emoji: '🌿' },
  { id: 'more', label: 'More...', emoji: '➕' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { coords, loading: locationLoading } = useGPS();

  const firstName =
    (user?.user_metadata?.['full_name'] as string | undefined)?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {firstName} 👋</Text>
            <View style={styles.locationBadge}>
              <Text style={styles.locationText}>
                📍 {locationLoading ? 'Locating…' : coords.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(customer)/search')}
          activeOpacity={0.8}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search services or providers...</Text>
        </TouchableOpacity>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Browse services</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() =>
                router.push({ pathname: '/(customer)/search', params: { category: cat.id } })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 6 },
  locationBadge: {
    backgroundColor: C.surface, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, alignSelf: 'flex-start',
  },
  locationText: { color: C.muted, fontSize: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 28, gap: 10,
  },
  searchIcon: { fontSize: 16 },
  searchPlaceholder: { color: C.muted, fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: {
    width: '30%', flexGrow: 1, backgroundColor: C.card, borderWidth: 1,
    borderColor: C.border, borderRadius: 14, padding: 16, alignItems: 'center', gap: 8,
  },
  categoryEmoji: { fontSize: 28 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: C.text, textAlign: 'center' },
});
