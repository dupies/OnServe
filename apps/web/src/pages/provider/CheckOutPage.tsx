import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useBooking, useCheckOut } from '@/features/bookings/hooks/useBookings';
import { formatDistanceStrict } from 'date-fns';

export function CheckOutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking } = useBooking(id);
  const checkOut = useCheckOut();

  const checkedInAt = booking?.providerCheckedInAt
    ? new Date(booking.providerCheckedInAt)
    : null;
  const elapsed = checkedInAt ? formatDistanceStrict(new Date(), checkedInAt) : '—';

  async function handleConfirm() {
    if (!id) return;
    try {
      await checkOut.mutateAsync(id);
      toast.success('Job complete — awaiting customer approval');
      navigate('/provider/jobs');
    } catch {
      toast.error('Failed to check out');
    }
  }

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Check out</h1>
          <p className="text-muted-foreground text-sm mt-1">Confirm the job is complete</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Job complete?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Confirming will notify the customer to approve and release payment from escrow.
            </p>
          </div>

          {booking && (
            <>
              <Separator className="w-full" />
              <div className="w-full flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-semibold text-primary">{elapsed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payment (escrowed)</span>
                  <span className="text-sm font-semibold text-primary">R {booking.totalAmount}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button className="w-full" size="lg" onClick={handleConfirm} disabled={checkOut.isPending}>
            {checkOut.isPending ? 'Confirming…' : 'Confirm check-out'}
          </Button>
          <Button className="w-full" variant="outline" onClick={() => navigate(-1)}>
            Not yet — go back
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Payment will be released once the customer approves the completed job.
        </p>
      </div>
    </PageLayout>
  );
}
