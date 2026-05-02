import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { AppShell } from '@/components/layout/AppShell';
import { verifyOtp } from '@/features/auth/services/authService';
import { useAuthStore } from '@/features/auth/store/authStore';
import { otpSchema, type OtpInput } from '@onserve/shared';
import { cn } from '@/lib/utils';

export function OTPPage() {
  const navigate = useNavigate();
  const { pendingPhone } = useAuthStore();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: '' },
  });

  const tokenValue = form.watch('token');
  const digits = tokenValue.padEnd(6, '').slice(0, 6).split('');

  function handleDigitInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const current = form.getValues('token');
    const arr = current.padEnd(6, '').slice(0, 6).split('');
    arr[index] = digit;
    form.setValue('token', arr.join('').trimEnd(), { shouldValidate: true });
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const current = form.getValues('token');
      const arr = current.padEnd(6, '').slice(0, 6).split('');
      arr[index] = '';
      form.setValue('token', arr.join('').trimEnd());
      if (index > 0) inputRefs.current[index - 1]?.focus();
    }
  }

  async function onSubmit({ token }: OtpInput) {
    if (!pendingPhone) {
      toast.error('Session expired — please request a new OTP');
      navigate('/login');
      return;
    }
    try {
      await verifyOtp(pendingPhone, token);
      navigate('/role');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
    }
  }

  return (
    <AppShell className="px-6 pt-16 pb-8 gap-6">
      <div>
        <p className="text-sm text-primary mb-1">Step 2 of 2</p>
        <h1 className="text-2xl font-semibold text-foreground">Verify code</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sent to {pendingPhone ?? '+27 *** ****'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="token"
            render={() => (
              <FormItem>
                <FormControl>
                  <div className="flex gap-2 justify-center">
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="tel"
                        maxLength={1}
                        value={d.trim()}
                        onChange={(e) => handleDigitInput(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className={cn(
                          'w-10 h-12 rounded-lg bg-surface border text-center text-lg font-semibold text-foreground outline-none transition-colors',
                          d.trim() ? 'border-primary' : 'border-border focus:border-primary/60',
                        )}
                      />
                    ))}
                  </div>
                </FormControl>
                <FormMessage className="text-center" />
              </FormItem>
            )}
          />

          <p className="text-sm text-center text-muted-foreground">
            Resend in <span className="text-primary">0:44</span>
          </p>

          <div className="mt-auto">
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting || tokenValue.length < 6}
            >
              {form.formState.isSubmitting ? 'Verifying…' : 'Verify'}
            </Button>
          </div>
        </form>
      </Form>
    </AppShell>
  );
}
