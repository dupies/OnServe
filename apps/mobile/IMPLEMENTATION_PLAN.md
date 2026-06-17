# OnServe Mobile App — Implementation Plan

**Status:** Starting Phase 0 (Foundation)  
**Branch:** `feat/mobile-app-phase0-foundation`  
**Review Document:** `onserve-mobile-plan-review.md`

---

## Execution Strategy

This implementation follows the **parallel agent teams** approach:
- **Phase 0a (Web-side API extraction)** — Runs independently, validates `@onserve/api` pattern before mobile work
- **Phase 0b (Mobile scaffold)** — Runs in parallel with 0a; starts once Metro config is proven
- **Phase 1 (Design system)** — Can start alongside Phase 0b
- **Phases 2–5** — Sequential as features build on each other

Each phase includes:
1. **Implementation** — Agent builds the feature/component
2. **Testing** — Unit tests, integration tests, manual verification
3. **Documentation** — Code comments, setup guides, decisions recorded
4. **Sign-off** — Verification before moving to next phase

---

## Phase 0a: Web-Side API Extraction (1–2 weeks)

**Goal:** Migrate feature services from `apps/web/src/features/*/services/*.ts` into `packages/api` without breaking production.

**Deliverables:**
- [ ] Audit all service files and dependency map
- [ ] Select 2–3 low-risk features (lowest import dependencies)
- [ ] Create `packages/api` structure with `tsconfig.json`
- [ ] Migrate one feature at a time, verify web build/tests green
- [ ] Document import rewiring pattern for remaining features
- [ ] Record any circular dependency discoveries

**Key Milestones:**
- **M0.1a** — Service audit completed, risk categories assigned
- **M0.1b** — First feature migrated, web app builds/tests pass
- **M0.1c** — Second feature migrated, patterns documented

**Success Criteria:**
- Web app builds without errors
- All web tests pass
- No duplicate dependencies or circular imports detected
- CI passes on every feature migration commit

---

## Phase 0b: Mobile Scaffold & Metro Configuration (3–5 days)

**Goal:** Create a fresh Expo SDK 56 app with correct monorepo configuration and shared package resolution.

**Deliverables:**
- [ ] Fresh Expo app via `create-expo-app@latest`
- [ ] Metro configuration with `disableHierarchicalLookup`
- [ ] TypeScript project references configured
- [ ] `.easignore` excludes only `*/node_modules`
- [ ] Custom dev client builds successfully on iOS and Android
- [ ] Deep-link scheme `onserve://` registered
- [ ] EAS project initialized with development profile

**Key Milestones:**
- **M0.2a** — Fresh app scaffolded, Metro config tested
- **M0.2b** — Dev client builds on both platforms
- **M0.2c** — EAS development profile working

**Success Criteria:**
- `eas build --platform ios --profile development` succeeds
- `eas build --platform android --profile development` succeeds
- Dev client launches with `eas dev` in emulator/simulator
- No Metro module resolution errors

---

## Phase 0c: `@onserve/core` Registry & Intent Router (3–5 days)

**Goal:** Build the AI-ready action registry, intent router, and context selectors.

**Deliverables:**
- [ ] `packages/core` directory with `tsconfig.json`
- [ ] `registry.ts` — All actions with Zod schemas (booking, provider, payment)
- [ ] `router.ts` — Intent dispatcher for navigation + actions + bottom sheets
- [ ] `context.ts` — App context selectors (user, location, bookings, preferences)
- [ ] `agent-bridge.ts` — Dormant AI SDK adapter (unused, documented)
- [ ] Unit tests for registry (every action has schema + handler)
- [ ] TypeScript strict mode passes

**Key Milestones:**
- **M0.3a** — Registry and router modules complete
- **M0.3b** — Context selectors integrated with TanStack Query
- **M0.3c** — All unit tests passing

**Success Criteria:**
- No TypeScript errors in `strict` mode
- Registry test asserts every action has Zod schema
- Intent router handles all three intent types
- Context selectors return properly typed data from React Query cache

---

## Phase 0d: `@onserve/ui-tokens` Design Tokens (2–3 days)

**Goal:** Create shared Tailwind v4 design tokens consumed by both web and mobile.

