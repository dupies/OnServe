import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { useAuthInit } from './features/auth/hooks/useAuth';

function AppContent() {
  useAuthInit();
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
