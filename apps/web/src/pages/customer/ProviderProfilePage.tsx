import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, CheckCircle, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useProviderProfile } from '@/features/providers/hooks/useProviders';

export function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: provider, isLoading, error } = useProviderProfile(id);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="animate-pulse flex flex-col gap-4 max-w-3xl">
          <div className="h-4 bg-card rounded w-24" />
          <div className="h-20 w-20 rounded-full bg-card" />
          <div className="h-5 bg-card rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-card rounded-xl" />)}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error || !provider) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-muted-foreground">Provider not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </PageLayout>
    );
  }

  const initials = `P${provider.userId.slice(0, 1).toUpperCase()}`;

  return (
    <PageLayout>
      <div className="max-w-4xl flex flex-col gap-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to search
        </button>

        <div className="grid grid-cols-[1fr_300px] gap-8">
          {/* Left: provider info */}
          <div className="flex flex-col gap-6">
            {/* Identity */}
            <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-semibold text-primary">{initials}</span>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-foreground">Service Provider</h1>
                <p className="text-sm text-muted-foreground mt-0.5">General service specialist</p>
                <div className="flex items-center gap-3 mt-3">
                  {provider.verificationStatus === 'verified' && (
                    <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-sm text-warning">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {provider.ratingAverage.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Jobs completed', value: provider.totalJobsCompleted, icon: Briefcase },
                { label: 'Completion rate', value: `${Math.round(provider.completionRate * 100)}%`, highlight: true },
                { label: 'Trust score', value: `${provider.reputationScore}/100`, highlight: true },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className={`text-2xl font-semibold ${s.highlight ? 'text-primary' : 'text-foreground'}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Reputation bar */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">Reputation score</p>
                <span className="text-sm text-primary font-medium">{provider.reputationScore}/100</span>
              </div>
              <Progress value={provider.reputationScore} className="h-2" />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>Completion rate: {Math.round(provider.completionRate * 100)}%</span>
                <span>Dispute rate: {provider.disputeRate < 0.05 ? 'Low' : 'Medium'}</span>
              </div>
            </div>

            {/* Bio */}
            {provider.bio && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-medium text-foreground mb-2">About</p>
                <p className="text-sm text-muted-foreground">{provider.bio}</p>
              </div>
            )}
          </div>

          {/* Right: booking card */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Book this provider</h2>
              <Separator className="mb-4" />
              <div className="flex flex-col gap-3 mb-6 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="text-warning font-medium">★ {provider.ratingAverage.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jobs done</span>
                  <span className="text-foreground">{provider.totalJobsCompleted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10">
                    Available
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => navigate(`/book/${id}`)}>
                  Book now
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate(`/quote-request?providerId=${id}`)}>
                  Request quote
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
