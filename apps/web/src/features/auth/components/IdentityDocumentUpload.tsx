import { useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${DOCUMENT_TYPE_LABELS[documentType]}`}
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
