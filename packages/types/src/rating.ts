export interface Rating {
  id: string;
  bookingId: string;
  ratedByUserId: string;
  ratedUserId: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  isProviderRating: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'booking' | 'payment' | 'rating' | 'dispute' | 'system';
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
