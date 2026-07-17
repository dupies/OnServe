import { supabase } from '../../../lib/supabase';
import type { IdentityDocument, DocumentUploadRequest } from '@onserve/types';

// Constants
const BUCKET_NAME = 'identity-documents';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

/**
 * Upload an identity document to Supabase Storage and create a database record
 */
export async function uploadDocument(
  userId: string,
  request: DocumentUploadRequest
): Promise<IdentityDocument> {
  const { file, documentType } = request;

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
    );
  }

  // Generate storage path
  const timestamp = Date.now();
  const ext = file.name.split('.').pop() || 'jpg';
  const storagePath = `${userId}/${documentType}/${timestamp}.${ext}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file);

  if (uploadError) {
    throw new Error(`Failed to upload document: ${uploadError.message}`);
  }

  // Store the storage path, not a public URL — access is always via signed URLs
  // Insert record into database
  const { data: insertedData, error: dbError } = await supabase
    .from('identity_documents')
    .insert({
      user_id: userId,
      document_type: documentType,
      document_url: storagePath,
    })
    .select()
    .single();

  if (dbError) {
    // Delete uploaded file if DB insert fails
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw new Error(`Failed to save document record: ${dbError.message}`);
  }

  return mapDocumentRow(insertedData);
}

/**
 * Get all identity documents for a user
 */
export async function getUserDocuments(
  userId: string
): Promise<IdentityDocument[]> {
  const { data, error } = await supabase
    .from('identity_documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to retrieve documents: ${error.message}`);
  }

  return data.map(mapDocumentRow);
}

/**
 * Delete an identity document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  // Get document record to retrieve URL
  const { data: document, error: fetchError } = await supabase
    .from('identity_documents')
    .select('document_url')
    .eq('id', documentId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to find document: ${fetchError.message}`);
  }

  if (!document) {
    throw new Error('Document not found');
  }

  // document_url now stores the storage path directly
  const storagePath = document.document_url;

  // Delete file from storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`Failed to delete document file: ${storageError.message}`);
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from('identity_documents')
    .delete()
    .eq('id', documentId);

  if (dbError) {
    throw new Error(`Failed to delete document record: ${dbError.message}`);
  }
}

/**
 * Generate a time-limited signed URL for a private document.
 * @param storagePath - The value stored in identity_documents.document_url
 * @param expiresIn   - Seconds until the URL expires (default 1 hour)
 */
export async function generateSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Helper: Map database row to IdentityDocument object
 */
function mapDocumentRow(row: any): IdentityDocument {
  return {
    id: row.id,
    userId: row.user_id,
    documentType: row.document_type,
    documentUrl: row.document_url,
    uploadedAt: row.uploaded_at,
    verifiedAt: row.verified_at,
    verifiedByAdminId: row.verified_by_admin_id,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
