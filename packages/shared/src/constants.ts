// Display-only copies. The database is the source of truth for both:
// public.platform_fee_rate() and public.escrow_hold_interval()
// (supabase/migrations/20260812000022_v1_escrow_and_security.sql).
export const PLATFORM_FEE_PERCENT = 0.05;
export const QUOTE_DEPOSIT_PERCENT = 0.20;
export const ESCROW_AUTO_RELEASE_HOURS = 48;
export const DEFAULT_SERVICE_RADIUS_KM = 10;
export const MAX_SAVED_LOCATIONS = 5;
