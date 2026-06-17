# OnServe Mobile Phase 2a: Customer Core Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real customer authentication, home, provider search, and provider profile screens with live Supabase data integration, proper error handling, and design tokens throughout.

**Architecture:** 
- Supabase client singleton for OTP-based phone auth
- Zustand auth store persisting session to AsyncStorage
- TanStack Query for data fetching with caching
- Screen hierarchy: splash → login/verify/role → home (tabs) → search/provider profile
- API integration layer in `@onserve/api` with typed Supabase queries
- All screens use `@onserve/ui-tokens` for colors, spacing, typography

**Tech Stack:** 
- Expo SDK 56, React Native 0.76
- Supabase JS client v2.39
- TanStack React Query v5 with AsyncStorage persister
- Zustand v5 for auth state
- NativeWind v5 + TailwindCSS v4
- Expo Location API for GPS
- @onserve/ui-tokens for design system

## Global Constraints

- TypeScript strict mode enforced
- All Supabase queries must respect RLS policies (no direct admin access)
- Phone numbers must validate SA format: +27 or 0 prefix via Zod schema
- All async operations show loading/error/retry states with Toast feedback
- Design tokens (colors, spacing, fonts) used throughout — no hardcoded values
- All screens must render within safe area (no overlap with notch/home indicator)
- Error handling required on every Supabase query (network, auth, RLS, data validation)
- Tests verify end-to-end flows with real Supabase OTP (sandbox account OK)

---

## File Structure Overview

### New Files to Create

**Core Infrastructure:**
- `apps/mobile/src/lib/supabase.ts` — Supabase client singleton
- `apps/mobile/src/lib/storage.ts` — AsyncStorage persistence adapter for React Query
- `apps/mobile/src/store/authStore.ts` — Zustand auth store with session persistence
- `apps/mobile/src/hooks/useAuth.ts` — Auth context hook (wrapper around Zustand)
- `apps/mobile/src/hooks/useLocation.ts` — GPS location fetching with error handling
- `apps/mobile/src/hooks/usePhoneValidation.ts` — Phone number validation (SA format)

**API Services in `packages/api/src/`:**
- `auth/authService.ts` — Phone OTP sign-up, verification, role assignment
- `users/userService.ts` — Fetch user profile, save profile updates
- `providers/providerService.ts` — Search providers by service+location, fetch profile
- `ratings/ratingService.ts` — Fetch provider ratings and reviews
- `services/serviceService.ts` — List service categories

**UI Components (Reusable):**
- `apps/mobile/src/components/SearchBar.tsx` — Sticky search input
- `apps/mobile/src/components/ProviderCard.tsx` — Provider preview card (name, rating, distance, price)
- `apps/mobile/src/components/ServiceBadge.tsx` — Service category badge with icon
- `apps/mobile/src/components/RatingStars.tsx` — Render star ratings
- `apps/mobile/src/components/Toast.tsx` — Toast notification overlay

**Screens:**
- `apps/mobile/app/(auth)/splash.tsx` — Rewrite: add 2-sec delay + OnServe branding
- `apps/mobile/app/(auth)/login.tsx` — Rewrite: phone input → OTP send via Supabase
- `apps/mobile/app/(auth)/verify.tsx` — NEW: OTP input → verify → role selection
- `apps/mobile/app/(auth)/_layout.tsx` — Add `verify` screen route
- `apps/mobile/app/(customer)/(tabs)/index.tsx` — Rewrite: home with user data, location, services, recent providers
- `apps/mobile/app/(customer)/(tabs)/_layout.tsx` — NEW: Stack layout for modals (provider profile modal)
- `apps/mobile/app/(customer)/search.tsx` — NEW: Service filter, radius slider, map/list toggle, provider list with pagination
- `apps/mobile/app/(customer)/providers/[id].tsx` — NEW: Provider profile with photo, services, reviews, "Book Now" button

**Utilities:**
- `apps/mobile/src/utils/toast.ts` — Toast notification manager
- `apps/mobile/src/utils/geolocation.ts` — Wrap expo-location with error handling
- `apps/mobile/src/utils/formatting.ts` — Format distance, price, rating display

### Modified Files

- `apps/mobile/.env.local` — Verify Supabase credentials (already set)
- `apps/mobile/app/_layout.tsx` — Add QueryClientProvider + AuthProvider wrapper
- `apps/mobile/app/(customer)/_layout.tsx` — Add search modal and provider profile modal stacks
- `apps/mobile/package.json` — Verify dependencies (Supabase, React Query, Zustand already listed)
- `packages/api/src/index.ts` — Export new auth, users, providers, ratings, services

---

## Tasks

### Task 1: Set up Supabase Client & Storage Persistence

**Files:**
- Create: `apps/mobile/src/lib/supabase.ts`
- Create: `apps/mobile/src/lib/storage.ts`
- Modify: `apps/mobile/package.json` (verify @react-native-async-storage/async-storage)
- Test: Manual Supabase connection test

**Interfaces:**
- Produces: `createSupabaseClient()` → SupabaseClient instance
- Produces: `createAsyncStoragePersister()` → React Query persister adapter
- Consumed by: All auth and data-fetching tasks

- [ ] **Step 1: Verify async-storage dependency**

Check if `@react-native-async-storage/async-storage` is in package.json. If missing, add it:

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npm list @react-native-async-storage/async-storage
```

Expected: `@react-native-async-storage/async-storage@1.x.x` or similar. If missing, note it — we'll add in a follow-up.

- [ ] **Step 2: Create Supabase client singleton**

Create file: `apps/mobile/src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@onserve/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
```

- [ ] **Step 3: Verify types from @onserve/types**

Check if `Database` type exists:

```bash
grep -r "export type Database" /Users/medupiramaboea/Projects/OnServe/packages/types/src/
```

If it doesn't exist, we'll create a minimal stub. For now, assume it exists or use `any`.

- [ ] **Step 4: Create React Query AsyncStorage persister**

Create file: `apps/mobile/src/lib/storage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

export const createAsyncStoragePersister = (): Persister => ({
  persistClient: async (client: PersistedClient) => {
    try {
      await AsyncStorage.setItem(
        'REACT_QUERY_OFFLINE_CACHE',
        JSON.stringify(client)
      );
    } catch (error) {
      console.error('Failed to persist React Query cache', error);
    }
  },

  restoreClient: async (): Promise<PersistedClient | undefined> => {
    try {
      const cached = await AsyncStorage.getItem('REACT_QUERY_OFFLINE_CACHE');
      return cached ? JSON.parse(cached) : undefined;
    } catch (error) {
      console.error('Failed to restore React Query cache', error);
      return undefined;
    }
  },

  removeClient: async () => {
    try {
      await AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
    } catch (error) {
      console.error('Failed to remove React Query cache', error);
    }
  },
});
```

- [ ] **Step 5: Test Supabase connection manually**

In the Expo CLI, test:

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npm start
# In Expo devtools, try importing and checking console:
# import { supabase } from './src/lib/supabase';
# console.log(supabase.auth.getSession());
```

Expected: No console errors, session check returns promise (pending or resolved).

- [ ] **Step 6: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/lib/supabase.ts apps/mobile/src/lib/storage.ts
git commit -m "feat(mobile): add Supabase client and React Query storage persistence"
```

---

### Task 2: Create Auth Zustand Store with Session Persistence

**Files:**
- Create: `apps/mobile/src/store/authStore.ts`
- Create: `apps/mobile/src/hooks/useAuth.ts`
- Test: Unit tests for store mutations

**Interfaces:**
- Consumes: `supabase` from Task 1
- Produces: `useAuthStore()` → Zustand store with `{ session, user, role, setSession, setUser, setRole, logout }`
- Produces: `useAuth()` → Hook wrapper exposing `{ session, user, role, isLoading }`
- Consumed by: Auth flow screens, root layout for conditional routing

- [ ] **Step 1: Create Zustand auth store**

Create file: `apps/mobile/src/store/authStore.ts`

```typescript
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'provider';

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      role: null,
      isLoading: false,

      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ session: null, user: null, role: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        role: state.role,
      }),
    }
  )
);
```

- [ ] **Step 2: Create useAuth hook**

Create file: `apps/mobile/src/hooks/useAuth.ts`

```typescript
import { useAuthStore, type UserRole } from '../store/authStore';
import type { Session, User } from '@supabase/supabase-js';

