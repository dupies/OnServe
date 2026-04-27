# OnServe — Project Plan

> **POC Target**: 6–8 weeks  
> **Stack**: React + React Native + Supabase  
> **Pattern**: Services layer for backend-agnostic frontend

---

## Delivery Phases

### ✅ Phase 0 — Architecture & Design (Current)
- [x] Architecture document
- [x] C4 diagrams (Context, Container, Component)
- [x] ERD
- [ ] Figma mockups (Step 2)
- [ ] ADRs for key decisions

### 🔲 Phase 1 — Foundation (Week 1–2)
- [ ] Monorepo setup (Turborepo)
- [ ] Shared types package (`@onserve/types`)
- [ ] Supabase project setup (new project: `onserve-poc`)
- [ ] Database migrations (core tables)
- [ ] RLS policies
- [ ] Auth flow (phone OTP + email)
- [ ] Base UI component library

### 🔲 Phase 2 — Core Marketplace (Week 3–4)
- [ ] Service catalogue (categories + types)
- [ ] Provider onboarding flow
- [ ] Location capture + geocoding
- [ ] Saved locations
- [ ] Provider search + filtering
- [ ] Instant booking flow
- [ ] Basic customer dashboard
- [ ] Basic provider dashboard

### 🔲 Phase 3 — Trust & Payments (Week 5–6)
- [ ] Yoco payment integration
- [ ] Escrow logic (Edge Functions)
- [ ] Dual rating system
- [ ] Location trust scoring
- [ ] Provider check-in / check-out
- [ ] Booking state machine
- [ ] Basic notifications (Supabase Realtime)

### 🔲 Phase 4 — Polish & Mobile (Week 7–8)
- [ ] React Native app (Expo)
- [ ] Push notifications
- [ ] Quote-based booking flow
- [ ] Dispute flow (basic)
- [ ] Admin panel (basic)
- [ ] End-to-end testing

---

## Step 2: Figma Mockups

Screens to design before building:

**Customer App**
1. Onboarding / Welcome
2. Phone OTP verification
3. Home — service category grid
4. Location picker (GPS + saved locations)
5. Provider search results
6. Provider profile
7. Booking wizard (instant)
8. Quote request flow
9. Booking tracking (map + status)
10. Customer dashboard (bookings list)
11. Rating screen

**Provider App**
1. Provider onboarding
2. Service setup
3. Job board (available jobs)
4. Job detail + accept/reject
5. Active job (check-in/out)
6. Earnings dashboard
7. Profile / reputation

**Shared**
1. Chat / messaging
2. Dispute form
3. Notification centre

---

## Tech Alternatives Considered

| Decision | Chosen | Alternative | Reason Not Chosen |
|---|---|---|---|
| Backend | Supabase | NestJS + Prisma | Speed for POC; swap later |
| Mobile | React Native | Flutter | Code sharing with web React |
| Auth | Supabase Auth | Clerk | Included in Supabase, sufficient for POC |
| Payments | Yoco | Stitch / PayFast | SA-first, good DX, easy integration |
| State | Zustand + React Query | Redux Toolkit | Lighter, TypeScript-first |
| Monorepo | Turborepo | Nx | Simpler config, faster for small teams |
| Maps | Google Maps | Mapbox | Better SA coverage + reverse geocoding |

---

## Development Conventions

All work follows hard project rules:
- TypeScript strict mode throughout
- ESLint + Prettier enforced via CI
- Vitest for all unit + integration tests
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Feature-based folder structure per app
- Services pattern — no direct Supabase calls in components
- Mobile-first responsive design
- Accessibility: ARIA + semantic HTML
- No hardcoded config values — all via `.env`
