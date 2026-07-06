# E2E Testing Plan: Identity Documents KYC Flows

**Document ID:** Task 12 - E2E Testing Plan Documentation  
**Created:** 2026-07-06  
**Status:** Planning Phase  
**Framework:** Playwright or Cypress (TBD in implementation phase)

## Overview

This document outlines the End-to-End (E2E) test scenarios for the identity document upload and verification workflow in OnServe. These tests cover the complete lifecycle of identity document management across provider onboarding, admin verification, and customer trust features.

**Target Workflows:**
- Provider identity verification during onboarding
- Admin document approval/rejection
- Customer proof of residence uploads for trust boost
- Concurrent upload handling (database constraint validation)

---

## Test Infrastructure

### Framework & Tools
- **Primary Framework:** Playwright or Cypress (decision deferred to implementation phase)
- **Test Database:** Supabase test database instance (separate from production)
- **Authentication:** Test user accounts with predefined credentials
- **File Uploads:** Mock file uploads using test fixtures and/or real test images
- **API Testing:** Direct Supabase API calls for setup/teardown and data validation

### Test Database Setup
1. Use Supabase test project (configured in `.env.test`)
2. Run migrations to create `public.identity_documents` table
3. Ensure RLS policies are active during testing
4. Clear test data between test suites via cleanup functions

### Test Users

All test users should be created in the test database prior to running the test suite:

```sql
-- Example: Create test provider user
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES (
  'test-provider-uuid-1',
  'test-provider@onserve.test',
  now(),
  jsonb_build_object('role', 'provider', 'name', 'Test Provider')
)
ON CONFLICT DO NOTHING;

-- Example: Create test customer user
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES (
  'test-customer-uuid-1',
  'test-customer@onserve.test',
  now(),
  jsonb_build_object('role', 'customer', 'name', 'Test Customer')
)
ON CONFLICT DO NOTHING;

-- Example: Create test admin user
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES (
  'test-admin-uuid-1',
  'test-admin@onserve.test',
  now(),
  jsonb_build_object('role', 'admin', 'name', 'Test Admin')
)
ON CONFLICT DO NOTHING;
```

### Test Fixtures

Store test files in `tests/fixtures/`:
- `test-id-front.jpg` - Valid ID front image (300x200px minimum)
- `test-id-back.jpg` - Valid ID back image (300x200px minimum)
- `test-proof-residence.pdf` - Valid proof of residence document
- `invalid-file.txt` - Invalid file type for testing rejection

---

## Test Scenarios

### Test 1: Provider Uploads ID During Onboarding, Sees Pending Badge

**Description:**  
Provider completes onboarding flow and uploads their government-issued ID. The document should be stored in the database with `status: 'pending'`, and the provider's UI should immediately show a "Pending Verification" badge.

**Preconditions:**
- Test provider user exists and is authenticated
- Onboarding flow is accessible at `/onboarding` or `/provider/onboarding`
- Identity document upload field is rendered in the onboarding form

**Test Steps:**

1. **Navigate to Onboarding**
   - Login as test provider (test-provider@onserve.test / password)
   - Navigate to `/onboarding` or provider onboarding page
   - Verify onboarding form is rendered

2. **Complete Provider Information**
   - Fill in required provider details (name, business details, etc.)
   - Reach identity document upload section

3. **Upload ID Document**
   - Select "Upload ID" button
   - Choose test fixture file: `tests/fixtures/test-id-front.jpg`
   - Confirm upload
   - Verify file is uploaded to Supabase Storage at path: `identity-documents/{user_id}/id_front.jpg`

4. **Verify Database Record**
   - Query `public.identity_documents` table:
     ```sql
     SELECT * FROM public.identity_documents 
     WHERE user_id = 'test-provider-uuid-1' AND document_type = 'id';
     ```
   - Confirm record exists with:
     - `status = 'pending'`
     - `document_type = 'id'` or `'id_front'`
     - `storage_path = 'identity-documents/{user_id}/id_front.jpg'`
     - `verified_by = NULL`
     - `verification_notes = NULL`

