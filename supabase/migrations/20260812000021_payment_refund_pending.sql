-- Adds the 'refund_pending' payment state used by the v1 escrow flow.
-- Kept in its own migration: a new enum value cannot be used in the same
-- transaction that adds it.
--
-- refund_pending = the customer is owed their money back (booking cancelled
-- after payment, or dispute resolved in the customer's favour). An admin
-- processes the refund in the Ozow dashboard and then marks it 'refunded'.
alter type payment_status add value if not exists 'refund_pending';
