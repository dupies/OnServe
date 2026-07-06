import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useIdentityDocuments } from '@/features/auth/hooks/useIdentityDocuments';
import { IdentityDocumentUpload } from './IdentityDocumentUpload';
import type { IdentityDocument, DocumentType } from '@onserve/types';
import { DOCUMENT_TYPE_LABELS } from '@onserve/types';

const DOCUMENT_TYPES: DocumentType[] = ['national_id', 'passport', 'driver_license', 'proof_residence'];

function DocumentStatusBadge({ document }: { document: IdentityDocument }) {
  const documentLabel = DOCUMENT_TYPE_LABELS[document.documentType];

  // Verified state
  if (document.verifiedAt) {
    const verifiedDate = new Date(document.verifiedAt).toLocaleDateString();
    return (
      <div className="flex items-start gap-3 bg-green-50 p-4 rounded-lg border border-green-200">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-green-900">{documentLabel} Verified</h3>
          <p className="text-sm text-green-700 mt-1">Verified on {verifiedDate}</p>
        </div>
      </div>
    );
  }

  // Rejected state
  if (document.rejectionReason) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 bg-red-50 p-4 rounded-lg border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">{documentLabel} Rejected</h3>
            <p className="text-sm text-red-700 mt-1">{document.rejectionReason}</p>
          </div>
        </div>
        <IdentityDocumentUpload documentType={document.documentType} />
      </div>
    );
  }

  // Pending state
  const uploadedDate = new Date(document.uploadedAt).toLocaleDateString();
  return (
    <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-medium text-blue-900">{documentLabel} Pending</h3>
        <p className="text-sm text-blue-700 mt-1">Uploaded on {uploadedDate}</p>
      </div>
    </div>
  );
}

export function IdentityDocumentStatus() {
  const { data: documents, isLoading } = useIdentityDocuments();

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading documents...</div>;
  }

  return (
    <div className="space-y-4">
      {DOCUMENT_TYPES.map((docType) => {
        const document = documents?.find((doc) => doc.documentType === docType);

        return (
          <div key={docType}>
            {document ? (
              <DocumentStatusBadge document={document} />
            ) : (
              <IdentityDocumentUpload documentType={docType} />
            )}
          </div>
        );
      })}
    </div>
  );
}
