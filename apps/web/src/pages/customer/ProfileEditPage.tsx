import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
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

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, role, setUser } = useAuthStore();
  const isProvider = role === 'provider';
  const currentEmail = user?.email ?? '';

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    (user?.user_metadata?.['avatar_url'] as string | undefined) ?? null,
  );
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .select('full_name, phone, email, avatar_url')
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

      if (u?.avatar_url) setAvatarPreview(u.avatar_url);

      form.reset({
        fullName: u?.full_name ?? (user!.user_metadata?.['full_name'] as string | undefined) ?? '',
        phone: u?.phone ?? user!.phone ?? '',
        email: u?.email ?? currentEmail,
        bio,
      });
    }
    load();
  }, [user, isProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    // Show local preview immediately
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);

    try {
      const ext = EXT[file.type] ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      // Bust the cache so the browser fetches the new image
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      // Persist in public.users and auth metadata
      await Promise.all([
        supabase.from('users').update({ avatar_url: urlWithBust }).eq('id', user.id),
        supabase.auth.updateUser({ data: { avatar_url: urlWithBust } }),
      ]);

      const { data: { user: refreshed } } = await supabase.auth.getUser();
      if (refreshed) setUser(refreshed);

      setAvatarPreview(urlWithBust);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setAvatarPreview((user.user_metadata?.['avatar_url'] as string | undefined) ?? null);
    } finally {
      setAvatarUploading(false);
    }
  }

  const fullName = form.watch('fullName');
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : '?';

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;
    try {
      const authUpdates: { data: Record<string, string>; email?: string } = {
        data: { full_name: values.fullName },
      };
      if (values.email && values.email !== currentEmail) {
        authUpdates.email = values.email;
      }
      const { data: authData, error: authError } = await supabase.auth.updateUser(authUpdates);
      if (authError) throw new Error(authError.message);

      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: values.fullName,
          phone: values.phone ?? '',
          ...(values.email && values.email !== currentEmail ? { email: values.email } : {}),
        })
        .eq('id', user.id);
      if (userError) throw new Error(userError.message);

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

        {/* Avatar upload */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-foreground self-start">Profile photo</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative group w-24 h-24 rounded-full overflow-hidden flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              {avatarUploading
                ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                : <Camera className="w-6 h-6 text-white" />}
            </div>
          </button>
          <p className="text-xs text-muted-foreground">Click to upload · JPG, PNG, WebP · max 5 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Profile fields */}
        <div className="bg-card border border-border rounded-xl p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl><Input {...field} placeholder="Your full name" /></FormControl>
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
                    <FormControl><Input {...field} type="tel" placeholder="+27 82 000 0000" /></FormControl>
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
                    <FormControl><Input {...field} type="email" placeholder="you@example.com" /></FormControl>
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
                        <Textarea {...field} placeholder="Describe your services and experience…" rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={form.formState.isSubmitting || avatarUploading}>
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
