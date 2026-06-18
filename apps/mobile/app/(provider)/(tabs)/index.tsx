import { View, Text, ScrollView, StatusBar, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Card, Badge } from '../../../src/components';
import { useAuthStore } from '../../../src/store/authStore';
import { getProviderBookings } from '@onserve/api';
import { supabase } from '../../../src/lib/supabase';
import { commonStyles } from '../../../src/utils/styles';
import { showErrorToast } from '../../../src/utils/toast';
import { colors } from '@onserve/ui-tokens';
import type { Booking } from '@onserve/types';

export default function ProviderJobsScreen() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, [user?.id]);

  const loadBookings = async () => {
    try {
      if (!user?.id) return;

      const bookingsData = await getProviderBookings(supabase, user.id);
      // Show only active/pending bookings - filter by status
      const activeBookings = (bookingsData as any[]).filter(
        (b) => b.status === 'confirmed' || b.status === 'in_progress'
      );
      setBookings(activeBookings as unknown as Booking[]);
    } catch (error: any) {
      console.error('Failed to load bookings:', error);
      showErrorToast('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'warning';
      case 'in_progress':
        return 'success';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const styles = StyleSheet.create({
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    emptyText: {
      textAlign: 'center' as const,
      paddingVertical: 24,
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
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={commonStyles.pageTitle}>Jobs</Text>
          <Text style={commonStyles.pageSubtitle}>Manage your bookings</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : bookings.length > 0 ? (
          bookings.map((booking: any) => (
            <Card key={booking.id} style={commonStyles.cardSpacing}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.sectionTitle} numberOfLines={1}>
                    Service #{booking.id.slice(0, 8)}
                  </Text>
                </View>
                <Badge
                  label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  color={getStatusColor(booking.status)}
                />
              </View>
              <Text style={commonStyles.textSecondary}>
                {formatDate(booking.scheduledAt || booking.scheduled_at || new Date().toISOString())}
              </Text>
              <Text style={commonStyles.textTertiary}>
                Customer Booking • R{(booking.totalAmount || booking.total_amount || 0).toFixed(2)}
              </Text>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={[commonStyles.textTertiary, styles.emptyText]}>
              No active job requests at the moment
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
