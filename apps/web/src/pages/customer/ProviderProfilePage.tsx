import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { AppShell } from '@/components/layout/AppShell';
import { useProviderProfile } from '@/features/providers/hooks/useProviders';

export function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: provider, isLoading, error } = useProviderProfile(id);

  if (isLoading) {
    return (
      <AppShell className="px-4 pt-4 pb-8 gap-5">
        <div className="animate-pulse space-y-4">
          <div className="h-14 w-14 rounded-full bg-card" />
          <div className="h-4 bg-card rounded w-40" />
          <div className="h-4 bg-card rounded w-24" />
        </div>
      </AppShell>
    );
  }

  if (error || !provider) {
    return (
      <AppShell className="px-4 pt-16 pb-8 items-center gap-4">
        <p className="text-muted-foreground text-sm">Provider not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
      </AppShell>
    );
  }

  const initials = `P${provider.userId.slice(0, 1).toUpperCase()}`;

  return (
    <AppShell className="px-4 pt-4 pb-8 gap-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground">Profile</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-base font-semibold text-primary">{initials}</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Provider</h1>
          <p className="text-xs text-muted-foreground">Service specialist</p>
          <div className="flex items-center gap-2 mt-1">
            {provider.verificationStatus === 'verified' && (
              <Badge variant="outline" className="text-[10px] h-5 text-primary border-primary/30 bg-primary/10">
                Verified
              </Badge>
            )}
            <span className="text-xs text-warning">★ {provider.ratingAverage.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Jobs', value: provider.totalJobsCompleted },
          { label: 'Done', value: `${Math.round(provider.completionRate * 100)}%`, highlight: true },
          { label: 'Trust', value: provider.reputationScore, highlight: true },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg py-3 text-center">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className={`text-sm font-semibold mt-0.5 ${s.highlight ? 'text-primary' : 'text-foreground'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Trust score</p>
          <span className="text-xs text-primary">{provider.reputationScore}/100</span>
        </div>
        <Progress value={provider.reputationScore} className="h-1.5" />
      </div>

      <Separator />

      <div className="flex flex-col gap-2 mt-auto">
        <Button className="w-full" onClick={() => navigate(`/book/${id}`)}>
          Book now
        </Button>
        <Button variant="outline" className="w-full">
          Request quote
        </Button>
      </div>
    </AppShell>
  );
}
