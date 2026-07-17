import { supabase } from '../../../lib/supabase';
import type { IdentityDocument } from '@onserve/types';
import { mapDocumentRow } from '../../identity/utils/mapDocumentRow';

/**
 * Get identity documents for verification
 */
export async function getDocumentsForVerification(
  status: 'pending' | 'all' = 'pending',
  limit: number = 20,
  offset: number = 0
): Promise<IdentityDocument[]> {
  let query = supabase
    .from('identity_documents')
    .select('*, users(id, email, phone, role)')
    .order('uploaded_at', { ascending: false });

  // Filter by pending status if requested.
  // Pending = not yet approved (verified_at IS NULL) AND not yet rejected (rejection_reason IS NULL).
  // Rejected documents have verified_at=null but rejection_reason set — they should not appear in pending.
  if (status === 'pending') {
    query = query.is('verified_at', null).is('rejection_reason', null);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to retrieve documents for verification: ${error.message}`);
  }

  return data.map(mapDocumentRow);
}

/**
 * Approve an identity document
 */
export async function approveDocument(
  documentId: string,
  adminId: string
): Promise<IdentityDocument> {
  const { data, error } = await supabase
    .from('identity_documents')
    .update({
      verified_at: new Date().toISOString(),
      verified_by_admin_id: adminId,
      rejection_reason: null,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to approve document: ${error.message}`);
  }

  return mapDocumentRow(data);
}

/**
 * Reject an identity document.
 * verified_by_admin_id is preserved so there is an audit record of who rejected the document.
 * verified_at is set to the rejection timestamp so the action is timestamped regardless of outcome.
 */
export async function rejectDocument(
  documentId: string,
  adminId: string,
  rejectionReason: string
): Promise<IdentityDocument> {
  const { data, error } = await supabase
    .from('identity_documents')
    .update({
      verified_at: new Date().toISOString(),
      verified_by_admin_id: adminId,
      rejection_reason: rejectionReason,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to reject document: ${error.message}`);
  }

  return mapDocumentRow(data);
}

