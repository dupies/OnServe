# OnServe — Phase 1 Setup Instructions

> Run every command exactly as written. Each step has a verification check — don't move to the next step until the check passes.

---

## Prerequisites

Before starting, confirm you have these installed:

```bash
node --version      # must be 18+
npm --version       # must be 9+
git --version       # any recent version
```

If Node is below 18, install it from https://nodejs.org

---

## Your Supabase Project

Already created for you:

| Field | Value |
|---|---|
| Project name | onserve-poc |
| Project ID | pehkmwbvwfohckakumnh |
| Region | eu-west-1 (Ireland) |
| Database host | db.pehkmwbvwfohckakumnh.supabase.co |

Go to https://supabase.com/dashboard/project/pehkmwbvwfohckakumnh and get your keys from **Settings → API**. You will need:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for migrations)

---

## Step 1 — Install Supabase CLI

```bash
npm install -g supabase
supabase --version
```

Then log in:

```bash
supabase login
```

This opens a browser — approve the login. Come back to the terminal when done.

**Verify:**
```bash
supabase projects list
# Should show onserve-poc in the list
```

---

## Step 2 — Create the project folder

```bash
mkdir -p /Users/medupiramaboea/Projects/OnServe
cd /Users/medupiramaboea/Projects/OnServe
git init
git checkout -b main
git config user.email "dev@onserve.co.za"
git config user.name "OnServe Dev"
```

**Verify:**
```bash
pwd
# /Users/medupiramaboea/Projects/OnServe
git branch
# * main
```

---

## Step 3 — Scaffold the monorepo

```bash
cd /Users/medupiramaboea/Projects/OnServe
npm install -g turbo
npx create-turbo@latest . --package-manager npm
```

When prompted, choose:
- Package manager: **npm**
- Do not install example apps (we will create our own structure)

Then clean out the example apps Turborepo creates:

```bash
rm -rf apps/docs apps/web 2>/dev/null || true
mkdir -p apps/web apps/mobile apps/api
mkdir -p packages/types/src packages/shared/src packages/ui/src
```

**Verify:**
```bash
ls apps/
# api  mobile  web
ls packages/
# shared  types  ui
```

---

## Step 4 — Root configuration files

Create these files one at a time in VS Code. Open the terminal inside VS Code with `` Ctrl+` ``.

### `package.json` (root)

```bash
cat > /Users/medupiramaboea/Projects/OnServe/package.json << 'EOF'
{
  "name": "onserve",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\""
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.4.0",
    "prettier": "^3.2.0",
    "eslint": "^8.57.0"
  }
}
EOF
```

### `turbo.json` (root)

```bash
cat > /Users/medupiramaboea/Projects/OnServe/turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", ".expo/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
EOF
```

### `tsconfig.base.json` (root)

```bash
cat > /Users/medupiramaboea/Projects/OnServe/tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules"]
}
EOF
```

### `.prettierrc` (root)

```bash
cat > /Users/medupiramaboea/Projects/OnServe/.prettierrc << 'EOF'
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
EOF
```

### `.gitignore` (root)

```bash
cat > /Users/medupiramaboea/Projects/OnServe/.gitignore << 'EOF'
node_modules/
.env
.env.local
.env.*.local
dist/
build/
.next/
.expo/
*.log
.DS_Store
coverage/
.turbo/
supabase/.temp/
EOF
```

---

## Step 5 — `packages/types`

This package holds every shared TypeScript type across the entire monorepo.

```bash
cd /Users/medupiramaboea/Projects/OnServe/packages/types
```

### `package.json`

```bash
cat > package.json << 'EOF'
{
  "name": "@onserve/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  }
}
EOF
```

### `src/user.ts`

```bash
cat > src/user.ts << 'EOF'
export type UserRole = 'customer' | 'provider' | 'admin';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  bio: string | null;
  idDocumentUrl: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  ratingAverage: number;
  totalJobsCompleted: number;
  completionRate: number;
  noShowRate: number;
  disputeRate: number;
  reputationScore: number;
  verifiedAt: string | null;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  cancellationRate: number;
  disputeAbuseScore: number;
  locationTrustScore: number;
  reputationScore: number;
}
EOF
```

### `src/location.ts`

```bash
cat > src/location.ts << 'EOF'
export type TrustLevel = 'unverified' | 'low' | 'medium' | 'high';

