import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PageLayout } from '@/components/layout/PageLayout';
import { useBooking, useCheckOut } from '@/features/bookings/hooks/useBookings';
import { useCreateRating } from '@/features/ratings/hooks/useRatings';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const TAGS = ['On time', 'Professional', 'Friendly', 'Great quality', 'Clean'];

export function RateReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useBooking(id);
  const createRating = useCreateRating();
  const checkOut = useCheckOut();

  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  async function handleSubmit() {
    if (!id || score === 0) {
      toast.error('Please select a star rating');
      return;
    }
    try {
      if (booking?.status !== 'completed') {
        await checkOut.mutateAsync(id);
      }
      await createRating.mutateAsync({
        bookingId: id,
        input: {
          score: score as 1 | 2 | 3 | 4 | 5,
          comment: comment || undefined,
          tags: selectedTags,
        },
      });
      toast.success('Rating submitted — funds released!');
      navigate('/bookings');
    } catch {
      toast.error('Failed to submit rating');
    }
  }

  if (isLoading || !booking) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto animate-pulse flex flex-col gap-4">
          <div className="h-48 bg-card rounded-xl" />
          <div className="h-32 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  const provider = (booking as unknown as Record<string, unknown>)['provider'] as Record<string, unknown> | undefined;
  const svcName = ((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown> | undefined)?.['name'] as string | undefined ?? 'Service';
  const initials = provider
    ? String(provider['display_name'] ?? 'P').slice(0, 2).toUpperCase()
    : 'P';

  const isPending = createRating.isPending || checkOut.isPending;

  return (
    <PageLayout>
      <div className="max-w-md mx-auto flex flex-col gap-6">
        {/* Provider header */}
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-semibold text-primary text-xl">
            {initials}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Rate {provider ? String(provider['display_name']) : 'provider'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{svcName} · R{booking.totalAmount}</p>
          </div>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setScore(star)}
              className="text-4xl transition-transform hover:scale-110 focus:outline-none"
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            >
              <span className={star <= (hovered || score) ? 'text-warning' : 'text-muted'}>
                ★
              </span>
            </button>
          ))}
        </div>

        {/* Tags */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">What went well?</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() =>
                    setSelectedTags((prev) =>
                      active ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/30'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Leave a comment (optional)</p>
          <Textarea
            placeholder="Share your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Escrow release notice */}
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-primary">
            Submitting your rating will release R{booking.totalAmount} to the provider
          </p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={isPending || score === 0}
        >
          {isPending ? 'Submitting…' : 'Submit & release funds'}
        </Button>
      </div>
    </PageLayout>
  );
}
