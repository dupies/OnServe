import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  createBooking,
  acceptBooking,
  startService,
  checkOut,
  updateBookingStatus,
} from '../services/bookingService';
import type { BookingInput } from '@onserve/shared';

export function useCustomerBookings() {
  return useQuery({
    queryKey: ['bookings', 'customer'],
    queryFn: getCustomerBookings,
  });
}

export function useProviderBookings() {
  return useQuery({
    queryKey: ['bookings', 'provider'],
    queryFn: getProviderBookings,
  });
}

// pollWhileConfirmed: the provider's screen refreshes every 10s until the
// customer starts the service (stand-in for push notifications).
export function useBooking(id: string | undefined, opts: { pollWhileConfirmed?: boolean } = {}) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBookingById(id!),
    enabled: !!id,
    refetchInterval: opts.pollWhileConfirmed
      ? (query) => (query.state.data?.status === 'confirmed' ? 10_000 : false)
      : false,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookingInput) => createBooking(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useAcceptBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acceptBooking(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', id] });
    },
  });
}

/** Customer starts the service when the provider arrives. */
export function useStartService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startService(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', id] });
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checkOut(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', id] });
    },
  });
}

/** Either side, before the service starts. A paid booking is refunded in full. */
export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateBookingStatus(id, 'cancelled'),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['payment', id] });
    },
  });
}
