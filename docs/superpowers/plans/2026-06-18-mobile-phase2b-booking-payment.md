# OnServe Mobile Phase 2b: Booking & Payment Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete booking-to-payment flow on mobile: customers collect booking details, request quotes, accept quotes, and complete payment via Ozow with deep-link return handling.

**Architecture:** Three main screens (booking form → quote request → payment) + two post-payment screens (success/failure). Booking form submits to Supabase, quote request subscribes to realtime updates, payment screen calls edge function to create Ozow session, then handles deep-link return via expo-linking. All screens use shared fee calculation from @onserve/shared. Form validation via Zod. Supabase RLS enforces customer/booking ownership.

**Tech Stack:** React Native, Expo Router, Supabase (realtime subscriptions + RLS), expo-web-browser (in-app payment browser), expo-linking (deep-link handling), Zod (validation), @onserve/shared (fee calculations), @tanstack/react-query (optional, for future caching)

## Global Constraints

- React Native 0.76.9, Expo 56.x, TypeScript strict mode
- NativeWind for styling; follow `commonStyles` pattern from `apps/mobile/src/utils/styles.ts`
- Fee calculation: Use `calculateFees()` from `@onserve/shared` (servicePrice: number → FeeBreakdown)
- Ozow payment gateway: createPayment edge function exists at `/functions/create-payment` and returns `{ paymentUrl, paymentId, fees }`
- All Supabase queries must respect RLS (no service role queries from mobile)
- Booking schema: `bookings(id, customer_id, service_type_id, location_id, status, total_amount, scheduled_at, customer_notes, ...)`
- Payment schema: `payments(id, booking_id, customer_id, amount, platform_fee, transaction_fee, status, ...)`
- Service types schema: `service_types(id, name, base_price, pricing_model)` + `provider_services(custom_price)`
- Saved locations schema: `saved_locations(id, formatted_address, latitude, longitude, ...)`
- Form state must be cleared/reset after navigation to prevent memory leaks
- All async operations must have loading + error states (no silent failures)
- Deep-link scheme: `onserve://payment/return?status=success&bookingId=UUID`

---

## File Structure

### New Files to Create

1. **`apps/mobile/src/lib/supabase.ts`** — Supabase client initialization for mobile (Expo with async storage)
2. **`apps/mobile/src/utils/validation.ts`** — Zod schemas for booking form (serviceId, date, location, notes)
3. **`apps/mobile/src/components/Picker.tsx`** — Reusable dropdown component for service/location selection
4. **`apps/mobile/src/components/DateTimePicker.tsx`** — Native date + time picker wrapper
5. **`apps/mobile/src/components/PriceBreakdown.tsx`** — Display FeeBreakdown with service/platform/transaction fees
6. **`apps/mobile/app/(customer)/booking-form.tsx`** — Main booking form screen (service, date, location, notes, estimate)
7. **`apps/mobile/app/(customer)/quote-request/[bookingId].tsx`** — Quote request screen with realtime subscription
8. **`apps/mobile/app/(customer)/payment.tsx`** — Payment confirmation screen → Ozow redirect
9. **`apps/mobile/app/(customer)/booking-confirmation/[bookingId].tsx`** — Post-payment success screen
10. **`apps/mobile/app/(customer)/payment-failed/[bookingId].tsx`** — Post-payment failure screen
11. **`packages/api/src/booking/bookingService.ts`** — Booking CRUD operations (createBooking, fetchBooking, etc.)
12. **`packages/api/src/payment/paymentService.ts`** — Payment creation wrapper for mobile (calls Ozow edge function)

### Modified Files

1. **`apps/mobile/app/_layout.tsx`** — Add deep-link listener for `onserve://payment/return`
2. **`apps/mobile/package.json`** — Add expo-web-browser dependency (if not present)
3. **`apps/mobile/.env.local`** — Add `EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL` for edge function calls
4. **`packages/types/src/index.ts`** — Export booking/payment types (already exist, just ensure exported)

---

## Task Breakdown

### Task 1: Set Up Supabase Client for Mobile

**Files:**
- Create: `apps/mobile/src/lib/supabase.ts`
- Modify: `apps/mobile/.env.local` (add FUNCTIONS_URL)

**Interfaces:**
- Consumes: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (from .env)
- Produces: `export { supabase }` — initialized SupabaseClient with Expo async storage session persistence

**Context:** Mobile requires AsyncStorage for session persistence. The web version uses localStorage; Expo handles this with `ExpoSecureStore`.

- [ ] **Step 1: Check if expo-secure-store is installed**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npm list expo-secure-store 2>&1 | head -5`

If not present (likely), continue to Step 2. If present, skip to Step 3.

- [ ] **Step 2: Install expo-secure-store**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npm install expo-secure-store`

- [ ] **Step 3: Create Supabase client**

Create file `apps/mobile/src/lib/supabase.ts` with:

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

// Expo AsyncStorage adapter for session persistence
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 4: Verify import works in a test file**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit src/lib/supabase.ts` (should have no errors)

- [ ] **Step 5: Update .env.local with FUNCTIONS_URL**

Read current `.env.local`:

```bash
cat /Users/medupiramaboea/Projects/OnServe/apps/mobile/.env.local
```

Append (or update if already present):

```
EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL=https://<your-supabase-project-id>.supabase.co/functions/v1
```

(Replace `<your-supabase-project-id>` with actual project ID from VITE_SUPABASE_URL)

- [ ] **Step 6: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add src/lib/supabase.ts .env.local
git commit -m "feat(mobile): initialize Supabase client with Expo secure storage"
```

---

### Task 2: Create Validation Schemas for Booking Form

**Files:**
- Create: `apps/mobile/src/utils/validation.ts`

**Interfaces:**
- Consumes: Zod library (already in deps)
- Produces:
  - `BookingFormSchema` — Zod schema with fields: serviceTypeId (uuid string), locationId (uuid string), scheduledDate (ISO string), notes (optional string)
  - `parseBookingForm(data: unknown)` — Validates form data, throws if invalid
  - Type: `BookingFormInput` — Inferred TypeScript type from schema

- [ ] **Step 1: Create validation.ts**

Create file `apps/mobile/src/utils/validation.ts`:

