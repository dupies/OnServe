import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AppShell } from '@/components/layout/AppShell';

const PLATFORM_FEE = 22.5;
const SERVICE_FEE = 450;
const TOTAL = SERVICE_FEE + PLATFORM_FEE;

export function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handlePay() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    navigate('/bookings');
  }

  return (
    <AppShell className="px-4 pt-4 pb-8 gap-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground">9:41</span>
      </div>

      <h1 className="text-xl font-semibold text-foreground">Confirm &amp; pay</h1>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
        {[
          { label: 'Service', value: 'Deep clean · 3 bed' },
          { label: 'Provider', value: 'Zanele M.' },
          { label: 'Date', value: 'Fri 2 May · 10:00' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className="text-xs text-foreground">{row.value}</span>
          </div>
        ))}
        <div className="flex items-start justify-between">
          <span className="text-xs text-muted-foreground">Location</span>
          <div className="text-right">
            <p className="text-xs text-foreground">14 Maple Cres.</p>
            <Badge variant="outline" className="text-[9px] h-4 text-primary border-primary/30 bg-primary/10 mt-1">
              Trusted
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Service fee</span>
          <span className="text-xs text-foreground">R {SERVICE_FEE}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Platform fee</span>
          <span className="text-xs text-foreground">R {PLATFORM_FEE}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-base font-semibold text-primary">R {TOTAL}</span>
        </div>
      </div>

      <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3">
        <p className="text-xs text-warning">Funds held in escrow until job approved</p>
      </div>

      <div className="mt-auto">
        <Button className="w-full" onClick={handlePay} disabled={loading}>
          {loading ? 'Processing…' : `Pay R ${TOTAL}`}
        </Button>
      </div>
    </AppShell>
  );
}
