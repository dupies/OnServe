import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppShell } from '@/components/layout/AppShell';
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
    <AppShell className="px-4 pt-4 pb-8 items-center gap-6">
      <div className="w-full flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="text-center mt-4">
        <h1 className="text-xl font-semibold text-foreground">Check out</h1>
        <p className="text-sm text-muted-foreground mt-1">Confirm job complete</p>
      </div>

      <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex flex-col items-center justify-center gap-1 my-2">
        <svg width="32" height="32" fill="none" viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="12" stroke="var(--primary)" strokeWidth="1.5" />
          <path
            d="M10 16l4.5 4.5L22 11"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[10px] text-primary">Confirm below</span>
      </div>

      {booking && (
        <div className="bg-card border border-border rounded-xl p-4 w-full flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Duration</span>
            <span className="text-sm font-semibold text-primary">{elapsed}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Payment</span>
            <span className="text-sm font-semibold text-primary">R {booking.totalAmount}</span>
          </div>
        </div>
      )}

      <div className="mt-auto w-full">
        <Button className="w-full" onClick={handleConfirm} disabled={checkOut.isPending}>
          {checkOut.isPending ? 'Confirming…' : 'Confirm check-out'}
        </Button>
      </div>
    </AppShell>
  );
}