**Deliverables:**
- [ ] `packages/ui-tokens` with `tailwind.config.ts`
- [ ] CSS variables file with dark theme (surfaces, accents, semantic colors)
- [ ] Shared color palette: `#0A0A0F` (base), `#13131A`, `#1C1C26`, `#00D97E` (teal)
- [ ] Typography scale exported as Tailwind plugins
- [ ] Shadow and border-radius scales
- [ ] Import in both web and mobile Tailwind configs

**Key Milestones:**
- **M0.4a** — Token definitions and CSS variables complete
- **M0.4b** — Both web and mobile use shared config

**Success Criteria:**
- Tailwind config merges without conflicts
- Both web and mobile use same color tokens
- CSS variables accessible in both web and native

---

## Phase 1: Design System & Native Components (1 week)

**Goal:** Establish `@expo/ui` + NativeWind integration and component patterns.

**Deliverables:**
- [ ] NativeWind v5 preview installed and configured
- [ ] `@expo/ui` components setup (Button, TextField, Card, BottomSheet, etc.)
- [ ] Component wrapper library (`@onserve/ui-components`) using `@expo/ui` + NativeWind
- [ ] Motion system (Reanimated v3 spring animations, haptics)
- [ ] Per-role tab shells (customer, provider) with native bottom tabs
- [ ] Storybook or manual component gallery

**Key Milestones:**
- **M1.0a** — NativeWind + `@expo/ui` working, zero compilation errors
- **M1.0b** — Core component set built and styled
- **M1.1** — Per-role tab shells navigable

**Success Criteria:**
- Dev client launches without NativeWind styling errors
- Components use shared tokens from `@onserve/ui-tokens`
- Haptics fire on touch interactions
- Bottom tabs render native on iOS (Material 3 on Android)

---

## Phase 2a: Customer Core Flows (Auth → Home → Search → Provider Profile) (1–2 weeks)

**Goal:** Get a navigable app with auth, home, search, and provider discovery.

**Deliverables:**
- [ ] Auth flow: splash → OTP input → role select (customer/provider)
- [ ] Home screen: personalized greeting, location badge, service categories, quick actions
- [ ] Search screen: category selection, location filter, provider list/map view toggle
- [ ] Provider profile screen: rating, services, availability, "book now" CTA
- [ ] Deep linking functional for all screens
- [ ] Push to Expo Preview build via EAS Build

**Key Milestones:**
- **M2.0a** — Auth flow complete and testable
- **M2.0b** — Home + search screens navigable
- **M2.0c** — Preview build shareable to stakeholders

**Success Criteria:**
- User can authenticate via OTP, select role
- Home screen shows personalized content
- Search filters by category and location
- Provider profile displays correctly
- Maestro critical path test passes

---

## Phase 2b: Booking & Payment Flow (1–2 weeks)

**Goal:** Complete booking form, quote request, and Ozow payment integration.

**Deliverables:**
- [ ] Booking form: service, provider, date/time, special instructions
- [ ] Quote request flow and display
- [ ] Ozow payment via `expo-web-browser` + deep link
- [ ] Payment success/failure handling
- [ ] Edge function for payment verification
- [ ] Ozow sandbox testing

**Key Milestones:**
- **M2.5a** — Booking form functional
- **M2.5b** — Ozow round-trip tested end-to-end

**Success Criteria:**
- Booking form submits and creates booking in Supabase
- Ozow payment URL generated and opens in in-app browser
- Deep link returns to success/failure screen
- Booking confirmed in database after successful payment

---

## Phase 2c: Booking Management & Live Tracking (1 week)

**Goal:** Bookings list, live provider tracking, and rating flow.

**Deliverables:**
- [ ] Bookings list with filtering (active, past, cancelled)
- [ ] Live tracking with `react-native-maps` and Supabase realtime
- [ ] Rating/review flow after completion
- [ ] Dispute flow navigation

**Key Milestones:**
- **M2.8** — All customer flows end-to-end testable

**Success Criteria:**
- Live tracking map updates in real-time
- Booking can be rated after completion
- Dispute can be initiated from booking detail

---

## Phase 3a: Provider Onboarding (1 week)

