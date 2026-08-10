# Identity Document Upload & KYC Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable customers and providers to upload identity documents (ID, passport, driver's license, proof of residence) for KYC verification, with admin review and verification workflows.

**Architecture:** Multi-layer approach with database persistence, Supabase Storage for files, service layer for uploads/management, React hooks for UI integration, and admin dashboard for verification. Documents are linked to users via `identity_documents` table; provider_profiles tracks overall verification_status and verified_at timestamps. Customers upload for trust, providers upload as onboarding requirement.

**Tech Stack:** PostgreSQL migrations (Supabase), TypeScript types (@onserve/types), Service layer (supabase client), React Query (server state), React Hook Form + Zod (validation), Supabase Storage (file hosting), signed URLs for access control.

## Global Constraints

- **Enum values:** Document types = ['national_id', 'passport', 'driver_license', 'proof_residence']; verification_status already exists: ['pending', 'approved', 'rejected']
- **File limits:** Max 5MB per document, JPG/PNG only, files stored in `identity-documents/{user_id}/{document_type}/{timestamp}.{ext}`
- **Privacy:** Documents are private (not publicly readable), accessed via signed URLs (15-min expiry for downloads, 1h for verification views)
- **Naming:** Exact values for column names: `document_type`, `document_url`, `uploaded_at`, `verified_at`, `verified_by_admin_id`, `rejection_reason`
- **Verification workflow:** Pending → Approved (manual admin action + verified_at set) OR Rejected (with rejection_reason)
- **RLS:** Users see only their own documents; admins see all; linked to auth.users via user_id

---

## File Structure

### Database & Types
- **Migration:** `supabase/migrations/20260706_create_identity_documents.sql` — Create `identity_documents` table, indexes, RLS policies
- **Types:** `packages/types/src/identity.ts` — `IdentityDocument`, `DocumentType`, `VerificationRequest` types
- **Types:** Update `packages/types/src/payment.ts` — Add `IdentityDocumentUrl` interface if needed

### Services & API
- **Service:** `apps/web/src/features/admin/services/verificationService.ts` — Query identity documents, update verification status
- **Service:** `apps/web/src/features/auth/services/identityService.ts` — Upload documents, list user's documents, delete documents
- **RPC Function:** `supabase/migrations/verify_document.sql` — Backend stored procedure to atomically update document verification status

### Hooks & Mutations
- **Hook:** `apps/web/src/features/auth/hooks/useIdentityDocuments.ts` — Query user's documents (cached)
- **Hook:** `apps/web/src/features/auth/hooks/useUploadIdentity.ts` — Mutation hook for uploading document

### Components
- **Component:** `apps/web/src/features/auth/components/IdentityDocumentUpload.tsx` — File picker, validation, upload progress
- **Component:** `apps/web/src/features/auth/components/IdentityDocumentStatus.tsx` — Display uploaded documents, status badge, re-upload option
- **Component:** `apps/web/src/features/admin/components/VerificationReviewPanel.tsx` — Admin view for reviewing documents with approve/reject buttons

### Pages & Integration
- **Page update:** `apps/web/src/pages/provider/ProviderOnboardingPage.tsx` — Add Step 2 for document upload
- **Page:** `apps/web/src/pages/admin/AdminVerificationsPage.tsx` — Already exists; integrate document reviews
- **Page (future):** `apps/web/src/pages/customer/TrustProfilePage.tsx` — Customer optional document upload for trust score

---

## Task Breakdown

### Task 1: Database Migration & RLS Policies

**Files:**
- Create: `supabase/migrations/20260706_create_identity_documents.sql`

**Interfaces:**
- Consumes: PostgreSQL migration runner, existing users table, provider_profiles.verification_status
- Produces: `public.identity_documents` table with columns: id (uuid), user_id (uuid FK → auth.users), document_type (text), document_url (text), uploaded_at (timestamp), verified_at (timestamp nullable), verified_by_admin_id (uuid nullable), rejection_reason (text nullable), created_at (timestamp), updated_at (timestamp)

**Steps:**

- [ ] **Step 1: Write migration file**

Create `supabase/migrations/20260706_create_identity_documents.sql`:

