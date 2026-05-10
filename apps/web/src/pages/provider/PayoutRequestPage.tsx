import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useProviderBookings } from '@/features/bookings/hooks/useBookings';
import { toast } from 'sonner';

const MOCK_BANK = { name: 'FNB Current', last4: '8821', bank: 'FNB' };

export function PayoutRequestPage() {
  const navigate = useNavigate();
  const { data: bookings = [] } = useProviderBookings();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const totalEarned = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const available = Math.max(0, totalEarned - 1200);

  function setMax() {
    setAmount(available.toFixed(0));
  }

  async function handleRequest() {
    const requested = parseFloat(amount);
    if (!amount || requested <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (requested > available) {
      toast.error(`Maximum available is R ${available}`);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    toast.success('Payout request submitted — processed within 1–2 business days');
    navigate('/provider/earnings');
  }

  return (
    <PageLayout>
      <div className="max-w-md flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/provider/earnings')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to earnings
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Request payout</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Available: <span className="text-primary font-semibold">R {available.toLocaleString()}</span>
          </p>
        </div>

        {/* Amount input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount">Amount (R)</Label>
            <button onClick={setMax} className="text-xs text-primary hover:text-primary/80 transition-colors">
              Max (R {available.toLocaleString()})
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-primary pointer-events-none">R</span>
            <Input
              id="amount"
              type="number"
              min="0"
              max={available}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10 text-2xl font-semibold text-primary h-14"
              placeholder="0"
            />
          </div>
        </div>

        {/* Bank account */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Pay to</h2>
          <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 bg-muted border border-border rounded flex items-center justify-center">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{MOCK_BANK.name}</p>
                <p className="text-xs text-muted-foreground">•••• {MOCK_BANK.last4}</p>
              </div>
            </div>
            <span className="text-xs text-primary font-medium border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-full">
              Default
            </span>
          </div>
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-3">
            + Add another account
          </button>
        </div>

        {/* Summary */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Summary</h2>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payout amount</span>
              <span className="text-sm font-semibold text-foreground">R {parseFloat(amount).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Processing fee</span>
              <span className="text-sm text-foreground">Free</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">You receive</span>
              <span className="text-lg font-semibold text-primary">R {parseFloat(amount).toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Processing notice */}
        <div className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
          <Clock className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-xs text-warning">Payouts are processed within 1–2 business days</p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleRequest}
          disabled={loading || !amount || parseFloat(amount) <= 0}
        >
          {loading ? 'Submitting…' : 'Request payout'}
        </Button>
      </div>
    </PageLayout>
  );
}