```typescript
import { z } from 'zod';

// Service dropdown must select from existing service types
export const BookingFormSchema = z.object({
  serviceTypeId: z.string().uuid('Invalid service type'),
  locationId: z.string().uuid('Invalid location'),
  scheduledDate: z.string().datetime('Invalid date format'),
  notes: z.string().optional().nullable(),
});

export type BookingFormInput = z.infer<typeof BookingFormSchema>;

export function parseBookingForm(data: unknown): BookingFormInput {
  return BookingFormSchema.parse(data);
}

export function validateBookingForm(data: unknown) {
  const result = BookingFormSchema.safeParse(data);
  return result;
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit src/utils/validation.ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add src/utils/validation.ts
git commit -m "feat(mobile): add Zod validation schemas for booking form"
```

---

### Task 3: Create Reusable Picker (Dropdown) Component

**Files:**
- Create: `apps/mobile/src/components/Picker.tsx`

**Interfaces:**
- Consumes: Nothing (basic RN component)
- Produces: `Picker` component with props: `items` (array of {id, label}), `selectedId`, `onSelect(id)`, `placeholder`, `label`, `error`

**Context:** React Native Picker needs platform-specific handling (iOS uses ActionSheetIOS, Android uses Picker). For MVP, use RN Picker.Picker (cross-platform via Picker.Picker from @react-native-picker/picker, which should already be available via Expo).

- [ ] **Step 1: Check if @react-native-picker/picker is available**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npm list @react-native-picker/picker 2>&1 | head -3`

If not found, install: `npm install @react-native-picker/picker`

- [ ] **Step 2: Create Picker component**

Create file `apps/mobile/src/components/Picker.tsx`:

```typescript
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RNPicker from '@react-native-picker/picker';
import { colors } from '@onserve/ui-tokens';

export interface PickerItem {
  id: string;
  label: string;
}

export interface PickerProps {
  items: PickerItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function Picker({
  items,
  selectedId,
  onSelect,
  placeholder = 'Select an option',
  label,
  error,
}: PickerProps) {
  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: error ? colors.semantic.error : colors.surface[2],
      borderRadius: 8,
      backgroundColor: colors.surface[1],
      overflow: 'hidden',
    },
    picker: {
      color: colors.text.primary,
    },
    error: {
      color: colors.semantic.error,
      fontSize: 12,
      marginTop: 4,
    },
  });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.pickerContainer}>
        <RNPicker.Picker
          selectedValue={selectedId}
          onValueChange={onSelect}
          style={styles.picker}
        >
          <RNPicker.Picker.Item label={placeholder} value="" />
          {items.map((item) => (
            <RNPicker.Picker.Item
              key={item.id}
              label={item.label}
              value={item.id}
            />
          ))}
        </RNPicker.Picker>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 3: Export from components/index.ts**

Update `apps/mobile/src/components/index.ts`:

```typescript
export { Button } from './Button';
export { Card } from './Card';
export { TextField } from './TextField';
export { Badge } from './Badge';
export { Picker } from './Picker';
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit src/components/Picker.tsx`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add src/components/Picker.tsx src/components/index.ts
git commit -m "feat(mobile): add reusable Picker dropdown component"
```

---

### Task 4: Create Native Date/Time Picker Component Wrapper

**Files:**
- Create: `apps/mobile/src/components/DateTimePicker.tsx`

**Interfaces:**
- Consumes: `expo-calendar` or native platform DatePickerIOS/DatePickerAndroid
- Produces: `DateTimePicker` component with props: `value` (Date), `onChange(date)`, `mode` ('date' | 'time' | 'datetime'), `label`, `error`

**Context:** Expo doesn't ship DatePicker, so we use Platform.select with iOS DatePickerIOS and Android DatePickerAndroid. Alternatively, use `@react-native-community/datetimepicker` package. For MVP, use community package.

- [ ] **Step 1: Install @react-native-community/datetimepicker**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npm install @react-native-community/datetimepicker`

- [ ] **Step 2: Create DateTimePicker wrapper**

Create file `apps/mobile/src/components/DateTimePicker.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import NativeDateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@onserve/ui-tokens';

export interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  label?: string;
  error?: string;
  minimumDate?: Date;
}

export function DateTimePicker({
  value,
  onChange,
  mode = 'datetime',
  label,
  error,
  minimumDate,
}: DateTimePickerProps) {
  const [show, setShow] = useState(false);

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    button: {
      borderWidth: 1,
      borderColor: error ? colors.semantic.error : colors.surface[2],
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface[1],
    },
    buttonText: {
      color: colors.text.primary,
      fontSize: 16,
    },
    error: {
      color: colors.semantic.error,
      fontSize: 12,
      marginTop: 4,
    },
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    if (mode === 'date') {
      return date.toLocaleDateString('en-ZA');
    } else if (mode === 'time') {
      return date.toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleString('en-ZA');
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        style={styles.button}
        onPress={() => setShow(true)}
      >
        <Text style={styles.buttonText}>{formatDate(value)}</Text>
      </Pressable>

      {show && (
        <NativeDateTimePicker
          value={value}
          mode={mode === 'datetime' ? 'date' : mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
        />
      )}

      {mode === 'datetime' && show && Platform.OS === 'ios' && (
        <Pressable
          onPress={() => setShow(false)}
          style={{ marginTop: 8 }}
        >
          <Text style={{ color: colors.primary, fontSize: 16, textAlign: 'center' }}>
            Done
          </Text>
        </Pressable>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 3: Export from components/index.ts**

Update `apps/mobile/src/components/index.ts`:

```typescript
export { Button } from './Button';
export { Card } from './Card';
export { TextField } from './TextField';
export { Badge } from './Badge';
export { Picker } from './Picker';
export { DateTimePicker } from './DateTimePicker';
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit src/components/DateTimePicker.tsx`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add src/components/DateTimePicker.tsx src/components/index.ts
git commit -m "feat(mobile): add native date/time picker wrapper component"
```

---

### Task 5: Create Price Breakdown Component

**Files:**
- Create: `apps/mobile/src/components/PriceBreakdown.tsx`

**Interfaces:**
- Consumes: `FeeBreakdown` type from `@onserve/types`
- Produces: `PriceBreakdown` component displaying: service price, platform fee, transaction fee, total

- [ ] **Step 1: Create PriceBreakdown component**