```sql
-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create identity_documents table
create table public.identity_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('national_id', 'passport', 'driver_license', 'proof_residence')),
  document_url text not null, -- Signed URL or storage path
  uploaded_at timestamp with time zone not null default now(),
  verified_at timestamp with time zone, -- Set when admin approves
  verified_by_admin_id uuid references auth.users(id) on delete set null,
  rejection_reason text, -- Why document was rejected
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  
  -- Ensure one active document per type per user
  unique(user_id, document_type) where verified_at is null
);

-- Indexes for performance
create index idx_identity_documents_user_id on public.identity_documents(user_id);
create index idx_identity_documents_verified_at on public.identity_documents(verified_at);
create index idx_identity_documents_pending on public.identity_documents(user_id, document_type) where verified_at is null;

-- Enable RLS
alter table public.identity_documents enable row level security;

-- Users can see and insert their own documents
create policy "Users can view own documents" on public.identity_documents
  for select using (auth.uid() = user_id or exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

create policy "Users can insert own documents" on public.identity_documents
  for insert with check (auth.uid() = user_id);

-- Admins can update verification status
create policy "Admins can update verification status" on public.identity_documents
  for update using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ))
  with check (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

-- Users cannot delete their own; only admins can
create policy "Admins can delete documents" on public.identity_documents
  for delete using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

-- Auto-update trigger for updated_at
create trigger update_identity_documents_updated_at
  before update on public.identity_documents
  for each row
  execute function public.update_updated_at();
```

- [ ] **Step 2: Verify migration syntax**

Run locally:
```bash
cd /Users/medupiramaboea/Projects/OnServe
npx supabase migration list
```

Expected: Migration file appears in list.

- [ ] **Step 3: Apply migration to Supabase**

```bash
npx supabase db push
```

Expected: No errors, table created in Supabase dashboard under `identity_documents`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260706_create_identity_documents.sql
git commit -m "feat(db): create identity_documents table with RLS policies for KYC verification"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `packages/types/src/identity.ts`
- Modify: `packages/types/src/index.ts` (add export)

**Interfaces:**
- Consumes: TypeScript, existing @onserve/types structure
- Produces: Exported types: `DocumentType`, `IdentityDocument`, `VerificationRequest`, `DocumentUploadRequest`

**Steps:**

- [ ] **Step 1: Create identity types file**

Create `packages/types/src/identity.ts`:

```typescript
export type DocumentType = 'national_id' | 'passport' | 'driver_license' | 'proof_residence';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface IdentityDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  documentUrl: string;
  uploadedAt: string; // ISO timestamp
  verifiedAt: string | null;
  verifiedByAdminId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadRequest {
  documentType: DocumentType;
  file: File; // Browser File object
}

export interface VerificationRequest {
  documentId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string; // Required if status = 'rejected'
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  driver_license: "Driver's License",
  proof_residence: 'Proof of Residence',
};
```

- [ ] **Step 2: Update index.ts export**

In `packages/types/src/index.ts`, add:

```typescript
export type { DocumentType, VerificationStatus, IdentityDocument, DocumentUploadRequest, VerificationRequest } from './identity';
export { DOCUMENT_TYPE_LABELS } from './identity';
```

- [ ] **Step 3: Run type check**

```bash
cd /Users/medupiramaboea/Projects/OnServe
npm run type-check
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/identity.ts packages/types/src/index.ts
git commit -m "feat(types): add identity document and KYC verification types"
```

---

### Task 3: Identity Upload Service

**Files:**
- Create: `apps/web/src/features/auth/services/identityService.ts`

**Interfaces:**
- Consumes: Supabase client, auth session (user_id), File object, @onserve/types (IdentityDocument, DocumentUploadRequest)
- Produces: Functions: `uploadDocument(request)`, `getUserDocuments(userId)`, `deleteDocument(documentId)`, `generateSignedUrl(documentUrl)`

**Steps:**

- [ ] **Step 1: Create service file**

Create `apps/web/src/features/auth/services/identityService.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import type { IdentityDocument, DocumentUploadRequest, VerificationStatus } from '@onserve/types';

const BUCKET_NAME = 'identity-documents';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

export async function uploadDocument(
  userId: string,
  request: DocumentUploadRequest
): Promise<IdentityDocument> {
  const { documentType, file } = request;

  // Validation
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File must be under 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only JPG and PNG images are allowed');
  }

  // Generate unique storage path
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const timestamp = Date.now();
  const storagePath = `${userId}/${documentType}/${timestamp}.${ext}`;

  // Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Generate public URL (not signed, but storage path stored in DB)
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  // Insert document record in database
  const { data, error } = await supabase
    .from('identity_documents')
    .insert({
      user_id: userId,
      document_type: documentType,
      document_url: publicUrl, // Store the public URL
    })
    .select()
    .single();

  if (error) {
    // Clean up file if DB insert fails
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Failed to save document record: ${error.message}`);
  }

  return mapDocumentRow(data as Record<string, unknown>);
}