interface UseAuthReturn {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const { session, user, role, isLoading, setSession, setUser, setRole, logout } =
    useAuthStore();

  return {
    session,
    user,
    role,
    isLoading,
    setSession,
    setUser,
    setRole,
    logout,
  };
};
```

- [ ] **Step 3: Verify store structure with TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit src/store/authStore.ts src/hooks/useAuth.ts
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/store/authStore.ts apps/mobile/src/hooks/useAuth.ts
git commit -m "feat(mobile): create auth Zustand store with AsyncStorage persistence"
```

---

### Task 3: Create Phone Validation & Location Hooks

**Files:**
- Create: `apps/mobile/src/hooks/usePhoneValidation.ts`
- Create: `apps/mobile/src/hooks/useLocation.ts`
- Create: `apps/mobile/src/utils/geolocation.ts`

**Interfaces:**
- Produces: `usePhoneValidation()` → `{ isValid, format, error }`
- Produces: `useLocation()` → `{ location, isLoading, error, refetch }`
- Produces: `getCurrentLocation()` → `Promise<{ latitude, longitude }>`
- Consumed by: Login screen (phone validation), home/search screens (location)

- [ ] **Step 1: Create phone validation hook**

Create file: `apps/mobile/src/hooks/usePhoneValidation.ts`

```typescript
import { useState, useCallback } from 'react';
import { z } from 'zod';

// SA phone format: +27XXXXXXXXXX or 0XXXXXXXXXX
const SA_PHONE_SCHEMA = z
  .string()
  .refine(
    (val) => {
      const cleaned = val.replace(/\D/g, '');
      // Either +27... (11+ digits) or 0... (10 digits)
      return (
        (val.startsWith('+27') && cleaned.length >= 11) ||
        (val.startsWith('0') && cleaned.length === 10)
      );
    },
    { message: 'Invalid SA phone number. Use +27 or 0 format.' }
  );

interface UsePhoneValidationReturn {
  isValid: boolean;
  format: (phone: string) => string;
  validate: (phone: string) => { valid: boolean; error?: string };
}

export const usePhoneValidation = (): UsePhoneValidationReturn => {
  const format = useCallback((phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    // Convert 0... to +27...
    if (cleaned.startsWith('27')) {
      return '+' + cleaned;
    }
    if (cleaned.startsWith('0')) {
      return '+27' + cleaned.slice(1);
    }
    return '+27' + cleaned;
  }, []);

  const validate = useCallback(
    (phone: string): { valid: boolean; error?: string } => {
      try {
        SA_PHONE_SCHEMA.parse(phone);
        return { valid: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return { valid: false, error: error.errors[0]?.message };
        }
        return { valid: false, error: 'Invalid phone number' };
      }
    },
    []
  );

  return {
    isValid: false, // Computed on-demand via validate()
    format,
    validate,
  };
};
```

- [ ] **Step 2: Create geolocation utility**

Create file: `apps/mobile/src/utils/geolocation.ts`

```typescript
import * as Location from 'expo-location';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export async function getCurrentLocation(): Promise<LocationCoordinates> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Geolocation error:', error);
    throw error;
  }
}
```

- [ ] **Step 3: Create useLocation hook**

Create file: `apps/mobile/src/hooks/useLocation.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentLocation, type LocationCoordinates } from '../utils/geolocation';

interface UseLocationReturn {
  location: LocationCoordinates | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<LocationCoordinates | undefined>;
}

export const useLocation = (enabled = true): UseLocationReturn => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['location', 'current'],
    queryFn: getCurrentLocation,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  return {
    location: data || null,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch: async () => {
      const result = await refetch();
      return result.data;
    },
  };
};
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit src/hooks/usePhoneValidation.ts src/hooks/useLocation.ts src/utils/geolocation.ts
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/hooks/usePhoneValidation.ts apps/mobile/src/hooks/useLocation.ts apps/mobile/src/utils/geolocation.ts
git commit -m "feat(mobile): add phone validation and location hooks"
```

---

### Task 4: Create Toast Notification System

**Files:**
- Create: `apps/mobile/src/components/Toast.tsx`
- Create: `apps/mobile/src/utils/toast.ts`
- Create: `apps/mobile/src/hooks/useToast.ts`

**Interfaces:**
- Produces: `Toast` component
- Produces: `useToast()` → `{ show(message, type) }`
- Consumed by: All screens for error/success feedback

- [ ] **Step 1: Create toast utility manager**

Create file: `apps/mobile/src/utils/toast.ts`

```typescript
import { EventEmitter } from 'eventemitter3';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

class ToastManager extends EventEmitter {
  private toasts: Map<string, ToastMessage> = new Map();
  private nextId = 0;

  show(message: string, type: ToastType = 'info', duration = 3000): string {
    const id = `toast-${this.nextId++}`;
    const toast: ToastMessage = { id, message, type, duration };
    this.toasts.set(id, toast);
    this.emit('show', toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (toast) {
      this.toasts.delete(id);
      this.emit('dismiss', id);
    }
  }

  getAll(): ToastMessage[] {
    return Array.from(this.toasts.values());
  }
}

export const toastManager = new ToastManager();
```

- [ ] **Step 2: Create useToast hook**

Create file: `apps/mobile/src/hooks/useToast.ts`

```typescript
import { useCallback, useEffect, useState } from 'react';
import { toastManager, type ToastMessage, type ToastType } from '../utils/toast';

interface UseToastReturn {
  toasts: ToastMessage[];
  show: (message: string, type?: ToastType, duration?: number) => string;
  dismiss: (id: string) => void;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleShow = (toast: ToastMessage) => {
      setToasts((prev) => [...prev, toast]);
    };

    const handleDismiss = (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    toastManager.on('show', handleShow);
    toastManager.on('dismiss', handleDismiss);

    return () => {
      toastManager.off('show', handleShow);
      toastManager.off('dismiss', handleDismiss);
    };
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      return toastManager.show(message, type, duration);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    toastManager.dismiss(id);
  }, []);

  return { toasts, show, dismiss };
};
```

- [ ] **Step 3: Create Toast component**

Create file: `apps/mobile/src/components/Toast.tsx`

```typescript
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors } from '@onserve/ui-tokens';
import type { ToastMessage, ToastType } from '../utils/toast';

interface ToastProps extends ToastMessage {
  onDismiss: (id: string) => void;
}

function SingleToast({ id, message, type, onDismiss }: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getBackgroundColor = (toastType: ToastType) => {
    switch (toastType) {
      case 'success':
        return colors.success || '#10b981';
      case 'error':
        return colors.error || '#ef4444';
      case 'warning':
        return colors.warning || '#f59e0b';
      case 'info':
      default:
        return colors.info || '#3b82f6';
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginVertical: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: getBackgroundColor(type),
    },
    text: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
  });

  return (
    <Pressable onPress={() => onDismiss(id)}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </Pressable>
  );
}

export interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
      {toasts.map((toast) => (
        <SingleToast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Update components index to export Toast**

Modify file: `apps/mobile/src/components/index.ts`

```typescript
export { Button } from './Button';
export { Card } from './Card';
export { TextField } from './TextField';
export { Badge } from './Badge';
export { ToastContainer } from './Toast';
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit src/utils/toast.ts src/hooks/useToast.ts src/components/Toast.tsx
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/components/Toast.tsx apps/mobile/src/utils/toast.ts apps/mobile/src/hooks/useToast.ts apps/mobile/src/components/index.ts
git commit -m "feat(mobile): add toast notification system"
```

---

### Task 5: Create Auth API Services

**Files:**
- Create: `packages/api/src/auth/authService.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `supabase` instance
- Produces: `signUpWithPhone(supabase, phone) → Promise<void>`
- Produces: `verifyOtp(supabase, phone, token) → Promise<Session>`
- Produces: `setUserRole(supabase, userId, role) → Promise<void>`
- Consumed by: Login, verify OTP, role selection screens

