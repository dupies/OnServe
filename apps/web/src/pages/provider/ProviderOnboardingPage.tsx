import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { useAllServiceTypes } from '@/features/services/hooks/useServices';

const TOTAL_STEPS = 4;

// ── Step 1 schema ─────────────────────────────────────────────────────────────
const profileSchema = z.object({
  displayName: z.string().min(2, 'Enter your full name'),
  bio: z.string().max(300, 'Keep bio under 300 characters').optional(),
});
type ProfileInput = z.infer<typeof profileSchema>;

// ── Step tracker ─────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`flex-1 h-1 rounded-full transition-colors ${
            i < step ? 'bg-[#7B6EF6]' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

// ── Step 1: Profile ───────────────────────────────────────────────────────────
function Step1Profile({ onNext }: { onNext: (data: ProfileInput) => void }) {
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-[#7B6EF6] font-medium mb-1">Step 1 of {TOTAL_STEPS}</p>
          <h1 className="text-xl font-semibold text-foreground">Set up your profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Customers will see this when booking you</p>
        </div>

        {/* Avatar placeholder */}
        <div className="flex justify-center py-2">
          <div className="w-20 h-20 rounded-full bg-[#7B6EF6]/10 border-2 border-dashed border-[#7B6EF6]/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-[#7B6EF6]/15 transition-colors">
            <Upload className="w-5 h-5 text-[#7B6EF6]" />
            <span className="text-[10px] text-[#7B6EF6]">Photo</span>
          </div>
        </div>

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl><Input placeholder="Zanele Mokoena" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell customers a bit about yourself and your experience…"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-[#7B6EF6] hover:bg-[#7B6EF6]/90 mt-2">
          Next: verify identity
        </Button>
      </form>
    </Form>
  );
}