export async function getUserDocuments(userId: string): Promise<IdentityDocument[]> {
  const { data, error } = await supabase
    .from('identity_documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return (data as Record<string, unknown>[]).map(mapDocumentRow);
}

export async function deleteDocument(documentId: string): Promise<void> {
  // Get document to retrieve storage path
  const { data, error: selectError } = await supabase
    .from('identity_documents')
    .select('document_url')
    .eq('id', documentId)
    .single();

  if (selectError) {
    throw new Error(`Document not found: ${selectError.message}`);
  }

  // Delete from storage
  const url = (data as Record<string, unknown>).document_url as string;
  const storagePath = extractStoragePath(url);

  await supabase.storage.from(BUCKET_NAME).remove([storagePath]);

  // Delete database record
  const { error: deleteError } = await supabase
    .from('identity_documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    throw new Error(`Failed to delete document: ${deleteError.message}`);
  }
}

export async function generateSignedUrl(documentUrl: string, expiresIn = 3600): Promise<string> {
  const storagePath = extractStoragePath(documentUrl);
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

// Helper: Extract storage path from public URL
function extractStoragePath(url: string): string {
  // URL format: https://...supabase.co/storage/v1/object/public/identity-documents/userId/type/timestamp.ext
  const parts = url.split('/identity-documents/');
  return parts[1] || url;
}

// Helper: Map database row to IdentityDocument type
function mapDocumentRow(row: Record<string, unknown>): IdentityDocument {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    documentType: row.document_type as any,
    documentUrl: row.document_url as string,
    uploadedAt: row.uploaded_at as string,
    verifiedAt: (row.verified_at as string) || null,
    verifiedByAdminId: (row.verified_by_admin_id as string) || null,
    rejectionReason: (row.rejection_reason as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

- [ ] **Step 2: Run tests (no tests in this phase, but validate syntax)**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm run type-check
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/services/identityService.ts
git commit -m "feat(services): add identity document upload and management service"
```

---

### Task 4: Custom Hooks for Document Upload & Queries

**Files:**
- Create: `apps/web/src/features/auth/hooks/useIdentityDocuments.ts`
- Create: `apps/web/src/features/auth/hooks/useUploadIdentity.ts`

**Interfaces:**
- Consumes: React Query (useQuery, useMutation), identityService functions, authStore (current user ID)
- Produces: Hook `useIdentityDocuments()` returns `{ documents, isLoading, error }` and hook `useUploadIdentity()` returns `{ uploadDocument, isUploading, error }`

**Steps:**

- [ ] **Step 1: Create documents query hook**

Create `apps/web/src/features/auth/hooks/useIdentityDocuments.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getUserDocuments } from '@/features/auth/services/identityService';
import { useAuthStore } from '@/store/authStore';
import type { IdentityDocument } from '@onserve/types';

export function useIdentityDocuments() {
  const user = useAuthStore((state) => state.user);

  return useQuery<IdentityDocument[], Error>({
    queryKey: ['identity-documents', user?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return getUserDocuments(user.id);
    },
    enabled: !!user?.id,
  });
}
```

- [ ] **Step 2: Create upload mutation hook**

Create `apps/web/src/features/auth/hooks/useUploadIdentity.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '@/features/auth/services/identityService';
import { useAuthStore } from '@/store/authStore';
import type { DocumentUploadRequest, IdentityDocument } from '@onserve/types';

export function useUploadIdentity() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation<IdentityDocument, Error, DocumentUploadRequest>({
    mutationFn: (request) => {
      if (!user?.id) throw new Error('User not authenticated');
      return uploadDocument(user.id, request);
    },
    onSuccess: () => {
      // Invalidate documents query to refetch
      queryClient.invalidateQueries({ queryKey: ['identity-documents', user?.id] });
    },
  });
}
```

- [ ] **Step 3: Validate hooks syntax**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm run type-check
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/hooks/useIdentityDocuments.ts apps/web/src/features/auth/hooks/useUploadIdentity.ts
git commit -m "feat(hooks): add custom hooks for identity document queries and mutations"
```

---

### Task 5: Identity Document Upload Component

**Files:**
- Create: `apps/web/src/features/auth/components/IdentityDocumentUpload.tsx`

**Interfaces:**
- Consumes: useUploadIdentity hook, Zod validation, UI components (Button, Input, Label)
- Produces: Component with props `{ documentType: DocumentType; onSuccess?: () => void }` that renders file picker and upload progress

**Steps:**

- [ ] **Step 1: Create upload component**

Create `apps/web/src/features/auth/components/IdentityDocumentUpload.tsx`:

```typescript
import { useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUploadIdentity } from '@/features/auth/hooks/useUploadIdentity';
import type { DocumentType } from '@onserve/types';
import { DOCUMENT_TYPE_LABELS } from '@onserve/types';

interface IdentityDocumentUploadProps {
  documentType: DocumentType;
  onSuccess?: () => void;
}

export function IdentityDocumentUpload({ documentType, onSuccess }: IdentityDocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadDocument, isPending, error } = useUploadIdentity();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    uploadDocument(
      { documentType, file },
      {
        onSuccess: () => {
          if (fileInputRef.current) fileInputRef.current.value = '';
          onSuccess?.();
        },
      }
    );
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[documentType]}</Label>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileSelect}
          disabled={isPending}
          className="hidden"
        />

        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">JPG or PNG up to 5MB</p>

        {isPending && <p className="text-xs text-primary mt-2">Uploading...</p>}
      </div>

      {error && (
        <div className="flex gap-2 items-start bg-destructive/10 p-3 rounded-md">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">{error.message}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Validate component**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/components/IdentityDocumentUpload.tsx
git commit -m "feat(components): add identity document file upload component"
```

---

### Task 6: Document Status Display Component

**Files:**
- Create: `apps/web/src/features/auth/components/IdentityDocumentStatus.tsx`

**Interfaces:**
- Consumes: IdentityDocument type, DOCUMENT_TYPE_LABELS, utility functions for date formatting
- Produces: Component displays document list with upload status (pending/approved/rejected), allows re-upload on rejection

**Steps:**

- [ ] **Step 1: Create status component**

Create `apps/web/src/features/auth/components/IdentityDocumentStatus.tsx`:

```typescript
import { AlertCircle, CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IdentityDocumentUpload } from './IdentityDocumentUpload';
import { useIdentityDocuments } from '@/features/auth/hooks/useIdentityDocuments';
import type { DocumentType, IdentityDocument } from '@onserve/types';
import { DOCUMENT_TYPE_LABELS } from '@onserve/types';

export function IdentityDocumentStatus() {
  const { data: documents = [], isLoading } = useIdentityDocuments();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading documents...</div>;
  }

  const documentTypes: DocumentType[] = ['national_id', 'passport', 'driver_license', 'proof_residence'];
  const uploadedDocs = new Map(documents.map((d) => [d.documentType, d]));

  return (
    <div className="space-y-4">
      {documentTypes.map((docType) => {
        const doc = uploadedDocs.get(docType);
        return (
          <div key={docType} className="space-y-2">
            {doc ? (
              <DocumentStatusBadge document={doc} />
            ) : (
              <IdentityDocumentUpload documentType={docType} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DocumentStatusBadge({ document }: { document: IdentityDocument }) {
  if (document.verifiedAt) {
    return (
      <div className="flex items-center gap-2 bg-green-50 p-3 rounded-md border border-green-200">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900">{DOCUMENT_TYPE_LABELS[document.documentType]} Verified</p>
          <p className="text-xs text-green-700">
            Verified on {new Date(document.verifiedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  if (document.rejectionReason) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 bg-red-50 p-3 rounded-md border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{DOCUMENT_TYPE_LABELS[document.documentType]} Rejected</p>
            <p className="text-xs text-red-700 mt-1">{document.rejectionReason}</p>
          </div>
        </div>
        <IdentityDocumentUpload
          documentType={document.documentType}
          onSuccess={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-md border border-blue-200">
      <Clock className="w-5 h-5 text-blue-600" />
      <div>
        <p className="text-sm font-medium text-blue-900">{DOCUMENT_TYPE_LABELS[document.documentType]} Pending</p>
        <p className="text-xs text-blue-700">Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Validate component**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/components/IdentityDocumentStatus.tsx
git commit -m "feat(components): add identity document status display with verification badges"
```

---

### Task 7: Provider Onboarding Step 2 Integration

**Files:**
- Modify: `apps/web/src/pages/provider/ProviderOnboardingPage.tsx`

**Interfaces:**
- Consumes: IdentityDocumentStatus component, existing Step1Profile schema
- Produces: Step 2 (identity verification) with document upload UI, navigation between steps

**Steps:**

- [ ] **Step 1: Update onboarding page to include Step 2**

Read the existing file at `apps/web/src/pages/provider/ProviderOnboardingPage.tsx` (it was truncated at 100 lines). Continue reading:

```bash
head -300 /Users/medupiramaboea/Projects/OnServe/apps/web/src/pages/provider/ProviderOnboardingPage.tsx | tail -200
```

Then modify the file. Insert Step 2 component after Step 1:

```typescript
// Add this import at the top
import { IdentityDocumentStatus } from '@/features/auth/components/IdentityDocumentStatus';

// Add this Step 2 component before the main onboarding component
function Step2IdentityVerification({ 
  onNext, 
  onBack 
}: { 
  onNext: () => void; 
  onBack: () => void 
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-[#7B6EF6] font-medium mb-1">Step 2 of {TOTAL_STEPS}</p>
        <h1 className="text-xl font-semibold text-foreground">Verify your identity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload government-issued ID or passport for verification
        </p>
      </div>

      <IdentityDocumentStatus />

      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={onNext} 
          className="flex-1 bg-[#7B6EF6] hover:bg-[#7B6EF6]/90"
        >
          Next: services
        </Button>
      </div>
    </div>
  );
}

// Update the main ProviderOnboarding component to use currentStep
// In the render section, add:
case 2:
  return <Step2IdentityVerification onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />;
```

- [ ] **Step 2: Update TOTAL_STEPS constant**

Change `const TOTAL_STEPS = 4;` to `const TOTAL_STEPS = 5;` (we're adding identity verification as a separate step).

- [ ] **Step 3: Test locally**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm run dev
```

Navigate to provider onboarding, verify Step 2 appears after Step 1 with document upload UI.

Expected: Can see "Step 2 of 5" header, upload area, and navigation buttons.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/provider/ProviderOnboardingPage.tsx
git commit -m "feat(onboarding): integrate identity document upload as Step 2 of provider onboarding"
```

---

### Task 8: Verification Service for Admin

**Files:**
- Create: `apps/web/src/features/admin/services/verificationService.ts`

**Interfaces:**
- Consumes: Supabase client, VerificationRequest type, admin auth (verify caller is admin)
- Produces: Functions: `getDocumentsForVerification()`, `approveDocument(documentId)`, `rejectDocument(documentId, reason)`

**Steps:**

- [ ] **Step 1: Create verification service**

Create `apps/web/src/features/admin/services/verificationService.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import type { IdentityDocument, VerificationRequest } from '@onserve/types';

export async function getDocumentsForVerification(
  status: 'pending' | 'all' = 'pending',
  limit = 20,
  offset = 0
): Promise<IdentityDocument[]> {
  let query = supabase
    .from('identity_documents')
    .select('*, users(id, email, phone, role)')
    .order('uploaded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === 'pending') {
    query = query.is('verified_at', true); // null check
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch documents for verification: ${error.message}`);
  }

  return (data as Record<string, unknown>[]).map(mapDocumentRow);
}

