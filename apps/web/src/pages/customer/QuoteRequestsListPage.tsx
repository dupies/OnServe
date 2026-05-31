import { useNavigate } from 'react-router-dom';
import { Plus, Clock, MessageSquare, UserCheck, Globe, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { useCustomerQuoteRequests } from '@/features/quotes/hooks/useQuotes';
import type { QuoteRequestSummary } from '@/features/quotes/hooks/useQuotes';
import { formatDistanceToNow, format } from 'date-fns';
import type { QuoteRequest } from '@onserve/types';

type QRStatus = QuoteRequest['status'];

const STATUS_STYLES: Record<QRStatus, string> = {
  open:       'text-warning border-warning/30 bg-warning/10',
  in_review:  'text-primary border-primary/30 bg-primary/10',
  accepted:   'text-muted-foreground border-border',
  expired:    'text-muted-foreground border-border',
};

const STATUS_LABELS: Record<QRStatus, string> = {
  open:       'Open',
  in_review:  'In review',
  accepted:   'Accepted',
  expired:    'Expired',
};

export function QuoteRequestsListPage() {
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = useCustomerQuoteRequests();

  const active = requests.filter((r) => r.status === 'open' || r.status === 'in_review');
  const past   = requests.filter((r) => r.status === 'accepted' || r.status === 'expired');

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Quote requests</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track bids from providers on your jobs
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/quote-request')}>
            <Plus className="w-4 h-4 mr-1.5" />
            New request
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4">
              <Inbox className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">No quote requests yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Request quotes to compare prices from multiple providers
            </p>
            <Button size="sm" className="mt-5" onClick={() => navigate('/quote-request')}>
              <Plus className="w-4 h-4 mr-1.5" />
              New request
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-3">Active</h2>
                <div className="flex flex-col gap-3">
                  {active.map((r) => (
                    <QuoteRequestCard
                      key={r.id}
                      request={r}
                      onClick={() => navigate(`/quote-requests/${r.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Past</h2>
                <div className="flex flex-col gap-3 opacity-70">
                  {past.map((r) => (
                    <QuoteRequestCard
                      key={r.id}
                      request={r}
                      onClick={() => navigate(`/quote-requests/${r.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
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
  request: QuoteRequestSummary;
  onClick: () => void;
}) {
  const expiresAt = new Date(request.expiresAt);
  const isExpired = expiresAt < new Date();
  const timeLabel = isExpired
    ? 'Expired'
    : `${formatDistanceToNow(expiresAt)} left`;

  return (
    <button
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-5 text-left w-full hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs h-5 ${STATUS_STYLES[request.status]}`}
            >
              {STATUS_LABELS[request.status]}
            </Badge>
            {request.targetedProviderId ? (
              <Badge variant="outline" className="text-xs h-5 text-primary border-primary/30 bg-primary/5 flex items-center gap-0.5">
                <UserCheck className="w-3 h-3" /> Direct
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs h-5 text-muted-foreground border-border flex items-center gap-0.5">
                <Globe className="w-3 h-3" /> Open
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {request.serviceTypeName}
            </span>
          </div>
          <p className="text-sm text-foreground font-medium line-clamp-2 leading-snug">
            {request.problemDescription}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>
              {request.quoteCount} quote{request.quoteCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div
            className={`flex items-center gap-1 text-xs ${
              isExpired ? 'text-muted-foreground' : 'text-warning'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{timeLabel}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {format(new Date(request.createdAt), 'd MMM')}
          </span>
        </div>
      </div>
    </button>
  );
}
