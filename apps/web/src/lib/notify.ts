import { toast } from 'sonner';

function messageFrom(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong. Please try again.';
}

export const notify = {
  success: (message: string) => toast.success(message),
  error: (err: unknown) => toast.error(messageFrom(err)),
  info: (message: string) => toast(message),
};