export interface SavedLocation {
  id: string;
  userId: string;
  label: 'Home' | 'Work' | 'Other';
  customName: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  visitCount: number;
  trustScore: number;
  isDefault: boolean;
  createdAt: string;
}

export interface LocationEvent {
  id: string;
  userId: string;
  bookingId: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  trustLevel: TrustLevel;
  capturedAt: string;
}
EOF
```

### `src/service.ts`

```bash
cat > src/service.ts << 'EOF'
export type PricingModel = 'fixed' | 'hourly' | 'quote_based';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ServiceType {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  pricingModel: PricingModel;
  basePrice: number | null;
  hourlyRate: number | null;
  estimatedDurationMins: number | null;
  requiredSkills: string[];
  requiredCertifications: string[];
  isActive: boolean;
}

export interface ProviderService {
  id: string;
  providerId: string;
  serviceTypeId: string;
  customPrice: number | null;
  serviceRadiusKm: number;
  isAvailable: boolean;
  createdAt: string;
}
EOF
```

### `src/booking.ts`

```bash
cat > src/booking.ts << 'EOF'
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type BookingType = 'instant' | 'quote_based';

export interface Booking {
  id: string;
  customerId: string;
  providerId: string | null;
  serviceTypeId: string;
  locationId: string;
  bookingType: BookingType;
  status: BookingStatus;
  totalAmount: number;
  depositAmount: number | null;
  customerNotes: string | null;
  scheduledAt: string;
  providerCheckedInAt: string | null;
  providerCheckedOutAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export interface QuoteRequest {
  id: string;
  bookingId: string | null;
  customerId: string;
  serviceTypeId: string;
  locationId: string;
  problemDescription: string;
  uploadedImageUrls: string[];
  status: 'open' | 'in_review' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface Quote {
  id: string;
  quoteRequestId: string;
  providerId: string;
  quotedPrice: number;
  estimatedDurationMins: number | null;
  notes: string | null;
  status: 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
  submittedAt: string;
  acceptedAt: string | null;
}
EOF
```

### `src/payment.ts`

```bash
cat > src/payment.ts << 'EOF'
export type PaymentStatus =
  | 'pending'
  | 'escrowed'
  | 'released'
  | 'refunded'
  | 'disputed';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_customer'
  | 'resolved_provider'
  | 'escalated';

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  amount: number;
  depositAmount: number;
  balanceAmount: number;
  status: PaymentStatus;
  paymentGateway: 'yoco' | 'peach';
  gatewayTransactionId: string | null;
  gatewayReference: string | null;
  escrowedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  paymentId: string;
  raisedByUserId: string;
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolvedByAdminId: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
EOF
```

### `src/rating.ts`

```bash
cat > src/rating.ts << 'EOF'
export interface Rating {
  id: string;
  bookingId: string;
  ratedByUserId: string;
  ratedUserId: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  isProviderRating: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'payment' | 'rating' | 'dispute' | 'system';
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
EOF
```

### `src/index.ts`

```bash
cat > src/index.ts << 'EOF'
export * from './user';
export * from './location';
export * from './service';
export * from './booking';
export * from './payment';
export * from './rating';
EOF
```

---

## Step 6 — `packages/shared`

```bash
cd /Users/medupiramaboea/Projects/OnServe/packages/shared
```

### `package.json`

```bash
cat > package.json << 'EOF'
{
  "name": "@onserve/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@onserve/types": "*"
  }
}
EOF
```

### `src/formatCurrency.ts`

```bash
cat > src/formatCurrency.ts << 'EOF'
/**
 * Formats a number as South African Rand.
 * @example formatCurrency(450) // "R 450.00"
 */
export function formatCurrency(amount: number): string {
  return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
EOF
```

### `src/trustScore.ts`

```bash
cat > src/trustScore.ts << 'EOF'
import type { TrustLevel } from '@onserve/types';

/**
 * Returns a human-readable trust level from a numeric score.
 */
export function getTrustLevel(score: number): TrustLevel {
  if (score === 0) return 'unverified';
  if (score < 30) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

/**
 * Returns a badge label for display.
 */
export function getTrustLabel(level: TrustLevel): string {
  const labels: Record<TrustLevel, string> = {
    unverified: 'Unverified location',
    low: 'New area',
    medium: 'Building trust',
    high: 'Trusted',
  };
  return labels[level];
}
EOF
```

### `src/constants.ts`

```bash
cat > src/constants.ts << 'EOF'
export const PLATFORM_FEE_PERCENT = 0.05; // 5%
export const QUOTE_DEPOSIT_PERCENT = 0.20; // 20%
export const ESCROW_AUTO_RELEASE_HOURS = 48;
export const DEFAULT_SERVICE_RADIUS_KM = 10;
export const MAX_SAVED_LOCATIONS = 5;
EOF
```

### `src/index.ts`

```bash
cat > src/index.ts << 'EOF'
export * from './formatCurrency';
export * from './trustScore';
export * from './constants';
EOF
```

---

## Step 7 — Bootstrap the web app

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm create vite@latest . -- --template react-ts
npm install
npm install @supabase/supabase-js @tanstack/react-query zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

### `package.json` (add workspace deps)

Open `apps/web/package.json` and add to `dependencies`:

```json
"@onserve/types": "*",
"@onserve/shared": "*"
```

So the full `dependencies` section looks like:

```json
"dependencies": {
  "@onserve/types": "*",
  "@onserve/shared": "*",
  "@supabase/supabase-js": "^2.43.0",
  "@tanstack/react-query": "^5.35.0",
  "zustand": "^4.5.0",
  "react-router-dom": "^6.23.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0"
}
```

### `tailwind.config.js`

```bash
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#00D97E',
        'accent-hover': '#00C470',
        surface: '#13131A',
        card: '#1C1C26',
        border: '#2A2A38',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
EOF
```

### `src/index.css` (replace contents)

```bash
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-accent: #00D97E;
  --color-bg: #0A0A0F;
  --color-surface: #13131A;
  --color-card: #1C1C26;
  --color-border: #2A2A38;
  --color-text: #F0EFE8;
  --color-muted: #888898;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: Inter, system-ui, sans-serif;
}
EOF
```

---

## Step 8 — Environment variables

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
```

Create `.env.local` (never commit this):

```bash
cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://pehkmwbvwfohckakumnh.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
EOF
```

**Replace `your_anon_key_here`** with your actual anon key from:
https://supabase.com/dashboard/project/pehkmwbvwfohckakumnh/settings/api

Create `.env.example` (safe to commit):

```bash
cat > .env.example << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
EOF
```

---

## Step 9 — Supabase client and service layer

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
mkdir -p src/lib src/features/auth/services src/features/auth/hooks src/features/auth/store
mkdir -p src/features/bookings/services src/features/bookings/hooks
mkdir -p src/features/location/services src/features/location/hooks
mkdir -p src/features/providers/services src/features/providers/hooks
```

### `src/lib/supabase.ts`

```bash
cat > src/lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
EOF
```

### `src/lib/queryClient.ts`

```bash
cat > src/lib/queryClient.ts << 'EOF'
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
EOF
```

### `src/features/auth/services/authService.ts`

```bash
cat > src/features/auth/services/authService.ts << 'EOF'
import { supabase } from '../../../lib/supabase';
import type { UserRole } from '@onserve/types';

/**
 * Sends a one-time password to the given phone number.
 * Phone must be in E.164 format e.g. +27821234567
 */
export async function sendOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw new Error(error.message);
}

/**
 * Verifies the OTP code sent to the phone number.
 */
export async function verifyOtp(phone: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  if (error) throw new Error(error.message);
}

/**
 * Returns the current authenticated session, or null if not authenticated.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

/**
 * Returns the current authenticated user, or null.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}

/**
 * Signs the current user out and clears the session.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Updates the user's role in their profile metadata.
 */
export async function setUserRole(role: UserRole): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { role },
  });
  if (error) throw new Error(error.message);
}
EOF
```

### `src/features/auth/store/authStore.ts`

```bash
cat > src/features/auth/store/authStore.ts << 'EOF'
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@onserve/types';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, role: null, isLoading: false }),
}));
EOF
```

### `src/features/auth/hooks/useAuth.ts`

```bash
cat > src/features/auth/hooks/useAuth.ts << 'EOF'
import { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '@onserve/types';

/**
 * Initialises auth state from Supabase and subscribes to auth changes.
 * Call this once at the app root.
 */
export function useAuthInit() {
  const { setUser, setRole, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setUser(user);
      setRole((user?.user_metadata?.role as UserRole) ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      setRole((user?.user_metadata?.role as UserRole) ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [setUser, setRole, setLoading]);
}

/**
 * Returns the current auth state. Use anywhere in the app.
 */
export function useAuth() {
  return useAuthStore();
}
EOF
```

### `src/features/location/services/locationService.ts`

```bash
cat > src/features/location/services/locationService.ts << 'EOF'
import { supabase } from '../../../lib/supabase';
import type { SavedLocation } from '@onserve/types';

/**
 * Fetches all saved locations for the current user.
 */
export async function getSavedLocations(): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from('saved_locations')
    .select('*')
    .order('is_default', { ascending: false });
  if (error) throw new Error(error.message);
  return data as SavedLocation[];
}

/**
 * Saves a new location for the current user.
 */
export async function saveLocation(
  location: Omit<SavedLocation, 'id' | 'visitCount' | 'trustScore' | 'createdAt'>
): Promise<SavedLocation> {
  const { data, error } = await supabase
    .from('saved_locations')
    .insert(location)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SavedLocation;
}

/**
 * Deletes a saved location by ID.
 */
export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('saved_locations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
EOF
```

### `src/features/bookings/services/bookingService.ts`

```bash
cat > src/features/bookings/services/bookingService.ts << 'EOF'
import { supabase } from '../../../lib/supabase';
import type { Booking, BookingStatus } from '@onserve/types';

/**
 * Fetches all bookings for the current customer.
 */
export async function getCustomerBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service_types(*), saved_locations(*), provider:provider_profiles(*)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Booking[];
}

/**
 * Fetches a single booking by ID.
 */
export async function getBookingById(id: string): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service_types(*), saved_locations(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as Booking;
}

/**
 * Creates a new instant booking.
 */
export async function createBooking(
  booking: Omit<Booking, 'id' | 'status' | 'createdAt' | 'completedAt' | 'cancelledAt' |
    'providerCheckedInAt' | 'providerCheckedOutAt'>
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...booking, status: 'pending' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Booking;
}

/**
 * Updates the status of a booking.
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
EOF
```

### `src/features/providers/services/providerService.ts`

```bash
cat > src/features/providers/services/providerService.ts << 'EOF'
import { supabase } from '../../../lib/supabase';
import type { ProviderProfile } from '@onserve/types';

/**
 * Searches for available providers near a location.
 * @param latitude - Latitude of the search point
 * @param longitude - Longitude of the search point
 * @param radiusKm - Search radius in kilometres
 */
export async function searchProviders(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<ProviderProfile[]> {
  const { data, error } = await supabase.rpc('search_providers_near', {
    lat: latitude,
    lng: longitude,
    radius_km: radiusKm,
  });
  if (error) throw new Error(error.message);
  return data as ProviderProfile[];
}

/**
 * Fetches a provider's public profile by user ID.
 */
export async function getProviderProfile(userId: string): Promise<ProviderProfile> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*, users(*), provider_services(*, service_types(*))')
    .eq('user_id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data as ProviderProfile;
}
EOF
```

---

## Step 10 — Router and app shell

### `src/router/index.tsx`

```bash
mkdir -p src/router src/pages
cat > src/router/index.tsx << 'EOF'
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/authStore';

// Pages (stubs — Phase 2 will fill these in)
const Home = () => <div className="p-6 text-white">Home</div>;
const Search = () => <div className="p-6 text-white">Search</div>;
const Login = () => <div className="p-6 text-white">Login</div>;
const OTPVerify = () => <div className="p-6 text-white">OTP Verify</div>;
const RoleSelect = () => <div className="p-6 text-white">Role Select</div>;
const BookingsList = () => <div className="p-6 text-white">Bookings</div>;
const Profile = () => <div className="p-6 text-white">Profile</div>;
const ProviderJobBoard = () => <div className="p-6 text-white">Job Board</div>;
const ProviderEarnings = () => <div className="p-6 text-white">Earnings</div>;

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <div className="p-6 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  // Auth routes
  { path: '/login', element: <Login /> },
  { path: '/verify', element: <OTPVerify /> },
  { path: '/role', element: <RoleSelect /> },

  // Customer routes
  { path: '/', element: <RequireAuth><Home /></RequireAuth> },
  { path: '/search', element: <RequireAuth><Search /></RequireAuth> },
  { path: '/bookings', element: <RequireAuth><BookingsList /></RequireAuth> },
  { path: '/profile', element: <RequireAuth><Profile /></RequireAuth> },

  // Provider routes
  { path: '/provider/jobs', element: <RequireAuth><ProviderJobBoard /></RequireAuth> },
  { path: '/provider/earnings', element: <RequireAuth><ProviderEarnings /></RequireAuth> },
]);
EOF
```

### `src/App.tsx` (replace contents)

```bash
cat > src/App.tsx << 'EOF'
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { useAuthInit } from './features/auth/hooks/useAuth';

function AppContent() {
  useAuthInit();
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
EOF
```

### `src/main.tsx` (replace contents)

```bash
cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF
```

---

## Step 11 — Database migrations

```bash
cd /Users/medupiramaboea/Projects/OnServe
supabase init
supabase link --project-ref pehkmwbvwfohckakumnh
```

Create the migrations:

```bash
supabase migration new enable_extensions
supabase migration new create_users
supabase migration new create_locations
supabase migration new create_services
supabase migration new create_bookings
supabase migration new create_payments
supabase migration new create_ratings
supabase migration new rls_policies
```

This creates timestamped SQL files in `supabase/migrations/`. Open each one in VS Code and paste the SQL from the migration files in this package.

**Run migrations:**

```bash
supabase db push
```

**Verify:**
```bash
supabase db push --dry-run
# Should show all migrations as applied
```

---

## Step 12 — Final install and first run

```bash
cd /Users/medupiramaboea/Projects/OnServe
npm install
turbo dev --filter=web
```

Open http://localhost:5173 — you should see the app shell with a white "Loading..." message, which means auth init is running and Supabase is connected.

**Verify the connection works:**

Open your browser console. You should see no errors. If you see `Missing Supabase environment variables`, check your `.env.local` file.

---

## Step 13 — First commit

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add .
git commit -m "feat: phase 1 foundation — monorepo, types, services, auth, web app shell"
```

---

## What's next — Phase 2

With this foundation in place, Phase 2 builds the actual screens:
- Home screen with service category grid
- Location picker with GPS capture
- Provider search and results
- Full booking wizard (instant)
- Customer and provider dashboards

Run Phase 2 in Claude Code from your project root for the fastest workflow.