**Goal:** Multi-step onboarding capturing profile, ID verification, services, and banking.

**Deliverables:**
- [ ] Onboarding wizard: profile → ID verification → services → banking → confirmation
- [ ] `expo-image-picker` for ID + selfie
- [ ] Verification step with optional OCR
- [ ] Bank account form for payouts

**Key Milestones:**
- **M3.0a** — Onboarding form complete and testable

**Success Criteria:**
- Provider can complete onboarding end-to-end
- Images uploaded to Supabase Storage
- Bank account safely stored (encrypted)

---

## Phase 3b: Job Board & Active Job (1 week)

**Goal:** Job discovery, acceptance, and active job tracking.

**Deliverables:**
- [ ] Job board: swipeable cards or list with accept/decline
- [ ] PostGIS proximity filtering on Supabase
- [ ] Active job screen: customer location, "Check in" / "Check out" / "Contact customer" actions
- [ ] Persistent foreground notification with elapsed time and earnings

**Key Milestones:**
- **M3.0b** — Job board functional
- **M3.5** — Provider earnings visible

**Success Criteria:**
- Provider sees available jobs filtered by proximity
- Job can be accepted and tracked
- Earnings updated in real-time

---

## Phase 4: Platform Integrations (1–2 weeks)

**Goal:** Push notifications, deep-link matrix, maps polish.

**Deliverables:**
- [ ] Push notification setup: `expo-notifications`, Supabase `push_tokens` table
- [ ] Edge function for notification delivery
- [ ] Deep-link handlers for payment, bookings, chat, disputes
- [ ] Map polish: custom provider pins, callouts, smooth animations
- [ ] Location permission flow

**Key Milestones:**
- **M4.0** — Push notifications tested, deep-link matrix complete

**Success Criteria:**
- Push notification delivered to device on booking event
- Tapping notification navigates to correct screen
- Maps render custom UI with no performance lag

---

## Phase 5: CI/CD & Release (1–2 weeks)

**Goal:** EAS Workflows, Maestro E2E tests, store submission setup.

**Deliverables:**
- [ ] EAS Workflows configuration for preview and production
- [ ] Maestro E2E flow files: customer critical path, provider critical path
- [ ] GitHub Actions integration (optional)
- [ ] Store submission prep: TestFlight (iOS), Internal Testing (Android)
- [ ] Release notes template

**Key Milestones:**
- **M5.0** — Continuous deployment ready, store submission in progress

**Success Criteria:**
- EAS Workflows runs Maestro tests on every PR
- Maestro tests pass against preview build
- Store submission ready for internal testing

---

## Tracking Checklist

Use this to track completion of each phase:

- [ ] Phase 0a: API extraction (web-side)
- [ ] Phase 0b: Mobile scaffold + Metro config
- [ ] Phase 0c: Core registry + router
- [ ] Phase 0d: UI tokens
- [ ] Phase 1: Design system
- [ ] Phase 2a: Auth + Home + Search
- [ ] Phase 2b: Booking + Payment
- [ ] Phase 2c: Bookings list + Live tracking
- [ ] Phase 3a: Provider onboarding
- [ ] Phase 3b: Job board + Active job
- [ ] Phase 4: Push notifications + Deep links
- [ ] Phase 5: CI/CD + Release

---

## Key Risks & Mitigations

| Risk | Phase | Mitigation |
|---|---|---|
| Web build breaks during API extraction | 0a | One feature at a time, web tests must pass before proceeding |
| Metro resolution failures | 0b | Exact `metro.config.js` configuration, test on both platforms |
| NativeWind v5 preview instability | 1 | Pin to specific version, monitor changelog, v4 fallback available |
| Ozow payment edge cases | 2b | Extensive testing with sandbox, handle cancellation/backgrounding/network loss |
| Push notification delivery flakiness | 4 | Use Supabase edge functions, not client-side Expo API calls |

---

## Next Steps

1. **Start Phase 0a immediately** — Audit service files and begin first feature migration
2. **Dispatch agents** to work on 0b, 0c, 0d in parallel (no dependencies until 0a validates pattern)
3. **Daily standups** — Each phase team reports blockers and progress
4. **Merge to main** only after sign-off (all tests pass, docs complete, no regressions)

