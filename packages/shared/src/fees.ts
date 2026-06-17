import type { FeeBreakdown } from '@onserve/types';

/** OnServe platform commission rate */
export const PLATFORM_FEE_RATE = 0.10;

/** Ozow instant EFT fee rate */
export const OZOW_EFT_FEE_RATE = 0.015;

/** Ozow minimum fee per transaction */
export const OZOW_MIN_FEE = 1.00;

/**
 * Calculate the full fee breakdown for a booking.
 *
 * Used by:
 * - Frontend: PaymentPage to show breakdown before redirect
 * - Edge Function: create-payment to set the actual charge amount
 *
 * @param servicePrice - The provider's price for the service (from
 *   service_types.base_price or provider_services.custom_price)
 */
export function calculateFees(servicePrice: number): FeeBreakdown {
  const platformFee = roundZAR(servicePrice * PLATFORM_FEE_RATE);
  const subtotal = servicePrice + platformFee;
  const transactionFee = Math.max(
    roundZAR(subtotal * OZOW_EFT_FEE_RATE),
    OZOW_MIN_FEE,
  );
  const totalCharged = subtotal + transactionFee;

  return {
    servicePrice,
    platformFee,
    subtotal,
    transactionFee,
    totalCharged,
    providerPayout: servicePrice,
    onserveRevenue: platformFee,
  };
}

/** Round to 2 decimal places (ZAR cents) using banker's rounding */
function roundZAR(value: number): number {
  return Math.round(value * 100) / 100;
}
