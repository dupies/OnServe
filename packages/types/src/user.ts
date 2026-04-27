export type UserRole = 'customer' | 'provider' | 'admin';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  bio: string | null;
  idDocumentUrl: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  ratingAverage: number;
  totalJobsCompleted: number;
  completionRate: number;
  noShowRate: number;
  disputeRate: number;
  reputationScore: number;
  verifiedAt: string | null;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  cancellationRate: number;
  disputeAbuseScore: number;
  locationTrustScore: number;
  reputationScore: number;
}
