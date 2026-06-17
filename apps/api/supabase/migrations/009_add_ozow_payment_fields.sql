-- Migration: 009_add_ozow_payment_fields.sql
-- Purpose: Extend payments table for Ozow integration and add provider bank details

-- ============================================================
-- 1. Extend payments table
-- ============================================================

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS platform_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transaction_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_payout     DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ozow_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS ozow_payout_id      TEXT,
  ADD COLUMN IF NOT EXISTS payout_failed_reason TEXT,
  ADD COLUMN IF NOT EXISTS payout_at           TIMESTAMPTZ;

-- Set default gateway for new records
ALTER TABLE payments
  ALTER COLUMN payment_gateway SET DEFAULT 'ozow';

-- Index for webhook lookups (Ozow sends transactionReference)
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON payments(booking_id);

-- Index for auto-release cron job
CREATE INDEX IF NOT EXISTS idx_payments_escrowed_pending_release
  ON payments(status, escrowed_at)
  WHERE status = 'escrowed';


-- ============================================================
-- 2. Provider bank details (on provider_profiles)
-- ============================================================

ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,      -- encrypt via pgcrypto
  ADD COLUMN IF NOT EXISTS bank_branch_code    TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_type   TEXT       -- 'cheque' | 'savings'
    CHECK (bank_account_type IN ('cheque', 'savings')),
  ADD COLUMN IF NOT EXISTS bank_verified       BOOLEAN NOT NULL DEFAULT false;

-- RLS: providers can only read/update their own bank details
-- (existing provider_profiles RLS already enforces this)


-- ============================================================
-- 3. Encrypt bank account numbers using pgcrypto
-- ============================================================
-- pgcrypto is already enabled in the project.
-- In the Edge Function, encrypt before INSERT/UPDATE:
--   pgp_sym_encrypt(account_number, vault_key)
-- And decrypt on read:
--   pgp_sym_decrypt(bank_account_number::bytea, vault_key)
--
-- Alternative: store bank details in Supabase Vault directly
-- and reference by secret ID. Evaluate based on Ozow's payout
-- payload requirements.

COMMENT ON COLUMN provider_profiles.bank_account_number IS
  'Encrypted via pgcrypto pgp_sym_encrypt. Never expose in API responses.';
