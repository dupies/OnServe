import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  getProviderProfile,
  getSavedLocations,
  getAllServiceTypes,
} from '@onserve/api';
import { createBooking } from '@onserve/api';
import { supabase } from '../../src/lib/supabase';
import { useAppContext } from '@onserve/core';
import { Button } from '../../src/components/Button';
import { TextField } from '../../src/components/TextField';
import { Card } from '../../src/components/Card';
import { showToast } from '../../src/utils/toast';
import { calculateFees } from '@onserve/shared';
import { colors } from '@onserve/ui-tokens';
import { format } from 'date-fns';

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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  selectBox: {
    backgroundColor: colors.surface[1],
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surface[2],
  },
  selectText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  selectPlaceholder: {
    color: colors.text.muted,
    fontSize: 16,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeField: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface[0],
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: 0,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalCloseBtn: {
    fontSize: 20,
    color: colors.text.secondary,
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface[2],
  },
  listItemText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  estimateCard: {
    marginBottom: 24,
    backgroundColor: colors.surface[1],
    borderWidth: 1,
    borderColor: colors.primary,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  estimateLabel: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  estimateValue: {
    color: colors.text.primary,
    fontSize: 14,
  },
  estimateTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estimateTotalLabel: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  estimateTotalValue: {
    fontWeight: 'bold',
    color: colors.primary,
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface[0],
  },
});