- [ ] **Step 1: Create auth service**

Create file: `packages/api/src/auth/authService.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@onserve/types';

type Client = SupabaseClient<Database>;

/**
 * Send OTP to phone number via Supabase Auth
 */
export async function signUpWithPhone(
  supabase: Client,
  phone: string
): Promise<void> {
  const formatted = phone.startsWith('+') ? phone : `+27${phone.slice(1)}`;

  const { error } = await supabase.auth.signInWithOtp({
    phone: formatted,
  });

  if (error) {
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
}

/**
 * Verify OTP token and return session
 */
export async function verifyOtp(
  supabase: Client,
  phone: string,
  token: string
): Promise<{ session: any; user: any }> {
  const formatted = phone.startsWith('+') ? phone : `+27${phone.slice(1)}`;

  const { data, error } = await supabase.auth.verifyOtp({
    phone: formatted,
    token,
    type: 'sms',
  });

  if (error) {
    throw new Error(`OTP verification failed: ${error.message}`);
  }

  if (!data.session || !data.user) {
    throw new Error('No session returned from OTP verification');
  }

  return { session: data.session, user: data.user };
}

/**
 * Set user role in public.users table
 */
export async function setUserRole(
  supabase: Client,
  userId: string,
  role: 'customer' | 'provider'
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to set user role: ${error.message}`);
  }
}

/**
 * Sign out the current user
 */
export async function signOut(supabase: Client): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
}
```

- [ ] **Step 2: Update API index to export auth**

Modify file: `packages/api/src/index.ts`

```typescript
// Location Services
export {
  getSavedLocations,
  saveLocation,
  updateLocation,
  setDefaultLocation,
  deleteLocation,
} from './location/locationService';

// Auth Services
export {
  signUpWithPhone,
  verifyOtp,
  setUserRole,
  signOut,
} from './auth/authService';
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/packages/api
npx tsc --noEmit src/auth/authService.ts
```

Expected: No errors (or minimal type errors if Database type is incomplete).

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add packages/api/src/auth/authService.ts packages/api/src/index.ts
git commit -m "feat(api): add phone OTP authentication service"
```

---

### Task 6: Create User & Profile API Services

**Files:**
- Create: `packages/api/src/users/userService.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `supabase` instance
- Produces: `getUserProfile(supabase, userId) → Promise<UserProfile>`
- Produces: `updateUserProfile(supabase, userId, data) → Promise<void>`
- Consumed by: Home screen, profile screen

- [ ] **Step 1: Create user service**

Create file: `packages/api/src/users/userService.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@onserve/types';

type Client = SupabaseClient<Database>;

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
  avatar_url?: string;
  role: 'customer' | 'provider';
  created_at: string;
}

/**
 * Fetch user profile from public.users table
 */
export async function getUserProfile(
  supabase: Client,
  userId: string
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return data as UserProfile;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  supabase: Client,
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
}
```

- [ ] **Step 2: Update API index**

Modify file: `packages/api/src/index.ts`

```typescript
// Location Services
export {
  getSavedLocations,
  saveLocation,
  updateLocation,
  setDefaultLocation,
  deleteLocation,
} from './location/locationService';

// Auth Services
export {
  signUpWithPhone,
  verifyOtp,
  setUserRole,
  signOut,
} from './auth/authService';

// User Services
export { getUserProfile, updateUserProfile, type UserProfile } from './users/userService';
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/packages/api
npx tsc --noEmit src/users/userService.ts
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add packages/api/src/users/userService.ts packages/api/src/index.ts
git commit -m "feat(api): add user profile service"
```

---

### Task 7: Create Service & Provider API Services

**Files:**
- Create: `packages/api/src/services/serviceService.ts`
- Create: `packages/api/src/providers/providerService.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `supabase` instance
- Produces: `listServiceCategories(supabase) → Promise<ServiceCategory[]>`
- Produces: `searchProviders(supabase, params) → Promise<ProviderResult[]>`
- Produces: `getProviderProfile(supabase, providerId) → Promise<ProviderProfile>`
- Consumed by: Home, search, provider profile screens

- [ ] **Step 1: Create service category service**

Create file: `packages/api/src/services/serviceService.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@onserve/types';

type Client = SupabaseClient<Database>;

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

/**
 * List all service categories
 */
export async function listServiceCategories(
  supabase: Client
): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('id, name, description');

  if (error) {
    throw new Error(`Failed to fetch service categories: ${error.message}`);
  }

  return data as ServiceCategory[];
}
```

- [ ] **Step 2: Create provider search service**

Create file: `packages/api/src/providers/providerService.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@onserve/types';

type Client = SupabaseClient<Database>;

export interface ProviderResult {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  rating_average?: number;
  distance_km?: number;
  hourly_rate?: number;
  services?: string[];
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  rating_average?: number;
  rating_count?: number;
  hourly_rate?: number;
  response_time_minutes?: number;
  is_available?: boolean;
  created_at: string;
  services?: Array<{ id: string; name: string; rate: number }>;
}

/**
 * Search providers by service type and location
 * Uses PostGIS ST_DWithin for distance filtering
 */
export async function searchProviders(
  supabase: Client,
  params: {
    serviceId?: string;
    latitude: number;
    longitude: number;
    radiusKm?: number;
    limit?: number;
    offset?: number;
  }
): Promise<ProviderResult[]> {
  const { serviceId, latitude, longitude, radiusKm = 25, limit = 20, offset = 0 } = params;

  try {
    let query = supabase
      .from('provider_services')
      .select(
        `
        provider_id,
        profiles!provider_id(
          id,
          user_id,
          full_name,
          avatar_url,
          rating_average,
          hourly_rate
        )
      `
      );

    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    const { data, error } = await query.limit(limit).range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    // Note: PostGIS distance filtering should be done via RPC function or raw SQL
    // For now, return results and client-side filter if needed
    return (data || []).map((item: any) => ({
      id: item.profiles.id,
      user_id: item.profiles.user_id,
      full_name: item.profiles.full_name,
      avatar_url: item.profiles.avatar_url,
      rating_average: item.profiles.rating_average,
      hourly_rate: item.profiles.hourly_rate,
    }));
  } catch (error) {
    throw new Error(`Failed to search providers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get full provider profile with services and stats
 */
export async function getProviderProfile(
  supabase: Client,
  providerId: string
): Promise<ProviderProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      user_id,
      full_name,
      avatar_url,
      bio,
      rating_average,
      created_at,
      provider_services(
        service_id,
        hourly_rate,
        services(id, name)
      )
    `
    )
    .eq('id', providerId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch provider profile: ${error.message}`);
  }

  const profile = data as any;
  const services = (profile.provider_services || []).map((ps: any) => ({
    id: ps.services?.id || '',
    name: ps.services?.name || '',
    rate: ps.hourly_rate || 0,
  }));

  return {
    id: profile.id,
    user_id: profile.user_id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    rating_average: profile.rating_average,
    rating_count: 0, // TODO: Query from ratings table
    hourly_rate: profile.provider_services?.[0]?.hourly_rate,
    response_time_minutes: undefined,
    is_available: true,
    created_at: profile.created_at,
    services,
  };
}
```

- [ ] **Step 3: Create ratings/reviews service**

Create file: `packages/api/src/ratings/ratingService.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@onserve/types';

