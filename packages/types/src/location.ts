export type TrustLevel = 'unverified' | 'low' | 'medium' | 'high';

export interface SavedLocation {
  id: string;
  userId: string;
  label: 'Home' | 'Work' | 'Other';
  customName: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  visitCount: number;
  trustScore: number;
  isDefault: boolean;
  createdAt: string;
}

export interface LocationEvent {
  id: string;
  userId: string;
  bookingId: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  trustLevel: TrustLevel;
  capturedAt: string;
}
