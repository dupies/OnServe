import { useNavigate } from 'react-router-dom';
import { Edit, MapPin, Bell, CreditCard, LogOut, FileText, DollarSign, Settings, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuthStore } from '@/features/auth/store/authStore';

const CUSTOMER_MENU = [
  {
    heading: 'Account',
    items: [
      { label: 'Edit profile', description: 'Update your name and contact details', to: '/profile/edit', icon: Edit },
      { label: 'Payment methods', description: 'Manage cards and payment options', to: '/profile/payments', icon: CreditCard },
      { label: 'Saved locations', description: 'Home, work, and other addresses', to: '/profile/locations', icon: MapPin },
    ],
  },
  {
    heading: 'Preferences',
    items: [
      { label: 'Notifications', description: 'Booking alerts and updates', to: '/notifications', icon: Bell },
      { label: 'Settings', description: 'Privacy, account, and data', to: '/settings', icon: Settings },
    ],
  },
];

const PROVIDER_MENU = [
  {
    heading: 'Provider',
    items: [
      { label: 'Edit profile', description: 'Update your name and bio', to: '/profile/edit', icon: Edit },
      { label: 'My services', description: 'Manage what you offer', to: '/provider/quotes', icon: FileText },
      { label: 'Reputation', description: 'Ratings, completion rate and scores', to: '/provider/reputation', icon: BarChart2 },
      { label: 'Bank account', description: 'Payout settings', to: '/provider/payout', icon: DollarSign },
    ],
  },
  {
    heading: 'Preferences',
    items: [
      { label: 'Notifications', description: 'Job alerts and updates', to: '/notifications', icon: Bell },
      { label: 'Settings', description: 'Privacy, account, and data', to: '/settings', icon: Settings },
    ],
  },
];

export function ProfilePage() {
  const { user, role, signOut } = useAuthStore();
  const navigate = useNavigate();
  const isProvider = role === 'provider';
  const MENU_SECTIONS = isProvider ? PROVIDER_MENU : CUSTOMER_MENU;

  const fullName = (user?.user_metadata?.['full_name'] as string | undefined) ?? 'User';
  const initials = fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const phone = user?.phone ?? (user?.user_metadata?.['phone'] as string | undefined) ?? '';
  const email = user?.email ?? '';
  const avatarUrl = user?.user_metadata?.['avatar_url'] as string | undefined;

  return (
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          {/* Left: identity card */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-primary/10 flex-shrink-0">
                {avatarUrl
                  ? <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  : <span className="text-2xl font-semibold text-primary">{initials}</span>}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{fullName}</h2>
                {email && <p className="text-sm text-muted-foreground mt-0.5">{email}</p>}
                {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10">
                  {isProvider ? 'Provider' : 'Active'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/profile/edit')}
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit profile
              </Button>
            </div>

            {/* Reputation score */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">Reputation</p>
                <span className="text-sm font-semibold text-primary">80/100</span>
              </div>
              <Progress value={80} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">Good standing — keep it up</p>
            </div>
          </div>

          {/* Right: menu sections */}
          <div className="flex flex-col gap-5">
            {MENU_SECTIONS.map((section) => (
              <section key={section.heading}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  {section.heading}
                </h3>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {section.items.map((item, i) => (
                    <div key={item.to}>
                      {i > 0 && <Separator />}
                      <button
                        onClick={() => navigate(item.to)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        </div>
                        <span className="text-muted-foreground text-sm" aria-hidden>›</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-sm font-medium text-destructive">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