Create file `apps/mobile/src/components/PriceBreakdown.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { FeeBreakdown } from '@onserve/types';
import { colors } from '@onserve/ui-tokens';

export interface PriceBreakdownProps {
  breakdown: FeeBreakdown;
  currency?: string;
}

export function PriceBreakdown({
  breakdown,
  currency = 'R',
}: PriceBreakdownProps) {
  const styles = StyleSheet.create({
    container: {
      marginVertical: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    rowLast: {
      borderBottomWidth: 0,
      paddingVertical: 12,
      marginTop: 8,
    },
    label: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    value: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    totalRow: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
  });

  const formatPrice = (price: number) => `${currency}${price.toFixed(2)}`;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Service fee</Text>
        <Text style={styles.value}>{formatPrice(breakdown.servicePrice)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Platform fee (10%)</Text>
        <Text style={styles.value}>{formatPrice(breakdown.platformFee)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Transaction fee</Text>
        <Text style={styles.value}>{formatPrice(breakdown.transactionFee)}</Text>
      </View>

      <View style={[styles.row, styles.rowLast]}>
        <Text style={[styles.label, styles.totalRow]}>TOTAL</Text>
        <Text style={[styles.value, styles.totalRow]}>
          {formatPrice(breakdown.totalCharged)}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Export from components/index.ts**

Update `apps/mobile/src/components/index.ts`:

```typescript
export { Button } from './Button';
export { Card } from './Card';
export { TextField } from './TextField';
export { Badge } from './Badge';
export { Picker } from './Picker';
export { DateTimePicker } from './DateTimePicker';
export { PriceBreakdown } from './PriceBreakdown';
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit src/components/PriceBreakdown.tsx`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add src/components/PriceBreakdown.tsx src/components/index.ts
git commit -m "feat(mobile): add price breakdown display component"
```

---

### Task 6: Create Booking Service (API Layer)

**Files:**
- Create: `packages/api/src/booking/bookingService.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `supabase: SupabaseClient`, booking type from `@onserve/types`
- Produces:
  - `createBooking(supabase, { serviceTypeId, locationId, scheduledDate, notes })` → Promise<Booking>
  - `fetchBooking(supabase, bookingId)` → Promise<Booking>
  - `cancelBooking(supabase, bookingId, reason)` → Promise<void>

**Context:** Mirrors locationService pattern. All queries respect RLS (no service role). Booking creation sets status='pending' and calculates total_amount from service type base price.

- [ ] **Step 1: Create bookingService.ts**

Create file `packages/api/src/booking/bookingService.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Booking } from '@onserve/types';

function mapRow(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    providerId: row.provider_id as string | null,
    serviceTypeId: row.service_type_id as string,
    locationId: row.location_id as string,
    bookingType: row.booking_type as Booking['bookingType'],
    status: row.status as Booking['status'],
    totalAmount: parseFloat(row.total_amount as string),
    depositAmount: row.deposit_amount ? parseFloat(row.deposit_amount as string) : null,
    customerNotes: row.customer_notes as string | null,
    scheduledAt: row.scheduled_at as string,
    providerCheckedInAt: row.provider_checked_in_at as string | null,
    providerCheckedOutAt: row.provider_checked_out_at as string | null,
    completedAt: row.completed_at as string | null,
    cancelledAt: row.cancelled_at as string | null,
    cancellationReason: row.cancellation_reason as string | null,
    createdAt: row.created_at as string,
  };
}

export interface CreateBookingInput {
  serviceTypeId: string;
  locationId: string;
  scheduledDate: Date;
  notes?: string;
}

export async function createBooking(
  supabase: SupabaseClient,
  input: CreateBookingInput,
): Promise<Booking> {
  // Fetch service type to get base price
  const { data: serviceType, error: stError } = await supabase
    .from('service_types')
    .select('base_price')
    .eq('id', input.serviceTypeId)
    .single();

  if (stError || !serviceType) {
    throw new Error('Service type not found');
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      service_type_id: input.serviceTypeId,
      location_id: input.locationId,
      scheduled_at: input.scheduledDate.toISOString(),
      customer_notes: input.notes || null,
      booking_type: 'instant',
      status: 'pending',
      total_amount: serviceType.base_price || 0,
    })
    .select()
    .single();

  if (error || !booking) {
    throw new Error(error?.message || 'Failed to create booking');
  }

  return mapRow(booking as Record<string, unknown>);
}

export async function fetchBooking(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<Booking> {
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    throw new Error(error?.message || 'Booking not found');
  }

  return mapRow(booking as Record<string, unknown>);
}

export async function cancelBooking(
  supabase: SupabaseClient,
  bookingId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq('id', bookingId);

  if (error) {
    throw new Error(error.message);
  }
}
```

- [ ] **Step 2: Export from packages/api/src/index.ts**

Update `packages/api/src/index.ts`:

```typescript
// Location Services
export {
  getSavedLocations,
  saveLocation,
  updateLocation,
  setDefaultLocation,
  deleteLocation,
} from './location/locationService';

// Booking Services
export {
  createBooking,
  fetchBooking,
  cancelBooking,
  type CreateBookingInput,
} from './booking/bookingService';
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe && npx tsc --noEmit packages/api/src/booking/bookingService.ts`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add packages/api/src/booking/bookingService.ts packages/api/src/index.ts
git commit -m "feat(api): add booking service with createBooking, fetchBooking, cancelBooking"
```

---

### Task 7: Create Payment Service (Ozow Wrapper)

**Files:**
- Create: `packages/api/src/payment/paymentService.ts`
- Modify: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `supabase: SupabaseClient`, `bookingId: string`
- Produces:
  - `createOzowPaymentSession(supabase, bookingId, functionsUrl)` → Promise<{ paymentUrl, paymentId, fees }>

**Context:** Calls the edge function `/create-payment` with booking ID. Edge function handles fee calculation and Ozow API interaction. Mobile just passes bookingId and gets back the Ozow redirect URL.

- [ ] **Step 1: Create paymentService.ts**

Create file `packages/api/src/payment/paymentService.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeeBreakdown } from '@onserve/types';

export interface OzowPaymentSession {
  paymentUrl: string;
  paymentId: string;
  fees: FeeBreakdown;
}

export async function createOzowPaymentSession(
  supabase: SupabaseClient,
  bookingId: string,
  functionsUrl: string,
): Promise<OzowPaymentSession> {
  const { data: session, error } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated. Please log in.');
  }

  const response = await fetch(`${functionsUrl}/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment session');
  }

  const data = (await response.json()) as OzowPaymentSession;
  return data;
}
```

- [ ] **Step 2: Export from packages/api/src/index.ts**

Update `packages/api/src/index.ts` to add:

```typescript
// Payment Services
export {
  createOzowPaymentSession,
  type OzowPaymentSession,
} from './payment/paymentService';
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe && npx tsc --noEmit packages/api/src/payment/paymentService.ts`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git add packages/api/src/payment/paymentService.ts packages/api/src/index.ts
git commit -m "feat(api): add payment service wrapper for Ozow session creation"
```

