import { View, Text, ScrollView, StatusBar, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TextField, Card } from '../../src/components';
import { getServiceTypesByCategory } from '@onserve/api';
import { supabase } from '../../src/lib/supabase';
import { commonStyles } from '../../src/utils/styles';
import { showErrorToast } from '../../src/utils/toast';
import { colors } from '@onserve/ui-tokens';
import type { ServiceType } from '@onserve/types';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const categoryId = Array.isArray(params.categoryId)
    ? params.categoryId[0]
    : params.categoryId || '';

  const [services, setServices] = useState<ServiceType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, [categoryId]);

  const loadServices = async () => {
    try {
      if (!categoryId) return;

      const servicesData = await getServiceTypesByCategory(supabase, categoryId);
      setServices(servicesData);
    } catch (error: any) {
      console.error('Failed to load services:', error);
      showErrorToast('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = StyleSheet.create({
    searchBox: {
      marginBottom: 24,
    },
    emptyText: {
      textAlign: 'center' as const,
      paddingVertical: 24,
    },
    serviceCard: {
      marginBottom: 12,
    },
    serviceHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 8,
    },
    price: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

  return (
    <ScrollView style={commonStyles.screenContainer}>
      <StatusBar barStyle="light-content" />
      <View style={commonStyles.screenContent}>
        <Text style={commonStyles.pageTitle}>Search Services</Text>
        <Text style={commonStyles.pageSubtitle}>Find what you need</Text>

        <View style={styles.searchBox}>
          <TextField
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <Card key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.sectionTitle} numberOfLines={1}>
                    {service.name}
                  </Text>
                </View>
                {service.basePrice && (
                  <Text style={styles.price}>R{service.basePrice.toFixed(2)}</Text>
                )}
                {service.hourlyRate && !service.basePrice && (
                  <Text style={styles.price}>R{service.hourlyRate.toFixed(2)}/hr</Text>
                )}
              </View>
              <Text style={commonStyles.textSecondary} numberOfLines={2}>
                {service.description}
              </Text>
              {service.estimatedDurationMins && (
                <Text style={[commonStyles.textTertiary, { marginTop: 8 }]}>
                  ⏱️ {service.estimatedDurationMins} minutes
                </Text>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <Text style={[commonStyles.textTertiary, styles.emptyText]}>
              {searchQuery ? 'No services match your search' : 'No services available'}
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