5. **Verify UI Badge**
   - Wait for UI to reflect pending status (allow 1-2 seconds for sync)
   - Verify "Pending Verification" badge appears on provider profile/dashboard
   - Badge should have clear visual state (e.g., yellow/orange color)

**Expected Outcome:**
- Identity document stored in database with `status = 'pending'`
- File uploaded to Supabase Storage with correct path
- Provider UI displays "Pending Verification" badge
- Verify badge is accessible from provider dashboard/profile
- No errors in browser console
- Test completes in <10 seconds

**Cleanup:**
```javascript
// After test
await supabase
  .from('identity_documents')
  .delete()
  .eq('user_id', 'test-provider-uuid-1');

await supabase.storage
  .from('documents')
  .remove(['identity-documents/test-provider-uuid-1']);
```

---

### Test 2: Admin Approves Document, Provider Sees Verified Badge

**Description:**  
Admin approves a pending identity document. The document status changes to `'verified'`, and the provider immediately sees the verification reflected in their UI with a green "Verified" badge.

**Preconditions:**
- Test 1 has been completed (pending document exists)
- Test admin user exists and is authenticated
- Admin verification interface is implemented at `/admin/documents` or similar
- Provider user still has active session (or will re-login)

**Test Steps:**

1. **Set Up Initial State**
   - Run setup query to ensure pending document exists:
     ```sql
     INSERT INTO public.identity_documents 
     (user_id, document_type, status, storage_path)
     VALUES 
     ('test-provider-uuid-1', 'id', 'pending', 'identity-documents/test-provider-uuid-1/id_front.jpg');
     ```

2. **Admin Navigates to Verification Queue**
   - Login as test admin (test-admin@onserve.test / password)
   - Navigate to admin dashboard: `/admin` or `/admin/documents`
   - Verify admin can see pending documents list
   - Locate test provider's document in the queue

3. **Admin Approves Document**
   - Click "Approve" button on the pending document
   - Optional: Admin may add verification notes (skip for basic test)
   - Confirm approval action
   - Verify success toast/alert appears

4. **Verify Database Update**
   - Query updated document record:
     ```sql
     SELECT status, verified_by, verified_at 
     FROM public.identity_documents 
     WHERE user_id = 'test-provider-uuid-1' AND document_type = 'id';
     ```
   - Confirm:
     - `status = 'verified'`
     - `verified_by = 'test-admin-uuid-1'`
     - `verified_at` is set to current timestamp (within 5 seconds)

5. **Verify Provider UI Update**
   - If provider session is still open: refresh provider dashboard
   - If not: login as test provider again
   - Navigate to profile/dashboard where badge is displayed
   - Verify "Verified" badge is now displayed (green color)
   - Confirm "Pending Verification" badge is no longer visible

6. **Verify Real-time Update (Optional)**
   - If websocket/real-time subscriptions are implemented:
     - Open provider dashboard in separate browser tab/window
     - Approve document from admin tab
     - Confirm provider tab updates without page refresh (within 2 seconds)

**Expected Outcome:**
- Document status updated to `'verified'` in database
- `verified_by` field populated with admin's user ID
- `verified_at` timestamp set accurately
- Provider sees "Verified" badge in UI
- No errors in browser console
- Admin receives success confirmation
- Test completes in <15 seconds

**Cleanup:**
```javascript
await supabase
  .from('identity_documents')
  .delete()
  .eq('user_id', 'test-provider-uuid-1');
```

---

### Test 3: Admin Rejects Document with Reason, Provider Sees Rejection and Can Re-upload

**Description:**  
Admin rejects a pending identity document with a rejection reason. The provider sees the rejection message and is able to re-upload a new document. The old rejected document is preserved in the database with `status = 'rejected'`.

**Preconditions:**
- Pending document exists in database (similar to Test 1 setup)
- Admin rejection interface includes a text field for rejection reason
- Provider re-upload interface is available
- Provider can delete/clear rejected document and upload new one

**Test Steps:**

1. **Set Up Initial State**
   - Insert pending document:
     ```sql
     INSERT INTO public.identity_documents 
     (user_id, document_type, status, storage_path)
     VALUES 
     ('test-provider-uuid-1', 'id', 'pending', 'identity-documents/test-provider-uuid-1/id_front.jpg');
     ```

