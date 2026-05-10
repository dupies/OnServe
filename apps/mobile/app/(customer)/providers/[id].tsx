import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { C } from '@/lib/colors';
import { Badge } from '@/components/Badge';
import { Btn } from '@/components/Btn';
import { ProgressBar } from '@/components/ProgressBar';
import { Card } from '@/components/Card';
import { getProviderProfile } from '@/lib/providerService';

export default function ProviderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: provider, isLoading, error } = useQuery({
    queryKey: ['provider-profile', id],
    queryFn: () => getProviderProfile(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Provider not found</Text>
          <Btn label="Go back" onPress={() => router.back()} variant="outline" style={styles.goBackBtn} />
        </View>
      </SafeAreaView>
    );
  }

  const initials = provider.userId.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>Service Provider</Text>
          <Text style={styles.specialty}>General service specialist</Text>
          <View style={styles.badgeRow}>
            {provider.verificationStatus === 'verified' && <Badge label="✓ Verified" variant="green" />}
            <Text style={styles.rating}>⭐ {provider.ratingAverage.toFixed(1)}</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{provider.totalJobsCompleted}</Text>
            <Text style={styles.statLabel}>Jobs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.round(provider.completionRate * 100)}%</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxLast]}>
            <Text style={styles.statValue}>{Math.round(provider.reputationScore)}</Text>
            <Text style={styles.statLabel}>Trust</Text>
          </View>
        </View>

        {/* Trust score */}
        <Card style={styles.trustCard}>
          <View style={styles.trustRow}>
            <Text style={styles.trustLabel}>Trust Score</Text>
            <Text style={styles.trustValue}>{Math.round(provider.reputationScore)}/100</Text>
          </View>
          <ProgressBar percent={provider.reputationScore} color={C.accent} height={8} />
          <View style={styles.trustMeta}>
            <Text style={styles.trustMetaText}>
              Completion: {Math.round(provider.completionRate * 100)}%
            </Text>
            <Text style={styles.trustMetaText}>
              Disputes: {provider.disputeRate < 0.05 ? 'Low' : 'Medium'}
            </Text>
          </View>
        </Card>

        {/* Bio */}
        {provider.bio ? (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <Card style={styles.bioCard}>
              <Text style={styles.bioText}>{provider.bio}</Text>
            </Card>
          </>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Btn
            label="Book now"
            onPress={() => router.push({ pathname: '/(customer)/payment' })}
            variant="accent"
          />
          <View style={styles.gap} />
          <Btn
            label="Request a quote"
            onPress={() =>
              router.push({
                pathname: '/(customer)/quote-request',
                params: { providerId: provider.userId },
              })
            }
            variant="outline"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  errorText: { color: C.muted, fontSize: 16 },
  goBackBtn: { marginTop: 8 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: { marginBottom: 16 },
  backText: { color: C.muted, fontSize: 15 },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${C.accent}22`, borderWidth: 2, borderColor: `${C.accent}44`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: C.accent },
  name: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
  specialty: { fontSize: 14, color: C.muted, marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rating: { fontSize: 13, color: C.amber },
  statsGrid: {
    flexDirection: 'row', backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, borderRadius: 14, marginBottom: 14, overflow: 'hidden',
  },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRightWidth: 1, borderRightColor: C.border,
  },
  statBoxLast: { borderRightWidth: 0 },
  statValue: { fontSize: 20, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
  trustCard: { marginBottom: 20, gap: 10 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trustLabel: { fontSize: 13, color: C.muted },
  trustValue: { fontSize: 14, fontWeight: '700', color: C.accent },
  trustMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  trustMetaText: { fontSize: 11, color: C.muted },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 10 },
  bioCard: { marginBottom: 20 },
  bioText: { fontSize: 14, color: C.muted, lineHeight: 20 },
  actions: { marginTop: 24 },
  gap: { height: 12 },
});