---

### Task 8: Create Booking Form Screen

**Files:**
- Create: `apps/mobile/app/(customer)/booking-form.tsx`

**Interfaces:**
- Consumes: `Picker`, `DateTimePicker`, `PriceBreakdown`, `Button`, `Card`, `TextField` components; `supabase` client; `createBooking` from @onserve/api
- Produces: Screen that collects booking data, validates, calculates fees, creates booking, navigates to quote request

**Context:** Form state holds: serviceTypeId, locationId, scheduledDate, notes. On submit, validates form, fetches base_price, calculates fees, calls createBooking, navigates to `/quote-request/[bookingId]`.

- [ ] **Step 1: Create booking-form.tsx**

Create file `apps/mobile/app/(customer)/booking-form.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@onserve/ui-tokens';
import {
  Button,
  Card,
  Picker,
  DateTimePicker,
  TextField,
  PriceBreakdown,
} from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';
import { supabase } from '../../../src/lib/supabase';
import { createBooking } from '@onserve/api';
import { calculateFees } from '@onserve/shared';
import type { PickerItem } from '../../../src/components/Picker';

interface FormState {
  serviceTypeId: string | null;
  locationId: string | null;
  scheduledDate: Date;
  notes: string;
}

interface FormErrors {
  serviceTypeId?: string;
  locationId?: string;
  scheduledDate?: string;
}

export default function BookingFormScreen() {
  const [formState, setFormState] = useState<FormState>({
    serviceTypeId: null,
    locationId: null,
    scheduledDate: new Date(),
    notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<PickerItem[]>([]);
  const [locations, setLocations] = useState<PickerItem[]>([]);
  const [fees, setFees] = useState<any>(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    section: {
      marginBottom: 24,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      marginBottom: 32,
    },
    button: {
      flex: 1,
    },
  });

  // Load service types and locations on mount
  useEffect(() => {
    loadData();
  }, []);

  // Calculate fees when service type changes
  useEffect(() => {
    calculateEstimate();
  }, [formState.serviceTypeId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load service types
      const { data: services, error: servicesError } = await supabase
        .from('service_types')
        .select('id, name')
        .eq('is_active', true);

      if (servicesError) throw servicesError;

      setServiceTypes(
        (services || []).map((s: any) => ({
          id: s.id,
          label: s.name,
        }))
      );

      // Load user's saved locations
      const { data: userLocations, error: locationsError } = await supabase
        .from('saved_locations')
        .select('id, formatted_address')
        .order('is_default', { ascending: false });

      if (locationsError) throw locationsError;

      setLocations(
        (userLocations || []).map((l: any) => ({
          id: l.id,
          label: l.formatted_address,
        }))
      );

      // Set first location as default if available
      if (userLocations && userLocations.length > 0) {
        setFormState((prev) => ({
          ...prev,
          locationId: userLocations[0].id,
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load services and locations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimate = async () => {
    if (!formState.serviceTypeId) {
      setFees(null);
      return;
    }

    try {
      const { data: serviceType } = await supabase
        .from('service_types')
        .select('base_price')
        .eq('id', formState.serviceTypeId)
        .single();

      if (serviceType && serviceType.base_price) {
        const breakdown = calculateFees(serviceType.base_price);
        setFees(breakdown);
      }
    } catch (error) {
      console.error('Failed to calculate estimate:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.serviceTypeId) {
      newErrors.serviceTypeId = 'Please select a service';
    }
    if (!formState.locationId) {
      newErrors.locationId = 'Please select a location';
    }
    if (formState.scheduledDate < new Date()) {
      newErrors.scheduledDate = 'Please select a future date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const booking = await createBooking(supabase, {
        serviceTypeId: formState.serviceTypeId!,
        locationId: formState.locationId!,
        scheduledDate: formState.scheduledDate,
        notes: formState.notes || undefined,
      });

      // Navigate to quote request screen
      router.push({
        pathname: '/(customer)/quote-request/[bookingId]',
        params: { bookingId: booking.id },
      });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create booking');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={commonStyles.pageTitle}>Request Booking</Text>
        <Text style={commonStyles.pageSubtitle}>Tell us what you need</Text>

        <Card style={styles.section}>
          <Picker
            label="Service Type"
            items={serviceTypes}
            selectedId={formState.serviceTypeId}
            onSelect={(id) => setFormState((prev) => ({ ...prev, serviceTypeId: id }))}
            placeholder="Select a service"
            error={errors.serviceTypeId}
          />

          <Picker
            label="Location"
            items={locations}
            selectedId={formState.locationId}
            onSelect={(id) => setFormState((prev) => ({ ...prev, locationId: id }))}
            placeholder="Select location"
            error={errors.locationId}
          />

          <DateTimePicker
            label="Scheduled Date & Time"
            value={formState.scheduledDate}
            onChange={(date) => setFormState((prev) => ({ ...prev, scheduledDate: date }))}
            mode="datetime"
            minimumDate={new Date()}
            error={errors.scheduledDate}
          />

          <TextField
            placeholder="Special instructions (optional)"
            value={formState.notes}
            onChangeText={(text) => setFormState((prev) => ({ ...prev, notes: text }))}
            multiline
            numberOfLines={4}
          />
        </Card>

        {fees && (
          <Card style={styles.section}>
            <Text style={commonStyles.sectionTitle}>Price Estimate</Text>
            <PriceBreakdown breakdown={fees} />
          </Card>
        )}

        <View style={styles.buttonRow}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.button}
            disabled={submitting}
          />
          <Button
            label="Request Quote"
            onPress={handleSubmit}
            style={styles.button}
            disabled={submitting || !formState.serviceTypeId || !formState.locationId}
          />
        </View>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit app/\(customer\)/booking-form.tsx`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add app/\(customer\)/booking-form.tsx
