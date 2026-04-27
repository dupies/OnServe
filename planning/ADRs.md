# ADR-001: Services Pattern for Backend Abstraction

**Date**: 2026-04-27  
**Status**: Accepted  
**Deciders**: Architecture team

---

## Context

OnServe uses Supabase as the backend for the POC. However, as the platform grows, we may need to migrate to a custom backend (NestJS, Express, etc.) for:
- Complex business logic that's hard to express in Edge Functions
- Better control over query performance
- Custom authentication flows
- Cost optimisation at scale

We need an architecture that allows this migration without rewriting the frontend.

---

## Decision

All data access from React components goes through **service classes**, never directly to Supabase or any other backend client.

```
Component → Hook (React Query) → Service → Backend Client (Supabase / REST / GraphQL)
```

Example:
```typescript
// ✅ CORRECT
const { data } = useQuery({
  queryKey: ['bookings', userId],
  queryFn: () => bookingService.getByCustomer(userId),
});

// ❌ WRONG — direct Supabase call in component
const { data } = await supabase.from('bookings').select('*');
```

---

## Consequences

**Positive**:
- Swap backend by changing only service files + `lib/supabase.ts`
- Services are unit-testable in isolation
- Clear separation of concerns
- Consistent error handling at service layer

**Negative**:
- More boilerplate for simple CRUD operations
- Developers must follow the convention consistently

---

# ADR-002: Supabase for POC Backend

**Date**: 2026-04-27  
**Status**: Accepted

## Decision
Use Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime) as the complete backend for the POC.

## Rationale
- Fastest path to working product
- Built-in auth, storage, realtime — no extra services to manage
- PostGIS available for location queries
- RLS provides security out of the box
- Easy to migrate away from (standard PostgreSQL underneath)

## Migration Path (when needed)
1. Stand up NestJS API pointing at same PostgreSQL instance
2. Update `lib/api.ts` to point at new API
3. Update service files one by one
4. Zero component changes required

---

# ADR-003: Monorepo with Turborepo

**Date**: 2026-04-27  
**Status**: Accepted

## Decision
Single monorepo using Turborepo with shared packages: `@onserve/types`, `@onserve/shared`, `@onserve/ui`.

## Rationale
- Share TypeScript types between web, mobile, and API
- Single source of truth for business logic (validation, constants)
- Coordinated versioning
- Faster builds with Turborepo caching

---

# ADR-004: React Native (Expo) for Mobile

**Date**: 2026-04-27  
**Status**: Accepted

## Decision
Use React Native with Expo for the mobile app, sharing service layer and types with the web app.

## Rationale
- Maximum code reuse with web (services, types, business logic)
- Expo simplifies build/OTA updates
- SA market: Android-first, must support lower-end devices

## Alternative Considered
Flutter — better performance on low-end devices, but zero code sharing with React web. Rejected for POC, revisit if performance is a production concern.
