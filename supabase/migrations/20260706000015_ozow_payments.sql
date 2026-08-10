-- Ozow payments support
alter type payment_gateway add value if not exists 'ozow';
alter type payment_status add value if not exists 'failed';
