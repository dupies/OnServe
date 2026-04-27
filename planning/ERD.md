# OnServe — Entity Relationship Diagram

Full database schema for the OnServe POC. Designed for PostgreSQL via Supabase with PostGIS extension for geo queries.

---

## Full ERD

```mermaid
erDiagram

    %% ─── USERS & IDENTITY ───────────────────────────────
    USERS {
        uuid id PK
        text email
        text phone
        text full_name
        text avatar_url
        enum role "customer | provider | admin"
        boolean is_verified
        timestamp created_at
        timestamp updated_at
    }

    PROVIDER_PROFILES {
        uuid id PK
        uuid user_id FK
        text bio
        text id_document_url
        enum verification_status "pending | verified | rejected"
        float rating_average
        int total_jobs_completed
        float completion_rate
        float no_show_rate
        float dispute_rate
        float reputation_score
        jsonb service_radius_km
        timestamp verified_at
    }

    CUSTOMER_PROFILES {
        uuid id PK
        uuid user_id FK
        float cancellation_rate
        float dispute_abuse_score
        float location_trust_score
        float reputation_score
    }

    %% ─── LOCATION ────────────────────────────────────────
    SAVED_LOCATIONS {
        uuid id PK
        uuid user_id FK
        text label "Home | Work | Other"
        text custom_name
        text formatted_address
        float latitude
        float longitude
        geography point
        int visit_count
        float trust_score
        boolean is_default
        timestamp created_at
    }

    LOCATION_EVENTS {
        uuid id PK
        uuid user_id FK
        uuid booking_id FK
        float latitude
        float longitude
        geography point
        text formatted_address
        enum trust_level "unverified | low | medium | high"
        timestamp captured_at
    }

    %% ─── SERVICE CATALOGUE ───────────────────────────────
    SERVICE_CATEGORIES {
        uuid id PK
        text name "Cleaning | Beauty | Plumbing..."
        text slug
        text icon_url
        boolean is_active
        int sort_order
    }

    SERVICE_TYPES {
        uuid id PK
        uuid category_id FK
        text name
        text description
        enum pricing_model "fixed | hourly | quote_based"
        decimal base_price
        decimal hourly_rate
        int estimated_duration_mins
        text[] required_skills
        text[] required_certifications
        boolean is_active
    }

    PROVIDER_SERVICES {
        uuid id PK
        uuid provider_id FK
        uuid service_type_id FK
        decimal custom_price
        int service_radius_km
        boolean is_available
        jsonb availability_schedule
        timestamp created_at
    }

    %% ─── BOOKINGS ────────────────────────────────────────
    BOOKINGS {
        uuid id PK
        uuid customer_id FK
        uuid provider_id FK
        uuid service_type_id FK
        uuid location_id FK
        enum booking_type "instant | quote_based"
        enum status "pending | confirmed | in_progress | completed | cancelled | disputed"
        decimal total_amount
        decimal deposit_amount
        text customer_notes
        timestamp scheduled_at
        timestamp provider_checked_in_at
        timestamp provider_checked_out_at
        timestamp completed_at
        timestamp cancelled_at
        text cancellation_reason
        timestamp created_at
    }

    QUOTE_REQUESTS {
        uuid id PK
        uuid booking_id FK
        uuid customer_id FK
        uuid service_type_id FK
        uuid location_id FK
        text problem_description
        text[] uploaded_image_urls
        enum status "open | in_review | accepted | expired"
        timestamp expires_at
        timestamp created_at
    }

    QUOTES {
        uuid id PK
        uuid quote_request_id FK
        uuid provider_id FK
        decimal quoted_price
        int estimated_duration_mins
        text notes
        enum status "submitted | accepted | rejected | withdrawn"
        timestamp submitted_at
        timestamp accepted_at
    }

    %% ─── PAYMENTS ────────────────────────────────────────
    PAYMENTS {
        uuid id PK
        uuid booking_id FK
        uuid customer_id FK
        decimal amount
        decimal deposit_amount
        decimal balance_amount
        enum status "pending | escrowed | released | refunded | disputed"
        text payment_gateway "yoco | peach"
        text gateway_transaction_id
        text gateway_reference
        timestamp escrowed_at
        timestamp released_at
        timestamp created_at
    }

    DISPUTES {
        uuid id PK
        uuid booking_id FK
        uuid payment_id FK
        uuid raised_by_user_id FK
        text reason
        text description
        text[] evidence_urls
        enum status "open | under_review | resolved_customer | resolved_provider | escalated"
        uuid resolved_by_admin_id FK
        text resolution_notes
        timestamp created_at
        timestamp resolved_at
    }

    %% ─── RATINGS ─────────────────────────────────────────
    RATINGS {
        uuid id PK
        uuid booking_id FK
        uuid rated_by_user_id FK
        uuid rated_user_id FK
        int score "1-5"
        text comment
        boolean is_provider_rating
        timestamp created_at
    }

    %% ─── NOTIFICATIONS ───────────────────────────────────
    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text title
        text body
        enum type "booking | payment | rating | dispute | system"
        jsonb metadata
        boolean is_read
        timestamp created_at
    }

    %% ─── RELATIONSHIPS ───────────────────────────────────
    USERS ||--o| PROVIDER_PROFILES : "has"
    USERS ||--o| CUSTOMER_PROFILES : "has"
    USERS ||--o{ SAVED_LOCATIONS : "saves"
    USERS ||--o{ LOCATION_EVENTS : "generates"
    USERS ||--o{ NOTIFICATIONS : "receives"

    PROVIDER_PROFILES ||--o{ PROVIDER_SERVICES : "offers"
    PROVIDER_SERVICES }o--|| SERVICE_TYPES : "based on"
    SERVICE_TYPES }o--|| SERVICE_CATEGORIES : "belongs to"

    BOOKINGS }o--|| USERS : "customer"
    BOOKINGS }o--|| PROVIDER_PROFILES : "provider"
    BOOKINGS }o--|| SERVICE_TYPES : "for service"
    BOOKINGS }o--|| SAVED_LOCATIONS : "at location"
    BOOKINGS ||--o| QUOTE_REQUESTS : "from quote"
    BOOKINGS ||--o| PAYMENTS : "has payment"
    BOOKINGS ||--o{ RATINGS : "generates"
    BOOKINGS ||--o| DISPUTES : "may have"

    QUOTE_REQUESTS ||--o{ QUOTES : "receives"
    QUOTES }o--|| PROVIDER_PROFILES : "submitted by"

    LOCATION_EVENTS }o--|| BOOKINGS : "captured for"

    PAYMENTS ||--o| DISPUTES : "may be disputed"
    DISPUTES }o--|| USERS : "resolved by admin"
```

