'use client';

import { useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import {
  Button,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui';
import { IdentityDocument, DOCUMENT_TYPE_LABELS } from '@onserve/types';
import { toast } from 'sonner';

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
      setIsSubmitting(true);
      await onApprove(document.id);
      toast.success('Document approved successfully');
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error('Failed to approve document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsSubmitting(true);
      await onReject(document.id, rejectionReason);
      toast.success('Document rejected successfully');
      setRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error('Failed to reject document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadedDate = new Date(document.uploadedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        {/* Document Type Label */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {DOCUMENT_TYPE_LABELS[document.documentType]}
          </h3>
        </div>

        {/* Document Image */}
        <div className="mb-6 flex justify-center">
          <img
            src={document.documentUrl}
            alt={DOCUMENT_TYPE_LABELS[document.documentType]}
            className="max-w-md max-h-96 rounded-md border object-contain"
          />
        </div>

        {/* Upload Date Info */}
        <div className="mb-6 text-sm text-muted-foreground">
          <p>Uploaded: {uploadedDate}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="default"
            size="default"
            onClick={handleApprove}
            disabled={isProcessing || isSubmitting}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="default"
            onClick={() => setRejectDialogOpen(true)}
            disabled={isProcessing || isSubmitting}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={isSubmitting}
              className="min-h-24"
            />
          </div>

          <div className="flex gap-4">
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
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isSubmitting}
              className="flex-1"
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
