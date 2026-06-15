import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeSupabaseMock, type SupabaseMock } from '@/test/mockSupabase';

let mock: SupabaseMock;
vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
}));

const {
  updateUserStatus,
  updateProviderVerification,
  getAdminOverview,
  getAdminUserDetail,
  getPendingVerifications,
} = await import('./adminService');

beforeEach(() => {
  mock = makeSupabaseMock();
  vi.clearAllMocks();
});

describe('updateUserStatus', () => {
  it('updates account_status with reason and timestamp', async () => {
    mock._setTable('users', [{ id: 'u-1' }]);
    await updateUserStatus('u-1', 'suspended', 'spam');
    const chain = mock.from('users');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ account_status: 'suspended', suspension_reason: 'spam' }),
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'u-1');
  });

  it('clears reason/timestamp when reactivating', async () => {
    mock._setTable('users', [{ id: 'u-1' }]);
    await updateUserStatus('u-1', 'active');
    const chain = mock.from('users');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ account_status: 'active', suspension_reason: null, suspended_at: null }),
    );
  });

  it('throws on supabase error', async () => {
    mock._setTable('users', null, { message: 'denied' });
    await expect(updateUserStatus('u-1', 'banned', 'fraud')).rejects.toThrow('denied');
  });
});

describe('updateProviderVerification', () => {
  it('sets verification_status and verified_at when verified', async () => {
    mock._setTable('provider_profiles', [{ id: 'p-1' }]);
    await updateProviderVerification('p-1', 'verified');
    const chain = mock.from('provider_profiles');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ verification_status: 'verified' }),
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'p-1');
  });

  it('throws on error', async () => {
    mock._setTable('provider_profiles', null, { message: 'nope' });
    await expect(updateProviderVerification('p-1', 'rejected')).rejects.toThrow('nope');
  });
});

describe('getAdminOverview', () => {
  it('returns aggregate counts', async () => {
    mock.rpc = vi.fn().mockResolvedValue({
      data: {
        total_users: 10,
        customers: 6,
        providers: 3,
        admins: 1,
        new_signups_7d: 4,
        pending_verifications: 2,
        open_disputes: 1,
      },
      error: null,
    });
    const overview = await getAdminOverview();
    expect(overview.totalUsers).toBe(10);
    expect(overview.pendingVerifications).toBe(2);
    expect(overview.openDisputes).toBe(1);
  });

  it('throws on error', async () => {
    mock.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    await expect(getAdminOverview()).rejects.toThrow('rpc failed');
  });
});

describe('getAdminUserDetail', () => {
  it('returns the user with related history', async () => {
    mock._setTable('users', { id: 'u-1', full_name: 'Sam', role: 'customer', account_status: 'active' });
    mock._setTable('bookings', []);
    mock._setTable('disputes', []);
    mock._setTable('ratings', []);
    const detail = await getAdminUserDetail('u-1');
    expect(detail.user.id).toBe('u-1');
    expect(Array.isArray(detail.bookings)).toBe(true);
    expect(Array.isArray(detail.disputes)).toBe(true);
    expect(Array.isArray(detail.ratings)).toBe(true);
  });

  it('throws when the user fetch errors', async () => {
    mock._setTable('users', null, { message: 'not found' });
    mock._setTable('bookings', []);
    mock._setTable('disputes', []);
    mock._setTable('ratings', []);
    await expect(getAdminUserDetail('u-1')).rejects.toThrow('not found');
  });
});

describe('getPendingVerifications', () => {
  it('maps pending providers with embedded user data', async () => {
    mock._setTable('provider_profiles', [
      {
        id: 'p-1',
        user_id: 'u-1',
        bio: 'Plumber',
        id_document_url: 'http://doc',
        verification_status: 'pending',
        users: { full_name: 'Sam', created_at: '2026-06-01T00:00:00Z' },
      },
    ]);
    const rows = await getPendingVerifications();
    const chain = mock.from('provider_profiles');
    expect(chain.eq).toHaveBeenCalledWith('verification_status', 'pending');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'p-1',
      userId: 'u-1',
      fullName: 'Sam',
      idDocumentUrl: 'http://doc',
      bio: 'Plumber',
      createdAt: '2026-06-01T00:00:00Z',
    });
  });

  it('throws on error', async () => {
    mock._setTable('provider_profiles', null, { message: 'boom' });
    await expect(getPendingVerifications()).rejects.toThrow('boom');
  });
});
