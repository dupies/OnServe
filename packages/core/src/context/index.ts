import { useQueryClient } from '@tanstack/react-query';
import type { Booking, SavedLocation, User } from '@onserve/types';

/**
 * App context selectors using React Query cache.
 * Provides typed access to app state without additional re-renders.
 * Safe to call even if data hasn't been loaded yet (returns undefined).
 */
export function useAppContext() {
  const queryClient = useQueryClient();

  return {
    /**
     * Get the current authenticated user.
     */
    get user(): User | undefined {
      return queryClient.getQueryData(['auth', 'user']);
    },

    /**
     * Get the user's current location (last known position).
     */
    get location(): { latitude: number; longitude: number } | undefined {
      return queryClient.getQueryData(['location', 'current']);
    },

    /**
     * Get all active bookings for the current user (pending, confirmed, in_progress).
     */
    get activeBookings(): Booking[] {
      return queryClient.getQueryData(['bookings', 'active']) || [];
    },

    /**
     * Get all completed bookings for the current user.
     */
    get completedBookings(): Booking[] {
      return queryClient.getQueryData(['bookings', 'completed']) || [];
    },

    /**
     * Get recently viewed providers.
     */
    get recentProviders(): Array<{ id: string; name: string; avgRating: number }> {
      return queryClient.getQueryData(['providers', 'recent']) || [];
    },

    /**
     * Get count of unread notifications.
     */
    get unreadNotificationCount(): number {
      const notifications: Array<{ id: string; isRead: boolean }> =
        queryClient.getQueryData(['notifications', 'all']) || [];
      return notifications.filter((n) => !n.isRead).length;
    },

    /**
     * Get all saved locations for the user.
     */
    get savedLocations(): SavedLocation[] {
      return queryClient.getQueryData(['locations', 'all']) || [];
    },

    /**
     * Get the default/primary location.
     */
    get defaultLocation(): SavedLocation | undefined {
      const locations: SavedLocation[] = queryClient.getQueryData(['locations', 'all']) || [];
      return locations.find((l) => l.isDefault);
    },

    /**
     * Get user preferences and settings.
     */
    get preferences(): {
      language: string;
      currency: string;
      notifications: boolean;
      darkMode: boolean;
    } {
      return (
        queryClient.getQueryData(['user', 'preferences']) || {
          language: 'en',
          currency: 'ZAR',
          notifications: true,
          darkMode: false,
        }
      );
    },

    /**
     * Get provider metrics (if user is a provider).
     */
    get providerMetrics(): {
      avgRating: number;
      reviewCount: number;
      completedJobs: number;
      totalEarnings: number;
    } | undefined {
      return queryClient.getQueryData(['provider', 'metrics']);
    },

    /**
     * Get pending quotes awaiting customer response.
     */
    get pendingQuotes(): Array<{ id: string; providerId: string; quotedPrice: number; expiresAt: string }> {
      return queryClient.getQueryData(['quotes', 'pending']) || [];
    },

    /**
     * Get pending quote requests awaiting provider responses.
     */
    get quoteRequests(): Array<{
      id: string;
      serviceTypeId: string;
      status: string;
      expiresAt: string;
    }> {
      return queryClient.getQueryData(['quoteRequests', 'open']) || [];
    },

    /**
     * Check if user is a customer.
     */
    get isCustomer(): boolean {
      const user = queryClient.getQueryData<User>(['auth', 'user']);
      return user?.role === 'customer';
    },

    /**
     * Check if user is a provider.
     */
    get isProvider(): boolean {
      const user = queryClient.getQueryData<User>(['auth', 'user']);
      return user?.role === 'provider';
    },

    /**
     * Check if user is an admin.
     */
    get isAdmin(): boolean {
      const user = queryClient.getQueryData<User>(['auth', 'user']);
      return user?.role === 'admin';
    },
  };
}

/**
 * Hook to subscribe to specific app context changes.
 * Triggers re-render only when selected value changes.
 */
export function useAppContextSelector<T>(selector: (context: ReturnType<typeof useAppContext>) => T): T {
  const context = useAppContext();
  return selector(context);
}

/**
 * Standalone selector functions that don't require hooks.
 * Can be used outside of components or in non-React contexts.
 */
export const contextSelectors = {
  /**
   * Get user from query client.
   */
  getUser(queryClient: ReturnType<typeof useQueryClient>): User | undefined {
    return queryClient.getQueryData(['auth', 'user']);
  },

  /**
   * Get active bookings from query client.
   */
  getActiveBookings(queryClient: ReturnType<typeof useQueryClient>): Booking[] {
    return queryClient.getQueryData(['bookings', 'active']) || [];
  },

  /**
   * Check if a specific booking is active.
   */
  isBookingActive(queryClient: ReturnType<typeof useQueryClient>, bookingId: string): boolean {
    const bookings = queryClient.getQueryData<Booking[]>(['bookings', 'active']) || [];
    return bookings.some((b) => b.id === bookingId);
  },

  /**
   * Get user's default location.
   */
  getDefaultLocation(queryClient: ReturnType<typeof useQueryClient>): SavedLocation | undefined {
    const locations = queryClient.getQueryData<SavedLocation[]>(['locations', 'all']) || [];
    return locations.find((l) => l.isDefault);
  },

  /**
   * Get total unread notifications.
   */
  getUnreadNotificationCount(queryClient: ReturnType<typeof useQueryClient>): number {
    const notifications = queryClient.getQueryData<Array<{ id: string; is_read: boolean }>>(['notifications', 'all']) || [];
    return notifications.filter((n) => !n.is_read).length;
  },
};
