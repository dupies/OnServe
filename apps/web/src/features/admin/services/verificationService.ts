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

  // Filter by pending status if requested
  if (status === 'pending') {
    query = query.is('verified_at', null);
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
 * Reject an identity document
 */
export async function rejectDocument(
  documentId: string,
  // adminId is part of the standard signature but not used in reject
  // (rejection clears admin verification, unlike approval)
  _adminId: string,
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

  return mapDocumentRow(data);
}

