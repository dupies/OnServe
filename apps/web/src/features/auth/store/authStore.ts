import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@onserve/types';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, role: null, isLoading: false }),
}));
