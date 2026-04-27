-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- Enums
create type user_role as enum ('customer', 'provider', 'admin');
create type verification_status as enum ('pending', 'verified', 'rejected');
create type trust_level as enum ('unverified', 'low', 'medium', 'high');
create type pricing_model as enum ('fixed', 'hourly', 'quote_based');
create type booking_status as enum ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed');
create type booking_type as enum ('instant', 'quote_based');
create type quote_status as enum ('open', 'in_review', 'accepted', 'expired');
create type quote_response_status as enum ('submitted', 'accepted', 'rejected', 'withdrawn');
create type payment_status as enum ('pending', 'escrowed', 'released', 'refunded', 'disputed');
create type dispute_status as enum ('open', 'under_review', 'resolved_customer', 'resolved_provider', 'escalated');
create type notification_type as enum ('booking', 'payment', 'rating', 'dispute', 'system');
create type location_label as enum ('Home', 'Work', 'Other');
create type payment_gateway as enum ('yoco', 'peach');
