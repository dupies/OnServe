import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBooking, getQuoteForBooking, acceptQuote } from '@onserve/api';
import { cancelBooking } from '@onserve/api';
import { supabase } from '../../../src/lib/supabase';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { Badge } from '../../../src/components/Badge';
import { showToast } from '../../../src/utils/toast';
import { colors } from '@onserve/ui-tokens';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface[0],
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface[2],
  },
  detailRowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  detailValue: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  quoteCard: {
    backgroundColor: colors.surface[1],
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  quoteAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  quoteNote: {
    padding: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface[2],
    backgroundColor: colors.surface[0],
    borderRadius: 8,
  },
  quoteNoteLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  quoteNoteText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  waitingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface[0],
  },
  buttonContainer: {
    gap: 12,
    marginTop: 16,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  providerRating: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 8,
  },
});

export default function QuoteRequestScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch booking
  const { data: booking, isLoading: bookingLoading, refetch: refetchBooking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBooking(supabase, bookingId || ''),
    enabled: !!bookingId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch quote for this booking
  const {
    data: quote,
    isLoading: quoteLoading,
    refetch: refetchQuote,
  } = useQuery({
    queryKey: ['quote', bookingId],
    queryFn: () => getQuoteForBooking(supabase, bookingId || ''),
    enabled: !!bookingId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Subscribe to realtime quote updates
  useEffect(() => {
    if (!bookingId) return;

    // Subscribe to quotes table INSERT events using channel
    const channel = supabase.channel(`quotes:${bookingId}`);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quotes',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          refetchQuote();
          showToast('Provider sent a quote!', 'success');
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [bookingId, refetchQuote]);

  const handleAcceptQuote = async () => {
    try {
      if (!quote) return;

      const result = await acceptQuote(supabase, quote.id, {
        quoteId: quote.id,
        bookingId: bookingId || '',
      });

      showToast('Quote accepted! Proceeding to payment...', 'success');

      // Navigate to payment screen
      router.push({
        pathname: '/(customer)/payment',
        params: { bookingId, quoteId: quote.id },
      });
    } catch (error: any) {
      console.error('Accept quote error:', error);
      showToast(error?.message || 'Failed to accept quote', 'error');
    }
  };

  const handleCancelBooking = async () => {
    try {
      await cancelBooking(supabase, bookingId || '', {
        reason: 'Cancelled by customer - no suitable quote',
      });

      showToast('Booking cancelled', 'info');
      router.back();
    } catch (error: any) {
      console.error('Cancel booking error:', error);
      showToast(error?.message || 'Failed to cancel booking', 'error');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchBooking(), refetchQuote()]);
    } finally {
      setRefreshing(false);
    }
  };

  if (bookingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          {quote ? 'Quote Received' : 'Waiting for Provider...'}
        </Text>

        {/* Booking Details */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>
              {booking?.serviceTypeId || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {booking?.scheduledAt
                ? new Date(booking.scheduledAt).toLocaleDateString() +
                  ' ' +
                  new Date(booking.scheduledAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>
              {booking?.address?.name || 'N/A'}
            </Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>
              {booking?.status || 'pending_quote'}
            </Text>
          </View>
        </Card>

        {quote ? (
          <>
            {/* Quote Details */}
            <Card style={styles.quoteCard}>
              <View style={styles.quoteHeader}>
                <Text style={styles.quoteTitle}>Provider Quote</Text>
                <Badge label="Expires in 24h" color="warning" size="sm" />
              </View>

              {booking?.provider && (
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>
                    {booking.provider.name}
                  </Text>
                  <Text style={styles.providerRating}>
                    Rating: {booking.provider.rating || 'New'}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quoted Amount</Text>
                <Text style={styles.quoteAmount}>
                  R{quote.quotedAmount.toFixed(2)}
                </Text>
              </View>

              <View style={[styles.detailRow, styles.detailRowLast]}>
                <Text style={styles.detailLabel}>Estimated Duration</Text>
                <Text style={styles.detailValue}>
                  {quote.estimatedDuration} hour
                  {quote.estimatedDuration !== 1 ? 's' : ''}
                </Text>
              </View>

              {quote.notes && (
                <View style={styles.quoteNote}>
                  <Text style={styles.quoteNoteLabel}>Provider Note</Text>
                  <Text style={styles.quoteNoteText}>{quote.notes}</Text>
                </View>
              )}
            </Card>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Button
                label="Accept Quote"
                onPress={handleAcceptQuote}
                variant="primary"
              />
              <Button
                label="Decline & Search Again"
                onPress={handleCancelBooking}
                variant="secondary"
              />
            </View>
          </>
        ) : (
          <>
            <Card style={styles.card}>
              <View style={styles.waitingContainer}>
                <Text style={styles.waitingEmoji}>⏳</Text>
                <Text style={styles.waitingTitle}>
                  Waiting for Provider Response
                </Text>
                <Text style={styles.waitingSubtitle}>
                  Your request has been sent to the provider.{'\n'}
                  You'll receive a quote within a few minutes.
                </Text>
              </View>
            </Card>

            <View style={styles.buttonContainer}>
              <Button
                label="Cancel Booking"
                onPress={handleCancelBooking}
                variant="ghost"
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
