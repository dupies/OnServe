import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { useCreateQuoteRequest } from '@/features/quotes/hooks/useQuotes';
import { useAllServiceTypes } from '@/features/services/hooks/useServices';
import { useSavedLocations } from '@/features/location/hooks/useLocations';
import { useProviderProfile } from '@/features/providers/hooks/useProviders';
import { quoteRequestSchema, type QuoteRequestInput } from '@onserve/shared';
import { toast } from 'sonner';

export function QuoteRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const providerId = searchParams.get('providerId') ?? undefined;

  const createQuote = useCreateQuoteRequest();
  const { data: services = [] } = useAllServiceTypes();
  const { data: locations = [] } = useSavedLocations();
  const { data: provider } = useProviderProfile(providerId);

  const form = useForm<QuoteRequestInput>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      serviceTypeId: '',
      locationId: '',
      problemDescription: '',
      expiresInHours: '24',
    },
  });

  // Auto-select the default saved location on load
  useEffect(() => {
    if (locations.length === 0) return;
    if (form.getValues('locationId')) return;
    const defaultLoc = locations.find((l) => l.isDefault) ?? locations[0];
    form.setValue('locationId', defaultLoc.id);
  }, [locations, form]);

  async function onSubmit(values: QuoteRequestInput) {
    try {
      await createQuote.mutateAsync(values);
      toast.success('Quote request posted — providers will bid on your job');
      navigate('/bookings');
    } catch {
      toast.error('Failed to post quote request');
    }
  }

  return (
    <PageLayout>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Request a quote</h1>
          <p className="text-muted-foreground text-sm mt-1">Providers will bid on your job</p>
        </div>

        {/* Provider context card */}
        {provider && (
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">
                P{provider.userId.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Requesting from: Service Provider</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-warning flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {provider.ratingAverage.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{provider.totalJobsCompleted} jobs</span>
                {provider.verificationStatus === 'verified' && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30 bg-primary/10 flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5" /> Verified
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="serviceTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a saved location..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.customName ?? l.formattedAddress}
                          {l.isDefault && ' (default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="problemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe the problem</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Give providers enough context to quote accurately..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresInHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quote closes in</FormLabel>
                  <div className="flex gap-3">
                    {(['24', '48', '72'] as const).map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => field.onChange(h)}
                        className={`flex-1 border rounded-xl py-3 text-sm font-medium transition-colors ${
                          field.value === h
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/20'
                        }`}
                      >
                        {h} hours
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" size="lg" disabled={createQuote.isPending}>
              {createQuote.isPending ? 'Posting…' : 'Post job request'}
            </Button>
          </form>
        </Form>
      </div>
    </PageLayout>
  );
}
