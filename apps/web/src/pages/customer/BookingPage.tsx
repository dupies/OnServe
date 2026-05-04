import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PageLayout } from '@/components/layout/PageLayout';
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

const UPCOMING_DATES = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + 1));
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

export function BookingPage() {
  const navigate = useNavigate();
  const { data: categories = [] } = useServiceCategories();
  const { data: locations = [] } = useSavedLocations();
  const createBooking = useCreateBooking();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { serviceTypeId: '', locationId: '', date: '', time: '10:00', customerNotes: '' },
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
    <PageLayout>
      <div className="max-w-3xl flex flex-col gap-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-semibold text-foreground">Book a service</h1>
          <p className="text-muted-foreground text-sm mt-1">Choose your service, location, and preferred time</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-6">
              {/* Left: service + location + notes */}
              <div className="flex flex-col gap-5">
                <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                  <h2 className="text-sm font-semibold text-foreground">Service details</h2>

                  <FormField
                    control={form.control}
                    name="serviceTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
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
                        <FormLabel>Service location</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="customerNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Access instructions, special requirements…"
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Right: date + time + submit */}
              <div className="flex flex-col gap-5">
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Select date</h2>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {UPCOMING_DATES.map((d) => {
                      const iso = format(d, 'yyyy-MM-dd');
                      const active = selectedDate === iso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => form.setValue('date', iso)}
                          className={cn(
                            'rounded-lg border py-2.5 text-center transition-colors',
                            active
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <p className="text-[10px]">{format(d, 'EEE')}</p>
                          <p className="text-sm font-semibold mt-0.5">{format(d, 'd')}</p>
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.date && (
                    <p className="text-xs text-destructive mt-2">{form.formState.errors.date.message}</p>
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Select time</h2>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TIMES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => form.setValue('time', t)}
                        className={cn(
                          'rounded-lg border px-2 py-2 text-xs transition-colors',
                          selectedTime === t
                            ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <Button type="submit" className="w-full" size="lg" disabled={createBooking.isPending}>
                  {createBooking.isPending ? 'Creating booking…' : 'Continue to payment →'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </PageLayout>
  );
}
