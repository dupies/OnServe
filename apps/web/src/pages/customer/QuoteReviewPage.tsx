import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { useQuoteRequest, useAcceptQuote } from '@/features/quotes/hooks/useQuotes';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { Quote } from '@onserve/types';

export function QuoteReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useQuoteRequest(id);
  const acceptQuote = useAcceptQuote();

  async function handleAccept(quoteId: string) {
    try {
      await acceptQuote.mutateAsync(quoteId);
      toast.success('Quote accepted — booking created');
      navigate('/bookings');
    } catch {
      toast.error('Failed to accept quote');
    }
  }

  if (isLoading || !data) {
    return (
      <PageLayout>
        <div className="max-w-2xl animate-pulse flex flex-col gap-4">
          <div className="h-24 bg-card rounded-xl" />
          <div className="h-32 bg-card rounded-xl" />
          <div className="h-32 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  const quotes: Quote[] = data.quotes ?? [];
  const expiresAt = new Date(data.expiresAt);
  const timeLeft = formatDistanceToNow(expiresAt, { addSuffix: false });
  const isExpired = expiresAt < new Date();

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {quotes.length} quote{quotes.length !== 1 ? 's' : ''} received
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{data.problemDescription}</p>
            </div>
            <Badge variant="outline" className={isExpired ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30 bg-warning/10'}>
              <Clock className="w-3 h-3 mr-1" />
              {isExpired ? 'Expired' : `${timeLeft} left`}
            </Badge>
          </div>
        </div>

        {quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center mb-4 text-xl">
              ⏳
            </div>
            <p className="text-foreground font-medium">Waiting for quotes</p>
            <p className="text-muted-foreground text-sm mt-1">
              Providers will bid on your job before the deadline
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {quotes.map((q, i) => (
              <QuoteCard
                key={q.id}
                quote={q}
                featured={i === 0}
                onAccept={() => handleAccept(q.id)}
                isPending={acceptQuote.isPending}
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
}: {
  quote: Quote;
  featured: boolean;
  onAccept: () => void;
  isPending: boolean;
}) {
  const durationLabel =
    quote.estimatedDurationMins !== null
      ? quote.estimatedDurationMins < 60
        ? `${quote.estimatedDurationMins} min`
        : `${Math.round(quote.estimatedDurationMins / 60)}h`
      : null;

  return (
    <div
      className={`bg-card border rounded-xl p-5 flex flex-col gap-4 ${
        featured ? 'border-primary/30 bg-primary/5' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
            P
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Provider</p>
            {durationLabel && (
              <p className="text-xs text-muted-foreground">Est. {durationLabel}</p>
            )}
          </div>
        </div>
        <span className={`text-2xl font-semibold ${featured ? 'text-primary' : 'text-foreground'}`}>
          R {quote.quotedPrice}
        </span>
      </div>

      {quote.notes && (
        <p className="text-sm text-muted-foreground">{quote.notes}</p>
      )}

      {featured && (
        <Button className="w-full" onClick={onAccept} disabled={isPending}>
          {isPending ? 'Accepting…' : 'Accept this quote'}
        </Button>
      )}
      {!featured && (
        <button
          className="w-full border border-border rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          onClick={onAccept}
          disabled={isPending}
        >
          Accept
        </button>
      )}
    </div>
  );
}
