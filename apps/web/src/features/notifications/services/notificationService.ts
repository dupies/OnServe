import { supabase } from '../../../lib/supabase';

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

export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((n) => ({
    id: n.id,
    userId: n.user_id,
    title: n.title,
    body: n.body,
    type: n.type,
    metadata: n.metadata ?? {},
    isRead: n.is_read,
    createdAt: n.created_at,
  }));
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}
