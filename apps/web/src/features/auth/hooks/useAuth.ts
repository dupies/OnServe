import { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '@onserve/types';

export function useAuthInit() {
  const { setUser, setRole, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setUser(user);
      setRole((user?.user_metadata?.['role'] as UserRole) ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      setRole((user?.user_metadata?.['role'] as UserRole) ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, [setUser, setRole, setLoading]);
}

export function useAuth() {
  return useAuthStore();
}
