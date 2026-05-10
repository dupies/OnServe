import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { C } from '@/lib/colors';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Btn } from '@/components/Btn';
import { listAllProviders } from '@/lib/providerService';
import { useGPS } from '@/hooks/useGPS';

const PAGE_SIZE = 20;

const RATING_FILTERS = [
  { label: 'Any rating', min: 0 },
  { label: '4.5+', min: 4.5 },
  { label: '4.0+', min: 4.0 },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [query, setQuery] = useState('');
  const [minRating, setMinRating] = useState(0);

  const { coords, loading: gpsLoading } = useGPS();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['providers', 'all', coords.lat, coords.lng],
    queryFn: ({ pageParam }) =>
      listAllProviders(coords.lat, coords.lng, PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  });

  const providers = useMemo(() => {
    const all = data?.pages.flatMap((p) => p) ?? [];
    let result = [...all];
    if (minRating > 0) result = result.filter((p) => p.ratingAverage >= minRating);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((p) => p.bio?.toLowerCase().includes(q));
    }
    return result;
  }, [data, minRating, query]);

  const locationLabel = gpsLoading ? 'Locating…' : coords.label;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={category ? `Filter ${category} providers…` : 'Filter providers…'}
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Rating filters */}
        <View style={styles.filtersRow}>
          {RATING_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, minRating === f.min && styles.filterChipActive]}
              onPress={() => setMinRating(f.min)}
            >
              <Text style={[styles.filterLabel, minRating === f.min && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.resultsCount}>
          {isLoading
            ? 'Loading providers…'
            : `${providers.length} providers near ${locationLabel}`}
        </Text>
      </View>

      {/* Provider list */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : providers.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No providers found near {locationLabel}</Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={C.accent} />
              </View>
            ) : null
          }
          renderItem={({ item: p }) => (
            <Card style={styles.providerCard}>
              <View style={styles.providerRow}>
                <Avatar
                  name={p.userId.slice(0, 2).toUpperCase()}
                  size={52}
                  color={C.accent}
                />
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>Service Provider</Text>
                  {p.bio ? (
                    <Text style={styles.specialty} numberOfLines={1}>{p.bio}</Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Text style={styles.distance}>
                      📍 {p.distance_km != null ? `${p.distance_km.toFixed(1)} km` : 'Distance unknown'}
                    </Text>
                    <Text style={styles.rating}>⭐ {p.ratingAverage.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
              <Btn
                label="View profile"
                onPress={() => router.push(`/(customer)/providers/${p.userId}`)}
                variant="accent"
                style={styles.bookBtn}
              />
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  backBtn: { marginBottom: 12 },
  backText: { color: C.muted, fontSize: 15 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, marginBottom: 12, gap: 10,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 14 },
  filtersRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: {
    borderWidth: 1, borderColor: C.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.surface,
  },
  filterChipActive: { backgroundColor: `${C.accent}22`, borderColor: C.accent },
  filterLabel: { color: C.muted, fontSize: 13, fontWeight: '500' },
  filterLabelActive: { color: C.accent },
  resultsCount: { fontSize: 13, color: C.muted, marginBottom: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { color: C.muted, fontSize: 15, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  providerCard: { gap: 14 },
  providerRow: { flexDirection: 'row', gap: 14 },
  providerInfo: { flex: 1, justifyContent: 'center' },
  providerName: { fontSize: 16, fontWeight: '700', color: C.text },
  specialty: { fontSize: 13, color: C.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  distance: { fontSize: 12, color: C.muted },
  rating: { fontSize: 12, color: C.amber },
  bookBtn: {},
  loadingMore: { paddingVertical: 16, alignItems: 'center' },
});