export default function BookingFormScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { user } = useAppContext();

  const [formState, setFormState] = useState({
    serviceTypeId: '',
    serviceTypeName: '',
    scheduledDate: new Date(),
    scheduledTime: new Date(),
    addressId: '',
    addressName: '',
    notes: '',
  });

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch provider details
  const { data: provider, isLoading: providerLoading } = useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => getProviderProfile(supabase, providerId || ''),
    enabled: !!providerId,
  });

  // Fetch user locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['locations', user?.id],
    queryFn: () => getSavedLocations(supabase),
    enabled: !!user?.id,
  });

  // Fetch service types
  const { data: serviceTypes, isLoading: servicesLoading } = useQuery({
    queryKey: ['serviceTypes'],
    queryFn: () => getAllServiceTypes(supabase),
  });

  // Calculate fees based on selected service type
  const basePrice = 50; // Placeholder: should come from provider's service pricing
  const estimate = formState.serviceTypeId && basePrice
    ? calculateFees(basePrice)
    : null;

  const handleDateInput = (text: string) => {
    // Simple date input handling (YYYY-MM-DD format)
    try {
      const date = new Date(text);
      if (!isNaN(date.getTime())) {
        setFormState({ ...formState, scheduledDate: date });
      }
    } catch (e) {
      // Invalid date, ignore
    }
  };

  const handleTimeInput = (text: string) => {
    // Simple time input handling (HH:MM format)
    const parts = text.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    if (hours !== undefined && minutes !== undefined && !isNaN(hours) && !isNaN(minutes)) {
      const time = new Date();
      time.setHours(hours, minutes);
      setFormState({ ...formState, scheduledTime: time });
    }
  };

  const handleSelectService = (serviceId: string, serviceName: string) => {
    setFormState({ ...formState, serviceTypeId: serviceId, serviceTypeName: serviceName });
    setShowServiceModal(false);
  };

  const handleSelectLocation = (locationId: string, locationName: string) => {
    setFormState({ ...formState, addressId: locationId, addressName: locationName });
    setShowLocationModal(false);
  };

  const handleSubmit = async () => {
    try {
      // Validate form
      if (!formState.serviceTypeId || !formState.addressId) {
        showToast('Please fill all required fields', 'error');
        return;
      }

      setLoading(true);

      // Combine date and time
      const scheduledAt = new Date(
        formState.scheduledDate.getFullYear(),
        formState.scheduledDate.getMonth(),
        formState.scheduledDate.getDate(),
        formState.scheduledTime.getHours(),
        formState.scheduledTime.getMinutes()
      ).toISOString();

      // Create booking
      const booking = await createBooking(
        supabase,
        {
          serviceTypeId: formState.serviceTypeId,
          providerId: providerId,
          scheduledAt,
          addressId: formState.addressId,
          notes: formState.notes || undefined,
        },
        user?.id || ''
      );

      showToast('Booking created! Waiting for provider quote...', 'success');

      // Navigate to quote request screen
      router.push({
        pathname: '/(customer)/quote-request/[bookingId]',
        params: { bookingId: booking.id },
      });
    } catch (error: any) {
      console.error('Booking error:', error);
      showToast(error?.message || 'Failed to create booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (providerLoading || locationsLoading || servicesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Book Service
        </Text>

        {/* Service Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Service Type *</Text>
          <Pressable
            onPress={() => setShowServiceModal(true)}
            style={styles.selectBox}
          >
            <Text
              style={
                formState.serviceTypeId
                  ? styles.selectText
                  : styles.selectPlaceholder
              }
            >
              {formState.serviceTypeName || 'Select service...'}
            </Text>
          </Pressable>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
          <TextField
            placeholder="2024-12-25"
            value={formState.scheduledDate instanceof Date && !isNaN(formState.scheduledDate.getTime()) ? format(formState.scheduledDate, 'yyyy-MM-dd') : ''}
            onChangeText={handleDateInput}
          />
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Time (HH:MM) *</Text>
          <TextField
            placeholder="14:30"
            value={formState.scheduledTime instanceof Date && !isNaN(formState.scheduledTime.getTime()) ? format(formState.scheduledTime, 'HH:mm') : ''}
            onChangeText={handleTimeInput}
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Location *</Text>
          <Pressable
            onPress={() => setShowLocationModal(true)}
            style={styles.selectBox}
          >
            <Text
              style={
                formState.addressId
                  ? styles.selectText
                  : styles.selectPlaceholder
              }
            >
              {formState.addressName || 'Select location...'}
            </Text>
          </Pressable>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Special Instructions (Optional)</Text>
          <TextField
            placeholder="Add any special requests..."
            value={formState.notes}
            onChangeText={(text) =>
              setFormState({ ...formState, notes: text })
            }
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Price Estimate */}
        {estimate && (
          <Card style={styles.estimateCard}>
            <Text style={styles.label}>Price Estimate</Text>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Service Fee</Text>
              <Text style={styles.estimateValue}>
                R{estimate.servicePrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Platform Fee (10%)</Text>
              <Text style={styles.estimateValue}>
                R{estimate.platformFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Transaction Fee</Text>
              <Text style={styles.estimateValue}>
                R{estimate.transactionFee.toFixed(2)}
              </Text>
            </View>
            <View style={styles.estimateTotal}>
              <Text style={styles.estimateTotalLabel}>Total</Text>
              <Text style={styles.estimateTotalValue}>
                R{estimate.totalCharged.toFixed(2)}
              </Text>
            </View>
          </Card>
        )}

        <Button
          label={loading ? 'Creating booking...' : 'Request Quote'}
          onPress={handleSubmit}
          disabled={
            loading ||
            !formState.serviceTypeId ||
            !formState.addressId
          }
        />
      </View>

      {/* Service Type Modal */}
      <Modal
        visible={showServiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowServiceModal(false)}
        >
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service</Text>
              <Pressable onPress={() => setShowServiceModal(false)}>
                <Text style={styles.modalCloseBtn}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={serviceTypes || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.listItem}
                  onPress={() =>
                    handleSelectService(item.id, item.name)
                  }
                >
                  <Text style={styles.listItemText}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.estimateLabel}>
                      {item.description}
                    </Text>
                  )}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLocationModal(false)}
        >
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <Pressable onPress={() => setShowLocationModal(false)}>
                <Text style={styles.modalCloseBtn}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={locations || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.listItem}
                  onPress={() =>
                    handleSelectLocation(item.id, item.customName || item.label)
                  }
                >
                  <Text style={styles.listItemText}>
                    {item.customName || item.label}
                  </Text>
                  <Text style={styles.estimateLabel}>
                    {item.formattedAddress}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