2. **Admin Navigates to Document and Initiates Rejection**
   - Login as test admin
   - Navigate to admin document verification interface
   - Locate test provider's pending document
   - Click "Reject" button
   - Verify rejection form/modal appears with reason text field

3. **Admin Provides Rejection Reason**
   - Enter rejection reason: `"ID is blurry and illegible. Please resubmit a clear photo."`
   - Click "Confirm Rejection" button
   - Verify success message appears

4. **Verify Database State**
   - Query the rejected document:
     ```sql
     SELECT status, rejection_reason, rejected_by, rejected_at 
     FROM public.identity_documents 
     WHERE user_id = 'test-provider-uuid-1' AND document_type = 'id';
     ```
   - Confirm:
     - `status = 'rejected'`
     - `rejection_reason = "ID is blurry and illegible..."`
     - `rejected_by = 'test-admin-uuid-1'`
     - `rejected_at` is set (within 5 seconds)

5. **Provider Sees Rejection Notification**
   - Login as test provider (new session or refresh)
   - Navigate to profile/dashboard
   - Verify "Document Rejected" badge/notification is displayed
   - Verify rejection reason is visible to provider
   - Verify "Re-upload Document" button is available

6. **Provider Re-uploads Document**
   - Click "Re-upload Document" button
   - Select new test file: `tests/fixtures/test-id-back.jpg`
   - Confirm upload
   - Verify new file is uploaded to Storage path: `identity-documents/{user_id}/id_new_{timestamp}.jpg`

7. **Verify New Document Record**
   - Query the new document:
     ```sql
     SELECT id, status, storage_path 
     FROM public.identity_documents 
     WHERE user_id = 'test-provider-uuid-1' 
     ORDER BY created_at DESC LIMIT 1;
     ```
   - Confirm:
     - New record exists with `status = 'pending'`
     - `storage_path` points to newly uploaded file
     - Different record from rejected document (different IDs)

8. **Verify Provider UI Updates**
   - Provider dashboard now shows new "Pending Verification" badge
   - Rejected badge is no longer visible
   - Provider can see history (optional): previous rejection is shown in document history

**Expected Outcome:**
- Rejected document marked with `status = 'rejected'` and rejection reason stored
- Provider receives notification of rejection with clear reason
- Provider can re-upload without removing old record
- New document starts with `status = 'pending'`
- UI reflects status changes appropriately
- Test completes in <20 seconds

**Cleanup:**
```javascript
await supabase
  .from('identity_documents')
  .delete()
  .eq('user_id', 'test-provider-uuid-1');

await supabase.storage
  .from('documents')
  .remove(['identity-documents/test-provider-uuid-1']);
```

---

### Test 4: Customer Uploads Proof of Residence for Trust Boost

**Description:**  
Customer uploads a proof of residence document (utility bill, lease agreement, etc.) to increase their trust score. The document is stored with `document_type = 'proof_of_residence'`, and the customer's profile shows an updated trust indicator.

**Preconditions:**
- Test customer user exists and is authenticated
- Customer trust/profile page is accessible
- Document upload UI component for proof of residence is implemented
- Trust score calculation includes proof of residence status
- Profile page displays trust badge/indicator

**Test Steps:**

1. **Navigate to Customer Trust/Profile Page**
   - Login as test customer (test-customer@onserve.test / password)
   - Navigate to profile page: `/profile` or `/customer/profile`
   - Verify profile/trust section is rendered
   - Note initial trust score (baseline before upload)

2. **Initiate Proof of Residence Upload**
   - Locate "Boost Trust" or "Add Proof of Residence" section
   - Click "Upload Proof of Residence" button
   - Verify upload modal/form appears with document type selector

3. **Select Document Type and Upload**
   - Select document type from dropdown: "Utility Bill" or "Lease Agreement"
   - Choose test file: `tests/fixtures/test-proof-residence.pdf`
   - Upload file
   - Verify file is uploaded to path: `identity-documents/{user_id}/proof_of_residence.pdf`

