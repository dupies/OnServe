/**
 * Identity documents and KYC verification types
 */

export type DocumentType = 'national_id' | 'passport' | 'driver_license' | 'proof_residence';

export interface IdentityDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  documentUrl: string;
  uploadedAt: string;
  verifiedAt: string | null;
  verifiedByAdminId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadRequest {
  documentType: DocumentType;
  file: File;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  national_id: 'National ID',
  passport: 'Passport',
  driver_license: "Driver's License",
  proof_residence: 'Proof of Residence',
};
