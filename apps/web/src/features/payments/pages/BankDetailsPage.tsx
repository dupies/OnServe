import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AppShell } from '@/components/layout/AppShell';
import { toast } from 'sonner';
import { useSaveBankDetails, useGetBankDetails } from '../hooks/useBankDetails';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Bank details page - provider enters/edits bank account for payouts
 *
 * Flow (during provider onboarding):
 * 1. Provider completes verification (ID, business docs, etc.)
 * 2. Navigates to /provider/bank-details
 * 3. Enters bank account information
 * 4. Form validates and submits via useSaveBankDetails hook
 * 5. Account is verified via AVS or micro-deposits
 * 6. Provider can now receive payouts
 *
 * Note: This is part of KYC/onboarding flow, called before provider goes live
 */

// SA banks with universal branch codes (from spec section 7)
const SA_BANKS = [
  { name: 'ABSA', branchCode: '632005' },
  { name: 'Capitec', branchCode: '470010' },
  { name: 'FNB', branchCode: '250655' },
  { name: 'Nedbank', branchCode: '198765' },
  { name: 'Standard Bank', branchCode: '051001' },
  { name: 'TymeBank', branchCode: '678910' },
  { name: 'African Bank', branchCode: '430000' },
  { name: 'Investec', branchCode: '580105' },
];

const bankDetailsSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z
    .string()
    .min(7, 'Account number must be at least 7 digits')
    .max(13, 'Account number must be at most 13 digits')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  accountHolder: z.string().min(2, 'Account holder name is required'),
  accountType: z.enum(['savings', 'cheque']),
  branchCode: z.string().min(6).max(6, 'Branch code must be 6 digits').regex(/^\d+$/, 'Branch code must contain only digits'),
});

type BankDetailsInput = z.infer<typeof bankDetailsSchema>;

export function BankDetailsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const providerId = user?.id;

  // Fetch existing bank details if they exist
  const { data: existingDetails } = useGetBankDetails(providerId);

  // Mutation hook for saving
  const saveBankDetailsMutation = useSaveBankDetails();

  const form = useForm<BankDetailsInput>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bankName: existingDetails?.bank_name || '',
      accountNumber: existingDetails?.account_number || '',
      accountHolder: existingDetails?.account_holder || '',
      accountType: (existingDetails?.account_type as 'savings' | 'cheque') || 'savings',
      branchCode: existingDetails?.branch_code || '',
    },
  });

  // Update defaults when existing details load
  React.useEffect(() => {
    if (existingDetails) {
      form.reset({
        bankName: existingDetails.bank_name || '',
        accountNumber: existingDetails.account_number || '',
        accountHolder: existingDetails.account_holder || '',
        accountType: (existingDetails.account_type as 'savings' | 'cheque') || 'savings',
        branchCode: existingDetails.branch_code || '',
      });
    }
  }, [existingDetails, form]);

  const selectedBank = form.watch('bankName');
  const selectedBankData = SA_BANKS.find((b) => b.name === selectedBank);

  async function onSubmit(data: BankDetailsInput) {
    if (!providerId) {
      toast.error('Provider ID not found');
      return;
    }

    try {
      await saveBankDetailsMutation.mutateAsync({
        providerId,
        data,
      });

      toast.success('Bank details saved! Your account will be verified within 24 hours.');
      navigate('/provider/onboarding');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save bank details');
    }
  }

  return (
    <AppShell className="px-6 pt-16 pb-8 gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Add bank account</h1>
        <p className="text-sm text-muted-foreground">
          We'll pay your earnings directly to your account. Your information is secure and encrypted.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Bank Name Field - Dropdown */}
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank name</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={saveBankDetailsMutation.isPending}
                  >
                    <option value="">Select your bank</option>
                    {SA_BANKS.map((bank) => (
                      <option key={bank.name} value={bank.name}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Branch Code Field - Auto-populated */}
          <FormField
            control={form.control}
            name="branchCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch code (Universal)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Auto-populated based on bank selection"
                    value={selectedBankData?.branchCode || field.value}
                    onChange={(e) => {
                      field.onChange(e);
                    }}
                    className="bg-card border-border"
                    disabled={saveBankDetailsMutation.isPending}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedBankData ? `${selectedBank} universal code: ${selectedBankData.branchCode}` : 'Select a bank to see the universal code'}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Account Number Field */}
          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="7-13 digits"
                    type="text"
                    inputMode="numeric"
                    className="bg-card border-border"
                    disabled={saveBankDetailsMutation.isPending}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground mt-1">Enter your bank account number without spaces</p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Account Holder Field */}
          <FormField
            control={form.control}
            name="accountHolder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account holder name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Full name or business name (must match bank records)"
                    className="bg-card border-border"
                    disabled={saveBankDetailsMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Account Type Field */}
          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account type</FormLabel>
                <FormControl>
                  <div className="flex gap-3">
                    <label className="flex-1 flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="savings"
                        checked={field.value === 'savings'}
                        onChange={() => field.onChange('savings')}
                        disabled={saveBankDetailsMutation.isPending}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-foreground">Savings</span>
                    </label>
                    <label className="flex-1 flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="cheque"
                        checked={field.value === 'cheque'}
                        onChange={() => field.onChange('cheque')}
                        disabled={saveBankDetailsMutation.isPending}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-foreground">Cheque</span>
                    </label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Security Notice */}
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">🔒 Security:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your bank details are encrypted and securely stored</li>
              <li>We never share your information with third parties</li>
              <li>Bank account verification takes 24-48 hours</li>
              <li>You can update these details anytime in settings</li>
            </ul>
          </div>

          {/* Information Section */}
          {/* TODO: Add micro-deposit verification flow details once implemented */}
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <p className="font-medium text-foreground mb-2">How verification works:</p>
            <p className="text-muted-foreground">
              We'll verify your account within 24 hours. You may receive small test deposits to confirm
              account ownership. Once verified, your payout deposits will appear within 2-3 business days.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-auto pt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
              disabled={saveBankDetailsMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saveBankDetailsMutation.isPending}>
              {saveBankDetailsMutation.isPending ? 'Saving...' : 'Save account'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Development Note */}
      {/* TODO: Remove in production */}
      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>Route: /provider/bank-details</p>
        <p>Provider bank account onboarding. Integrates with KYC verification.</p>
        <p>TODO: Implement micro-deposit verification and account confirmation flow</p>
      </div>
    </AppShell>
  );
}