4. **Verify Database Record**
   - Query the new document:
     ```sql
     SELECT * FROM public.identity_documents 
     WHERE user_id = 'test-customer-uuid-1' AND document_type = 'proof_of_residence';
     ```
   - Confirm:
     - `document_type = 'proof_of_residence'`
     - `user_role = 'customer'` (if tracked)
     - `storage_path` points to uploaded file
     - `status = 'pending'` (may auto-approve, depending on implementation)

5. **Verify Trust Score Update (if auto-approved)**
   - If proof of residence auto-approves:
     ```sql
     SELECT trust_boost_documents FROM public.users 
     WHERE id = 'test-customer-uuid-1';
     ```
   - Confirm trust boost is recorded in user metadata

6. **Verify Customer UI Update**
   - Refresh customer profile page
   - Verify trust badge is updated (e.g., "Trust Score: 75%" → "Trust Score: 85%")
   - Verify "Proof of Residence Verified" indicator appears
   - Confirm success message/toast is displayed

7. **Optional: Verify in Booking/Service Context**
   - If proof of residence affects booking visibility:
     - Navigate to service list/booking page
     - Verify customer appears in search results or has enhanced visibility
     - Verify updated trust score is displayed in customer profile during booking flow

**Expected Outcome:**
- Proof of residence document stored with correct document_type
- File uploaded to Supabase Storage
- Trust score updated on customer profile
- Customer UI shows updated trust indicator
- Document may be visible in customer's trust history
- Test completes in <15 seconds

**Cleanup:**
```javascript
await supabase
  .from('identity_documents')
  .delete()
  .eq('user_id', 'test-customer-uuid-1');

await supabase.storage
  .from('documents')
  .remove(['identity-documents/test-customer-uuid-1']);
```

---

### Test 5: Concurrent Uploads Are Handled Correctly (Unique Constraint on user_id + document_type)

**Description:**  
When two concurrent upload requests are made for the same document type by the same user, the database unique constraint `(user_id, document_type)` should prevent duplicates. The test verifies that:
- Only one document record is created
- The second upload either waits for the first to complete, or receives a clear conflict error
- No orphaned files are left in Storage
- Error handling is graceful from the user's perspective

**Preconditions:**
- Database constraint `UNIQUE(user_id, document_type)` exists on `identity_documents` table
- Test framework supports concurrent request simulation (Playwright with multiple contexts, or Promise.all)
- Error handling in UI is implemented (conflict detection and user messaging)

**Test Steps:**

1. **Set Up Test Environment**
   - Login as test provider
   - Navigate to onboarding page or document upload section
   - Prepare two file upload actions (same document_type)

2. **Trigger Concurrent Uploads**
   - Using test framework concurrency (e.g., Playwright multi-context):
     ```javascript
     const uploadPromise1 = page1.locator('[data-testid="upload-id"]').setInputFiles('test-id-front.jpg');
     const uploadPromise2 = page2.locator('[data-testid="upload-id"]').setInputFiles('test-id-front.jpg');
     
     await Promise.all([uploadPromise1, uploadPromise2]);
     ```
   - OR trigger the submit button twice in rapid succession:
     ```javascript
     const submitButton = page.locator('[data-testid="submit-upload"]');
     await Promise.all([
       submitButton.click(),
       submitButton.click()
     ]);
     ```

3. **Verify First Upload Succeeds**
   - Wait for first request to complete (success message or redirect)
   - Verify file appears in Storage

4. **Verify Second Upload Handling**
   - Second upload should receive one of the following outcomes:
     - **Option A (Optimistic):** Database returns unique constraint violation error; UI shows clear message: "You've already uploaded a document of this type. Please update your existing document."
     - **Option B (Retry):** Database automatically resolves conflict; only one record exists; second file may be discarded or replaced
   - Verify user sees an appropriate message (no silent failure)

5. **Query Database**
   - Count documents of the specified type:
     ```sql
     SELECT COUNT(*) FROM public.identity_documents 
     WHERE user_id = 'test-provider-uuid-1' AND document_type = 'id';
     ```
   - Confirm count = 1 (exactly one record)

6. **Verify Storage State**
   - List files in Storage directory:
     ```javascript
     const { data } = await supabase.storage
       .from('documents')
       .list('identity-documents/test-provider-uuid-1/');
     ```
   - Confirm only one file exists for the document_type
   - No orphaned/duplicate files

