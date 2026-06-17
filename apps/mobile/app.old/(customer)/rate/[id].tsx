import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/lib/colors';
import { Avatar } from '@/components/Avatar';
import { Btn } from '@/components/Btn';
import { Card } from '@/components/Card';

const TAGS = ['On time', 'Professional', 'Friendly', 'Would rebook'];

export default function RateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // TODO: submit rating + release escrow via supabase
      router.replace('/(customer)/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Rate & review</Text>

        <View style={styles.providerRow}>
          <Avatar name="Sipho Dlamini" size={56} color={C.purple} />
          <Text style={styles.providerName}>Sipho Dlamini</Text>
        </View>

        {/* Star rating */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tags */}
        <View style={styles.tagsWrap}>
          {TAGS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tagChip, selectedTags.includes(t) && styles.tagChipActive]}
              onPress={() => toggleTag(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tagLabel, selectedTags.includes(t) && styles.tagLabelActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Escrow notice */}
        <Card style={styles.escrowCard}>
          <Text style={styles.escrowText}>
            💰 Submitting releases R 450 from escrow to the provider.
          </Text>
        </Card>

        <Btn
          label="Submit & release"
          onPress={handleSubmit}
          variant="accent"
          loading={loading}
          disabled={rating === 0}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  heading: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 20 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  providerName: { fontSize: 17, fontWeight: '700', color: C.text },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  star: { fontSize: 36, color: C.border },
  starActive: { color: C.amber },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  tagChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.surface,
  },
  tagChipActive: { backgroundColor: `${C.accent}22`, borderColor: C.accent },
  tagLabel: { color: C.muted, fontSize: 13, fontWeight: '500' },
  tagLabelActive: { color: C.accent },
  escrowCard: { marginBottom: 24 },
  escrowText: { color: C.amber, fontSize: 13, lineHeight: 18 },
});
