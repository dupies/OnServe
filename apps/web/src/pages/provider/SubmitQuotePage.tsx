import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageLayout } from '@/components/layout/PageLayout';
import { useQuoteRequest, useSubmitQuote } from '@/features/quotes/hooks/useQuotes';
import { toast } from 'sonner';

const DURATION_OPTIONS: { label: string; mins: number }[] = [
  { label: '30 min', mins: 30 },
  { label: '1–2 hrs', mins: 90 },
  { label: 'Half day', mins: 240 },
  { label: 'Full day', mins: 480 },
];

export function SubmitQuotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQuoteRequest(id);
  const submitQuote = useSubmitQuote();

  const [price, setPrice] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    if (!id || !price || parseFloat(price) <= 0) {
      toast.error('Enter a valid price');
      return;
    }
    try {
      await submitQuote.mutateAsync({
        quoteRequestId: id,
        quotedPrice: parseFloat(price),
        estimatedDurationMins: selectedDuration,
        notes: notes.trim() || null,
      });
      toast.success('Quote submitted successfully');
      navigate('/provider/quotes');
    } catch {
      toast.error('Failed to submit quote');
    }
  }

  const svcName = data
    ? (((data as unknown as Record<string, unknown>)['service_types'] as Record<string, unknown> | undefined)?.['name'] as string ?? 'Service')
    : 'Service';

  const depositAmount = price ? parseFloat(price) * 0.2 : 0;

  return (
    <PageLayout>
      <div className="max-w-xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/provider/quotes')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to requests
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Submit quote</h1>
          {data && (
            <p className="text-muted-foreground text-sm mt-1">
              {svcName} · {data.problemDescription.slice(0, 60)}
              {data.problemDescription.length > 60 ? '…' : ''}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="price">Your price (R)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span>
            <Input
              id="price"
              type="number"
              min="0"
              step="10"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-8 text-lg font-semibold text-primary"
              placeholder="0"
            />
          </div>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-2">
          <Label>Estimated duration</Label>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.mins}
                type="button"
                onClick={() => setSelectedDuration(d.mins)}
                className={`py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  selectedDuration === d.mins
                    ? 'border-[#7B6EF6]/30 bg-[#7B6EF6]/10 text-[#7B6EF6]'
                    : 'border-border text-muted-foreground hover:border-[#7B6EF6]/20'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Your note (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Describe your approach, what's included..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Deposit info */}
        {depositAmount > 0 && (
          <div className="bg-[#7B6EF6]/5 border border-[#7B6EF6]/20 rounded-xl px-4 py-3">
            <p className="text-xs text-[#7B6EF6]">
              20% deposit (R {depositAmount.toFixed(0)}) collected from customer if accepted
            </p>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitQuote.isPending || !price}
        >
          {submitQuote.isPending
            ? 'Submitting…'
            : `Submit quote${price ? ` · R ${price}` : ''}`}
        </Button>
      </div>
    </PageLayout>
  );
}
