import type { IdentityDocument } from '@onserve/types';

/**
 * Map a raw database row to an IdentityDocument object.
 * Shared between identityService and verificationService.
 */
export function mapDocumentRow(row: Record<string, unknown>): IdentityDocument {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    documentType: row.document_type as IdentityDocument['documentType'],
    documentUrl: row.document_url as string,
    uploadedAt: row.uploaded_at as string,
    verifiedAt: row.verified_at as string | null,
    verifiedByAdminId: row.verified_by_admin_id as string | null,
    rejectionReason: row.rejection_reason as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
