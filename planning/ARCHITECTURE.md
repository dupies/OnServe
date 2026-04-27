# OnServe — Architecture Document

> **Version**: 0.1.0 — POC  
> **Last Updated**: 2026-04-27  
> **Status**: Draft

---

## 1. Vision

OnServe is a **location-secure, trust-first marketplace** connecting South Africans to on-demand services delivered at their location — backed by verification, accountability, and intelligent assistance.

**Strategic Position**: The operating system for informal services in South Africa.

---

## 2. System Overview

OnServe is a **multi-sided marketplace platform** with three primary actors:

| Actor | Description |
|---|---|
| **Customer** | Books and pays for services at their location |
| **Provider** | Delivers services, manages jobs and earnings |
| **Admin** | Manages platform, disputes, and onboarding |

---

## 3. Tech Stack

### POC Stack (Current)
| Layer | Technology | Rationale |
|---|---|---|
| Web Frontend | React 18 + TypeScript + Vite | Fast iteration, large ecosystem |
| Mobile | React Native (Expo) | Code sharing with web, SA market needs native |
| Styling | Tailwind CSS | Utility-first, consistent design system |
| State (Server) | TanStack Query (React Query) | Caching, sync, optimistic updates |
| State (Client) | Zustand | Lightweight, TypeScript-first |
| Backend | Supabase (BaaS) | Auth, DB, Storage, Realtime, Edge Functions |
| Database | PostgreSQL (via Supabase) | Relational, RLS, PostGIS for geo queries |
| Auth | Supabase Auth | JWT, OTP, OAuth |
| File Storage | Supabase Storage | Profile photos, service images, ID docs |
| Payments | Yoco / Peach Payments | SA-first payment rails |
| Maps | Google Maps API | Geocoding, reverse geocoding, distance |
| AI | Anthropic Claude API | Hairstyle recommendations, smart matching |
| Monorepo | Turborepo | Shared packages, fast builds |

### Future/Alternative Stack (Post-POC)
| Layer | Alternative | Why Consider |
|---|---|---|
| Backend | NestJS + Prisma | When Supabase limits are hit, need custom logic |
| Database | Neon (Serverless PG) | Cost at scale, branching |
| Auth | Clerk | Better DX, more advanced user management |
| Mobile | Flutter | Better performance for SA low-end devices |
| Payments | Stitch | Local SA, open banking integrations |
| Queue | BullMQ / Inngest | Background jobs at scale |
| Cache | Upstash Redis | Rate limiting, sessions, caching |

---

## 4. Repository Structure (Monorepo)

```
onserve/
├── apps/
│   ├── web/                    # React web app (customer + provider dashboards)
│   ├── mobile/                 # React Native / Expo app
│   └── api/                    # Supabase Edge Functions (custom logic)
├── packages/
│   ├── types/                  # Shared TypeScript types & interfaces
│   ├── shared/                 # Business logic, utils, constants
│   └── ui/                     # Shared UI components
├── docs/
│   ├── architecture/           # This document + ADRs
│   ├── diagrams/               # C4 + ERD source files
│   └── adr/                    # Architecture Decision Records
├── scripts/                    # Dev tooling, DB seed scripts
└── .github/workflows/          # CI/CD pipelines
```

---

## 5. Services Pattern

All data access is abstracted behind **service classes**. React components never call Supabase directly. This enables backend swapping without touching UI code.

```
apps/web/src/
├── features/
│   ├── auth/
│   │   ├── services/authService.ts        ← calls Supabase Auth
│   │   ├── hooks/useAuth.ts
│   │   └── components/LoginForm.tsx
│   ├── bookings/
│   │   ├── services/bookingService.ts     ← calls Supabase DB
│   │   ├── hooks/useBookings.ts
│   │   └── components/BookingCard.tsx
│   └── ...
├── lib/
│   ├── supabase.ts                        ← Supabase client (one place)
│   └── api.ts                             ← future REST/GraphQL client
```

**Swapping backend**: Change only `lib/supabase.ts` and service files. Zero component changes.

---

## 6. Core Domains

### 6.1 Authentication & Identity
- Phone OTP (primary — SA market)
- Email/password (secondary)
- Google OAuth (optional)
- Role-based: `customer`, `provider`, `admin`
- Provider KYC: ID document upload + verification state

### 6.2 Location & Trust System
- GPS capture at booking time
- Reverse geocoding to human-readable address
- Saved locations (Home, Work, Other)
- **Location Trust Score**: increases with repeat verified bookings
- **Area Risk Indicator**: Low / Medium / High per area
- Suspicious pattern detection (frequent changes, dispute spikes)

### 6.3 Service Catalogue
- Category → Sub-category → Service Type
- Pricing models: Fixed | Hourly | Quote-based
- Required skills/certifications per service type
- Provider sets: service radius, pricing, availability

### 6.4 Booking Engine
- **Instant Booking**: Fixed price, immediate confirmation
- **Quote-Based Booking**: Customer posts job → providers bid → customer selects
- Booking states: `pending` → `confirmed` → `in_progress` → `completed` → `disputed`
- Location tied to each booking (not just user account)

### 6.5 Payments & Escrow
- Fixed services: full escrow upfront
- Quote-based: deposit (20–50%) upfront, balance on completion
- Release triggered by customer approval or auto-release after 48h
- Dispute hold: funds frozen pending resolution

### 6.6 Trust & Reputation
- **Dual rating**: Customer ↔ Provider (both sides rate)
- **Provider Reputation Score**: rating + completion rate + no-show rate + dispute frequency
- **Customer Reputation Score**: cancellation rate + dispute abuse + location trust
- Scores affect: search ranking, job matching, access to premium features

### 6.7 AI Features (Phase 1)
- **Hairstyle Preview**: Upload selfie → face mapping → style overlays → provider recommendations
- **Smart Recommendations**: Cross-category upsell ("You booked a photographer → need makeup?")

---

## 7. Security Principles

- All secrets in environment variables — never in code
- Row Level Security (RLS) on all Supabase tables
- JWT validation on every Edge Function
- Provider ID verification before first job
- Location data treated as PII — never exposed publicly
- Escrow ensures no direct money transfers between users

---

## 8. MVP Scope

**Phase 1 (POC)**:
- Auth (phone OTP + email)
- 2 service categories: Cleaning + Beauty
- Instant booking only
- Basic location capture (GPS + saved locations)
- Payments: Yoco integration
- Basic dual rating
- Web + Mobile

**Phase 2**:
- Quote-based bookings
- 3rd category (Plumbing)
- Location trust scoring
- Provider reputation algorithm
- AI hairstyle preview

**Phase 3**:
- Full multi-category
- Smart recommendations
- Panic alert / safety features
- Admin dispute resolution dashboard