git commit -m "feat(mobile): add booking form screen with service/location selection and fee estimation"
```

---

### Task 9: Create Quote Request Screen with Realtime Subscription

**Files:**
- Create: `apps/mobile/app/(customer)/quote-request/[bookingId].tsx`

**Interfaces:**
- Consumes: `bookingId` from route params; `supabase` client; `fetchBooking` from @onserve/api
- Produces: Screen that displays booking details, subscribes to realtime updates, shows loading spinner while awaiting provider quote

**Context:** Screen fetches booking on mount. Sets up realtime subscription on bookings table to listen for status='quoted'. When quote arrives, shows quote details (price, provider notes) and buttons to accept/decline. Accept navigates to payment screen.

- [ ] **Step 1: Create directory structure**

Run: `mkdir -p /Users/medupiramaboea/Projects/OnServe/apps/mobile/app/\(customer\)/quote-request`

- [ ] **Step 2: Create [bookingId].tsx**

Create file `apps/mobile/app/(customer)/quote-request/[bookingId].tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@onserve/ui-tokens';
import { Button, Card, PriceBreakdown } from '../../../../src/components';
import { commonStyles } from '../../../../src/utils/styles';
import { supabase } from '../../../../src/lib/supabase';
import { fetchBooking } from '@onserve/api';
import type { Booking } from '@onserve/types';