7. **Verify UI State**
   - Refresh page
   - Verify UI shows single document with no duplication
   - No errors in browser console

8. **Edge Case: Different Document Types**
   - Verify concurrent uploads of different types (e.g., 'id' + 'proof_of_residence') are allowed:
     ```javascript
     await Promise.all([
       uploadFile('id', 'test-id-front.jpg'),
       uploadFile('proof_of_residence', 'test-proof-residence.pdf')
     ]);
     ```
   - Confirm both documents are created successfully
   - Verify count = 2 in database

**Expected Outcome:**
- Exactly one document record created in database
- Unique constraint enforced; no duplicates
- Clear error/conflict message shown to user
- Storage contains exactly one file (no orphans)
- Concurrent uploads of different types succeed independently
- Test completes in <20 seconds
- No database deadlocks or timeout errors

**Cleanup:**
```javascript
await supabase
  .from('identity_documents')
  .delete()
  .eq('user_id', 'test-provider-uuid-1');

await supabase.storage
  .from('documents')
  .remove(['identity-documents/test-provider-uuid-1']);
```

---

## Test Framework & Configuration

### Playwright Configuration Example

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential for shared test DB
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Setup/Teardown Example

```typescript
// tests/e2e/fixtures.ts
import { test as base } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

type TestFixtures = {
  supabase: ReturnType<typeof createClient>;
  testUserId: string;
};

export const test = base.extend<TestFixtures>({
  supabase: async ({}, use) => {
    const supabase = createClient(
      process.env.SUPABASE_URL_TEST,
      process.env.SUPABASE_ANON_KEY_TEST
    );
    await use(supabase);
  },
  
  testUserId: async ({}, use) => {
    // Setup: Create test user
    const userId = 'test-provider-uuid-' + Date.now();
    await use(userId);
    // Teardown: Delete test user and documents
  },
});
```

### Test Database Environment Variables

Create `.env.test`:
```bash
SUPABASE_URL_TEST=https://test-project.supabase.co
SUPABASE_ANON_KEY_TEST=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY_TEST=your-test-service-role-key
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npm run test:e2e -- --grep "Test 1:"

# Run with UI debugging
npm run test:e2e -- --ui

# Run with headed browser
npm run test:e2e -- --headed
```

---

## Future Implementation Checklist

- [ ] **Framework Selection:** Decide between Playwright vs Cypress
- [ ] **Database:** Set up test Supabase project
- [ ] **Test Users:** Create and manage test user accounts
- [ ] **File Fixtures:** Prepare test image and PDF files
- [ ] **Test Infrastructure:** Set up CI/CD integration for E2E tests
- [ ] **Real-time Testing:** Add websocket subscription tests if applicable
- [ ] **API Mocking:** Determine if file storage should be mocked or use real Supabase Storage
- [ ] **Performance Baselines:** Set up expected timing benchmarks
- [ ] **Parallel Execution:** Evaluate possibility of running tests in parallel with DB isolation
- [ ] **Reporting:** Configure test report generation and HTML reports

---

## References

- **Feature Plan:** `/docs/superpowers/plans/2026-07-06-identity-documents-kyc.md`
- **Database Schema:** Identity documents table structure and RLS policies
- **Supabase Documentation:** https://supabase.com/docs
- **Playwright Docs:** https://playwright.dev
- **Cypress Docs:** https://docs.cypress.io

---

## Appendix: Test Data Reset Script

```sql
-- Reset all test identity documents (use with caution in test DB only)
DELETE FROM public.identity_documents 
WHERE user_id LIKE 'test-%' OR user_id LIKE '%test%';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_docs FROM public.identity_documents 
WHERE user_id LIKE 'test-%' OR user_id LIKE '%test%';
```

```javascript
// Storage cleanup function
async function cleanupTestStorage(supabase, prefix = 'identity-documents/test-') {
  const { data, error } = await supabase.storage
    .from('documents')
    .list(prefix);
  
  if (!error && data) {
    const filesToDelete = data.map(f => `${prefix}${f.name}`);
    if (filesToDelete.length > 0) {
      await supabase.storage
        .from('documents')
        .remove(filesToDelete);
    }
  }
}
```
