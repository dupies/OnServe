import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/lib/supabase';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, role, setUser } = useAuthStore();
  const isProvider = role === 'provider';
  const currentEmail = user?.email ?? '';

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '', email: currentEmail, bio: '' },
  });

  // Load current values from public.users (and provider_profiles if provider)
  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: u } = await supabase
        .from('users')
        .select('full_name, phone, email')
        .eq('id', user!.id)
        .single();

      let bio = '';
      if (isProvider) {
        const { data: pp } = await supabase
          .from('provider_profiles')
          .select('bio')
          .eq('user_id', user!.id)
          .single();
        bio = pp?.bio ?? '';
      }

      form.reset({
        fullName: u?.full_name ?? (user!.user_metadata?.['full_name'] as string | undefined) ?? '',
        phone: u?.phone ?? user!.phone ?? '',
        email: u?.email ?? currentEmail,
        bio,
      });
    }
    load();
  }, [user, isProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;
    try {
      // 1. Update auth metadata
      const authUpdates: { data: Record<string, string>; email?: string } = {
        data: { full_name: values.fullName },
      };
      if (values.email && values.email !== currentEmail) {
        authUpdates.email = values.email;
      }
      const { data: authData, error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) throw new Error(authError.message);

      // 2. Update public.users
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: values.fullName,
          phone: values.phone ?? '',
          ...(values.email && values.email !== currentEmail ? { email: values.email } : {}),
        })
        .eq('id', user.id);
      if (userError) throw new Error(userError.message);

      // 3. Update provider bio if applicable
      if (isProvider) {
        const { error: ppError } = await supabase
          .from('provider_profiles')
          .update({ bio: values.bio ?? '' })
          .eq('user_id', user.id);
        if (ppError) throw new Error(ppError.message);
      }

      if (authData.user) setUser(authData.user);
      toast.success('Profile updated');
      navigate('/profile');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }

  return (
    <PageLayout>
      <div className="max-w-lg flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to profile
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Edit profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Update your name and contact details</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your full name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="+27 82 000 0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="you@example.com" />
                    </FormControl>
                    <FormMessage />
                    {currentEmail && form.watch('email') !== currentEmail && form.watch('email') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        A confirmation link will be sent to your new email address
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {isProvider && (
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe your services and experience…"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/profile')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </PageLayout>
  );
}
