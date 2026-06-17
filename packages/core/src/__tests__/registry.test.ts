/**
 * Unit tests for the action registry.
 * Validates that all actions have proper schema definitions and handlers.
 */

import { allActions } from '../registry';
import type { Action } from '../registry';

describe('Action Registry', () => {
  it('should have all actions properly typed with Zod schemas', () => {
    for (const [name, action] of Object.entries(allActions)) {
      expect(action).toBeDefined();
      expect(action).toHaveProperty('description');
      expect(action).toHaveProperty('parameters');
      expect(action).toHaveProperty('execute');

      // Validate description
      expect(typeof action.description).toBe('string');
      expect(action.description.length).toBeGreaterThan(0);

      // Validate Zod schema exists
      expect(action.parameters).toBeDefined();
      expect(action.parameters._def).toBeDefined();

      // Validate execute is a function
      expect(typeof action.execute).toBe('function');
    }
  });

  it('should have no duplicate action names', () => {
    const names = Object.keys(allActions);
    const unique = new Set(names);
    expect(names.length).toBe(unique.size);
  });

  it('should have at least 15 actions across all categories', () => {
    const actionCount = Object.keys(allActions).length;
    expect(actionCount).toBeGreaterThanOrEqual(15);
  });

  it('should have booking actions', () => {
    const bookingActionNames = [
      'createBooking',
      'getBookingStatus',
      'cancelBooking',
      'updateBookingDate',
      'listActiveBookings',
    ];

    for (const name of bookingActionNames) {
      expect(allActions).toHaveProperty(name);
      expect(allActions[name as keyof typeof allActions]).toBeDefined();
    }
  });

  it('should have provider actions', () => {
    const providerActionNames = [
      'searchProviders',
      'getProviderProfile',
      'acceptJob',
      'completeJob',
      'getProviderEarnings',
    ];

    for (const name of providerActionNames) {
      expect(allActions).toHaveProperty(name);
      expect(allActions[name as keyof typeof allActions]).toBeDefined();
    }
  });

  it('should have payment actions', () => {
    const paymentActionNames = ['initiatePayment', 'getPaymentStatus', 'refundPayment'];

    for (const name of paymentActionNames) {
      expect(allActions).toHaveProperty(name);
      expect(allActions[name as keyof typeof allActions]).toBeDefined();
    }
  });

  it('should have location actions', () => {
    const locationActionNames = ['getLocations', 'addLocation', 'deleteLocation', 'setDefaultLocation'];

    for (const name of locationActionNames) {
      expect(allActions).toHaveProperty(name);
      expect(allActions[name as keyof typeof allActions]).toBeDefined();
    }
  });

  it('should have notification actions', () => {
    const notificationActionNames = ['getNotifications', 'markAsRead', 'deleteNotification'];

    for (const name of notificationActionNames) {
      expect(allActions).toHaveProperty(name);
      expect(allActions[name as keyof typeof allActions]).toBeDefined();
    }
  });

  it('should validate action schemas with invalid input', () => {
    const createBookingAction = allActions.createBooking;

    // Should fail without required parameters
    expect(() => {
      createBookingAction.parameters.parse({});
    }).toThrow();

    // Should succeed with valid parameters
    expect(() => {
      createBookingAction.parameters.parse({
        serviceTypeId: '550e8400-e29b-41d4-a716-446655440000',
        scheduledAt: new Date().toISOString(),
        addressId: '550e8400-e29b-41d4-a716-446655440001',
      });
    }).not.toThrow();
  });

  it('should validate UUID parameters', () => {
    const getBookingStatusAction = allActions.getBookingStatus;

    // Should fail with invalid UUID
    expect(() => {
      getBookingStatusAction.parameters.parse({
        bookingId: 'not-a-uuid',
      });
    }).toThrow();

    // Should succeed with valid UUID
    expect(() => {
      getBookingStatusAction.parameters.parse({
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
      });
    }).not.toThrow();
  });

  it('should validate datetime parameters', () => {
    const updateBookingDateAction = allActions.updateBookingDate;

    // Should fail with invalid datetime
    expect(() => {
      updateBookingDateAction.parameters.parse({
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        newDate: 'not-a-date',
      });
    }).toThrow();

    // Should succeed with valid ISO datetime
    expect(() => {
      updateBookingDateAction.parameters.parse({
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        newDate: new Date().toISOString(),
      });
    }).not.toThrow();
  });

  it('should validate enum parameters', () => {
    const initiatePaymentAction = allActions.initiatePayment;

    // Should fail with invalid enum value
    expect(() => {
      initiatePaymentAction.parameters.parse({
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        paymentMethod: 'invalid_method',
      });
    }).toThrow();

    // Should succeed with valid enum value
    expect(() => {
      initiatePaymentAction.parameters.parse({
        bookingId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        paymentMethod: 'card',
      });
    }).not.toThrow();
  });

  it('should validate numeric parameters and constraints', () => {
    const searchProvidersAction = allActions.searchProviders;

    // Should fail with negative radius
    expect(() => {
      searchProvidersAction.parameters.parse({
        serviceTypeId: '550e8400-e29b-41d4-a716-446655440000',
        latitude: -25.7461,
        longitude: 28.2293,
        radiusKm: -5,
      });
    }).toThrow();

    // Should succeed with valid coordinates and radius
    expect(() => {
      searchProvidersAction.parameters.parse({
        serviceTypeId: '550e8400-e29b-41d4-a716-446655440000',
        latitude: -25.7461,
        longitude: 28.2293,
        radiusKm: 10,
      });
    }).not.toThrow();
  });

  it('should handle optional parameters correctly', () => {
    const listActiveBookingsAction = allActions.listActiveBookings;

    // Should succeed without optional limit
    expect(() => {
      listActiveBookingsAction.parameters.parse({});
    }).not.toThrow();

    // Should succeed with optional limit
    expect(() => {
      listActiveBookingsAction.parameters.parse({
        limit: 50,
      });
    }).not.toThrow();
  });

  it('should have execute functions that are callable', () => {
    for (const [name, action] of Object.entries(allActions)) {
      expect(typeof action.execute).toBe('function');

      // Check that it's an async function by checking it returns a Promise
      const result = action.execute({}, { supabase: {} as any });
      expect(result instanceof Promise || typeof result.then === 'function').toBe(true);
    }
  });
});

