import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getBooking, getQuote } from '@onserve/api';
import { supabase } from '../../src/lib/supabase';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { showToast } from '../../src/utils/toast';
import { colors } from '@onserve/ui-tokens';
import { calculateFees } from '@onserve/shared';

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
  detailLabel: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  detailValue: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  feeBreakdown: {
    marginBottom: 24,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface[0],
  },
  placeholderText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
});

export default function PaymentScreen() {
  const { bookingId, quoteId } = useLocalSearchParams<{
    bookingId: string;
    quoteId: string;
  }>();
  const [processing, setProcessing] = useState(false);

  // Fetch booking
  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBooking(supabase, bookingId || ''),
    enabled: !!bookingId,
  });

  // Fetch quote
  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => getQuote(supabase, quoteId || ''),
    enabled: !!quoteId,
  });

  // Calculate fee breakdown
  const feeBreakdown = quote
    ? calculateFees(quote.quotedAmount)
    : null;

  const handlePayment = async () => {
    try {
      setProcessing(true);
      showToast('Redirecting to payment gateway...', 'info');

      // In Phase 4, this will redirect to Ozow payment gateway
      // For now, just show a placeholder message
      setTimeout(() => {
        showToast(
          'Payment integration coming in Phase 4',
          'info'
        );
        setProcessing(false);
      }, 1000);
    } catch (error: any) {
      console.error('Payment error:', error);
      showToast(error?.message || 'Payment processing failed', 'error');
      setProcessing(false);
    }
  };

  if (bookingLoading || quoteLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Confirm Payment</Text>

        {/* Service Summary */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Service Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>
              {booking?.serviceTypeId || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Provider</Text>
            <Text style={styles.detailValue}>
              {booking?.provider?.name || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scheduled</Text>
            <Text style={styles.detailValue}>
              {booking?.scheduledAt
                ? new Date(booking.scheduledAt).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
        </Card>

        {/* Quote Details */}
        {quote && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Quote</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quoted Amount</Text>
              <Text style={styles.detailValue}>
                R{quote.quotedAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>
                {quote.estimatedDuration} hour
                {quote.estimatedDuration !== 1 ? 's' : ''}
              </Text>
            </View>
          </Card>
        )}

        {/* Fee Breakdown */}
        {feeBreakdown && (
          <Card style={[styles.card, styles.feeBreakdown]}>
            <Text style={styles.cardTitle}>Payment Breakdown</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service Price</Text>
              <Text style={styles.detailValue}>
                R{feeBreakdown.servicePrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Platform Fee (10%)</Text>
              <Text style={styles.detailValue}>
                R{feeBreakdown.platformFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction Fee</Text>
              <Text style={styles.detailValue}>
                R{feeBreakdown.transactionFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subtotal</Text>
              <Text style={styles.detailValue}>
                R{feeBreakdown.subtotal.toFixed(2)}
              </Text>
            </View>
          </Card>
        )}

        {/* Total Amount */}
        {feeBreakdown && (
          <Text style={styles.totalAmount}>
            R{feeBreakdown.totalCharged.toFixed(2)}
          </Text>
        )}

        {/* Placeholder Message */}
        <Text style={styles.placeholderText}>
          Payment processing integration coming in Phase 4.{'\n'}
          This will redirect to Ozow payment gateway.
        </Text>

        {/* Payment Button */}
        <Button
          label={processing ? 'Processing...' : 'Proceed to Payment'}
          onPress={handlePayment}
          disabled={processing}
        />

        {/* Back Button */}
        <Button
          label="Cancel"
          onPress={() => router.back()}
          variant="ghost"
        />
      </View>
    </ScrollView>
  );
}