---

## Key Design Decisions

### 1. Location is a first-class entity
Bookings are tied to `saved_locations`, not just coordinates. Every booking captures a `location_event` with trust metadata at that moment in time.

### 2. Dual reputation scores
Both `provider_profiles` and `customer_profiles` carry computed reputation scores. These are updated via Supabase Edge Functions after each completed booking/rating.

### 3. Quote flow as a separate path
`quote_requests` and `quotes` are separate from `bookings`. A booking is only created once a quote is accepted — keeping the data model clean.

### 4. Payment state machine
Payments have their own status lifecycle (`escrowed → released`) separate from booking status. This allows disputes to freeze payment without changing booking state.

### 5. PostGIS for location queries
`saved_locations.point` and `location_events.point` use PostGIS `geography` type enabling:
- Distance-based provider search (`ST_DWithin`)
- Area-level risk aggregation
- Provider radius matching

---

## Supabase RLS Policy Summary

| Table | Customer | Provider | Admin |
|---|---|---|---|
| `users` | Read own | Read own | Full access |
| `saved_locations` | CRUD own | Read (for jobs) | Full access |
| `bookings` | CRUD own | Read/update assigned | Full access |
| `payments` | Read own | Read own | Full access |
| `ratings` | CRUD own | Read | Full access |
| `disputes` | CRUD own | Read own | Full access |
| `provider_profiles` | Read all | CRUD own | Full access |
| `service_types` | Read all | Read all | Full access |
