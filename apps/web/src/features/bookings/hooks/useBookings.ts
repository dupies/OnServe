import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  createBooking,
  acceptBooking,
  checkIn,
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

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBookingById(id!),
    enabled: !!id,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checkIn(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checkOut(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateBookingStatus(id, 'cancelled'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}
