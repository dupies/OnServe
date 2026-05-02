import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

// Import after mock is registered
const { sendOtp, verifyOtp, getSession, getCurrentUser, signOut, setUserRole } =
  await import('./authService');

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('sendOtp', () => {
  it('calls signInWithOtp with the given phone number', async () => {
    await sendOtp('+27820000000');
    expect(mock.auth.signInWithOtp).toHaveBeenCalledWith({ phone: '+27820000000' });
  });

  it('throws when Supabase returns an error', async () => {
    mock.auth.signInWithOtp.mockResolvedValueOnce({ error: { message: 'Rate limited' } });
    await expect(sendOtp('+27820000000')).rejects.toThrow('Rate limited');
  });
});

describe('verifyOtp', () => {
  it('calls verifyOtp with phone, token and sms type', async () => {
    await verifyOtp('+27820000000', '123456');
    expect(mock.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+27820000000',
      token: '123456',
      type: 'sms',
    });
  });

  it('throws on invalid token', async () => {
    mock.auth.verifyOtp.mockResolvedValueOnce({ error: { message: 'Token has expired or is invalid' } });
    await expect(verifyOtp('+27820000000', '000000')).rejects.toThrow('Token has expired or is invalid');
  });
});

describe('getSession', () => {
  it('returns the session when one exists', async () => {
    const session = { access_token: 'abc', user: { id: 'u1' } };
    mock.auth.getSession.mockResolvedValueOnce({ data: { session }, error: null });
    const result = await getSession();
    expect(result).toEqual(session);
  });

  it('returns null when no session exists', async () => {
    const result = await getSession();
    expect(result).toBeNull();
  });

  it('throws on error', async () => {
    mock.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Network error' } });
    await expect(getSession()).rejects.toThrow('Network error');
  });
});

describe('getCurrentUser', () => {
  it('returns the current user', async () => {
    const user = { id: 'u1', phone: '+27820000000' };
    mock.auth.getUser.mockResolvedValueOnce({ data: { user }, error: null });
    const result = await getCurrentUser();
    expect(result).toEqual(user);
  });

  it('throws on error', async () => {
    mock.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Unauthorized' } });
    await expect(getCurrentUser()).rejects.toThrow('Unauthorized');
  });
});

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    await signOut();
    expect(mock.auth.signOut).toHaveBeenCalled();
  });

  it('throws on error', async () => {
    mock.auth.signOut.mockResolvedValueOnce({ error: { message: 'Sign out failed' } });
    await expect(signOut()).rejects.toThrow('Sign out failed');
  });
});

describe('setUserRole', () => {
  it('saves the role to user metadata', async () => {
    await setUserRole('customer');
    expect(mock.auth.updateUser).toHaveBeenCalledWith({ data: { role: 'customer' } });
  });

  it('works for provider role', async () => {
    await setUserRole('provider');
    expect(mock.auth.updateUser).toHaveBeenCalledWith({ data: { role: 'provider' } });
  });

  it('throws on error', async () => {
    mock.auth.updateUser.mockResolvedValueOnce({ error: { message: 'Update failed' } });
    await expect(setUserRole('customer')).rejects.toThrow('Update failed');
  });
});