// ── Step 2: ID Verification ───────────────────────────────────────────────────
function Step2ID({ onNext }: { onNext: () => void }) {
  const [frontUploaded, setFrontUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-[#7B6EF6] font-medium mb-1">Step 2 of {TOTAL_STEPS}</p>
        <h1 className="text-xl font-semibold text-foreground">Verify your identity</h1>
        <p className="text-sm text-muted-foreground mt-1">Required to accept bookings on OnServe</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">SA ID document</p>
            <p className="text-xs text-muted-foreground mt-0.5">Front of your South African ID</p>
          </div>
          {frontUploaded
            ? <CheckCircle className="w-5 h-5 text-primary" />
            : <span className="text-[10px] text-warning border border-warning/30 bg-warning/10 rounded-full px-2 py-0.5">Required</span>
          }
        </div>
        <button
          onClick={() => setFrontUploaded(true)}
          className={`w-full border border-dashed rounded-xl py-6 text-sm flex flex-col items-center gap-2 transition-colors ${
            frontUploaded
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-[#7B6EF6]/30 hover:bg-[#7B6EF6]/5 hover:text-[#7B6EF6]'
          }`}
        >
          <Upload className="w-4 h-4" />
          {frontUploaded ? 'ID uploaded ✓' : 'Upload front of ID'}
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Selfie with ID</p>
            <p className="text-xs text-muted-foreground mt-0.5">Hold your ID next to your face</p>
          </div>
          {selfieUploaded
            ? <CheckCircle className="w-5 h-5 text-primary" />
            : <span className="text-[10px] text-warning border border-warning/30 bg-warning/10 rounded-full px-2 py-0.5">Required</span>
          }
        </div>
        <button
          onClick={() => setSelfieUploaded(true)}
          className={`w-full border border-dashed rounded-xl py-6 text-sm flex flex-col items-center gap-2 transition-colors ${
            selfieUploaded
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-[#7B6EF6]/30 hover:bg-[#7B6EF6]/5 hover:text-[#7B6EF6]'
          }`}
        >
          <Upload className="w-4 h-4" />
          {selfieUploaded ? 'Selfie uploaded ✓' : 'Take selfie with ID'}
        </button>
      </div>

      <div className="bg-[#7B6EF6]/5 border border-[#7B6EF6]/20 rounded-xl px-4 py-3">
        <p className="text-xs text-[#7B6EF6]">Verification takes 2–24 hours. You can still browse the platform while we review.</p>
      </div>

      <Button
        className="w-full bg-[#7B6EF6] hover:bg-[#7B6EF6]/90"
        onClick={onNext}
        disabled={!frontUploaded || !selfieUploaded}
      >
        Submit for verification
      </Button>
    </div>
  );
}

// ── Step 3: Services ──────────────────────────────────────────────────────────
function Step3Services({ onNext }: { onNext: (services: string[]) => void }) {
  const { data: serviceTypes = [] } = useAllServiceTypes();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-[#7B6EF6] font-medium mb-1">Step 3 of {TOTAL_STEPS}</p>
        <h1 className="text-xl font-semibold text-foreground">What do you offer?</h1>
        <p className="text-sm text-muted-foreground mt-1">Select the services you provide</p>
      </div>

      <div className="flex flex-col gap-2">
        {serviceTypes.length === 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {serviceTypes.map((s) => {
              const active = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`text-left border rounded-xl p-3 transition-colors ${
                    active
                      ? 'border-[#7B6EF6]/40 bg-[#7B6EF6]/10'
                      : 'border-border bg-card hover:border-[#7B6EF6]/20'
                  }`}
                >
                  <p className={`text-sm font-medium ${active ? 'text-[#7B6EF6]' : 'text-foreground'}`}>
                    {s.name}
                  </p>
                  {s.basePrice && (
                    <p className="text-xs text-muted-foreground mt-0.5">from R {s.basePrice}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button
        className="w-full bg-[#7B6EF6] hover:bg-[#7B6EF6]/90 mt-2"
        onClick={() => onNext(selected)}
        disabled={selected.length === 0}
      >
        Next: set availability
      </Button>
    </div>
  );
}

// ── Step 4: Availability & Radius ─────────────────────────────────────────────
function Step4Availability({ onSubmit, loading }: { onSubmit: () => void; loading: boolean }) {
  const [days, setDays] = useState({ mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false });
  const [radius, setRadius] = useState(10);

  const dayLabels: (keyof typeof days)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-[#7B6EF6] font-medium mb-1">Step 4 of {TOTAL_STEPS}</p>
        <h1 className="text-xl font-semibold text-foreground">Availability &amp; area</h1>
        <p className="text-sm text-muted-foreground mt-1">Set when and how far you'll travel</p>
      </div>

      {/* Days */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Working days</h2>
        <div className="flex flex-col gap-2">
          {dayLabels.map((d) => (
            <div key={d} className="flex items-center justify-between">
              <span className="text-sm text-foreground capitalize">
                {d === 'mon' ? 'Monday' : d === 'tue' ? 'Tuesday' : d === 'wed' ? 'Wednesday' :
                 d === 'thu' ? 'Thursday' : d === 'fri' ? 'Friday' : d === 'sat' ? 'Saturday' : 'Sunday'}
              </span>
              <button
                onClick={() => setDays((prev) => ({ ...prev, [d]: !prev[d] }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  days[d] ? 'bg-primary' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={days[d]}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    days[d] ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Travel radius</h2>
        <div className="flex gap-2 flex-wrap">
          {[5, 10, 20, 30, 50].map((km) => (
            <button
              key={km}
              onClick={() => setRadius(km)}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                radius === km
                  ? 'border-primary/30 bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:border-primary/20'
              }`}
            >
              {km} km
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label htmlFor="startTime" className="text-xs text-muted-foreground">Start time</Label>
          <Input id="startTime" type="time" defaultValue="08:00" className="mt-1 w-32" />
        </div>
      </div>

      <Button
        className="w-full bg-[#7B6EF6] hover:bg-[#7B6EF6]/90 mt-2"
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? 'Setting up…' : 'Complete setup'}
      </Button>
    </div>
  );
}

// ── Main onboarding page ──────────────────────────────────────────────────────
export function ProviderOnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profileData, setProfileData] = useState<ProfileInput | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleFinalSubmit() {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update full_name on the user record
      if (profileData?.displayName) {
        await supabase
          .from('users')
          .update({ full_name: profileData.displayName })
          .eq('id', user.id);
      }

      const { data: profile } = await supabase
        .from('provider_profiles')
        .upsert({ user_id: user.id, bio: profileData?.bio ?? null })
        .select('id')
        .single();

      if (selectedServices.length > 0 && profile?.id) {
        await supabase.from('provider_services').insert(
          selectedServices.map((serviceTypeId) => ({
            provider_id: profile.id,
            service_type_id: serviceTypeId,
          }))
        );
      }

      toast.success('Profile set up! Welcome to OnServe.');
      navigate('/provider/jobs');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell className="px-6 pt-12 pb-8 gap-0 max-w-md mx-auto w-full">
      <StepBar step={step} />

      {step === 1 && (
        <Step1Profile
          onNext={(data) => {
            setProfileData(data);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <Step2ID onNext={() => setStep(3)} />
      )}

      {step === 3 && (
        <Step3Services
          onNext={(services) => {
            setSelectedServices(services);
            setStep(4);
          }}
        />
      )}

      {step === 4 && (
        <Step4Availability onSubmit={handleFinalSubmit} loading={submitting} />
      )}
    </AppShell>
  );
}
