# Technical Brief — UI Component Library & Frontend Stack

**Project:** OnServe POC  
**Phase:** 2 — UI Build  
**Prepared:** 30 April 2026  
**Version:** 1.0  
**Audience:** Frontend & Mobile Developers  
**Status:** Active — approved for distribution

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Decision — Primary Component Library](#2-decision--primary-component-library)
3. [Full Frontend Stack](#3-full-frontend-stack)
4. [shadcn/ui Setup Instructions](#4-shadcnui-setup-instructions)
5. [Component Mapping — Screens to Components](#5-component-mapping--screens-to-components)
6. [Coding Standards](#6-coding-standards)
7. [Live Infrastructure](#7-live-infrastructure)
8. [Environment Setup](#8-environment-setup)
9. [Running the Project](#9-running-the-project)
10. [Phase 2 Delivery Checklist](#10-phase-2-delivery-checklist)
11. [References](#11-references)

---

## 1. Purpose

This brief defines the approved UI component library, frontend tooling, and styling strategy for the OnServe POC. All developers working on `apps/web` and `apps/mobile` must follow these decisions. Deviations require architecture sign-off.

> **Context:** Phase 1 (Supabase project, database migrations, RLS policies, service layer, auth) is complete. This brief governs Phase 2 — building all screens defined in the approved mockups.

---

## 2. Decision — Primary Component Library

### 2.1 Approved: shadcn/ui for the web app

After evaluating the options below, **shadcn/ui** is the approved component library for `apps/web`.

| Library | Type | Verdict | Reason |
|---|---|---|---|
| **shadcn/ui** | Copy-into-project | ✅ **Approved** | Tailwind-native, accessible, fully owned |
| MUI (Material UI) | Installed dependency | ❌ Rejected | Opinionated styling conflicts with design system |
| Chakra UI | Installed dependency | ❌ Rejected | Runtime CSS-in-JS, performance overhead |
| Ant Design | Installed dependency | ❌ Rejected | Heavy bundle, not Tailwind-compatible |
| Mantine | Installed dependency | ⚠️ Considered | Good DX but adds CSS variable duplication with Tailwind |

### 2.2 What shadcn/ui actually is

shadcn/ui is **not** a traditional npm package. Running the CLI copies component source code directly into your project under `src/components/ui/`. You own the code entirely — no version lock-in, no opaque dependency, every component can be modified freely.

It is built on two foundations:

- **Radix UI primitives** — handles all accessibility concerns (ARIA roles, keyboard navigation, focus management, screen reader support) that are required by our non-negotiable accessibility standard.
- **Tailwind CSS** — the styling layer you are already using. No additional CSS methodology is introduced.

### 2.3 Why this is the right choice for OnServe

| Requirement | How shadcn/ui satisfies it |
|---|---|
| TypeScript strict mode | All components are fully typed. No `any` types. |
| Accessibility by default | Radix UI handles ARIA, focus traps, keyboard nav out of the box. |
| Tailwind integration | Classes are the only styling mechanism. Zero conflict. |
| Dark mode | `dark:` variant support built in. Matches OnServe dark palette. |
| No vendor lock-in | You own the source. Backend swap does not touch components. |
| Customisability | Every component is plain source code. Full control over design. |
| Bundle size | Only installed components are included. No dead code. |

---

## 3. Full Frontend Stack

### 3.1 Web app (`apps/web`)

| Concern | Library | Version | Notes |
|---|---|---|---|
| Core UI components | shadcn/ui | latest | Copy-in via CLI — see Section 4 |
| Styling | Tailwind CSS | ^3.4 | Already configured in Phase 1 |
| Component primitives | Radix UI | via shadcn | Do not install directly — use through shadcn |
| Icons | Lucide React | ^0.383 | Bundled with shadcn. Use only Lucide — no other icon sets |
| Forms | React Hook Form | ^7.51 | Pair with shadcn `Form` component |
| Validation | Zod | ^3.23 | Schema validation for all form inputs and API responses |
| Server state | TanStack Query | ^5.35 | Already in place from Phase 1 |
| Client state | Zustand | ^4.5 | Already in place from Phase 1 |
| Routing | React Router | ^6.23 | Already in place from Phase 1 |
| Animations | Framer Motion | ^11.2 | Screen transitions and micro-interactions only |
| Date handling | date-fns | ^3.6 | Pair with shadcn `Calendar` component |
| Charts | Recharts | ^2.12 | Provider earnings dashboard only |
| Maps | Google Maps JS API | latest | Location picker, live tracking screen |

### 3.2 Mobile app (`apps/mobile`)

shadcn/ui does not work in React Native. The mobile stack uses the following:

| Concern | Library | Notes |
|---|---|---|
| Styling | NativeWind v4 | Tailwind utility classes in React Native. Keeps styling model consistent with web. |
| Navigation | React Navigation v6 | Stack + Bottom Tab navigators |
| Forms | React Hook Form | Same library as web — identical validation patterns |
| Validation | Zod | Same schemas as web via `@onserve/shared` |
| Server state | TanStack Query | Same library as web |
| Client state | Zustand | Same stores as web where possible |
| Maps | react-native-maps | Location picker, provider tracking |
| Icons | Lucide React Native | Mirrors web icon set |

### 3.3 Shared packages

The shared packages (`@onserve/types`, `@onserve/shared`) are consumed by both apps. Zod schemas, TypeScript interfaces, business logic, and formatting utilities are written once and shared. **Never duplicate these across apps.**

| Package | Contains | Consumed by |
|---|---|---|
| `@onserve/types` | All TypeScript interfaces and enums (User, Booking, Payment, etc.) | web, mobile, api |
| `@onserve/shared` | `formatCurrency`, `getTrustLevel`, constants, Zod schemas | web, mobile |
| `@onserve/ui` | Future: shared primitive components (Phase 3+) | web, mobile |

---

## 4. shadcn/ui Setup Instructions

### 4.1 Initialise shadcn in `apps/web`

Run from the `apps/web` directory. Answer the prompts exactly as shown below.

```bash
cd apps/web
npx shadcn@latest init
```

| Prompt | Answer |
|---|---|
| Which style would you like to use? | Default |
| Which color would you like to use as base color? | Slate |
| Where is your global CSS file? | `src/index.css` |
| Would you like to use CSS variables for colors? | Yes |
| Where is your tailwind.config.js located? | `tailwind.config.js` |
| Configure the import alias for components? | `@/components` |
| Configure the import alias for utils? | `@/lib/utils` |
| Are you using React Server Components? | No |

### 4.2 Override the default theme with OnServe colours

After init, replace the CSS variable block in `src/index.css` with the OnServe design tokens. This ensures all shadcn components automatically use the correct palette.

```css
@layer base {
  :root {
    --background: 240 10% 4%;         /* #0A0A0F */
    --foreground: 40 13% 94%;          /* #F0EFE8 */
    --card: 240 10% 9%;                /* #1C1C26 */
    --card-foreground: 40 13% 94%;
    --primary: 158 100% 43%;           /* #00D97E — OnServe accent */
    --primary-foreground: 240 10% 4%;
    --secondary: 240 8% 12%;           /* #13131A */
    --secondary-foreground: 40 13% 94%;
    --muted: 240 8% 22%;               /* #2A2A38 */
    --muted-foreground: 240 4% 54%;    /* #888898 */
    --destructive: 0 65% 57%;          /* #E8453C */
    --border: 240 8% 22%;              /* #2A2A38 */
    --ring: 158 100% 43%;              /* focus rings = accent */
    --radius: 0.5rem;
  }
}
```

### 4.3 Install components needed for Phase 2

Install only the components you will use. Run from `apps/web`:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add badge
npx shadcn@latest add toast
npx shadcn@latest add avatar
npx shadcn@latest add progress
npx shadcn@latest add separator
npx shadcn@latest add dropdown-menu
npx shadcn@latest add calendar
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add tabs
```

Add more as needed. The full component list is at https://ui.shadcn.com/docs/components.

---

## 5. Component Mapping — Screens to Components

Build screens in priority order. P1 must be complete before P2 work begins.

| Screen | Priority | shadcn Components Required |
|---|---|---|
| Home | P1 | `Badge`, `Avatar`, `Card` |
| Search results | P1 | `Card`, `Badge`, `Avatar`, `Input` |
| Provider profile | P1 | `Card`, `Badge`, `Avatar`, `Progress`, `Sheet`, `Button` |
| Location picker | P1 | `Dialog`, `Button`, `Badge`, `Card` |
| Saved locations | P1 | `Card`, `Badge`, `Progress`, `Button` |
| Booking wizard | P1 | `Form`, `Input`, `Label`, `Select`, `Calendar`, `Card`, `Button` |
| Payment / escrow | P1 | `Card`, `Separator`, `Button`, `Badge` |
| Live tracking | P1 | `Card`, `Badge`, `Progress`, `Button` |
| Bookings list | P1 | `Card`, `Badge`, `Avatar`, `Tabs` |
| User profile | P1 | `Card`, `Avatar`, `Badge`, `Progress`, `Button` |
| Provider job board | P1 | `Card`, `Badge`, `Avatar`, `Button` |
| Rate & review | P2 | `Dialog`, `Card`, `Textarea`, `Button`, `Badge` |
| Quote request | P2 | `Form`, `Input`, `Textarea`, `Label`, `Select`, `Button` |
| Quote review | P2 | `Card`, `Avatar`, `Badge`, `Button` |
| Chat / messages | P2 | `Input`, `Button`, `Avatar`, `Badge` |
| Dispute form | P2 | `Form`, `Textarea`, `Input`, `Label`, `Card`, `Button` |
| Notifications | P2 | `Card`, `Badge`, `Button` |
| Provider earnings | P2 | `Card`, `Progress`, `Separator`, `Tabs`, `Badge` |
| Admin dashboard | P3 | `Card`, `Badge`, `Tabs`, `Button` |

---

## 6. Coding Standards

All Phase 2 work must comply with the project-wide hard rules established in Phase 1. The following rules are specific to component development.

### 6.1 Component architecture

- Never call Supabase directly from a component. All data access goes through service files in `features/*/services/`.
- Use React Query (`useQuery`, `useMutation`) for all server state. Never use `useState` for data fetched from the backend.
- Use Zustand only for client-side UI state (modals open/closed, selected filters, etc.).
- Keep components small and single-purpose. If a component exceeds 150 lines, split it.
- Prefer composition — build screens by composing small components, not writing large monolithic ones.

### 6.2 TypeScript

- Strict mode is enforced. No `any` types without an explicit comment justifying the exception.
- Import all types from `@onserve/types`. Never redefine types that already exist in the shared package.
- Use Zod schemas from `@onserve/shared` for all form validation. Never write custom validation logic inline.
- All component props must have explicit TypeScript interfaces — never use implicit prop types.

### 6.3 Styling

- Use Tailwind utility classes exclusively. No inline `style` objects except for dynamic values that cannot be expressed as Tailwind classes.
- Dark mode is the default for OnServe. All new components must look correct in dark mode without any additional configuration.
- Use the CSS variables defined in Section 4.2 (e.g. `bg-background`, `text-foreground`, `border-border`) to ensure theme consistency. Do not hardcode hex values.
- Mobile-first always. Start with the mobile layout and add responsive modifiers (`sm:`, `md:`, `lg:`) for larger screens.

### 6.4 Accessibility

- Every interactive element must be keyboard-accessible. Tab order must be logical.
- All images require descriptive `alt` text. Decorative images use `alt=""`.
- Form inputs must have associated labels — use the shadcn `Label` component. Never rely on placeholder text as a label.
- Use semantic HTML elements (`nav`, `main`, `section`, `article`, `aside`, `header`, `footer`). No div soup.
- Colour contrast must meet WCAG 2.1 AA minimum. The OnServe palette has been validated — do not introduce custom colours without checking contrast ratios.

### 6.5 Testing

- Write Vitest unit tests alongside every new component.
- Test service functions in isolation with mocked Supabase responses.
- Do not ship a feature without at least one test covering the happy path.

### 6.6 Commits

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- One logical change per commit. Do not bundle unrelated changes.
- Reference screen names in commit messages: `feat(booking-wizard): add date selection step`.

---

## 7. Live Infrastructure

Phase 1 is complete. The following infrastructure is live and available to all developers immediately.

### 7.1 Supabase project

| Field | Value |
|---|---|
| Project name | `onserve-poc` |
| Project ID | `pehkmwbvwfohckakumnh` |
| Region | eu-west-1 (Ireland) |
| Status | `ACTIVE_HEALTHY` |
| PostgreSQL version | 17.6.1 |
| Database host | `db.pehkmwbvwfohckakumnh.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/pehkmwbvwfohckakumnh |

### 7.2 Migrations applied

All 8 migrations are applied and verified. The database schema is fully in place.

| Version | Name | Status |
|---|---|---|
| 20260427000001 | enable_extensions | ✅ Applied |
| 20260427000002 | create_users | ✅ Applied |
| 20260427000003 | create_locations | ✅ Applied |
| 20260427000004 | create_services | ✅ Applied |
| 20260427000005 | create_bookings | ✅ Applied |
| 20260427000006 | create_payments | ✅ Applied |
| 20260427000007 | create_ratings | ✅ Applied |
| 20260427000008 | rls_policies | ✅ Applied |

### 7.3 Database tables

All 15 tables are live. Row Level Security is enabled on every application table.

| Table | RLS | Seeded rows | Notes |
|---|---|---|---|
| `users` | ✅ | 0 | Auto-populated via auth trigger on signup |
| `provider_profiles` | ✅ | 0 | |
| `customer_profiles` | ✅ | 0 | |
| `saved_locations` | ✅ | 0 | PostGIS `geography` column for geo queries |
| `location_events` | ✅ | 0 | Captured at booking time |
| `service_categories` | ✅ | 8 | Cleaning, Beauty, Plumbing, Electrical, Gardening, Photography, Catering, Tutoring |
| `service_types` | ✅ | 4 | Deep clean, Standard clean, Move-out clean, Leak repair |
| `provider_services` | ✅ | 0 | |
| `bookings` | ✅ | 0 | |
| `quote_requests` | ✅ | 0 | |
| `quotes` | ✅ | 0 | |
| `payments` | ✅ | 0 | |
| `disputes` | ✅ | 0 | |
| `ratings` | ✅ | 0 | Trigger auto-updates `provider_profiles.rating_average` |
| `notifications` | ✅ | 0 | |

### 7.4 Active extensions

| Extension | Schema | Purpose |
|---|---|---|
| `postgis` | public | Geographic point queries — provider search radius, location distance |
| `uuid-ossp` | extensions | UUID generation for all primary keys |
| `pgcrypto` | extensions | Cryptographic functions |
| `pg_stat_statements` | extensions | Query performance monitoring |
| `plpgsql` | pg_catalog | Stored procedures and triggers |

> **Note:** PostGIS is installed and the `search_providers_near()` function is live. The location picker and provider search screens can use this immediately via `providerService.searchProviders(lat, lng, radiusKm)`.

---

## 8. Environment Setup

Each developer must create a local `.env.local` file in `apps/web`. This file is gitignored and must never be committed.

```env
# apps/web/.env.local
VITE_SUPABASE_URL=https://pehkmwbvwfohckakumnh.supabase.co
VITE_SUPABASE_ANON_KEY=<get from tech lead>
```

Get the anon key from the Supabase dashboard: **Settings → API → Project API keys → anon public**.

> ⚠️ **Never commit the service role key. Never use the service role key in the frontend.** It bypasses all RLS policies.

---

## 9. Running the Project

```bash
# Install all dependencies from monorepo root
npm install

# Run web app only
turbo dev --filter=web

# Run all apps
turbo dev

# Run tests
turbo test

# Lint
turbo lint

# Type check
turbo lint --filter=@onserve/types
```

---

## 10. Phase 2 Delivery Checklist

The following must be complete before Phase 2 is considered done.

| Item | Owner | Status |
|---|---|---|
| shadcn/ui initialised with OnServe theme | Frontend | ⬜ Pending |
| All P1 screens built and connected to services | Frontend | ⬜ Pending |
| React Hook Form + Zod on all form screens | Frontend | ⬜ Pending |
| Location picker wired to Google Maps API | Frontend | ⬜ Pending |
| Provider search calling `search_providers_near()` | Frontend | ⬜ Pending |
| NativeWind configured in `apps/mobile` | Mobile | ⬜ Pending |
| P1 mobile screens built | Mobile | ⬜ Pending |
| Vitest tests for all service files | Full stack | ⬜ Pending |
| Vitest tests for key UI components | Frontend | ⬜ Pending |
| Accessibility audit on all P1 screens | Frontend | ⬜ Pending |

---

## 11. References

| Resource | Link |
|---|---|
| shadcn/ui documentation | https://ui.shadcn.com |
| shadcn/ui components | https://ui.shadcn.com/docs/components |
| Radix UI primitives | https://www.radix-ui.com |
| NativeWind | https://www.nativewind.dev |
| TanStack Query | https://tanstack.com/query |
| React Hook Form | https://react-hook-form.com |
| Zod | https://zod.dev |
| Supabase dashboard | https://supabase.com/dashboard/project/pehkmwbvwfohckakumnh |
| Screen mockups | `/docs/mockups/onserve_mockups.html` |
| Architecture document | `/docs/architecture/ARCHITECTURE.md` |
| Phase 1 instructions | `/docs/PHASE1_INSTRUCTIONS.md` |

---

*Confidential — Internal Use Only. Questions? Raise a GitHub issue or message the architecture channel.*