export default function QuoteRequestScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoted, setQuoted] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    spinnerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusText: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: 14,
      color: colors.text.secondary,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    detailLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      marginBottom: 32,
    },
    button: {
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    notesBox: {
      backgroundColor: colors.surface[1],
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    notesText: {
      fontSize: 14,
      color: colors.text.primary,
      lineHeight: 20,
    },
  });

  useEffect(() => {
    if (!bookingId) {
      Alert.alert('Error', 'No booking ID provided');
      router.back();
      return;
    }

    loadBooking();
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscription
      supabase
        .from('bookings')
        .off('UPDATE', (payload) => {
          // subscription cleanup happens automatically
        });
    };
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const booking = await fetchBooking(supabase, bookingId!);
      setBooking(booking);

      // Check if already quoted
      if (booking.status === 'confirmed') {
        setQuoted(true);
        // Fetch quote details
        const { data: quotes } = await supabase
          .from('quotes')
          .select('*')
          .eq('booking_id', bookingId)
          .single();

        if (quotes) {
          setQuote(quotes);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .from('bookings')
      .on(
        'UPDATE',
        (payload) => {
          if (payload.new.id === bookingId) {
            setBooking(payload.new as Booking);

            if (payload.new.status === 'confirmed') {
              setQuoted(true);
              // Fetch quote details
              supabase
                .from('quotes')
                .select('*')
                .eq('booking_id', bookingId)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setQuote(data);
                  }
                });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED') {
          console.log('Realtime subscription closed');
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleAcceptQuote = async () => {
    try {
      // Navigate to payment screen
      router.push({
        pathname: '/(customer)/payment',
        params: { bookingId: bookingId! },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to proceed to payment');
      console.error(error);
    }
  };

  const handleDeclineAndCancel = async () => {
    try {
      // Cancel booking
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Customer declined quote',
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Navigate back to home
      router.push('/(customer)/(tabs)/index');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel booking');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.statusText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.spinnerContainer}>
        <Text style={styles.statusText}>Booking not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={commonStyles.pageTitle}>
          {quoted ? 'Quote Received' : 'Awaiting Quote'}
        </Text>
        <Text style={commonStyles.pageSubtitle}>
          {quoted ? 'Review and accept the quote' : 'Provider is reviewing your request'}
        </Text>

        <Card style={styles.section}>
          <Text style={commonStyles.sectionTitle}>Booking Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{booking.status}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {new Date(booking.scheduledAt).toLocaleString('en-ZA')}
            </Text>
          </View>

          {booking.customerNotes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Your Notes</Text>
              <Text style={styles.detailValue}>{booking.customerNotes}</Text>
            </View>
          )}
        </Card>

        {!quoted && (
          <Card style={styles.section}>
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.statusText}>Provider is reviewing your request...</Text>
              <Text style={styles.statusText}>This typically takes a few minutes</Text>
            </View>
          </Card>
        )}

        {quoted && quote && (
          <Card style={styles.section}>
            <Text style={commonStyles.sectionTitle}>Quote Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quoted Price</Text>
              <Text style={[styles.detailValue, { color: colors.primary, fontSize: 16 }]}>
                R{quote.quoted_price?.toFixed(2) || '0.00'}
              </Text>
            </View>

            {quote.estimated_duration_mins && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estimated Duration</Text>
                <Text style={styles.detailValue}>{quote.estimated_duration_mins} mins</Text>
              </View>
            )}

            {quote.notes && (
              <View>
                <Text style={[commonStyles.sectionTitle, { marginTop: 12 }]}>
                  Provider Notes
                </Text>
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{quote.notes}</Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {quoted && (
          <View style={styles.buttonRow}>
            <Button
              label="Decline"
              variant="secondary"
              onPress={handleDeclineAndCancel}
              style={styles.button}
            />
            <Button
              label="Accept & Pay"
              onPress={handleAcceptQuote}
              style={styles.button}
            />
          </View>
        )}

        {!quoted && (
          <Button
            label="Cancel Booking"
            variant="secondary"
            onPress={handleDeclineAndCancel}
            style={styles.section}
          />
        )}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit app/\(customer\)/quote-request/\[bookingId\].tsx`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add app/\(customer\)/quote-request/\[bookingId\].tsx
git commit -m "feat(mobile): add quote request screen with realtime subscription to provider quotes"
```

---

### Task 10: Create Payment Screen

**Files:**
- Create: `apps/mobile/app/(customer)/payment.tsx`

**Interfaces:**
- Consumes: `bookingId` from route params; `supabase` client; `createOzowPaymentSession` from @onserve/api
- Produces: Screen showing payment breakdown, opens Ozow payment in in-app browser, navigates to success/failure based on deep-link

**Context:** Fetches booking/quote to display amount. Calls createOzowPaymentSession to get Ozow URL. Opens URL in in-app WebView/browser. Deep-link handler (in _layout.tsx) will navigate to success/failure screen.

- [ ] **Step 1: Check if expo-web-browser is installed**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npm list expo-web-browser 2>&1 | head -3`

If not found, install: `npm install expo-web-browser`

- [ ] **Step 2: Create payment.tsx**

Create file `apps/mobile/app/(customer)/payment.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '@onserve/ui-tokens';
import { Button, Card, PriceBreakdown } from '../../../src/components';
import { commonStyles } from '../../../src/utils/styles';
import { supabase } from '../../../src/lib/supabase';
import { fetchBooking, createOzowPaymentSession } from '@onserve/api';
import type { Booking, FeeBreakdown } from '@onserve/types';

export default function PaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [fees, setFees] = useState<FeeBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    spinnerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    section: {
      marginBottom: 24,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    detailLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      marginBottom: 32,
    },
    button: {
      flex: 1,
    },
    warning: {
      backgroundColor: colors.semantic.warning + '20',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    warningText: {
      fontSize: 12,
      color: colors.semantic.warning,
      lineHeight: 18,
    },
  });

  useEffect(() => {
    if (!bookingId) {
      Alert.alert('Error', 'No booking ID provided');
      router.back();
      return;
    }

    loadBookingAndFees();
  }, [bookingId]);

  const loadBookingAndFees = async () => {
    try {
      setLoading(true);
      const booking = await fetchBooking(supabase, bookingId!);
      setBooking(booking);

      // For now, calculate fees from total_amount
      // In production, fetch the exact fees from the payment record or edge function
      const { calculateFees } = await import('@onserve/shared');
      const breakdown = calculateFees(booking.totalAmount);
      setFees(breakdown);
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking details');
      console.error(error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!bookingId) return;

    try {
      setProcessing(true);

      const functionsUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL!;
      if (!functionsUrl) {
        throw new Error('Supabase functions URL not configured');
      }

      // Call edge function to create Ozow session
      const session = await createOzowPaymentSession(supabase, bookingId, functionsUrl);

      // Open Ozow payment URL in in-app browser
      const result = await WebBrowser.openAuthSessionAsync(
        session.paymentUrl,
        'onserve://'
      );

      // Result handling:
      // - type === 'success': Deep-link was triggered (handled by _layout.tsx)
      // - type === 'cancel': User dismissed the browser
      if (result.type === 'cancel') {
        Alert.alert('Payment Cancelled', 'You cancelled the payment. You can try again anytime.');
      }
      // 'success' means the deep-link was handled, navigation already occurred
    } catch (error) {
      Alert.alert(
        'Payment Failed',
        error instanceof Error ? error.message : 'Failed to initiate payment'
      );
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={commonStyles.pageSubtitle}>Loading payment details...</Text>
      </View>
    );
  }

  if (!booking || !fees) {
    return (
      <View style={styles.spinnerContainer}>
        <Text style={commonStyles.pageSubtitle}>Unable to load payment details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={commonStyles.pageTitle}>Payment Confirmation</Text>
        <Text style={commonStyles.pageSubtitle}>Review and proceed to pay</Text>

        <Card style={styles.section}>
          <Text style={commonStyles.sectionTitle}>Booking Summary</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {new Date(booking.scheduledAt).toLocaleString('en-ZA')}
            </Text>
          </View>

          {booking.customerNotes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Your Notes</Text>
              <Text style={styles.detailValue}>{booking.customerNotes}</Text>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={commonStyles.sectionTitle}>Amount Breakdown</Text>
          <PriceBreakdown breakdown={fees} />
        </Card>

        <Card style={styles.section}>
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              You will be redirected to Ozow (secure payment gateway) to complete the payment.
              Return to this app automatically when done.
            </Text>
          </View>

          <Text style={commonStyles.sectionTitle}>Payment Method</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gateway</Text>
            <Text style={styles.detailValue}>Ozow EFT</Text>
          </View>
        </Card>

        <View style={styles.buttonRow}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.button}
            disabled={processing}
          />
          <Button
            label="Proceed to Payment"
            onPress={handleProceedToPayment}
            style={styles.button}
            disabled={processing}
          />
        </View>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit app/\(customer\)/payment.tsx`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add app/\(customer\)/payment.tsx
git commit -m "feat(mobile): add payment screen with Ozow payment session integration"
```

---

### Task 11: Create Deep-Link Return Handlers (Success/Failure Screens)

**Files:**
- Create: `apps/mobile/app/(customer)/booking-confirmation/[bookingId].tsx`
- Create: `apps/mobile/app/(customer)/payment-failed/[bookingId].tsx`

**Interfaces:**
- Consumes: `bookingId` from route params; `supabase` client; `fetchBooking` from @onserve/api
- Produces: Two screens: success (shows booking confirmed, "View Booking" / "Back to Home" buttons), failure (shows error, "Try Again" / "Cancel Booking" / "Contact Support" buttons)

**Context:** Deep-link handler in _layout.tsx navigates to these screens based on Ozow payment status. Success screen verifies booking.status === 'confirmed'. Failure screen allows retry or cancellation.

- [ ] **Step 1: Create booking-confirmation directory**

Run: `mkdir -p /Users/medupiramaboea/Projects/OnServe/apps/mobile/app/\(customer\)/booking-confirmation`

- [ ] **Step 2: Create booking-confirmation/[bookingId].tsx**

Create file `apps/mobile/app/(customer)/booking-confirmation/[bookingId].tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@onserve/ui-tokens';
import { Button, Card } from '../../../../src/components';
import { commonStyles } from '../../../../src/utils/styles';
import { supabase } from '../../../../src/lib/supabase';
import { fetchBooking } from '@onserve/api';
import type { Booking } from '@onserve/types';

export default function BookingConfirmationScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    spinnerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    successIcon: {
      fontSize: 64,
      marginBottom: 16,
      textAlign: 'center',
    },
    section: {
      marginBottom: 24,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    detailLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      marginBottom: 32,
    },
    button: {
      flex: 1,
    },
  });

  useEffect(() => {
    if (!bookingId) {
      Alert.alert('Error', 'No booking ID provided');
      router.push('/(customer)/(tabs)/index');
      return;
    }

    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const booking = await fetchBooking(supabase, bookingId!);
      setBooking(booking);
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking details');
      console.error(error);
      router.push('/(customer)/(tabs)/index');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.spinnerContainer}>
        <Text style={commonStyles.pageSubtitle}>Booking not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.successIcon}>✅</Text>

        <Text style={commonStyles.pageTitle}>Payment Successful!</Text>
        <Text style={commonStyles.pageSubtitle}>Your booking is confirmed</Text>

        <Card style={styles.section}>
          <Text style={commonStyles.sectionTitle}>Booking Confirmed</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, { color: colors.semantic.success }]}>
              {booking.status}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {new Date(booking.scheduledAt).toLocaleString('en-ZA')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Paid</Text>
            <Text style={styles.detailValue}>R{booking.totalAmount.toFixed(2)}</Text>
          </View>

          {booking.customerNotes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Your Notes</Text>
              <Text style={styles.detailValue}>{booking.customerNotes}</Text>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={commonStyles.sectionTitle}>Next Steps</Text>
          <Text style={[commonStyles.textSecondary, { marginTop: 8 }]}>
            A confirmation has been sent to your email. You'll receive updates as the provider
            progresses on your booking.
          </Text>
        </Card>

        <View style={styles.buttonRow}>
          <Button
            label="Back to Home"
            variant="secondary"
            onPress={() => router.push('/(customer)/(tabs)/index')}
            style={styles.button}
          />
          <Button
            label="View Booking"
            onPress={() =>
              router.push({
                pathname: '/(customer)/(tabs)/bookings',
                params: { bookingId: booking.id },
              })
            }
            style={styles.button}
          />
        </View>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Create payment-failed/[bookingId].tsx**

Create file `apps/mobile/app/(customer)/payment-failed/[bookingId].tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '@onserve/ui-tokens';
import { Button, Card } from '../../../../src/components';
import { commonStyles } from '../../../../src/utils/styles';
import { supabase } from '../../../../src/lib/supabase';
import { fetchBooking } from '@onserve/api';
import * as Linking from 'expo-linking';
import type { Booking } from '@onserve/types';

export default function PaymentFailedScreen() {
  const { bookingId, reason } = useLocalSearchParams<{
    bookingId: string;
    reason?: string;
  }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface[0],
    },
    content: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    spinnerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorIcon: {
      fontSize: 64,
      marginBottom: 16,
      textAlign: 'center',
    },
    section: {
      marginBottom: 24,
    },
    errorBox: {
      backgroundColor: colors.semantic.error + '20',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      color: colors.semantic.error,
      lineHeight: 20,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface[2],
    },
    detailLabel: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text.primary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      marginBottom: 16,
    },
    button: {
      flex: 1,
    },
    fullWidthButton: {
      marginBottom: 16,
    },
  });

  useEffect(() => {
    if (!bookingId) {
      Alert.alert('Error', 'No booking ID provided');
      router.push('/(customer)/(tabs)/index');
      return;
    }

    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const booking = await fetchBooking(supabase, bookingId!);
      setBooking(booking);
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    router.push({
      pathname: '/(customer)/payment',
      params: { bookingId: bookingId! },
    });
  };

  const handleCancel = async () => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Payment failed - customer cancelled',
        })
        .eq('id', bookingId);

      if (error) throw error;

      router.push('/(customer)/(tabs)/index');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel booking');
      console.error(error);
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@onserve.com?subject=Payment%20Failed%20-%20Booking%20' + bookingId);
  };

  if (loading) {
    return (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.errorIcon}>❌</Text>

        <Text style={commonStyles.pageTitle}>Payment Failed</Text>
        <Text style={commonStyles.pageSubtitle}>Unable to process payment</Text>

        <Card style={styles.section}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {reason || 'Your payment could not be processed. Your booking is still pending.'}{' '}
              Please try again or contact support if the problem persists.
            </Text>
          </View>

          {booking && (
            <>
              <Text style={commonStyles.sectionTitle}>Booking Details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{booking.status}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.scheduledAt).toLocaleString('en-ZA')}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>R{booking.totalAmount.toFixed(2)}</Text>
              </View>
            </>
          )}
        </Card>

        <View style={styles.buttonRow}>
          <Button
            label="Try Again"
            onPress={handleRetry}
            style={styles.button}
          />
          <Button
            label="Cancel Booking"
            variant="secondary"
            onPress={handleCancel}
            style={styles.button}
          />
        </View>

        <Button
          label="Contact Support"
          variant="ghost"
          onPress={handleContactSupport}
          style={styles.fullWidthButton}
        />
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit app/\(customer\)/booking-confirmation/\[bookingId\].tsx app/\(customer\)/payment-failed/\[bookingId\].tsx`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add app/\(customer\)/booking-confirmation/\[bookingId\].tsx app/\(customer\)/payment-failed/\[bookingId\].tsx
git commit -m "feat(mobile): add payment success and failure confirmation screens"
```

---

### Task 12: Add Deep-Link Handler to Root Layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `expo-linking` (already available)
- Produces: Listener that parses `onserve://payment/return?status=success&bookingId=UUID` and navigates accordingly

**Context:** Setup in useEffect to capture deep-links from Ozow payment redirect. Route to booking-confirmation on success, payment-failed on failure.

- [ ] **Step 1: Update app/_layout.tsx**

Read current file (already read above), then update to add deep-link handler:

```typescript
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import '../global.css';

const linking = {
  prefixes: ['onserve://', 'https://onserve.com'],
  config: {
    screens: {
      '(customer)/booking-confirmation/[bookingId]': 'booking-confirmation/:bookingId',
      '(customer)/payment-failed/[bookingId]': 'payment-failed/:bookingId',
    },
  },
};

export default function RootLayout() {
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      const route = url.replace(/.*?:\/\//g, '');
      const routeName = route.split('/')[0];

      if (route.startsWith('payment/return')) {
        const params = new URLSearchParams(route.split('?')[1]);
        const status = params.get('status');
        const bookingId = params.get('bookingId');

        if (!bookingId) {
          console.error('No bookingId in deep-link');
          return;
        }

        if (status === 'success') {
          router.push({
            pathname: '/(customer)/booking-confirmation/[bookingId]',
            params: { bookingId },
          });
        } else if (status === 'failed' || status === 'error') {
          const reason = params.get('reason') || undefined;
          router.push({
            pathname: '/(customer)/payment-failed/[bookingId]',
            params: { bookingId, reason: reason || undefined },
          });
        }
      }
    };

    // Listen for deep-links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial URL if app was launched from a deep-link
    Linking.getInitialURL().then((url) => {
      if (url != null) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <Stack
      linking={linking}
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
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit app/_layout.tsx`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add app/_layout.tsx
git commit -m "feat(mobile): add deep-link handler for Ozow payment return flow"
```

---

### Task 13: Update Routes Configuration (Customer Layout)

**Files:**
- Modify: `apps/mobile/app/(customer)/_layout.tsx`

**Interfaces:**
- Consumes: Current layout structure
- Produces: Add modal routes for booking-form, quote-request, payment, and post-payment screens

**Context:** These screens are outside the tab navigation. They should be presented as modals or stack screens over the tabs.

- [ ] **Step 1: Update (customer)/_layout.tsx**

Read current file, then replace with:

```typescript
import { Tabs } from 'expo-router';
import { Stack } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../src/../../../packages/ui-tokens/src';

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
  },
});

export default function CustomerLayout() {
  return (
    <Stack>
      {/* Tab-based navigation (home, bookings, chat, profile) */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />

      {/* Modal screens for booking flow */}
      <Stack.Screen
        name="booking-form"
        options={{
          title: 'New Booking',
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />

      <Stack.Screen
        name="quote-request/[bookingId]"
        options={{
          title: 'Quote Request',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="payment"
        options={{
          title: 'Payment',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="booking-confirmation/[bookingId]"
        options={{
          title: 'Booking Confirmed',
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="payment-failed/[bookingId]"
        options={{
          title: 'Payment Failed',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
```

- [ ] **Step 2: Remove Tabs from this file if it exists**

The layout should now use Stack with (tabs) as a nested group for tab navigation

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npx tsc --noEmit app/\(customer\)/_layout.tsx`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add app/\(customer\)/_layout.tsx
git commit -m "refactor(mobile): restructure customer layout to use Stack for modal screens"
```

---

### Task 14: Add Test Cases (Optional but Recommended)

**Files:**
- Create: `apps/mobile/__tests__/booking-form.test.tsx`
- Create: `packages/api/__tests__/bookingService.test.ts`

**Interfaces:**
- Test booking form validation
- Test createBooking with valid/invalid data
- Test payment session creation

This task is optional for MVP but strongly recommended for confidence.

- [ ] **Step 1: Create booking form validation test**

Create file `apps/mobile/__tests__/booking-form.test.tsx`:

```typescript
import { validateBookingForm } from '../src/utils/validation';

describe('Booking Form Validation', () => {
  it('should reject form without serviceTypeId', () => {
    const result = validateBookingForm({
      locationId: 'loc-123',
      scheduledDate: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid booking form', () => {
    const result = validateBookingForm({
      serviceTypeId: '550e8400-e29b-41d4-a716-446655440000',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: new Date().toISOString(),
      notes: 'Clean the house',
    });
    expect(result.success).toBe(true);
  });

  it('should accept form without notes', () => {
    const result = validateBookingForm({
      serviceTypeId: '550e8400-e29b-41d4-a716-446655440000',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      scheduledDate: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npm test 2>&1 | head -20`

(May need to configure Jest; if not set up, skip this step)

- [ ] **Step 3: Commit (optional)**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/mobile
git add __tests__/booking-form.test.tsx
git commit -m "test(mobile): add booking form validation unit tests"
```

---

### Task 15: Manual Testing Checklist

**No code changes — just verification steps**

- [ ] **Step 1: Start the Expo app**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npm start`

Expected: Metro bundler starts, shows QR code

- [ ] **Step 2: Open app on simulator/device**

Scan QR code or select simulator (iOS/Android)

- [ ] **Step 3: Navigate to booking form**

Tap on home screen → tap "Request Service" or similar → should navigate to booking form

- [ ] **Step 4: Test booking form**

- Select a service type → price estimate should appear
- Select a location → no errors
- Select a future date → button should be enabled
- Add optional notes
- Tap "Request Quote" → should create booking and navigate to quote request screen

- [ ] **Step 5: Test quote request screen**

- Should show booking details
- Should show loading spinner ("Provider is reviewing...")
- (In sandbox mode, manually update booking status in Supabase to simulate provider quote)
- Once quoted, "Accept & Pay" button should appear

- [ ] **Step 6: Test payment screen**

- Tap "Accept & Pay" → navigate to payment screen
- Should show price breakdown matching calculated fees
- Tap "Proceed to Payment" → should open Ozow sandbox URL in in-app browser

- [ ] **Step 7: Test Ozow sandbox payment (optional)**

- Use Ozow sandbox credentials
- Complete test payment
- Should redirect back to app via deep-link
- Should navigate to booking confirmation screen

- [ ] **Step 8: Verify deep-link handler**

Test deep-link manually:
```bash
xcrun simctl openurl booted "onserve://payment/return?status=success&bookingId=550e8400-e29b-41d4-a716-446655440000"
```

Expected: App navigates to booking confirmation screen

- [ ] **Step 9: Check for TypeScript errors**

Run: `cd /Users/medupiramaboea/Projects/OnServe/apps/mobile && npm run build`

Expected: No errors

- [ ] **Step 10: Commit final changes**

```bash
cd /Users/medupiramaboea/Projects/OnServe
git status
# Verify all files are committed
```

---

## Implementation Checklist Summary

- [ ] Task 1: Supabase client + .env setup
- [ ] Task 2: Zod validation schemas
- [ ] Task 3: Picker dropdown component
- [ ] Task 4: DateTimePicker wrapper
- [ ] Task 5: PriceBreakdown component
- [ ] Task 6: Booking service (API)
- [ ] Task 7: Payment service (Ozow wrapper)
- [ ] Task 8: Booking form screen
- [ ] Task 9: Quote request screen with realtime
- [ ] Task 10: Payment screen
- [ ] Task 11: Success/failure confirmation screens
- [ ] Task 12: Deep-link handler in root layout
- [ ] Task 13: Update customer layout (Stack + modals)
- [ ] Task 14: Tests (optional)
- [ ] Task 15: Manual testing

---

## Success Criteria (from Spec)

✅ Booking form collects all required details (service, date, location, notes)
✅ Price calculation matches @onserve/shared fee logic
✅ Quote request shows real-time provider response via realtime subscription
✅ Payment screen integration with Ozow works (calls createPayment edge function)
✅ Deep-link return from Ozow handled correctly (onserve://payment/return)
✅ Success/failure screens display properly
✅ Supabase booking status updates correctly (pending → confirmed)
✅ All async operations have loading/error states
✅ TypeScript strict mode passes (npm run build)
✅ NativeWind styling follows design tokens from @onserve/ui-tokens
✅ All components reusable (Picker, DateTimePicker, PriceBreakdown)

---

## Known Limitations (Phase 2b)

- Quote creation is manual via Supabase update (provider app will automate in Phase 2a)
- Live tracking not implemented (Phase 2c)
- Rating flow not implemented (Phase 2c)
- Dispute handling not implemented (Phase 4)
- Push notifications not integrated yet (Phase 3)

