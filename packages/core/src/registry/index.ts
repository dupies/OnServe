import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Booking,
  BookingStatus,
  QuoteRequest,
  Quote,
  SavedLocation,
  User,
  PaymentRecord,
} from '@onserve/types';

/**
 * Action execution context provided to all action handlers.
 * Includes authenticated Supabase client for database access.
 */
export interface ActionContext {
  supabase: SupabaseClient;
  userId?: string;
}

/**
 * Base action definition with schema and handler.
 * All actions follow this pattern for AI SDK integration.
 */
export interface Action<TParams = any, TResult = any> {
  description: string;
  parameters: z.ZodSchema<TParams>;
  execute: (params: TParams, context: ActionContext) => Promise<TResult>;
}

/**
 * BOOKING ACTIONS
 * Operations for creating, querying, and managing service bookings.
 */
export const bookingActions: Record<string, Action> = {
  createBooking: {
    description: 'Create a new service booking for a customer',
    parameters: z.object({
      serviceTypeId: z.string().uuid().describe('The service type ID'),
      providerId: z.string().uuid().optional().describe('Provider ID if booking with a specific provider'),
      scheduledAt: z.string().datetime().describe('Scheduled booking date and time'),
      addressId: z.string().uuid().describe('Delivery address ID'),
      notes: z.string().optional().describe('Customer notes or special requests'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<Booking> => {
      const { data, error } = await context.supabase
        .from('bookings')
        .insert({
          customer_id: context.userId,
          service_type_id: params.serviceTypeId,
          provider_id: params.providerId || null,
          location_id: params.addressId,
          booking_type: 'instant',
          status: 'pending',
          scheduled_at: params.scheduledAt,
          customer_notes: params.notes || null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as Booking;
    },
  } as Action,

  getBookingStatus: {
    description: 'Get the current status and details of a booking',
    parameters: z.object({
      bookingId: z.string().uuid().describe('The booking ID'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<Booking | null> => {
      const { data, error } = await context.supabase
        .from('bookings')
        .select('*')
        .eq('id', params.bookingId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as Booking | null;
    },
  } as Action,

  cancelBooking: {
    description: 'Cancel an active booking',
    parameters: z.object({
      bookingId: z.string().uuid().describe('The booking ID to cancel'),
      reason: z.string().optional().describe('Cancellation reason'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<Booking> => {
      const { data, error } = await context.supabase
        .from('bookings')
        .update({
          status: 'cancelled' as BookingStatus,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: params.reason || null,
        })
        .eq('id', params.bookingId)
        .select('*')
        .single();

      if (error) throw error;
      return data as Booking;
    },
  } as Action,

  updateBookingDate: {
    description: 'Reschedule an existing booking to a new date',
    parameters: z.object({
      bookingId: z.string().uuid().describe('The booking ID'),
      newDate: z.string().datetime().describe('New scheduled date and time'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<Booking> => {
      const { data, error } = await context.supabase
        .from('bookings')
        .update({
          scheduled_at: params.newDate,
        })
        .eq('id', params.bookingId)
        .select('*')
        .single();

      if (error) throw error;
      return data as Booking;
    },
  } as Action,

  listActiveBookings: {
    description: 'Get all active bookings for the current customer',
    parameters: z.object({
      limit: z.number().optional().default(20).describe('Number of bookings to return'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<Booking[]> => {
      const { data, error } = await context.supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', context.userId)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .order('scheduled_at', { ascending: false })
        .limit(params.limit);

      if (error) throw error;
      return data as Booking[];
    },
  } as Action,
};

/**
 * PROVIDER ACTIONS
 * Operations for searching and managing service providers.
 */
export const providerActions: Record<string, Action> = {
  searchProviders: {
    description: 'Find service providers near a location matching service type',
    parameters: z.object({
      serviceTypeId: z.string().uuid().describe('Service type to search for'),
      latitude: z.number().describe('Latitude of search location'),
      longitude: z.number().describe('Longitude of search location'),
      radiusKm: z.number().optional().default(10).describe('Search radius in kilometers'),
      limit: z.number().optional().default(20).describe('Maximum providers to return'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<
      Array<{
        id: string;
        name: string;
        avgRating: number;
        reviewCount: number;
        distance: number;
      }>
    > => {
      const { data, error } = await context.supabase.rpc('search_providers_nearby', {
        service_type_id: params.serviceTypeId,
        user_lat: params.latitude,
        user_lng: params.longitude,
        radius_km: params.radiusKm,
        result_limit: params.limit,
      });

      if (error) throw error;
      return data || [];
    },
  } as Action,

  getProviderProfile: {
    description: 'Get detailed profile information for a service provider',
    parameters: z.object({
      providerId: z.string().uuid().describe('The provider ID'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<any> => {
      const { data, error } = await context.supabase
        .from('users')
        .select(
          `
        id,
        full_name,
        avatar_url,
        phone_number,
        bio,
        created_at,
        provider_profiles!inner(
          avg_rating,
          review_count,
          service_types,
          hourly_rate,
          is_verified
        )
      `
        )
        .eq('id', params.providerId)
        .single();

      if (error) throw error;
      return data;
    },
  } as Action,

  acceptJob: {
    description: 'Accept a job offer or booking as a provider',
    parameters: z.object({
      bookingId: z.string().uuid().describe('The booking ID to accept'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<Booking> => {
      const { data, error } = await context.supabase
        .from('bookings')
        .update({
          provider_id: context.userId,
          status: 'confirmed' as BookingStatus,
        })
        .eq('id', params.bookingId)
        .select('*')
        .single();

      if (error) throw error;
      return data as Booking;
    },
  } as Action,

  completeJob: {
    description: 'Mark a job as completed by the provider',
    parameters: z.object({
      bookingId: z.string().uuid().describe('The booking ID to complete'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<Booking> => {
      const { data, error } = await context.supabase
        .from('bookings')
        .update({
          status: 'completed' as BookingStatus,
          provider_checked_out_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', params.bookingId)
        .select('*')
        .single();

      if (error) throw error;
      return data as Booking;
    },
  } as Action,

  getProviderEarnings: {
    description: 'Get earnings summary for a provider',
    parameters: z.object({
      periodDays: z.number().optional().default(30).describe('Number of days to look back'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<{
      totalEarnings: number;
      completedJobs: number;
      avgJobValue: number;
      period: string;
    }> => {
      const { data, error } = await context.supabase.rpc('get_provider_earnings', {
        provider_id: context.userId,
        days: params.periodDays,
      });

      if (error) throw error;
      return data || { totalEarnings: 0, completedJobs: 0, avgJobValue: 0, period: 'N/A' };
    },
  } as Action,
};

/**
 * PAYMENT ACTIONS
 * Operations for initiating and tracking payments.
 */
export const paymentActions: Record<string, Action> = {
  initiatePayment: {
    description: 'Initiate a payment transaction for a booking',
    parameters: z.object({
      bookingId: z.string().uuid().describe('The booking ID to pay for'),
      amount: z.number().positive().describe('Amount to pay in local currency'),
      paymentMethod: z.enum(['card', 'mobile_money', 'escrow']).describe('Payment method'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<{ transactionId: string; status: string; redirectUrl?: string }> => {
      const { data, error } = await context.supabase
        .from('payments')
        .insert({
          booking_id: params.bookingId,
          customer_id: context.userId,
          amount: params.amount,
          payment_method: params.paymentMethod,
          status: 'pending',
        })
        .select('id, status')
        .single();

      if (error) throw error;
      return {
        transactionId: data.id,
        status: data.status,
      };
    },
  } as Action,

  getPaymentStatus: {
    description: 'Check the status of a payment transaction',
    parameters: z.object({
      transactionId: z.string().uuid().describe('The payment transaction ID'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<PaymentRecord | null> => {
      const { data, error } = await context.supabase
        .from('payments')
        .select('*')
        .eq('id', params.transactionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as PaymentRecord | null;
    },
  } as Action,

  refundPayment: {
    description: 'Initiate a refund for a completed payment',
    parameters: z.object({
      transactionId: z.string().uuid().describe('The payment transaction ID to refund'),
      reason: z.string().optional().describe('Refund reason'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<{ refundId: string; status: string }> => {
      const { data, error } = await context.supabase
        .from('payments')
        .update({
          status: 'refunded',
          refund_reason: params.reason || null,
        })
        .eq('id', params.transactionId)
        .select('id, status')
        .single();

      if (error) throw error;
      return {
        refundId: data.id,
        status: data.status,
      };
    },
  } as Action,
};

/**
 * LOCATION ACTIONS
 * Operations for managing saved locations and addresses.
 */
export const locationActions: Record<string, Action> = {
  getLocations: {
    description: 'Get all saved locations for the current user',
    parameters: z.object({
      limit: z.number().optional().default(10).describe('Maximum locations to return'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<SavedLocation[]> => {
      const { data, error } = await context.supabase
        .from('locations')
        .select('*')
        .eq('user_id', context.userId)
        .order('is_default', { ascending: false })
        .limit(params.limit);

      if (error) throw error;
      return data as SavedLocation[];
    },
  } as Action,

  addLocation: {
    description: 'Add a new saved location for the user',
    parameters: z.object({
      label: z.string().describe('Location label (e.g., "Home", "Work")'),
      address: z.string().describe('Full address'),
      latitude: z.number().describe('Latitude coordinate'),
      longitude: z.number().describe('Longitude coordinate'),
      isDefault: z.boolean().optional().default(false).describe('Set as default location'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<SavedLocation> => {
      const { data, error } = await context.supabase
        .from('locations')
        .insert({
          user_id: context.userId,
          label: params.label,
          address: params.address,
          latitude: params.latitude,
          longitude: params.longitude,
          is_default: params.isDefault,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as SavedLocation;
    },
  } as Action,

  deleteLocation: {
    description: 'Delete a saved location',
    parameters: z.object({
      locationId: z.string().uuid().describe('The location ID to delete'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<{ deleted: boolean }> => {
      const { error } = await context.supabase.from('locations').delete().eq('id', params.locationId);

      if (error) throw error;
      return { deleted: true };
    },
  } as Action,

  setDefaultLocation: {
    description: 'Set a location as the user default',
    parameters: z.object({
      locationId: z.string().uuid().describe('The location ID to set as default'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<SavedLocation> => {
      // First unset all other defaults
      await context.supabase
        .from('locations')
        .update({ is_default: false })
        .eq('user_id', context.userId);

      // Then set this one as default
      const { data, error } = await context.supabase
        .from('locations')
        .update({ is_default: true })
        .eq('id', params.locationId)
        .select('*')
        .single();

      if (error) throw error;
      return data as SavedLocation;
    },
  } as Action,
};

/**
 * NOTIFICATION ACTIONS
 * Operations for managing user notifications.
 */
export const notificationActions: Record<string, Action> = {
  getNotifications: {
    description: 'Get user notifications with optional filtering',
    parameters: z.object({
      unreadOnly: z.boolean().optional().default(false).describe('Return only unread notifications'),
      limit: z.number().optional().default(20).describe('Maximum notifications to return'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<
      Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
        createdAt: string;
      }>
    > => {
      let query = context.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', context.userId);

      if (params.unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(params.limit);

      if (error) throw error;
      return data || [];
    },
  } as Action,

  markAsRead: {
    description: 'Mark one or more notifications as read',
    parameters: z.object({
      notificationIds: z
        .array(z.string().uuid())
        .optional()
        .describe('Notification IDs to mark as read; if empty, mark all as read'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<{ updatedCount: number }> => {
      let query = context.supabase.from('notifications').update({ is_read: true }).eq('user_id', context.userId);

      if (params.notificationIds && params.notificationIds.length > 0) {
        query = query.in('id', params.notificationIds);
      }

      const { error } = await query;

      if (error) throw error;
      return { updatedCount: 1 };
    },
  } as Action,

  deleteNotification: {
    description: 'Delete a notification',
    parameters: z.object({
      notificationId: z.string().uuid().describe('The notification ID to delete'),
    }),
    execute: async (
      params: any,
      context: ActionContext
    ): Promise<{ deleted: boolean }> => {
      const { error } = await context.supabase
        .from('notifications')
        .delete()
        .eq('id', params.notificationId);

      if (error) throw error;
      return { deleted: true };
    },
  } as Action,
};

/**
 * Unified action registry combining all action categories.
 * This is the single source of truth for all available actions.
 */
export const allActions = {
  ...bookingActions,
  ...providerActions,
  ...paymentActions,
  ...locationActions,
  ...notificationActions,
};

/**
 * Type for all available action IDs.
 */
export type ActionId = keyof typeof allActions;
