import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Briefcase, TrendingUp, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useProviderProfile } from '@/features/providers/hooks/useProviders';

function ScoreRing({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? 'text-primary' : value >= 50 ? 'text-warning' : 'text-destructive';
  return (
    <div className="flex flex-col items-center gap-1">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ProviderReputationPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: profile, isLoading, error } = useProviderProfile(user?.id);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-2xl animate-pulse flex flex-col gap-4">
          <div className="h-4 bg-card rounded w-24" />
          <div className="h-32 bg-card rounded-xl" />
          <div className="h-48 bg-card rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (error || !profile) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-muted-foreground text-sm">No provider profile found</p>
        </div>
      </PageLayout>
    );
  }

  const reputationLabel =
    profile.reputationScore >= 80
      ? 'Excellent standing'
      : profile.reputationScore >= 60
      ? 'Good standing'
      : profile.reputationScore >= 40
      ? 'Fair — room to improve'
      : 'Needs attention';

  const disputeRisk = profile.disputeRate < 0.03 ? 'Low' : profile.disputeRate < 0.08 ? 'Medium' : 'High';
  const disputeColor = profile.disputeRate < 0.03 ? 'text-primary' : profile.disputeRate < 0.08 ? 'text-warning' : 'text-destructive';

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to profile
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">My reputation</h1>
          <Badge
            variant="outline"
            className={`text-xs ${
              profile.reputationScore >= 80
                ? 'text-primary border-primary/30 bg-primary/10'
                : profile.reputationScore >= 60
                ? 'text-warning border-warning/30 bg-warning/10'
                : 'text-destructive border-destructive/30 bg-destructive/10'
            }`}
          >
            {reputationLabel}
          </Badge>
        </div>

        {/* Score card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-foreground">Overall reputation score</p>
            <span className="text-2xl font-bold text-primary">{profile.reputationScore}/100</span>
          </div>
          <Progress value={profile.reputationScore} className="h-3 mb-3" />
          <p className="text-xs text-muted-foreground">{reputationLabel}</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <ScoreRing value={Math.round(profile.ratingAverage * 20)} label="Rating score" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <ScoreRing value={Math.round(profile.completionRate * 100)} label="Completion %" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <ScoreRing value={Math.round((1 - profile.noShowRate) * 100)} label="Show-up %" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold ${disputeColor}`}>{disputeRisk}</p>
            <p className="text-xs text-muted-foreground">Dispute risk</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-foreground">Breakdown</h2>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-foreground">Average rating</p>
                <span className="text-sm font-semibold text-foreground">
                  {profile.ratingAverage.toFixed(1)} / 5
                </span>
              </div>
              <Progress value={profile.ratingAverage * 20} className="h-1.5" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-foreground">Completion rate</p>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round(profile.completionRate * 100)}%
                </span>
              </div>
              <Progress value={profile.completionRate * 100} className="h-1.5" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-foreground">No-show rate</p>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round(profile.noShowRate * 100)}%
                </span>
              </div>
              <Progress value={profile.noShowRate * 100} className="h-1.5" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-foreground">Dispute rate</p>
                <span className={`text-sm font-semibold ${disputeColor}`}>
                  {(profile.disputeRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={profile.disputeRate * 100} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Summary stat */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{profile.totalJobsCompleted}</p>
            <p className="text-sm text-muted-foreground">Jobs completed</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
