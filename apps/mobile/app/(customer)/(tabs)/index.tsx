import { View, Text, ScrollView, StatusBar, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Card, Badge } from '../../../src/components';
import { useAuthStore } from '../../../src/store/authStore';
import { getAllServiceCategories, getAllServiceTypes } from '@onserve/api';
import { supabase } from '../../../src/lib/supabase';
import { commonStyles } from '../../../src/utils/styles';
import { showErrorToast } from '../../../src/utils/toast';
import { colors } from '@onserve/ui-tokens';
import type { ServiceCategory, ServiceType } from '@onserve/types';

const SERVICE_ICONS: Record<string, string> = {
  cleaning: '🧹',
  plumbing: '🔧',
  beauty: '💅',
  electrical: '⚡',
  gardening: '🌿',
  photography: '📷',
  catering: '🍽️',
  tutoring: '📚',
  painting: '🎨',
  hvac: '❄️',
  roofing: '🏠',
  carpentry: '🪵',
};

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const categoriesData = await getAllServiceCategories(supabase);
      setCategories(categoriesData.slice(0, 8)); // Show top 8 categories
    } catch (error: any) {
      console.error('Failed to load services:', error);
      showErrorToast('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const getIconForCategory = (categoryName: string): string => {
    const slug = categoryName.toLowerCase().replace(/\s+/g, '');
    return SERVICE_ICONS[slug] || '✨';
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const styles = StyleSheet.create({
    icon: {
      fontSize: 24,
    },
    cardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    serviceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    serviceCard: {
      flex: 1,
      minWidth: '45%',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface[1],
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surface[2],
    },
    serviceIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    serviceName: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.primary,
      textAlign: 'center',
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
  });

  return (
    <ScrollView style={commonStyles.screenContainer}>
      <StatusBar barStyle="light-content" />
      <View style={commonStyles.screenContent}>
        {/* Greeting Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={commonStyles.pageTitle}>
            {greeting()}, {(user as any)?.user_metadata?.name || (user as any)?.full_name || 'Guest'}
          </Text>
          <Text style={commonStyles.pageSubtitle}>Find and book services</Text>
        </View>

        {/* Quick Search Card */}
        <Card style={commonStyles.cardSpacing}>
          <View style={styles.cardContent}>
            <View>
              <Text style={commonStyles.sectionTitle}>Quick Search</Text>
              <Text style={commonStyles.textTertiary}>Find services near you</Text>
            </View>
            <Text style={styles.icon}>🔍</Text>
          </View>
        </Card>

        {/* Popular Services */}
        <Text style={[commonStyles.sectionTitle, { marginBottom: 12 }]}>
          Popular Services
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : categories.length > 0 ? (
          <View style={styles.serviceGrid}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => {
                  // Navigate to search with category filter
                  router.push({
                    pathname: '/(customer)/search',
                    params: { categoryId: category.id },
                  });
                }}
                style={styles.serviceCard}
              >
                <Text style={styles.serviceIcon}>
                  {getIconForCategory(category.name)}
                </Text>
                <Text style={styles.serviceName} numberOfLines={2}>
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={commonStyles.textTertiary}>
            Unable to load services. Please try again.
          </Text>
        )}

        {/* Quick Actions */}
        <Text style={[commonStyles.sectionTitle, { marginBottom: 12, marginTop: 24 }]}>
          Quick Actions
        </Text>

        <Card
          style={commonStyles.cardSpacing}
          onPress={() => router.push('/(customer)/(tabs)/bookings')}
        >
          <View style={styles.cardContent}>
            <View>
              <Text style={commonStyles.sectionTitle}>My Bookings</Text>
              <Text style={commonStyles.textTertiary}>View and manage</Text>
            </View>
            <Text style={styles.icon}>📅</Text>
          </View>
        </Card>

        <Card
          style={commonStyles.cardSpacing}
          onPress={() => router.push('/(customer)/(tabs)/profile')}
        >
          <View style={styles.cardContent}>
            <View>
              <Text style={commonStyles.sectionTitle}>Profile</Text>
              <Text style={commonStyles.textTertiary}>Manage your account</Text>
            </View>
            <Text style={styles.icon}>👤</Text>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
