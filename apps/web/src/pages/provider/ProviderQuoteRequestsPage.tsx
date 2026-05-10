import { useNavigate } from 'react-router-dom';
import { Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { useProviderQuoteRequests } from '@/features/quotes/hooks/useQuotes';
import { formatDistanceToNow } from 'date-fns';
import type { QuoteRequest } from '@onserve/types';

export function ProviderQuoteRequestsPage() {
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useProviderQuoteRequests();

  return (
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Quote requests</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Bid on jobs from customers near you
            </p>
          </div>
          {requests.length > 0 && (
            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
              {requests.length} open
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4 text-xl">
              📋
            </div>
            <p className="text-foreground font-medium">No open requests</p>
            <p className="text-muted-foreground text-sm mt-1">
              New quote requests will appear here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((r) => (
              <QuoteRequestCard
                key={r.id}
                request={r}
                onClick={() => navigate(`/provider/quotes/${r.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function QuoteRequestCard({
  request,
  onClick,
}: {
  request: QuoteRequest;
  onClick: () => void;
}) {
  const svcName = ((request as unknown as Record<string, unknown>)['service_types'] as Record<string, unknown> | undefined)?.['name'] as string | undefined ?? 'Service';
  const expiresAt = new Date(request.expiresAt);
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 6 * 60 * 60 * 1000;
  const timeLeft = formatDistanceToNow(expiresAt, { addSuffix: false });

  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-5 text-left w-full hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-foreground">{svcName}</p>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{request.problemDescription}</p>
        </div>
        <Badge
          variant="outline"
          className={isExpiringSoon ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30 bg-warning/10'}
        >
          <Clock className="w-3 h-3 mr-1" />
          {timeLeft} left
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>Customer location</span>
        </div>
        <div className="ml-auto">
          <span className="text-sm text-primary font-medium">Submit quote →</span>
        </div>
      </div>
    </button>
  );
}
