import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface UseAuthReturn {
  sendOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (phone: string, token: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession, refreshUser } = useAuthStore();

  const sendOtp = async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Ensure phone is in international format
      const phoneNumber = phone.startsWith('+') ? phone : `+${phone}`;

      const { error: err } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (err) {
        throw new Error(err.message || 'Failed to send OTP');
      }

      return true;
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred while sending OTP';
      setError(errorMessage);
      console.error('Send OTP error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (phone: string, token: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Ensure phone is in international format
      const phoneNumber = phone.startsWith('+') ? phone : `+${phone}`;

      const { data, error: err } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token,
        type: 'sms',
      });

      if (err) {
        throw new Error(err.message || 'Failed to verify OTP');
      }

      if (data?.session) {
        setSession(data.session);
        // Refresh user data from database
        await refreshUser();
      }

      return true;
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred while verifying OTP';
      setError(errorMessage);
      console.error('Verify OTP error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signOut();
      if (err) {
        throw new Error(err.message || 'Failed to sign out');
      }
      // Clear auth store
      const store = useAuthStore.getState();
      await store.signOut();
    } catch (err: any) {
      const errorMessage = err?.message || 'An error occurred while signing out';
      setError(errorMessage);
      console.error('Sign out error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendOtp,
    verifyOtp,
    signOut,
    loading,
    error,
  };
}
