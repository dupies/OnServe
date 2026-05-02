import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AppShell } from '@/components/layout/AppShell';
import { useServiceCategories } from '@/features/services/hooks/useServices';
import { useSavedLocations } from '@/features/location/hooks/useLocations';
import { useCreateBooking } from '@/features/bookings/hooks/useBookings';
import { cn } from '@/lib/utils';

const bookingFormSchema = z.object({
  serviceTypeId: z.string().min(1, 'Select a service'),
  locationId: z.string().min(1, 'Select a location'),
  date: z.string().min(1, 'Select a date'),
  time: z.string().min(1, 'Select a time'),
  customerNotes: z.string().max(500).optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

const UPCOMING_DATES = Array.from({ length: 6 }, (_, i) => addDays(new Date(), i + 1));
const TIMES = ['08:00', '10:00', '12:00', '14:00', '16:00'];

export function BookingPage() {
  const navigate = useNavigate();
  const { data: categories = [] } = useServiceCategories();
  const { data: locations = [] } = useSavedLocations();
  const createBooking = useCreateBooking();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      serviceTypeId: '',
      locationId: '',
      date: '',
      time: '10:00',
      customerNotes: '',
    },
  });

  const selectedDate = form.watch('date');
  const selectedTime = form.watch('time');

  async function onSubmit(values: BookingFormValues) {
    const scheduledAt = `${values.date}T${values.time}:00`;
    try {
      const booking = await createBooking.mutateAsync({
        serviceTypeId: values.serviceTypeId,
        locationId: values.locationId,
        scheduledAt,
        customerNotes: values.customerNotes,
      });
      navigate('/payment', { state: { bookingId: booking.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create booking');
    }
  }

  return (
    <AppShell className="px-4 pt-4 pb-8 gap-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground">Book</span>
      </div>

      <div className="flex gap-1">
        {[1, 1, 0].map((f, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${f ? 'bg-primary' : 'bg-surface'}`} />
        ))}
      </div>

      <h1 className="text-xl font-semibold text-foreground">Choose service</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="serviceTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
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
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.label} {loc.isDefault ? '(default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Date</p>
            <div className="grid grid-cols-3 gap-2">
              {UPCOMING_DATES.map((d) => {
                const iso = format(d, 'yyyy-MM-dd');
                const active = selectedDate === iso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => form.setValue('date', iso)}
                    className={cn(
                      'rounded-lg border py-2 text-center transition-colors',
                      active
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    <p className="text-[10px]">{format(d, 'EEE')}</p>
                    <p className="text-sm font-medium mt-0.5">{format(d, 'd')}</p>
                  </button>
                );
              })}
            </div>
            {form.formState.errors.date && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Time</p>
            <div className="flex gap-2 flex-wrap">
              {TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue('time', t)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                    selectedTime === t
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="customerNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Any access instructions or special requirements…"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-auto">
            <Button
              type="submit"
              className="w-full"
              disabled={createBooking.isPending}
            >
              {createBooking.isPending ? 'Creating…' : 'Next: confirm & pay'}
            </Button>
          </div>
        </form>
      </Form>
    </AppShell>
  );
}