export async function approveDocument(documentId: string, adminId: string): Promise<IdentityDocument> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('identity_documents')
    .update({
      verified_at: now,
      verified_by_admin_id: adminId,
      rejection_reason: null,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to approve document: ${error.message}`);
  }

  return mapDocumentRow(data as Record<string, unknown>);
}

export async function rejectDocument(
  documentId: string,
  adminId: string,
  rejectionReason: string
): Promise<IdentityDocument> {
  const { data, error } = await supabase
    .from('identity_documents')
    .update({
      verified_at: null,
      verified_by_admin_id: null,
      rejection_reason: rejectionReason,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to reject document: ${error.message}`);
  }

  return mapDocumentRow(data as Record<string, unknown>);
}

function mapDocumentRow(row: Record<string, unknown>): IdentityDocument {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    documentType: row.document_type as any,
    documentUrl: row.document_url as string,
    uploadedAt: row.uploaded_at as string,
    verifiedAt: (row.verified_at as string) || null,
    verifiedByAdminId: (row.verified_by_admin_id as string) || null,
    rejectionReason: (row.rejection_reason as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

- [ ] **Step 2: Validate syntax**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/admin/services/verificationService.ts
git commit -m "feat(admin): add verification service for document approval/rejection workflow"
```

---

### Task 9: Admin Verification Review Component

**Files:**
- Create: `apps/web/src/features/admin/components/VerificationReviewPanel.tsx`

**Interfaces:**
- Consumes: IdentityDocument type, verificationService functions, useAuthStore (admin ID)
- Produces: Component displays pending documents with approve/reject buttons and reason input

**Steps:**

- [ ] **Step 1: Create review component**

Create `apps/web/src/features/admin/components/VerificationReviewPanel.tsx`:

```typescript
import { useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { IdentityDocument } from '@onserve/types';
import { DOCUMENT_TYPE_LABELS } from '@onserve/types';

interface VerificationReviewPanelProps {
  document: IdentityDocument;
  onApprove: (documentId: string) => Promise<void>;
  onReject: (documentId: string, reason: string) => Promise<void>;
  isProcessing?: boolean;
}

export function VerificationReviewPanel({
  document,
  onApprove,
  onReject,
  isProcessing = false,
}: VerificationReviewPanelProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    try {
      await onApprove(document.id);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(document.id, rejectionReason);
      setRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="border rounded-lg p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-2">{DOCUMENT_TYPE_LABELS[document.documentType]}</h3>
          <img 
            src={document.documentUrl} 
            alt={document.documentType}
            className="max-w-md max-h-96 border rounded"
          />
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Uploaded:</span> {new Date(document.uploadedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={isProcessing || isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
          >
            <Check className="w-4 h-4" />
            Approve
          </Button>

          <Button
            onClick={() => setRejectDialogOpen(true)}
            disabled={isProcessing || isSubmitting}
            variant="destructive"
            className="flex-1 gap-2"
          >
            <X className="w-4 h-4" />
            Reject
          </Button>
        </div>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. The user will see this message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              placeholder="e.g., Image is too blurry, document is expired, name doesn't match profile..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                }}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Validate**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/admin/components/VerificationReviewPanel.tsx
git commit -m "feat(admin): add verification review panel for document approval/rejection"
```

---

### Task 10: Admin Verifications Page Integration

**Files:**
- Modify: `apps/web/src/pages/admin/AdminVerificationsPage.tsx` (create if doesn't exist)

**Interfaces:**
- Consumes: VerificationReviewPanel, verificationService functions, custom hooks for queries/mutations
- Produces: Page lists pending documents with review panels, tabs for pending/approved/rejected

**Steps:**

- [ ] **Step 1: Check if AdminVerificationsPage exists**

```bash
test -f /Users/medupiramaboea/Projects/OnServe/apps/web/src/pages/admin/AdminVerificationsPage.tsx && echo "EXISTS" || echo "DOES NOT EXIST"
```

If it exists, read it and integrate. If not, create it:

- [ ] **Step 2: Create or update AdminVerificationsPage**

Create `apps/web/src/pages/admin/AdminVerificationsPage.tsx`:

```typescript
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppShell } from '@/components/layout/AppShell';
import { VerificationReviewPanel } from '@/features/admin/components/VerificationReviewPanel';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocumentsForVerification, approveDocument, rejectDocument } from '@/features/admin/services/verificationService';
import { useAuthStore } from '@/store/authStore';
import { notify } from '@/lib/notify';

export function AdminVerificationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');

  const { data: pendingDocs = [], isLoading } = useQuery({
    queryKey: ['verifications', 'pending'],
    queryFn: () => getDocumentsForVerification('pending'),
  });

  const { data: allDocs = [] } = useQuery({
    queryKey: ['verifications', 'all'],
    queryFn: () => getDocumentsForVerification('all'),
  });

  const approveMutation = useMutation({
    mutationFn: (documentId: string) => 
      approveDocument(documentId, user?.id || ''),
    onSuccess: () => {
      notify.success('Document approved');
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
    },
    onError: (error) => {
      notify.error(`Approval failed: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      rejectDocument(documentId, user?.id || '', reason),
    onSuccess: () => {
      notify.success('Document rejected');
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
    },
    onError: (error) => {
      notify.error(`Rejection failed: ${error.message}`);
    },
  });

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Identity Verification</h1>
          <p className="text-muted-foreground">Review and verify user identity documents</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingDocs.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({allDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : pendingDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending documents</p>
            ) : (
              pendingDocs.map((doc) => (
                <VerificationReviewPanel
                  key={doc.id}
                  document={doc}
                  onApprove={approveMutation.mutateAsync}
                  onReject={(id, reason) =>
                    rejectMutation.mutateAsync({ documentId: id, reason })
                  }
                  isProcessing={approveMutation.isPending || rejectMutation.isPending}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4 mt-4">
            {allDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents</p>
            ) : (
              allDocs.map((doc) => (
                <VerificationReviewPanel
                  key={doc.id}
                  document={doc}
                  onApprove={approveMutation.mutateAsync}
                  onReject={(id, reason) =>
                    rejectMutation.mutateAsync({ documentId: id, reason })
                  }
                  isProcessing={approveMutation.isPending || rejectMutation.isPending}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Update routing if needed**

Check that the admin routing includes this page. Update router config if necessary.

- [ ] **Step 4: Test locally**

```bash
cd /Users/medupiramaboea/Projects/OnServe/apps/web
npm run dev
```

Navigate to `/admin/verifications`, verify you can see pending documents and approve/reject.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/admin/AdminVerificationsPage.tsx
git commit -m "feat(admin): add identity document verification page with review UI"
```

---

### Task 11: Update Provider Profile Display

**Files:**
- Modify: `apps/web/src/features/providers/services/providerService.ts` (already exists, line 38-46)

**Interfaces:**
- Consumes: Identity document URL from database
- Produces: Provider profile includes linked identity document reference

**Steps:**

- [ ] **Step 1: Review current mapping (already done in earlier read)**

The service already maps `id_document_url` field. No changes needed here if the column is already in database. If not, add to provider_profiles table via migration.

- [ ] **Step 2: Create migration to link provider_profiles to identity_documents**

Actually, we should keep identity_documents separate and query it independently. The existing `id_document_url` on provider_profiles can be deprecated in favor of querying identity_documents table. No change needed now; document this for future cleanup.

- [ ] **Step 3: Commit (no changes needed)**

No commit needed for this task if schema is correct.

---

### Task 12: E2E Testing Plan (Future)

**Files:**
- (Not implemented in this plan, but document for reference)

**Future test scenarios:**
1. Provider uploads ID during onboarding, sees pending badge
2. Admin approves document, provider sees verified badge
3. Admin rejects with reason, provider sees rejection and can re-upload
4. Customer uploads proof of residence for trust boost
5. Concurrent uploads are handled correctly (unique constraint on user_id + document_type)

---

## Implementation Checklist

- [ ] Task 1: Database migration & RLS
- [ ] Task 2: TypeScript types
- [ ] Task 3: Identity upload service
- [ ] Task 4: Custom hooks
- [ ] Task 5: Upload component
- [ ] Task 6: Status display component
- [ ] Task 7: Provider onboarding integration
- [ ] Task 8: Verification service
- [ ] Task 9: Admin review component
- [ ] Task 10: Admin verifications page
- [ ] Task 11: Provider profile updates (deferred)
- [ ] Task 12: E2E testing (future)

---

## Dependencies & Notes

**Known dependencies:**
- Supabase project must have `identity-documents` storage bucket created (manual step for now; can be automated later)
- Admin users must exist in `public.users` with `role = 'admin'`
- Provider onboarding Step 1 (profile) must complete before Step 2 (identity) is accessible

**Future enhancements:**
- OCR verification for document legitimacy
- Automated storage bucket creation via migration
- Webhook notifications to providers on verification status change
- Document re-upload limits (e.g., max 3 per document type per 30 days)
- Integration with third-party KYC providers (Yoco KYC, Onfido, etc.)

---

## Execution Next Steps

Plan complete and saved to `docs/superpowers/plans/2026-07-06-identity-documents-kyc.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with quality gates

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints every 3-4 tasks

**Which approach would you prefer?**
