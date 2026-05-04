import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';

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
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Confirm &amp; pay</h1>
          <p className="text-muted-foreground text-sm mt-1">Review your booking before payment</p>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Booking summary */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Booking details</h2>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Service', value: 'Deep clean · 3 bed' },
                  { label: 'Provider', value: 'Zanele M.' },
                  { label: 'Date', value: 'Fri 2 May · 10:00' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm text-foreground">{row.value}</span>
                  </div>
                ))}
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground">Location</span>
                  <div className="text-right">
                    <p className="text-sm text-foreground">14 Maple Crescent, Sandton</p>
                    <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30 bg-primary/10 mt-1">
                      Trusted area
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-xl px-5 py-4">
              <Shield className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-sm text-warning">
                Funds are held in escrow and only released when you approve the completed job
              </p>
            </div>
          </div>

          {/* Payment card */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">Payment summary</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Service fee</span>
                <span className="text-foreground">R {SERVICE_FEE}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform fee (5%)</span>
                <span className="text-foreground">R {PLATFORM_FEE}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-lg font-semibold text-primary">R {TOTAL}</span>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handlePay} disabled={loading}>
              {loading ? 'Processing…' : `Pay R ${TOTAL} (escrow)`}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Secured by Yoco · Payment held in escrow until job completion
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
