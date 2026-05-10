import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageLayout } from '@/components/layout/PageLayout';
import { useBooking } from '@/features/bookings/hooks/useBookings';
import { useCreateDispute } from '@/features/disputes/hooks/useDisputes';
import { disputeSchema, type DisputeInput } from '@onserve/shared';
import { toast } from 'sonner';

const REASONS: { value: DisputeInput['reason']; label: string }[] = [
  { value: 'work_not_completed', label: 'Work not completed' },
  { value: 'quality_not_acceptable', label: 'Quality not acceptable' },
  { value: 'provider_no_show', label: 'Provider no-show' },
];

export function DisputeFormPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { data: booking } = useBooking(bookingId);
  const createDispute = useCreateDispute();

  const form = useForm<DisputeInput>({
    resolver: zodResolver(disputeSchema),
    defaultValues: {
      reason: 'work_not_completed',
      description: '',
    },
  });

  async function onSubmit(values: DisputeInput) {
    if (!bookingId) return;
    try {
      const dispute = await createDispute.mutateAsync({ bookingId, input: values });
      toast.success('Dispute raised — funds are frozen pending review');
      navigate(`/disputes/${dispute.id}`);
    } catch {
      toast.error('Failed to raise dispute');
    }
  }

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
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <h1 className="text-2xl font-semibold text-destructive">Raise a dispute</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            Funds will be frozen until an admin resolves the issue.
          </p>
        </div>

        {/* Booking summary */}
        {booking && (
          <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Booking</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {((booking as unknown as Record<string, unknown>)['serviceType'] as Record<string, unknown> | undefined)?.['name'] as string ?? 'Service'}
              </p>
            </div>
            <span className="text-base font-semibold text-destructive">R {booking.totalAmount} held</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <div className="flex flex-col gap-2">
                    {REASONS.map((r) => {
                      const selected = field.value === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => field.onChange(r.value)}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                            selected
                              ? 'border-destructive/30 bg-destructive/10'
                              : 'border-border hover:border-destructive/20'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              selected ? 'border-destructive' : 'border-muted-foreground'
                            }`}
                          >
                            {selected && <div className="w-2 h-2 rounded-full bg-destructive" />}
                          </div>
                          <span className={`text-sm font-medium ${selected ? 'text-destructive' : 'text-foreground'}`}>
                            {r.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe what happened</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide details so the admin can review fairly..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              size="lg"
              disabled={createDispute.isPending}
            >
              {createDispute.isPending ? 'Submitting…' : 'Submit dispute'}
            </Button>
          </form>
        </Form>
      </div>
    </PageLayout>
  );
}
