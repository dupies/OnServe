// Display-only copies. The database is the source of truth for both:
// public.platform_fee_rate() and public.escrow_hold_interval()
// (supabase/migrations/20260812000022_v1_escrow_and_security.sql).
export const PLATFORM_FEE_PERCENT = 0.05;
export const QUOTE_DEPOSIT_PERCENT = 0.20;
export const ESCROW_AUTO_RELEASE_HOURS = 48;

// Customers can't cancel a confirmed booking within this window before the
// start time. Providers choose it per service; enforced by the database
// (provider_services / bookings.cancellation_cutoff_minutes, 60..2880).
export const DEFAULT_CANCELLATION_CUTOFF_MINUTES = 60;
export const CANCELLATION_CUTOFF_OPTIONS_MINUTES = [60, 120, 240, 720, 1440] as const;

/** 60 -> "1 hour", 240 -> "4 hours", 90 -> "90 minutes" */
export function formatCancellationCutoff(minutes: number): string {
  if (minutes % 60 !== 0) return `${minutes} minutes`;
  const hours = minutes / 60;
  return hours === 1 ? '1 hour' : `${hours} hours`;
}
export const DEFAULT_SERVICE_RADIUS_KM = 10;
export const MAX_SAVED_LOCATIONS = 5;
