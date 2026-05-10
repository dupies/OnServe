import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@onserve/types';

interface AuthState {
  user: User | null;
  role: 'customer' | 'provider' | 'admin' | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  init: () => Promise<void>;
  setRole: (role: 'customer' | 'provider' | 'admin') => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,

  setRole: (role) => set({ role }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null });
  },

  init: async () => {
    set({ isLoading: true });

    async function loadUser(supabaseUser: { id: string }) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
      set({
        user: profile as unknown as User,
        role: profile?.role ?? null,
        isLoading: false,
      });
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadUser(session.user);
      } else {
        set({ user: null, role: null, isLoading: false });
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await loadUser(session.user);
        } else {
          set({ user: null, role: null, isLoading: false });
        }
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
