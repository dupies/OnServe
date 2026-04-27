import type { TrustLevel } from '@onserve/types';

export function getTrustLevel(score: number): TrustLevel {
  if (score === 0) return 'unverified';
  if (score < 30) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

export function getTrustLabel(level: TrustLevel): string {
  const labels: Record<TrustLevel, string> = {
    unverified: 'Unverified location',
    low: 'New area',
    medium: 'Building trust',
    high: 'Trusted',
  };
  return labels[level];
}
