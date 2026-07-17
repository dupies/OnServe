import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@onserve/types';
import { supabase } from '@/lib/supabase';

export interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  pendingPhone: string | null;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  setPendingPhone: (phone: string | null) => void;
  reset: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  pendingPhone: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  setPendingPhone: (pendingPhone) => set({ pendingPhone }),
  reset: () => set({ user: null, role: null, isLoading: false, pendingPhone: null }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null, pendingPhone: null });
  },
}));
