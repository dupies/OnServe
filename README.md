# OnServe

> **The operating system for informal services in South Africa.**

OnServe is a location-secure, trust-first marketplace connecting South Africans to on-demand home and professional services — backed by identity verification, escrow payments, and dual-reputation accountability.
---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [C4 Level 1 — System Context](#2-c4-level-1--system-context)
3. [C4 Level 2 — Container Diagram](#3-c4-level-2--container-diagram)
4. [C4 Level 3 — Component Diagram](#4-c4-level-3--component-diagram)
5. [C4 Level 4 — Data Model](#5-c4-level-4--data-model)
6. [Technical Reference](#6-technical-reference)
7. [Development Setup](#7-development-setup)

---

## 1. Business Overview

### 1.1 Problem Statement

South Africa has a large informal services economy — cleaners, plumbers, electricians, beauticians, photographers — where supply and demand are fundamentally mismatched:

- **Customers** have no reliable way to find, vet, and pay a trusted service provider at their location.
- **Providers** have no platform to build a verified reputation or receive guaranteed payment.
- **Trust** is the central barrier: customers fear no-shows and fraud; providers fear non-payment.

Existing solutions (Facebook groups, WhatsApp referrals, Gumtree) offer no accountability, no payment protection, and no reputation system.

### 1.2 Solution

OnServe is a structured marketplace with three trust mechanisms built into every transaction:

| Mechanism | What it does |
|---|---|
| **Identity verification** | Providers submit ID documents before their first job. Customers are KYC-lite via phone OTP. |
| **Escrow payments** | Funds are held in escrow at booking time and only released on job completion — neither party can be defrauded. |
| **Dual reputation** | Both the customer and provider rate each other after every job. Bad actors on either side lose access over time. |

### 1.3 Primary Actors

| Actor | Role | Core need |
|---|---|---|
| **Customer** | Books and pays for services at their location | Find a reliable, verified provider quickly and safely |
| **Provider** | Delivers services, manages jobs, receives payment | Consistent work with guaranteed payment on completion |
| **Admin** | Manages platform health and dispute resolution | Operational tools to maintain trust and quality at scale |

### 1.4 Business Model

OnServe operates on a **commission-based marketplace model**:

- A **5% platform fee** is added to every booking at checkout (applied in `bookingService.createBooking`).
- Future revenue streams: premium provider listings, promoted search placement, subscription tiers for high-volume providers.

### 1.5 Service Categories (Live)

Eight categories are seeded in the production database with four live service types:

| Category | Example Service Types |
|---|---|
| Cleaning | Standard Clean (R450), Deep Clean, Move-out Clean |
| Beauty | Facial, Braiding, Nails |
| Plumbing | Leak Repair, Geyser Service |
| Electrical | Fault Finding, Installations |
| Gardening | Lawn Mowing, Tree Trimming |
| Photography | Events, Portraits |
| Catering | Private Chef, Events |
| Tutoring | Maths, Science, Languages |

### 1.6 Customer Journey

```
Splash → Login (OTP or Google) → Role Select → Home (service grid)
  → Search providers near me → View provider profile
  → Book: select service + location + date + time
  → Payment (escrow captured) → Provider accepts
  → Provider checks in at location → Service delivered
  → Provider checks out → Payment released after approval
  → Both parties rate each other
```

### 1.7 Provider Journey

```
Login → Role Select → Job Board (open bookings near me)
  → View job detail → Accept job
  → Check in at customer location
  → Complete service → Check out
  → Await customer payment approval (auto-releases after 48h)
  → Rating received → Reputation score updated
```

### 1.8 Delivery Phases

| Phase | Scope | Status |
|---|---|---|
| **Phase 0** | Architecture, C4 diagrams, ERD, project plan | ✅ Complete |
| **Phase 1** | Monorepo, DB migrations, RLS, auth, shared types | ✅ Complete |
| **Phase 2** | All screens, full Supabase integration, forms, tests | ✅ Complete |
| **Phase 3** | Yoco payments, escrow Edge Functions, notifications | Upcoming |
| **Phase 4** | React Native mobile app, push notifications, quote flow | Upcoming |

---

## 2. C4 Level 1 — System Context

> **Audience**: Technical and non-technical stakeholders. Shows what OnServe does and who it interacts with — no implementation detail.

```mermaid
C4Context
  title System Context — OnServe Marketplace

  Person(customer, "Customer", "Books on-demand services at their home or location. Pays via escrow.")
  Person(provider, "Service Provider", "Delivers services. Accepts jobs, checks in and out, receives guaranteed payment.")
  Person(admin, "Platform Admin", "Manages provider onboarding, resolves disputes, monitors platform health.")

  System(onserve, "OnServe Platform", "Location-secure marketplace connecting customers to verified service providers. Handles bookings, payments, ratings, and trust scoring.")

  System_Ext(supabase, "Supabase", "Managed backend-as-a-service. Provides PostgreSQL, authentication, file storage, and real-time event streaming.")
  System_Ext(google_oauth, "Google OAuth 2.0", "Social sign-in for customers and providers. Managed via Supabase Auth.")
  System_Ext(sms_gateway, "SMS Gateway", "Delivers one-time passwords for phone number verification. Managed via Supabase Auth.")
  System_Ext(yoco, "Yoco / Peach Payments", "South African payment gateway. Processes card payments and holds funds in escrow.")
  System_Ext(google_maps, "Google Maps Platform", "Geocoding, reverse geocoding, and proximity-based provider search.")
  System_Ext(claude_api, "Anthropic Claude API", "AI-powered hairstyle recommendations and smart service matching. Planned Phase 3+.")

  Rel(customer, onserve, "Searches providers, books services, tracks jobs, makes payments", "HTTPS")
  Rel(provider, onserve, "Views job board, accepts jobs, checks in/out, views earnings", "HTTPS")
  Rel(admin, onserve, "Manages users, resolves disputes, approves provider KYC", "HTTPS")
  Rel(onserve, supabase, "Stores all data, authenticates users, streams real-time events", "Supabase JS SDK")
  Rel(onserve, google_oauth, "Authenticates users via Google social sign-in", "OAuth 2.0")
  Rel(onserve, sms_gateway, "Sends OTP codes to mobile numbers", "HTTPS via Supabase")
  Rel(onserve, yoco, "Processes payments, holds escrow, releases funds on completion", "HTTPS + Webhooks")
  Rel(onserve, google_maps, "Geocodes addresses, calculates distances, powers location picker", "HTTPS")
  Rel(onserve, claude_api, "Generates AI style previews and service recommendations", "HTTPS")
```

### Context Notes

- **OnServe** is the central system. Customers and providers never exchange money directly — all funds flow through escrow.
- **Supabase** is the single backend dependency. The services-pattern codebase means Supabase can be replaced by changing only service files — zero component changes required.
- **Google Maps** is used for geocoding in the frontend. Radius search runs inside PostgreSQL via PostGIS — no Maps API calls for proximity queries.
- **Claude API** is a Phase 3+ feature. No AI calls are made in the current build.

---

## 3. C4 Level 2 — Container Diagram

> **Audience**: Developers and architects. Shows the deployable units that make up OnServe and how they communicate.

```mermaid
C4Container
  title Container Diagram — OnServe Platform

  Person(customer, "Customer")
  Person(provider, "Provider")
  Person(admin, "Admin")

  System_Boundary(onserve_platform, "OnServe Platform") {

    Container(web_app, "Web App", "React 18 + TypeScript + Vite", "Single-page application. Serves both customer and provider dashboards. Mobile-first, runs in the browser.")

    Container(mobile_app, "Mobile App", "React Native + Expo + NativeWind", "iOS and Android native app. Shares types and schemas with web via monorepo packages. Planned Phase 4.")

    Container(edge_functions, "Edge Functions", "Supabase Edge Functions / Deno", "Escrow release logic, payment webhooks, reputation score recalculation, provider matching algorithm.")

    System_Boundary(supabase_boundary, "Supabase (Managed BaaS)") {
      Container(auth_service, "Auth Service", "Supabase Auth / GoTrue", "JWT session management. Phone OTP via SMS. Google OAuth 2.0. Role stored in user_metadata.")
      ContainerDb(postgres_db, "PostgreSQL 17", "Supabase Postgres + PostGIS", "15 tables. Row Level Security on every table. PostGIS for geo proximity queries. Triggers for reputation score updates.")
      Container(storage, "File Storage", "Supabase Storage", "Provider ID documents, profile photos, service images, dispute evidence.")
      Container(realtime, "Realtime", "Supabase Realtime / Phoenix Channels", "WebSocket subscriptions for live booking status updates and job board notifications.")
    }

    Container(shared_packages, "Shared Packages", "TypeScript + Zod", "@onserve/types: all interfaces and enums. @onserve/shared: Zod schemas, formatCurrency, trust score utilities, constants.")
  }

  System_Ext(google_oauth_ext, "Google OAuth 2.0")
  System_Ext(sms_ext, "SMS Gateway")
  System_Ext(yoco_ext, "Yoco / Peach Payments")
  System_Ext(google_maps_ext, "Google Maps Platform")

  Rel(customer, web_app, "Uses via browser", "HTTPS")
  Rel(customer, mobile_app, "Uses on iOS / Android", "HTTPS")
  Rel(provider, web_app, "Uses via browser", "HTTPS")
  Rel(provider, mobile_app, "Uses on iOS / Android", "HTTPS")
  Rel(admin, web_app, "Manages platform via admin panel", "HTTPS")

  Rel(web_app, auth_service, "Sign in, sign out, session refresh", "Supabase JS SDK")
  Rel(web_app, postgres_db, "Reads and writes data via RLS-enforced queries", "Supabase JS SDK / PostgREST")
  Rel(web_app, storage, "Uploads and retrieves files", "Supabase JS SDK")
  Rel(web_app, realtime, "Subscribes to booking and notification events", "WebSocket")
  Rel(web_app, google_maps_ext, "Geocodes user-entered addresses", "HTTPS")

  Rel(mobile_app, auth_service, "Sign in, sign out, session refresh", "Supabase JS SDK")
  Rel(mobile_app, postgres_db, "Reads and writes data", "Supabase JS SDK")
  Rel(mobile_app, realtime, "Subscribes to live job events", "WebSocket")

  Rel(edge_functions, postgres_db, "Reads and writes via service role key", "PostgreSQL connection")
  Rel(edge_functions, yoco_ext, "Processes payment capture and escrow release", "HTTPS")

  Rel(auth_service, google_oauth_ext, "Delegates Google sign-in", "OAuth 2.0")
  Rel(auth_service, sms_ext, "Delivers OTP codes", "HTTPS")

  Rel(web_app, shared_packages, "Imports types, schemas, and utilities")
  Rel(mobile_app, shared_packages, "Imports types, schemas, and utilities")
  Rel(edge_functions, shared_packages, "Imports types")
```

### Container Notes

| Container | Key decisions |
|---|---|
| **Web App** | Deployed as a static SPA. All Supabase queries go through RLS — the anon key is safe to include in frontend builds. Service role key is never used client-side. |
| **Mobile App** | Shares `@onserve/types` and `@onserve/shared` via the monorepo. Same Supabase project and RLS policies — no separate mobile backend. |
| **Edge Functions** | The only place the Supabase service role key is used. Handles business logic that cannot be expressed as an RLS policy: escrow state machine, reputation recalculation, payment webhooks. |
| **PostgreSQL** | PostGIS powers the `search_providers_near(lat, lng, radius_km)` stored procedure. Distance queries run in the database — not the application layer. |
| **Realtime** | Used for live job board updates and booking status changes. Chat is planned for Phase 3. |

---

## 4. C4 Level 3 — Component Diagram

> **Audience**: Frontend developers. Shows the internal structure of the Web App container.

```mermaid
C4Component
  title Component Diagram — Web App (apps/web)

  Container_Ext(supabase_ext, "Supabase", "Auth, PostgreSQL, Realtime, Storage")
  Container_Ext(google_maps_ext, "Google Maps Platform", "Geocoding")

  Container_Boundary(web_app, "Web App (apps/web)") {

    Component(router, "React Router", "react-router-dom v6", "Client-side routing. RequireAuth guard redirects unauthenticated users to /splash and roleless users to /role.")

    Component(auth_feature, "Auth Feature", "Zustand store + Supabase Auth", "Manages session state. Phone OTP flow, Google OAuth redirect, and role selection. Persists user and role via onAuthStateChange listener.")

    Component(booking_feature, "Booking Feature", "React Query + bookingService.ts", "Create bookings with 5% platform fee. List customer and provider bookings. Update status with automatic check-in/out timestamps.")

    Component(services_feature, "Services Feature", "React Query + serviceService.ts", "Reads service_categories and service_types. Powers the home screen category grid and booking wizard service selector.")

    Component(location_feature, "Location Feature", "React Query + locationService.ts", "CRUD for saved_locations. Returns locations ordered default-first. Powers the booking wizard location selector.")

    Component(provider_feature, "Provider Feature", "React Query + providerService.ts", "Calls search_providers_near() PostGIS RPC with GPS coordinates. Returns ranked provider list. Fetches individual provider profile stats.")

    Component(ui_components, "UI Components", "shadcn/ui + Radix UI", "Button, Form, Select, Input, Badge, Card, Dialog, Sheet, Tabs, Progress, Avatar. Source is project-owned — all files live in src/components/ui/.")

    Component(layout_components, "Layout Components", "AppShell + BottomNav", "Mobile-first shell with safe-area padding. Bottom navigation with role-aware tabs for switching between customer and provider views.")

    Component(query_client, "Query Client", "TanStack Query v5", "Global server state cache. Handles loading, error, and stale-while-revalidate states. Mutations call invalidateQueries to keep data fresh after writes.")

    Component(shared_packages, "Shared Packages", "@onserve/types + @onserve/shared", "TypeScript interfaces (User, Booking, Payment, etc.), Zod validation schemas (loginSchema, bookingSchema, otpSchema), formatCurrency, DEFAULT_SERVICE_RADIUS_KM.")
  }

  Rel(router, auth_feature, "Reads user and role to guard protected routes")
  Rel(auth_feature, supabase_ext, "signInWithOtp, verifyOtp, signInWithOAuth, onAuthStateChange, updateUser", "Supabase JS SDK")
  Rel(booking_feature, supabase_ext, "SELECT / INSERT / UPDATE bookings, service_types", "Supabase JS SDK")
  Rel(services_feature, supabase_ext, "SELECT service_categories, service_types", "Supabase JS SDK")
  Rel(location_feature, supabase_ext, "SELECT / INSERT / DELETE saved_locations", "Supabase JS SDK")
  Rel(provider_feature, supabase_ext, "RPC search_providers_near(), SELECT provider_profiles", "Supabase JS SDK")
  Rel(booking_feature, query_client, "useCustomerBookings, useProviderBookings, useCreateBooking, useCheckIn, useCheckOut")
  Rel(services_feature, query_client, "useServiceCategories, useServiceTypes")
  Rel(location_feature, query_client, "useSavedLocations, useSaveLocation, useDeleteLocation")
  Rel(provider_feature, query_client, "useSearchProviders, useProviderProfile")
  Rel(provider_feature, google_maps_ext, "Geocodes provider addresses for display", "HTTPS")
  Rel(booking_feature, shared_packages, "Imports BookingStatus type")
  Rel(auth_feature, shared_packages, "Imports loginSchema, otpSchema for form validation")
```

### Data Flow Rule

Every data access in the codebase follows this strict layering:

```
Page Component
  → React Query hook      (useBookings, useProviders, …)
    → Service file        (bookingService.ts, providerService.ts, …)
      → Supabase client   (lib/supabase.ts)
        → PostgreSQL       (RLS-filtered result)
```

Components never call Supabase directly. This means the entire data layer can be swapped (to a REST API, GraphQL, or any other backend) by changing only the service files — zero component changes required.

### State Ownership

| State type | Tool | Examples |
|---|---|---|
| Server state (DB data) | TanStack Query | Bookings list, provider search results, service categories |
| Auth session | Zustand (`authStore`) | Current user, role, pending OTP phone number |
| Local UI state | React `useState` | Modal open/closed, selected date, form field values |

### Screens Built (Phase 2)

**Auth** — Splash, Login (OTP + Google), OTP verification, Role selection

**Customer** — Home (service grid), Search (geo providers), Provider profile, Booking wizard, Payment, Bookings list, Profile

**Provider** — Job board, Job detail, Active job (check-in + elapsed timer), Check-out summary

---

## 5. C4 Level 4 — Data Model

> **Audience**: Backend developers and architects. Full database schema with entity relationships.

```mermaid
erDiagram

    USERS {
        uuid id PK
        text email
        text phone
        text full_name
        text avatar_url
        enum role "customer | provider | admin"
        boolean is_verified
        timestamp created_at
    }

    PROVIDER_PROFILES {
        uuid id PK
        uuid user_id FK
        text bio
        enum verification_status "pending | verified | rejected"
        float rating_average
        int total_jobs_completed
        float completion_rate
        float no_show_rate
        float dispute_rate
        float reputation_score
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

    SAVED_LOCATIONS {
        uuid id PK
        uuid user_id FK
        text label "Home | Work | Other"
        text formatted_address
        float latitude
        float longitude
        geography point
        int visit_count
        float trust_score
        boolean is_default
        timestamp created_at
    }

    SERVICE_CATEGORIES {
        uuid id PK
        text name
        text slug
        boolean is_active
        int sort_order
    }

    SERVICE_TYPES {
        uuid id PK
        uuid category_id FK
        text name
        enum pricing_model "fixed | hourly | quote_based"
        decimal base_price
        decimal hourly_rate
        boolean is_active
    }

    PROVIDER_SERVICES {
        uuid id PK
        uuid provider_id FK
        uuid service_type_id FK
        decimal custom_price
        int service_radius_km
        boolean is_available
    }

    BOOKINGS {
        uuid id PK
        uuid customer_id FK
        uuid provider_id FK
        uuid service_type_id FK
        uuid location_id FK
        enum booking_type "instant | quote_based"
        enum status "pending|confirmed|in_progress|completed|cancelled|disputed"
        decimal total_amount
        decimal deposit_amount
        text customer_notes
        timestamp scheduled_at
        timestamp provider_checked_in_at
        timestamp provider_checked_out_at
        timestamp completed_at
        timestamp created_at
    }

    QUOTE_REQUESTS {
        uuid id PK
        uuid customer_id FK
        uuid service_type_id FK
        uuid location_id FK
        text problem_description
        enum status "open | in_review | accepted | expired"
        timestamp expires_at
    }

    QUOTES {
        uuid id PK
        uuid quote_request_id FK
        uuid provider_id FK
        decimal quoted_price
        enum status "submitted | accepted | rejected | withdrawn"
        timestamp submitted_at
        timestamp accepted_at
    }

    PAYMENTS {
        uuid id PK
        uuid booking_id FK
        uuid customer_id FK
        decimal amount
        enum status "pending | escrowed | released | refunded | disputed"
        text payment_gateway "yoco | peach"
        timestamp escrowed_at
        timestamp released_at
    }

    DISPUTES {
        uuid id PK
        uuid booking_id FK
        uuid payment_id FK
        uuid raised_by_user_id FK
        text reason
        enum status "open|under_review|resolved_customer|resolved_provider|escalated"
        uuid resolved_by_admin_id FK
        timestamp resolved_at
    }

    RATINGS {
        uuid id PK
        uuid booking_id FK
        uuid rated_by_user_id FK
        uuid rated_user_id FK
        int score "1-5"
        boolean is_provider_rating
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text title
        text body
        enum type "booking | payment | rating | dispute | system"
        boolean is_read
        timestamp created_at
    }

    USERS ||--o| PROVIDER_PROFILES : "has"
    USERS ||--o| CUSTOMER_PROFILES : "has"
    USERS ||--o{ SAVED_LOCATIONS : "saves"
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
    PAYMENTS ||--o| DISPUTES : "may be disputed"
```

### Booking State Machine

```
pending → confirmed → in_progress → completed
              ↘                    ↘
           cancelled             disputed
```

| Transition | Triggered by | Side effect |
|---|---|---|
| `pending → confirmed` | Provider accepts job | Payment captured into escrow |
| `confirmed → in_progress` | Provider checks in | `provider_checked_in_at` timestamp set automatically |
| `in_progress → completed` | Provider checks out | `provider_checked_out_at` set; escrow released after 48h or customer approval |
| `* → disputed` | Either party raises dispute | Payment frozen; admin notified |
| `* → cancelled` | Customer or provider cancels | Refund triggered via Edge Function |

### Payment State Machine

Payment state is independent of booking state, allowing a dispute to freeze funds without reverting the booking.

```
pending → escrowed → released
                  ↘
               refunded
               disputed
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Location as first-class entity** | Bookings link to `saved_locations`, not raw coordinates. Trust metadata (visit count, trust score) accumulates per location over time. |
| **PostGIS geography type** | `saved_locations.point` enables server-side `ST_DWithin` queries via `search_providers_near()` RPC — radius logic runs in the database, not the application. |
| **Dual reputation scores** | `provider_profiles` and `customer_profiles` carry independent scores. Bad actors on either side lose standing. Scores are recalculated via Edge Function triggers after every completed booking. |
| **Payment state separate from booking state** | `payments.status` has its own lifecycle independent of `bookings.status`. A dispute freezes payment without reverting booking state. |
| **Quote flow as separate path** | `quote_requests` and `quotes` are their own tables. A booking is only created once a quote is accepted — clean separation from the instant booking flow. |

### RLS Policy Summary

| Table | Customer | Provider | Admin |
|---|---|---|---|
| `users` | Read own | Read own | Full access |
| `saved_locations` | CRUD own | Read (for assigned jobs) | Full access |
| `bookings` | CRUD own | Read and update assigned | Full access |
| `payments` | Read own | Read own | Full access |
| `ratings` | CRUD own | Read | Full access |
| `disputes` | CRUD own | Read own | Full access |
| `provider_profiles` | Read all | CRUD own | Full access |
| `service_types` | Read all | Read all | Full access |

---

## 6. Technical Reference

### 6.1 Monorepo Structure

```
onserve/
├── apps/
│   ├── web/                        # React SPA — customer + provider web app
│   │   └── src/
│   │       ├── features/           # Domain-scoped modules
│   │       │   └── <domain>/
│   │       │       ├── services/   # Async functions that call Supabase
│   │       │       ├── hooks/      # React Query wrappers (useQuery / useMutation)
│   │       │       └── store/      # Zustand slices (client-only state)
│   │       ├── pages/              # Route-level page components
│   │       │   ├── auth/           # Splash, Login, OTP, RoleSelect
│   │       │   ├── customer/       # Home, Search, Booking, BookingsList, Profile
│   │       │   └── provider/       # JobBoard, JobDetail, ActiveJob, CheckOut
│   │       ├── components/
│   │       │   ├── ui/             # shadcn/ui components (project-owned source)
│   │       │   └── layout/         # AppShell, BottomNav
│   │       ├── router/             # React Router config + RequireAuth guard
│   │       └── lib/                # supabase.ts, queryClient.ts, utils.ts
│   ├── mobile/                     # React Native / Expo (Phase 4)
│   └── api/                        # Supabase Edge Functions (Phase 3)
├── packages/
│   ├── types/                      # @onserve/types — TypeScript interfaces + enums
│   ├── shared/                     # @onserve/shared — Zod schemas, utils, constants
│   └── ui/                         # @onserve/ui — future shared primitives
└── planning/                       # Architecture docs, ERD, ADRs, SQL migrations
```

### 6.2 Full Tech Stack

| Concern | Technology | Notes |
|---|---|---|
| Web framework | React 18 | Strict mode |
| Language | TypeScript 5.4 | Strict mode throughout |
| Build tool | Vite 5 | Hot reload, path aliases |
| Styling | Tailwind CSS v4 | CSS-first config, `@theme inline` |
| UI components | shadcn/ui + Radix UI | Owned source in `src/components/ui/` |
| Icons | Lucide React | Consistent icon set |
| Forms | React Hook Form + Zod | All forms validated via shared schemas |
| Server state | TanStack Query v5 | Caching, mutation invalidation |
| Client state | Zustand v5 | Auth store, UI state |
| Routing | React Router v6 | `createBrowserRouter`, role-based guards |
| Notifications | Sonner | Toast system |
| Date utilities | date-fns v3 | Formatting and elapsed time |
| Backend | Supabase | Postgres 17 + PostGIS + Auth + Realtime |
| Testing | Vitest + happy-dom | 59 unit tests across 5 service files |
| Monorepo | Turborepo v2 | `tasks` config, parallel builds |

### 6.3 Design System

All colours are defined as CSS custom properties in `apps/web/src/index.css`. Changing `--primary` once updates the entire application.

| Token | Value | Used for |
|---|---|---|
| `--primary` | `#00D97E` | Buttons, focus rings, active states |
| `--background` | `#0A0A0F` | Page background |
| `--surface` | `#13131A` | Secondary backgrounds |
| `--card` | `#1C1C26` | Elevated card surfaces |
| `--border` | `#2A2A38` | All borders and dividers |
| `--foreground` | `#F0EFE8` | Primary text |
| `--muted-foreground` | `#888898` | Secondary text, placeholders |
| `--destructive` | `#E8453C` | Errors, destructive actions |
| `--warning` | `#F5A623` | Star ratings, caution states |

### 6.4 Authentication Flow

```
Phone OTP path:
  LoginPage → sendOtp(e164) → setPendingPhone()
    → OTPPage → verifyOtp(phone, token)
      → onAuthStateChange fires → user set in store
        → navigate('/role') → setUserRole(role)
          → navigate('/') → RequireAuth passes

Google OAuth path:
  LoginPage → signInWithGoogle() → browser redirects to Google
    → Google callback → Supabase processes token
      → onAuthStateChange fires → user set in store
        → RequireAuth: user set, role null → redirect to '/role'
          → setUserRole(role) → navigate('/') → RequireAuth passes
```

### 6.5 Infrastructure

| Resource | Value |
|---|---|
| Supabase project | `onserve-poc` |
| Project ID | `pehkmwbvwfohckakumnh` |
| Region | eu-west-1 (Ireland) |
| PostgreSQL version | 17.6.1 |
| Migrations applied | 8 (all verified) |
| Tables | 15 (all with RLS) |
| Active DB extensions | PostGIS, uuid-ossp, pgcrypto, pg_stat_statements, plpgsql |

---

## 7. Development Setup

### Prerequisites

- Node.js 22+
- npm 10+

### Installation

```bash
git clone <repo>
cd onserve
npm install
```

### Environment Variables

Create `apps/web/.env.local` — this file is gitignored and must never be committed:

```env
VITE_SUPABASE_URL=https://pehkmwbvwfohckakumnh.supabase.co
VITE_SUPABASE_ANON_KEY=<get from Supabase → Settings → API → anon public>
```

Never use the service role key in the frontend — it bypasses all RLS policies.

### Commands

```bash
# Start all apps (browser opens at localhost:5173 automatically)
npm run dev

# Run tests — 59 unit tests across 5 service files
npm test

# Type check
cd apps/web && npx tsc -b --noEmit

# Build for production
npm run build

# Format
npm run format
```

### Google OAuth (local development)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → Credentials → OAuth client ID
2. Set **Authorised redirect URI** to `https://pehkmwbvwfohckakumnh.supabase.co/auth/v1/callback`
3. Add `http://localhost:5173` to **Authorised JavaScript origins**
4. In Supabase dashboard → Authentication → Providers → Google: enable and paste Client ID + Secret
5. Add `http://localhost:5173` to Supabase → Authentication → URL Configuration → Redirect URLs

### Coding Standards

- TypeScript strict mode — no `any` without justification
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Services pattern — no direct Supabase calls in components
- React Query for all server state — no `useState` for fetched data
- Zod schemas from `@onserve/shared` for all form validation
- Mobile-first Tailwind classes — responsive modifiers added as needed
- Accessible by default — semantic HTML, ARIA labels, keyboard navigation

---

*Internal document — confidential. Questions? Raise a GitHub issue or message the architecture channel.*