type Client = SupabaseClient<Database>;

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  reviewer_name?: string;
  created_at: string;
}

/**
 * Fetch provider ratings/reviews
 */
export async function getProviderRatings(
  supabase: Client,
  providerId: string,
  limit = 5
): Promise<Review[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select(`
      id,
      rating,
      comment,
      profiles!customer_id(full_name),
      created_at
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch ratings: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    rating: item.rating,
    comment: item.comment,
    reviewer_name: item.profiles?.full_name,
    created_at: item.created_at,
  }));
}
```

- [ ] **Step 4: Update API index**

Modify file: `packages/api/src/index.ts`

```typescript
// Location Services
export {
  getSavedLocations,
  saveLocation,
  updateLocation,
  setDefaultLocation,
  deleteLocation,
} from './location/locationService';

// Auth Services
export {
  signUpWithPhone,
  verifyOtp,
  setUserRole,
  signOut,
} from './auth/authService';

// User Services
export { getUserProfile, updateUserProfile, type UserProfile } from './users/userService';

// Service Services
export { listServiceCategories, type ServiceCategory } from './services/serviceService';

// Provider Services
export {
  searchProviders,
  getProviderProfile,
  type ProviderResult,
  type ProviderProfile,
} from './providers/providerService';

// Rating Services
export { getProviderRatings, type Review } from './ratings/ratingService';
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/packages/api
npx tsc --noEmit src/services/serviceService.ts src/providers/providerService.ts src/ratings/ratingService.ts
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add packages/api/src/services/serviceService.ts packages/api/src/providers/providerService.ts packages/api/src/ratings/ratingService.ts packages/api/src/index.ts
git commit -m "feat(api): add service, provider, and rating services"
```

---

### Task 8: Create Reusable UI Components

**Files:**
- Create: `apps/mobile/src/components/SearchBar.tsx`
- Create: `apps/mobile/src/components/ProviderCard.tsx`
- Create: `apps/mobile/src/components/RatingStars.tsx`
- Modify: `apps/mobile/src/components/index.ts`

**Interfaces:**
- Produces: `SearchBar` component with placeholder + onChangeText
- Produces: `ProviderCard` component showing provider name, rating, distance, price
- Produces: `RatingStars` component rendering 1-5 stars

- [ ] **Step 1: Create SearchBar component**

Create file: `apps/mobile/src/components/SearchBar.tsx`

```typescript
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { colors } from '@onserve/ui-tokens';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  editable?: boolean;
}

export function SearchBar({
  placeholder = 'Search services...',
  value,
  onChangeText,
  onPress,
  editable = true,
}: SearchBarProps) {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface[1],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginHorizontal: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.surface[2],
    },
    icon: {
      marginRight: 8,
      fontSize: 18,
    },
    input: {
      flex: 1,
      color: colors.text.primary,
      fontSize: 16,
    },
  });

  return (
    <Pressable onPress={onPress} disabled={editable}>
      <View style={styles.container}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
        />
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 2: Create RatingStars component**

Create file: `apps/mobile/src/components/RatingStars.tsx`

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@onserve/ui-tokens';

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingStars({ rating, count, size = 'md' }: RatingStarsProps) {
  const sizeMap = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  const starSize = sizeMap[size];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 2,
    },
    star: {
      fontSize: starSize,
    },
    text: {
      color: colors.text.secondary,
      fontSize: 14,
      fontWeight: '500',
    },
  });

  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push('⭐');
    } else if (i === fullStars && hasHalfStar) {
      stars.push('✨');
    } else {
      stars.push('☆');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {stars.map((star, idx) => (
          <Text key={idx} style={styles.star}>
            {star}
          </Text>
        ))}
      </View>
      {typeof count === 'number' && (
        <Text style={styles.text}>{rating.toFixed(1)} ({count})</Text>
      )}
      {typeof count === 'undefined' && (
        <Text style={styles.text}>{rating.toFixed(1)}</Text>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Create ProviderCard component**

Create file: `apps/mobile/src/components/ProviderCard.tsx`

```typescript
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { colors } from '@onserve/ui-tokens';
import { RatingStars } from './RatingStars';

interface ProviderCardProps {
  id: string;
  name: string;
  rating?: number;
  ratingCount?: number;
  distance?: number;
  hourlyRate?: number;
  avatar?: string;
  services?: string[];
  onPress?: () => void;
}

export function ProviderCard({
  id,
  name,
  rating = 5.0,
  ratingCount = 0,
  distance,
  hourlyRate,
  avatar,
  services = [],
  onPress,
}: ProviderCardProps) {
  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface[1],
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.surface[2],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    info: {
      flex: 1,
      marginRight: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface[2],
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    rating: {
      marginBottom: 8,
    },
    meta: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    metaText: {
      fontSize: 13,
      color: colors.text.secondary,
    },
    services: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    serviceBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 16,
    },
    serviceBadgeText: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '500',
    },
    price: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
  });

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.rating}>
            <RatingStars rating={rating} count={ratingCount} size="sm" />
          </View>
        </View>
        {avatar && <Image source={{ uri: avatar }} style={styles.avatar} />}
      </View>

      {services.length > 0 && (
        <View style={styles.services}>
          {services.map((service) => (
            <View key={service} style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>{service}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.meta}>
        {distance !== undefined && (
          <Text style={styles.metaText}>📍 {distance.toFixed(1)} km</Text>
        )}
        {hourlyRate !== undefined && (
          <Text style={styles.price}>R{hourlyRate}/hr</Text>
        )}
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 4: Update components index**

Modify file: `apps/mobile/src/components/index.ts`

```typescript
export { Button } from './Button';
export { Card } from './Card';
export { TextField } from './TextField';
export { Badge } from './Badge';
export { ToastContainer } from './Toast';
export { SearchBar } from './SearchBar';
export { ProviderCard } from './ProviderCard';
export { RatingStars } from './RatingStars';
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit src/components/SearchBar.tsx src/components/RatingStars.tsx src/components/ProviderCard.tsx
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/components/SearchBar.tsx apps/mobile/src/components/RatingStars.tsx apps/mobile/src/components/ProviderCard.tsx apps/mobile/src/components/index.ts
git commit -m "feat(mobile): add reusable search, provider card, and rating components"
```

---

### Task 9: Create Login & OTP Verification Screens

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/verify.tsx`
- Modify: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/src/utils/formatting.ts`

**Interfaces:**
- Consumes: `usePhoneValidation`, `useAuth`, `useToast`, `signUpWithPhone`, `verifyOtp`
- Produces: Functional login and OTP verification screens
- Consumed by: Root layout for auth routing

- [ ] **Step 1: Create formatting utilities**

Create file: `apps/mobile/src/utils/formatting.ts`

```typescript
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('27')) {
    return `+27 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  if (cleaned.startsWith('0')) {
    return `0${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function formatPrice(price: number): string {
  return `R${price.toFixed(2)}`;
}
```

- [ ] **Step 2: Rewrite login screen with phone OTP**

Modify file: `apps/mobile/app/(auth)/login.tsx`

```typescript
import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, TextField, Card } from '../../src/components';
import { colors } from '@onserve/ui-tokens';
import { signUpWithPhone } from '@onserve/api';
import { supabase } from '../../src/lib/supabase';
import { usePhoneValidation } from '../../src/hooks/usePhoneValidation';
import { useToast } from '../../src/hooks/useToast';

export default function LoginScreen() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const { format: formatPhone, validate: validatePhone } = usePhoneValidation();
  
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | undefined>();

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    const validation = validatePhone(text);
    setPhoneError(validation.error);
  };

  const handleContinue = async () => {
    const validation = validatePhone(phone);
    if (!validation.valid) {
      setPhoneError(validation.error);
      showToast(validation.error || 'Invalid phone number', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const formatted = formatPhone(phone);
      await signUpWithPhone(supabase, formatted);
      
      // Navigate to verify OTP screen with phone number
      router.push({
        pathname: '/(auth)/verify',
        params: { phone: formatted },
      });
      
      showToast('OTP sent to your phone', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      showToast(message, 'error');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 48,
      justifyContent: 'center',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: 16,
      marginBottom: 32,
    },
    cardSpacing: {
      marginBottom: 24,
    },
    labelText: {
      color: colors.text.primary,
      fontWeight: '600',
      marginBottom: 12,
    },
    footerText: {
      color: colors.text.tertiary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 24,
    },
    errorText: {
      color: colors.error || '#ef4444',
      fontSize: 12,
      marginTop: 4,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Enter your phone number to continue</Text>

        <Card style={styles.cardSpacing}>
          <Text style={styles.labelText}>Phone Number</Text>
          <TextField
            placeholder="+27 or 0..."
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
        </Card>

        <Button
          label={isLoading ? 'Sending OTP...' : 'Send OTP'}
          onPress={handleContinue}
          variant="primary"
          size="lg"
          disabled={isLoading || !phone}
        />

        <Text style={styles.footerText}>
          We'll send you a one-time code via SMS
        </Text>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Create OTP verification screen**

Create file: `apps/mobile/app/(auth)/verify.tsx`

```typescript
import { View, Text, ScrollView, StatusBar, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button, TextField, Card } from '../../src/components';
import { colors } from '@onserve/ui-tokens';
import { verifyOtp } from '@onserve/api';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';
import { formatPhoneDisplay } from '../../src/utils/formatting';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { show: showToast } = useToast();
  const { setSession, setUser } = useAuth();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | undefined>();
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    // Resend countdown timer
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerify = async () => {
    if (!phone) {
      showToast('Phone number not found', 'error');
      return;
    }

    if (otp.length !== 6) {
      setOtpError('OTP must be 6 digits');
      showToast('Enter a 6-digit code', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { session, user } = await verifyOtp(supabase, phone, otp);
      
      setSession(session);
      setUser(user);
      
      showToast('Verified! Select your role', 'success');
      router.push('/(auth)/role');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OTP verification failed';
      setOtpError(message);
      showToast(message, 'error');
      console.error('OTP verification error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    
    try {
      const { signUpWithPhone } = await import('@onserve/api');
      await signUpWithPhone(supabase, phone);
      showToast('OTP resent to your phone', 'success');
      setResendCountdown(60);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend OTP';
      showToast(message, 'error');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 48,
      justifyContent: 'center',
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: 16,
      marginBottom: 32,
    },
    phoneInfo: {
      color: colors.text.secondary,
      fontSize: 14,
      marginBottom: 24,
      textAlign: 'center',
    },
    cardSpacing: {
      marginBottom: 24,
    },
    labelText: {
      color: colors.text.primary,
      fontWeight: '600',
      marginBottom: 12,
    },
    otpInput: {
      fontSize: 24,
      letterSpacing: 8,
      textAlign: 'center',
    },
    errorText: {
      color: colors.error || '#ef4444',
      fontSize: 12,
      marginTop: 4,
    },
    resendContainer: {
      marginTop: 24,
      alignItems: 'center',
    },
    resendText: {
      color: colors.text.secondary,
      fontSize: 14,
    },
    resendButton: {
      marginTop: 8,
    },
  });

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the code we sent you</Text>

        <Text style={styles.phoneInfo}>
          Sent to {phone ? formatPhoneDisplay(phone) : 'your phone'}
        </Text>

        <Card style={styles.cardSpacing}>
          <Text style={styles.labelText}>6-Digit Code</Text>
          <TextField
            placeholder="000000"
            value={otp}
            onChangeText={(text) => {
              setOtp(text.replace(/\D/g, '').slice(0, 6));
              setOtpError(undefined);
            }}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.otpInput}
          />
          {otpError && <Text style={styles.errorText}>{otpError}</Text>}
        </Card>

        <Button
          label={isLoading ? 'Verifying...' : 'Verify'}
          onPress={handleVerify}
          variant="primary"
          size="lg"
          disabled={isLoading || otp.length !== 6}
        />

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          <Button
            label={
              resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'
            }
            onPress={handleResend}
            variant="tertiary"
            size="md"
            disabled={resendCountdown > 0}
            style={styles.resendButton}
          />
        </View>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Update auth layout to include verify screen**

Modify file: `apps/mobile/app/(auth)/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="role" />
    </Stack>
  );
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit app/\(auth\)/login.tsx app/\(auth\)/verify.tsx src/utils/formatting.ts
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/app/\(auth\)/login.tsx apps/mobile/app/\(auth\)/verify.tsx apps/mobile/app/\(auth\)/_layout.tsx apps/mobile/src/utils/formatting.ts
git commit -m "feat(mobile): implement phone OTP login and verification screens"
```

---

### Task 10: Implement Home Screen with Real Data

**Files:**
- Modify: `apps/mobile/app/(customer)/(tabs)/index.tsx`
- Create: `apps/mobile/src/hooks/useHomeData.ts`

**Interfaces:**
- Consumes: `useAuth`, `useLocation`, `listServiceCategories`, `getUserProfile`, `TanStack Query`
- Produces: Functional home screen with user name, location badge, services, recent providers
- Consumed by: Customer tab navigation

- [ ] **Step 1: Create home data hook**

Create file: `apps/mobile/src/hooks/useHomeData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getUserProfile, listServiceCategories } from '@onserve/api';
import { supabase } from '../lib/supabase';
import type { UserProfile, ServiceCategory } from '@onserve/api';

interface UseHomeDataReturn {
  user: UserProfile | null;
  services: ServiceCategory[];
  userLoading: boolean;
  servicesLoading: boolean;
  userError: Error | null;
  servicesError: Error | null;
}

export const useHomeData = (userId?: string): UseHomeDataReturn => {
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['users', 'profile', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID required');
      return getUserProfile(supabase, userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: services, isLoading: servicesLoading, error: servicesError } = useQuery({
    queryKey: ['services', 'categories'],
    queryFn: () => listServiceCategories(supabase),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return {
    user: user || null,
    services: services || [],
    userLoading,
    servicesLoading,
    userError: userError instanceof Error ? userError : null,
    servicesError: servicesError instanceof Error ? servicesError : null,
  };
};
```

- [ ] **Step 2: Rewrite home screen**

Modify file: `apps/mobile/app/(customer)/(tabs)/index.tsx`

```typescript
import { View, Text, ScrollView, StatusBar, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, SearchBar, Badge, ToastContainer } from '../../../src/components';
import { colors } from '@onserve/ui-tokens';
import { useAuth } from '../../../src/hooks/useAuth';
import { useLocation } from '../../../src/hooks/useLocation';
import { useToast } from '../../../src/hooks/useToast';
import { useHomeData } from '../../../src/hooks/useHomeData';
import { formatDistance } from '../../../src/utils/formatting';

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { location, isLoading: locationLoading } = useLocation(true);
  const { toasts, dismiss } = useToast();
  const { user, services, userLoading, servicesLoading } = useHomeData(authUser?.id);

  const handleSearchPress = () => {
    router.push({
      pathname: '/(customer)/search',
      params: { latitude: location?.latitude || 0, longitude: location?.longitude || 0 },
    });
  };

  const handleServicePress = (serviceId: string) => {
    router.push({
      pathname: '/(customer)/search',
      params: { serviceId, latitude: location?.latitude || 0, longitude: location?.longitude || 0 },
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 24,
      backgroundColor: colors.surface[1],
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    greeting: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 4,
    },
    location: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 8,
    },
    section: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 12,
    },
    servicesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickActionsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    actionCard: {
      flex: 1,
      backgroundColor: colors.surface[1],
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.surface[2],
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    actionText: {
      fontSize: 13,
      color: colors.text.primary,
      fontWeight: '500',
      textAlign: 'center',
    },
    loadingContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
  });

  const displayName = user?.full_name?.split(' ')[0] || 'User';
  const displayLocation = location
    ? `📍 ${formatDistance(Math.sqrt(location.latitude ** 2 + location.longitude ** 2))} away`
    : '📍 Getting location...';

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning, {displayName}</Text>
        <Text style={styles.location}>{displayLocation}</Text>
      </View>

      {/* Search Bar */}
      <SearchBar placeholder="Search services..." onPress={handleSearchPress} editable={false} />

      {/* Popular Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Services</Text>
        {servicesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.servicesContainer}>
            {services.slice(0, 4).map((service) => (
              <Pressable key={service.id} onPress={() => handleServicePress(service.id)}>
                <Badge label={service.name} color="primary" />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(customer)/(tabs)/bookings')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>My Bookings</Text>
          </Pressable>
          <Pressable style={styles.actionCard} onPress={() => router.push('/(customer)/(tabs)/profile')}>
            <Text style={styles.actionIcon}>📍</Text>
            <Text style={styles.actionText}>Locations</Text>
          </Pressable>
        </View>
      </View>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ScrollView>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit src/hooks/useHomeData.ts app/\(customer\)/\(tabs\)/index.tsx
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/hooks/useHomeData.ts apps/mobile/app/\(customer\)/\(tabs\)/index.tsx
git commit -m "feat(mobile): implement home screen with real Supabase data"
```

---

### Task 11: Create Search Screen with Filters & Pagination

**Files:**
- Create: `apps/mobile/app/(customer)/search.tsx`
- Create: `apps/mobile/src/hooks/useProviderSearch.ts`

**Interfaces:**
- Consumes: `useLocation`, `useToast`, `searchProviders`, `listServiceCategories`, `TanStack Query`
- Produces: Functional search screen with category filter, radius slider, list view pagination
- Consumed by: Home/provider card navigation

- [ ] **Step 1: Create provider search hook with pagination**

Create file: `apps/mobile/src/hooks/useProviderSearch.ts`

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchProviders, type ProviderResult } from '@onserve/api';
import { supabase } from '../lib/supabase';

interface UseProviderSearchParams {
  serviceId?: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

interface UseProviderSearchReturn {
  providers: ProviderResult[];
  isLoading: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  error: Error | null;
  refetch: () => void;
}

const PAGE_SIZE = 20;

export const useProviderSearch = (
  params: UseProviderSearchParams
): UseProviderSearchReturn => {
  const { data, isLoading, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['providers', 'search', params.serviceId, params.latitude, params.longitude],
    queryFn: ({ pageParam = 0 }) =>
      searchProviders(supabase, {
        serviceId: params.serviceId,
        latitude: params.latitude,
        longitude: params.longitude,
        radiusKm: params.radiusKm,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const providers = data?.pages.flatMap((page) => page) || [];

  return {
    providers,
    isLoading,
    hasNextPage: !!hasNextPage,
    fetchNextPage: async () => {
      await fetchNextPage();
    },
    error: error instanceof Error ? error : null,
    refetch,
  };
};
```

- [ ] **Step 2: Create search screen**

Create file: `apps/mobile/app/(customer)/search.tsx`

```typescript
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@onserve/ui-tokens';
import { SearchBar, ProviderCard, ToastContainer } from '../../src/components';
import { useProviderSearch } from '../../src/hooks/useProviderSearch';
import { useToast } from '../../src/hooks/useToast';
import { listServiceCategories } from '@onserve/api';
import { supabase } from '../../src/lib/supabase';

export default function SearchScreen() {
  const router = useRouter();
  const { toasts, dismiss, show: showToast } = useToast();
  const { serviceId: initialServiceId, latitude: latStr, longitude: lonStr } = useLocalSearchParams();

  const latitude = parseFloat(latStr as string) || 0;
  const longitude = parseFloat(lonStr as string) || 0;

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(initialServiceId as string);
  const [radiusKm, setRadiusKm] = useState(25);
  const [isMapView, setIsMapView] = useState(false);

  const { data: services } = useQuery({
    queryKey: ['services', 'categories'],
    queryFn: () => listServiceCategories(supabase),
  });

  const {
    providers,
    isLoading,
    hasNextPage,
    fetchNextPage,
    error,
  } = useProviderSearch({
    serviceId: selectedServiceId,
    latitude,
    longitude,
    radiusKm,
  });

  const handleProviderPress = useCallback(
    (providerId: string) => {
      router.push({
        pathname: '/(customer)/providers/[id]',
        params: { id: providerId },
      });
    },
    [router]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasNextPage) {
      fetchNextPage();
    }
  }, [isLoading, hasNextPage, fetchNextPage]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: colors.surface[1],
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    filterLabel: {
      fontSize: 14,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    serviceSelect: {
      flex: 1,
      backgroundColor: colors.surface[2],
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 12,
    },
    serviceSelectText: {
      color: colors.text.primary,
      fontSize: 14,
    },
    radiusContainer: {
      marginBottom: 12,
    },
    radiusText: {
      color: colors.text.primary,
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    radiusSliderPlaceholder: {
      backgroundColor: colors.surface[2],
      height: 40,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radiusValue: {
      color: colors.text.secondary,
      fontSize: 12,
    },
    viewToggle: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
      backgroundColor: colors.surface[2],
    },
    toggleButtonActive: {
      backgroundColor: colors.primary,
    },
    toggleText: {
      color: colors.text.primary,
      fontSize: 13,
      fontWeight: '500',
    },
    toggleTextActive: {
      color: '#fff',
    },
    listContainer: {
      paddingTop: 12,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      color: colors.text.secondary,
      fontSize: 16,
      fontWeight: '500',
    },
    loadingContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    errorContainer: {
      margin: 24,
      padding: 16,
      backgroundColor: colors.error || '#fee2e2',
      borderRadius: 8,
    },
    errorText: {
      color: colors.error || '#dc2626',
      fontSize: 14,
    },
  });

  if (error) {
    showToast(error.message, 'error');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with Filters */}
      <View style={styles.header}>
        <SearchBar placeholder="Search services..." editable={false} />

        {/* Service Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Service:</Text>
          <Pressable
            style={styles.serviceSelect}
            onPress={() => {
              // TODO: Implement service picker modal
              setSelectedServiceId(undefined);
            }}
          >
            <Text style={styles.serviceSelectText}>
              {selectedServiceId
                ? services?.find((s) => s.id === selectedServiceId)?.name || 'All Services'
                : 'All Services'}
            </Text>
          </Pressable>
        </View>

        {/* Radius Filter */}
        <View style={styles.radiusContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Radius:</Text>
            <Text style={styles.filterLabel}>{radiusKm}km</Text>
          </View>
          <View style={styles.radiusSliderPlaceholder}>
            <Text style={styles.radiusValue}>Slider component (TODO: Implement)</Text>
          </View>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleButton, !isMapView && styles.toggleButtonActive]}
            onPress={() => setIsMapView(false)}
          >
            <Text style={[styles.toggleText, !isMapView && styles.toggleTextActive]}>
              📋 List
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, isMapView && styles.toggleButtonActive]}
            onPress={() => setIsMapView(true)}
          >
            <Text style={[styles.toggleText, isMapView && styles.toggleTextActive]}>
              🗺️ Map
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Provider List */}
      {isLoading && providers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.emptyText}>Loading providers...</Text>
        </View>
      ) : providers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No providers found</Text>
          <Text style={[styles.emptyText, { fontSize: 13, color: colors.text.tertiary }]}>
            Try adjusting your filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProviderCard
              id={item.id}
              name={item.full_name || 'Unknown'}
              rating={item.rating_average}
              avatar={item.avatar_url}
              hourlyRate={item.hourly_rate}
              onPress={() => handleProviderPress(item.id)}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading && providers.length > 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          scrollEnabled={false}
          style={styles.listContainer}
        />
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Update customer layout to handle search modal**

Modify file: `apps/mobile/app/(customer)/_layout.tsx` to add search as a modal:

```typescript
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { colors } from '@onserve/ui-tokens';

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
  },
});

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.surface[1],
          borderTopColor: colors.surface[2],
          borderTopWidth: 1,
        },
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -8,
        },
      }}
    >
      <Tabs.Screen
        name="(tabs)/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>💬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>👤</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null, // Hidden from tab bar, accessed via navigation
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit src/hooks/useProviderSearch.ts app/\(customer\)/search.tsx
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/hooks/useProviderSearch.ts apps/mobile/app/\(customer\)/search.tsx apps/mobile/app/\(customer\)/_layout.tsx
git commit -m "feat(mobile): implement search screen with filters and pagination"
```

---

### Task 12: Create Provider Profile Screen

**Files:**
- Create: `apps/mobile/app/(customer)/providers/[id].tsx`
- Create: `apps/mobile/app/(customer)/providers/_layout.tsx`
- Create: `apps/mobile/src/hooks/useProviderDetails.ts`

**Interfaces:**
- Consumes: `getProviderProfile`, `getProviderRatings`, `TanStack Query`
- Produces: Functional provider profile screen with details, reviews, "Book Now" button
- Consumed by: Search/home card taps

- [ ] **Step 1: Create provider details hook**

Create file: `apps/mobile/src/hooks/useProviderDetails.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getProviderProfile, getProviderRatings } from '@onserve/api';
import { supabase } from '../lib/supabase';
import type { ProviderProfile, Review } from '@onserve/api';

interface UseProviderDetailsReturn {
  provider: ProviderProfile | null;
  reviews: Review[];
  isLoading: boolean;
  error: Error | null;
}

export const useProviderDetails = (providerId?: string): UseProviderDetailsReturn => {
  const { data: provider, isLoading: providerLoading, error: providerError } = useQuery({
    queryKey: ['providers', providerId],
    queryFn: () => {
      if (!providerId) throw new Error('Provider ID required');
      return getProviderProfile(supabase, providerId);
    },
    enabled: !!providerId,
  });

  const { data: reviews, error: reviewsError } = useQuery({
    queryKey: ['providers', providerId, 'ratings'],
    queryFn: () => {
      if (!providerId) throw new Error('Provider ID required');
      return getProviderRatings(supabase, providerId);
    },
    enabled: !!providerId,
  });

  return {
    provider: provider || null,
    reviews: reviews || [],
    isLoading: providerLoading,
    error: providerError instanceof Error ? providerError : (reviewsError instanceof Error ? reviewsError : null),
  };
};
```

- [ ] **Step 2: Create providers layout**

Create file: `apps/mobile/app/(customer)/providers/_layout.tsx`

```typescript
import { Stack } from 'expo-router';

export default function ProvidersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
```

- [ ] **Step 3: Create provider profile screen**

Create file: `apps/mobile/app/(customer)/providers/[id].tsx`

```typescript
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@onserve/ui-tokens';
import { Button, Card, RatingStars, ToastContainer } from '../../../src/components';
import { useProviderDetails } from '../../../src/hooks/useProviderDetails';
import { useToast } from '../../../src/hooks/useToast';

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toasts, dismiss, show: showToast } = useToast();
  const { provider, reviews, isLoading, error } = useProviderDetails(id);

  if (error) {
    showToast(error.message, 'error');
  }

  const handleBookNow = () => {
    if (!id) return;
    showToast('Navigating to booking form...', 'info');
    router.push({
      pathname: '/(customer)/booking-form',
      params: { providerId: id },
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    scrollContent: {
      paddingBottom: 100,
    },
    header: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: colors.surface[1],
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface[2],
      marginBottom: 16,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 8,
    },
    ratingContainer: {
      marginBottom: 12,
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 24,
      marginTop: 16,
      justifyContent: 'center',
    },
    stat: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 4,
    },
    section: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 12,
    },
    bio: {
      fontSize: 14,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    servicesList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    serviceBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    serviceName: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '500',
    },
    serviceRate: {
      color: colors.text.secondary,
      fontSize: 12,
      marginLeft: 4,
    },
    reviewCard: {
      backgroundColor: colors.surface[1],
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.surface[2],
    },
    reviewerName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    reviewComment: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
      marginBottom: 8,
    },
    reviewDate: {
      fontSize: 12,
      color: colors.text.tertiary,
    },
    emptyReviews: {
      fontSize: 14,
      color: colors.text.secondary,
      fontStyle: 'italic',
    },
    bookingContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: colors.surface[1],
      borderTopWidth: 1,
      borderTopColor: colors.surface[2],
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text.secondary }}>Provider not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          {provider.avatar_url && (
            <Image source={{ uri: provider.avatar_url }} style={styles.avatar} />
          )}
          <Text style={styles.name}>{provider.full_name || 'Unknown Provider'}</Text>

          <View style={styles.ratingContainer}>
            <RatingStars rating={provider.rating_average || 5.0} count={provider.rating_count} />
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{provider.rating_count || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            {provider.response_time_minutes && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>&lt;{provider.response_time_minutes}min</Text>
                <Text style={styles.statLabel}>Response</Text>
              </View>
            )}
            <View style={styles.stat}>
              <Text style={styles.statValue}>{provider.is_available ? '✓' : '✗'}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </View>
        </View>

        {/* Bio */}
        {provider.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{provider.bio}</Text>
          </View>
        )}

        {/* Services */}
        {provider.services && provider.services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <View style={styles.servicesList}>
              {provider.services.map((service) => (
                <View key={service.id} style={styles.serviceBadge}>
                  <Text style={styles.serviceName}>
                    {service.name}
                    <Text style={styles.serviceRate}> R{service.rate}/hr</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <Text style={styles.reviewerName}>{review.reviewer_name || 'Anonymous'}</Text>
                <RatingStars rating={review.rating} size="sm" />
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyReviews}>No reviews yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Booking Button */}
      <View style={styles.bookingContainer}>
        <Button
          label="Book Now"
          onPress={handleBookNow}
          variant="primary"
          size="lg"
        />
      </View>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit src/hooks/useProviderDetails.ts app/\(customer\)/providers/\[id\].tsx
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/hooks/useProviderDetails.ts apps/mobile/app/\(customer\)/providers/_layout.tsx apps/mobile/app/\(customer\)/providers/\[id\].tsx
git commit -m "feat(mobile): implement provider profile screen with reviews"
```

---

### Task 13: Update Root Layout with Auth & Query Providers

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/src/hooks/useAuthSession.ts`

**Interfaces:**
- Consumes: `useAuthStore`, `Supabase`, `TanStack Query`
- Produces: Root layout with auth routing logic and Query provider
- Consumed by: Entire app

- [ ] **Step 1: Create session sync hook**

Create file: `apps/mobile/src/hooks/useAuthSession.ts`

```typescript
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './useAuth';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

/**
 * Syncs Supabase auth session with local Zustand store
 * and handles navigation between auth/app stacks
 */
export const useAuthSession = () => {
  const router = useRouter();
  const segments = useSegments();
  const { session, setSession, setUser, logout } = useAuth();
  const { setIsLoading } = useAuthStore();

  useEffect(() => {
    setIsLoading(true);

    // Check current session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session check error:', error);
          logout();
        } else if (data.session) {
          setSession(data.session);
          if (data.session.user) {
            setUser(data.session.user);
          }
        } else {
          logout();
        }
      } catch (error) {
        console.error('Unexpected error during session check:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const subscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSession(session);
        if (session.user) {
          setUser(session.user);
        }
      } else {
        logout();
      }
    });

    return () => {
      subscription.data?.subscription?.unsubscribe();
    };
  }, []);

  // Navigate based on auth state
  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/splash');
    } else if (session && inAuthGroup) {
      router.replace('/(customer)');
    }
  }, [session, segments, router]);

  return { session };
};
```

- [ ] **Step 2: Rewrite root layout with providers**

Modify file: `apps/mobile/app/_layout.tsx`

```typescript
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthSession } from '../src/hooks/useAuthSession';
import { useAuthStore } from '../src/store/authStore';
import { useToast } from '../src/hooks/useToast';
import { ToastContainer } from '../src/components';
import '../global.css';