describe('Action Registry - Categories', () => {
  it('should have 5 booking actions', () => {
    const bookingActions = [
      'createBooking',
      'getBookingStatus',
      'cancelBooking',
      'updateBookingDate',
      'listActiveBookings',
    ];
    const count = Object.keys(allActions).filter((name) => bookingActions.includes(name)).length;
    expect(count).toBe(5);
  });

  it('should have 5 provider actions', () => {
    const providerActions = [
      'searchProviders',
      'getProviderProfile',
      'acceptJob',
      'completeJob',
      'getProviderEarnings',
    ];
    const count = Object.keys(allActions).filter((name) => providerActions.includes(name)).length;
    expect(count).toBe(5);
  });

  it('should have 3 payment actions', () => {
    const paymentActions = ['initiatePayment', 'getPaymentStatus', 'refundPayment'];
    const count = Object.keys(allActions).filter((name) => paymentActions.includes(name)).length;
    expect(count).toBe(3);
  });

  it('should have 4 location actions', () => {
    const locationActions = ['getLocations', 'addLocation', 'deleteLocation', 'setDefaultLocation'];
    const count = Object.keys(allActions).filter((name) => locationActions.includes(name)).length;
    expect(count).toBe(4);
  });

  it('should have 3 notification actions', () => {
    const notificationActions = ['getNotifications', 'markAsRead', 'deleteNotification'];
    const count = Object.keys(allActions).filter((name) => notificationActions.includes(name)).length;
    expect(count).toBe(3);
  });
});
