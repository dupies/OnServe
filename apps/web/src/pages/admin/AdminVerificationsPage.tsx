import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VerificationReviewPanel } from '@/features/admin/components/VerificationReviewPanel';
import {
  getDocumentsForVerification,
  approveDocument,
  rejectDocument,
} from '@/features/admin/services/verificationService';
import { useAuthStore } from '@/features/auth/store/authStore';
import { notify } from '@/lib/notify';

export function AdminVerificationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  // Query for pending documents
  const { data: pendingDocs = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['verifications', 'pending'],
    queryFn: () => getDocumentsForVerification('pending'),
  });

  // Query for all documents
  const { data: allDocs = [], isLoading: allLoading } = useQuery({
    queryKey: ['verifications', 'all'],
    queryFn: () => getDocumentsForVerification('all'),
    enabled: activeTab === 'all',
  });

  // Mutation for approving document
  const approveMutation = useMutation({
    mutationFn: (documentId: string) => approveDocument(documentId, user?.id ?? ''),
    onSuccess: () => {
      notify.success('Document approved');
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
    },
    onError: (error) => {
      notify.error(error);
    },
  });

  // Mutation for rejecting document
  const rejectMutation = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      rejectDocument(documentId, user?.id ?? '', reason),
    onSuccess: () => {
      notify.success('Document rejected');
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
    },
    onError: (error) => {
      notify.error(error);
    },
  });

  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <PageLayout>
      <div className="max-w-4xl flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Identity Verification</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and verify user identity documents
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'all')}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingDocs.length})</TabsTrigger>
            <TabsTrigger value="all">All ({allDocs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="flex flex-col gap-6">
            {pendingLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : pendingDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No pending documents</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {pendingDocs.map((doc) => (
                  <VerificationReviewPanel
                    key={doc.id}
                    document={doc}
                    onApprove={approveMutation.mutateAsync}
                    onReject={(id, reason) => rejectMutation.mutateAsync({ documentId: id, reason })}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="flex flex-col gap-6">
            {allLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : allDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No documents</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {allDocs.map((doc) => (
                  <VerificationReviewPanel
                    key={doc.id}
                    document={doc}
                    onApprove={approveMutation.mutateAsync}
                    onReject={(id, reason) => rejectMutation.mutateAsync({ documentId: id, reason })}
                    isProcessing={isProcessing}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
