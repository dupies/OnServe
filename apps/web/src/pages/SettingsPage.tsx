import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuthStore } from '@/features/auth/store/authStore';

export function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const [bookingAlerts, setBookingAlerts] = useState(true);
  const [promoAlerts, setPromoAlerts] = useState(false);

  return (
    <PageLayout>
      <div className="max-w-xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        {/* Account */}
        <SettingsSection heading="Account">
          <SettingsLink label="Edit profile" onClick={() => navigate('/profile/edit')} />
          <SettingsLink label="Phone number" onClick={() => navigate('/profile/edit')} />
          <SettingsLink label="Payment methods" onClick={() => navigate('/profile/payments')} />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection heading="Notifications">
          <SettingsToggle
            label="Booking updates"
            description="Confirmations, check-ins, and completions"
            value={bookingAlerts}
            onChange={setBookingAlerts}
          />
          <SettingsToggle
            label="Promotions"
            description="Deals and platform news"
            value={promoAlerts}
            onChange={setPromoAlerts}
          />
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection heading="Privacy">
          <SettingsLink label="Location data" description="Manage how we use your location" onClick={() => {}} />
          <SettingsLink label="Data export" description="Download a copy of your data" onClick={() => {}} />
        </SettingsSection>

        {/* Danger zone */}
        <SettingsSection heading="Account actions">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface transition-colors"
          >
            <span className="text-sm font-medium text-muted-foreground">Sign out</span>
          </button>
          <Separator />
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <span className="text-sm font-medium text-destructive">Delete account</span>
          </button>
        </SettingsSection>
      </div>
    </PageLayout>
  );
}

function SettingsSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        {heading}
      </p>
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

function SettingsLink({
  label,
  description,
  onClick,
}: {
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface transition-colors"
    >
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <span className="text-muted-foreground text-sm" aria-hidden>›</span>
    </button>
  );
}

function SettingsToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-primary' : 'bg-muted'}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
