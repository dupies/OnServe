import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/lib/supabase';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const fullName = (user?.user_metadata?.['full_name'] as string | undefined) ?? '';
  const email = user?.email ?? '';

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName, email },
  });

  async function onSubmit(values: ProfileFormValues) {
    try {
      // Update auth metadata (email in auth.users)
      const authUpdates: { data: Record<string, string>; email?: string } = {
        data: { full_name: values.fullName },
      };
      if (values.email && values.email !== email) {
        authUpdates.email = values.email;
      }
      const { data, error } = await supabase.auth.updateUser(authUpdates);
      if (error) throw new Error(error.message);

      // Update full_name in public.users (auth.updateUser only writes metadata)
      if (user) {
        const { error: dbError } = await supabase
          .from('users')
          .update({ full_name: values.fullName })
          .eq('id', user.id);
        if (dbError) throw new Error(dbError.message);
      }

      if (data.user) setUser(data.user);
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="you@example.com" />
                    </FormControl>
                    <FormMessage />
                    {email && form.watch('email') !== email && form.watch('email') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        A confirmation link will be sent to your new email address
                      </p>
                    )}
                  </FormItem>
                )}
              />

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
