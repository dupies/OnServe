import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, User, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { getAdminUsers, updateUserRole } from '@/features/admin/services/adminService';
import { format } from 'date-fns';
import type { User as UserType } from '@onserve/types';

const ROLE_META: Record<UserType['role'], { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  customer: { label: 'Customer', icon: User, color: 'text-foreground border-border bg-card' },
  provider: { label: 'Provider', icon: Wrench, color: 'text-primary border-primary/30 bg-primary/10' },
  admin: { label: 'Admin', icon: Shield, color: 'text-warning border-warning/30 bg-warning/10' },
};

const ROLES: UserType['role'][] = ['customer', 'provider', 'admin'];

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserType['role'] | 'all'>('all');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
  });

  const { mutate: changeRole } = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserType['role'] }) =>
      updateUserRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone ?? '').includes(search);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <PageLayout>
      <div className="max-w-5xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{users.length} total registered users</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="flex items-center gap-1">
            {(['all', ...ROLES] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  roleFilter === r
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === 'all' ? 'All' : ROLE_META[r].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No users found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Change role
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const { icon: RoleIcon, color } = ROLE_META[u.role];
                  const initials = u.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-border last:border-0 hover:bg-surface transition-colors ${
                        i % 2 === 0 ? '' : 'bg-surface/30'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">{initials}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.fullName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-foreground">{u.email ?? '—'}</p>
                        {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {ROLE_META[u.role].label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">
                        {format(new Date(u.createdAt), 'dd MMM yyyy')}
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            changeRole({ userId: u.id, role: e.target.value as UserType['role'] })
                          }
                          className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/40"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
