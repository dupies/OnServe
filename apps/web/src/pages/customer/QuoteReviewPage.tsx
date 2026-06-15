import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Star, Briefcase, ShieldCheck, UserCheck, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { useQuoteRequest, useAcceptQuote } from '@/features/quotes/hooks/useQuotes';
import type { QuoteWithProvider } from '@/features/quotes/hooks/useQuotes';
import { formatDistanceToNow } from 'date-fns';
import { LoadingState, EmptyState, ErrorState } from '@/components/common';
import { notify } from '@/lib/notify';

export function QuoteReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuoteRequest(id);
  const acceptQuote = useAcceptQuote();

  async function handleAccept(quoteId: string) {
    try {
      await acceptQuote.mutateAsync(quoteId);
      notify.success('Quote accepted — booking created');
      navigate('/bookings');
    } catch {
      // Global mutation error handler surfaces the toast.
    }
  }

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState label="Loading quotes…" />
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout>
        <ErrorState message="We couldn't load this quote request." onRetry={() => refetch()} />
      </PageLayout>
    );
  }

  const quotes: QuoteWithProvider[] = data.quotes ?? [];
  const expiresAt = new Date(data.expiresAt);
  const timeLeft = formatDistanceToNow(expiresAt, { addSuffix: false });
  const isExpired = expiresAt < new Date();

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/quote-requests')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Quote requests
          </button>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">{data.serviceTypeName}</p>
              <h1 className="text-2xl font-semibold text-foreground">
                {quotes.length} quote{quotes.length !== 1 ? 's' : ''} received
              </h1>
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{data.problemDescription}</p>
            </div>
            <Badge variant="outline" className={isExpired ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30 bg-warning/10'}>
              <Clock className="w-3 h-3 mr-1" />
              {isExpired ? 'Expired' : `${timeLeft} left`}
            </Badge>
          </div>
        </div>

        {/* Audience banner */}
        <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${
          data.targetedProviderId
            ? 'border-primary/20 bg-primary/5 text-primary'
            : 'border-border bg-card text-muted-foreground'
        }`}>
          {data.targetedProviderId ? (
            <>
              <UserCheck className="w-4 h-4 flex-shrink-0" />
              <span>Direct request — sent to one specific provider</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span>Open request — visible to all providers in your area</span>
            </>
          )}
        </div>

        {quotes.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Waiting for quotes"
            description="Providers will bid on your job before the deadline."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {quotes.map((q, i) => (
              <QuoteCard
                key={q.id}
                quote={q}
                featured={i === 0}
                onAccept={() => handleAccept(q.id)}
                isPending={acceptQuote.isPending}
                isAccepted={data.status === 'accepted'}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function QuoteCard({
  quote,
  featured,
  onAccept,
  isPending,
  isAccepted,
}: {
  quote: QuoteWithProvider;
  featured: boolean;
  onAccept: () => void;
  isPending: boolean;
  isAccepted: boolean;
}) {
  const provider = quote.provider;
  const durationLabel =
    quote.estimatedDurationMins !== null
      ? quote.estimatedDurationMins < 60
        ? `${quote.estimatedDurationMins} min`
        : `${Math.round(quote.estimatedDurationMins / 60)}h`
      : null;

  const initials = provider
    ? provider.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'P';

  const isThisAccepted = quote.status === 'accepted';

  return (
    <div
      className={`bg-card border rounded-xl p-5 flex flex-col gap-4 ${
        isThisAccepted
          ? 'border-primary/40 bg-primary/5'
          : featured
          ? 'border-primary/20'
          : 'border-border'
      }`}
    >
      {/* Provider header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {provider?.avatarUrl ? (
              <img src={provider.avatarUrl} alt={provider.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-primary">{initials}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-foreground">
                {provider?.fullName ?? 'Provider'}
              </p>
              {provider?.verificationStatus === 'verified' && (
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {provider && provider.ratingAverage > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 fill-warning text-warning" />
                  {provider.ratingAverage.toFixed(1)}
                </span>
              )}
              {provider && provider.totalJobsCompleted > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Briefcase className="w-3 h-3" />
                  {provider.totalJobsCompleted} jobs
                </span>
              )}
              {durationLabel && (
                <span className="text-xs text-muted-foreground">· {durationLabel}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-2xl font-semibold ${isThisAccepted || featured ? 'text-primary' : 'text-foreground'}`}>
            R{quote.quotedPrice}
          </span>
          {isThisAccepted && (
            <p className="text-xs text-primary mt-0.5">Accepted</p>
          )}
        </div>
      </div>

      {quote.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed">{quote.notes}</p>
      )}

      {!isAccepted && (
        featured ? (
          <Button className="w-full" onClick={onAccept} disabled={isPending}>
            {isPending ? 'Accepting…' : 'Accept this quote'}
          </Button>
        ) : (
          <button
            className="w-full border border-border rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            onClick={onAccept}
            disabled={isPending}
          >
            Accept
          </button>
        )
      )}
    </div>
  );
}
