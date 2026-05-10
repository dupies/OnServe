import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageLayout } from '@/components/layout/PageLayout';
import { useCreateQuoteRequest } from '@/features/quotes/hooks/useQuotes';
import { useAllServiceTypes } from '@/features/services/hooks/useServices';
import { useSavedLocations } from '@/features/location/hooks/useLocations';
import { quoteRequestSchema, type QuoteRequestInput } from '@onserve/shared';
import { toast } from 'sonner';

export function QuoteRequestPage() {
  const navigate = useNavigate();
  const createQuote = useCreateQuoteRequest();
  const { data: services = [] } = useAllServiceTypes();
  const { data: locations = [] } = useSavedLocations();

  const form = useForm<QuoteRequestInput>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      serviceTypeId: '',
      locationId: '',
      problemDescription: '',
      expiresInHours: '24',
    },
  });

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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a saved location..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.label}
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
