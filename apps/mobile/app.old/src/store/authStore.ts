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
  refreshUser: () => Promise<void>;
}

let _subscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isLoading: true,

  setRole: (role) => set({ role }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, role: null });
  },

  refreshUser: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    set({
      user: profile as unknown as User,
      role: (profile as Record<string, unknown>)?.['role'] as AuthState['role'] ?? null,
    });
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
        role: (profile as Record<string, unknown>)?.['role'] as AuthState['role'] ?? null,
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

      // Unsubscribe any previous listener before registering a new one
      _subscription?.unsubscribe();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          set({ isLoading: true });
          await loadUser(newSession.user);
        } else {
          set({ user: null, role: null, isLoading: false });
        }
      });
      _subscription = subscription;
    } catch {
      set({ isLoading: false });
    }
  },
}));