// Create a singleton QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Root layout with auth session sync and providers
 */
function RootLayoutContent() {
  useAuthSession();
  const { toasts, dismiss } = useToast();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="(auth)"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="(customer)"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="(provider)"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="_storybook" />
      </Stack>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutContent />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npx tsc --noEmit src/hooks/useAuthSession.ts app/_layout.tsx
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add apps/mobile/src/hooks/useAuthSession.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add auth session sync and Query/Toast providers to root layout"
```

---

### Task 14: Build & Test Complete Auth Flow

**Files:**
- Test: End-to-end auth flow (manual)
- Verify: All screens render without errors
- Document: Testing checklist

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified, working auth flow end-to-end

- [ ] **Step 1: Build TypeScript**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npm run build
```

Expected: `tsc --noEmit` succeeds with no errors (or only type-stub warnings for incomplete Database type).

- [ ] **Step 2: Start Expo dev server**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
npm start
```

Expected: Server starts on `http://localhost:8081`, outputs QR code.

- [ ] **Step 3: Test splash screen**

- Press `i` to open iOS simulator (or `a` for Android)
- Expected: Splash screen displays "OnServe" + tagline for 2 seconds, then navigates to login

- [ ] **Step 4: Test login screen**

- Enter valid SA phone: `0712345678` or `+27712345678`
- Press "Send OTP"
- Expected: Toast shows "OTP sent", navigates to verify screen
- If Supabase is set up with SMS auth, check Supabase dashboard for OTP sent event

- [ ] **Step 5: Test OTP verification (sandbox)**

- If using Supabase sandbox account, check Supabase dashboard for generated OTP code
- Enter 6-digit OTP
- Press "Verify"
- Expected: Toast shows "Verified!", navigates to role selection

- [ ] **Step 6: Test role selection**

- Tap "Book Services" (Customer) or "Provide Services" (Provider)
- Press "Continue"
- Expected: Role is stored in Zustand, navigates to home/provider screen

- [ ] **Step 7: Test home screen (customer)**

- Expected: User name displayed, location badge shows (or "Getting location...")
- Services section loads and displays categories
- Quick Actions cards render

- [ ] **Step 8: Test search navigation**

- Tap search bar or tap a service badge
- Expected: Navigates to search screen, service is pre-selected (if applicable)

- [ ] **Step 9: Test search screen**

- Service filter dropdown shows categories
- Radius slider (TODO placeholder for now)
- List view loads providers with pagination
- Tap a provider card
- Expected: Navigates to provider profile

- [ ] **Step 10: Test provider profile**

- Expected: Provider name, rating, services, reviews displayed
- "Book Now" button present (taps toast for now, as booking form is Phase 2b)

- [ ] **Step 11: Document checklist results**

Create file: `docs/testing/PHASE_2A_TEST_RESULTS.md`

```markdown
# Phase 2a: Customer Core Flows — Test Results

**Date:** 2026-06-18
**Tester:** [Your name]
**Status:** ✅ PASS / ❌ FAIL

## Splash Screen
- [ ] Displays for 2 seconds
- [ ] Shows "OnServe" title
- [ ] Shows tagline

## Login Screen
- [ ] Phone input validates SA format
- [ ] "Send OTP" button disabled for invalid input
- [ ] Toast shows on OTP send success
- [ ] Navigates to verify screen with phone param

## OTP Verification
- [ ] 6-digit input only
- [ ] Verify button disabled for incomplete OTP
- [ ] Toast shows on verification success
- [ ] Resend button shows and counts down
- [ ] Navigates to role selection on success

## Role Selection
- [ ] Two role cards render
- [ ] Selection toggles highlighted state
- [ ] Continue button disabled until role selected
- [ ] Navigates to home/provider on selection

## Home Screen
- [ ] User name displays (or "User" if not set)
- [ ] Location badge shows
- [ ] Service categories load
- [ ] Quick Actions cards render
- [ ] Search bar navigates to search screen

## Search Screen
- [ ] Service filter works (shows all categories)
- [ ] Radius slider placeholder displays
- [ ] List/Map toggle buttons work
- [ ] Provider list loads with pagination
- [ ] Provider card taps navigate to profile
- [ ] Loading state shows during fetch

## Provider Profile
- [ ] Provider name and avatar display
- [ ] Rating stars and count show
- [ ] Services list displays with rates
- [ ] Recent reviews render (or "No reviews yet")
- [ ] "Book Now" button present
- [ ] All data loads from Supabase (check RLS)

## Error Handling
- [ ] Toast shows on Supabase errors
- [ ] Network errors gracefully handled
- [ ] RLS permission errors logged
- [ ] Retry mechanisms work

## Navigation
- [ ] All screen transitions work
- [ ] Back navigation works (if enabled)
- [ ] Deep links functional (future testing)

## Design Tokens
- [ ] Colors from @onserve/ui-tokens used
- [ ] Spacing consistent throughout
- [ ] Typography matches design system
- [ ] Dark theme applied correctly

## TypeScript
- [ ] `npm run build` passes (strict mode)
- [ ] No console errors during app use
- [ ] Types properly inferred from API services

## Notes
[Add any issues, blockers, or observations]
```

- [ ] **Step 12: Commit test results**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add docs/testing/PHASE_2A_TEST_RESULTS.md
git commit -m "docs: add Phase 2a test results and checklist"
```

---

## Summary

**Total Tasks:** 14  
**Estimated Duration:** 8-12 hours (implementation + testing)  
**Success Criteria:**
- ✅ Auth flow end-to-end testable (splash → login → OTP → role → home)
- ✅ Home screen shows real user data + location badge
- ✅ Search screen lists providers by category and distance
- ✅ Provider profile shows ratings, services, reviews
- ✅ Navigation between all screens works
- ✅ Supabase queries use proper RLS
- ✅ Error handling on all async operations
- ✅ All screens follow design system
- ✅ TypeScript strict mode passes

**Next Phase (Phase 2b):** Booking form, payment integration, booking confirmation screen

---

Plan complete and saved to `/Users/medupiramaboea/Projects/OnServe/docs/superpowers/plans/2026-06-18-mobile-phase2a-customer-flows.md`

## Execution Options

**1. Subagent-Driven (Recommended)** — I'll dispatch a specialized subagent per 2-3 tasks, review between batches, iterate quickly  
**2. Inline Execution** — Execute all tasks in this session with frequent commits and checkpoints

Which approach do you prefer?