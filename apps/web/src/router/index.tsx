import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';

// Auth
import { SplashPage } from '@/pages/auth/SplashPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { OTPPage } from '@/pages/auth/OTPPage';
import { RoleSelectPage } from '@/pages/auth/RoleSelectPage';

// Customer
import { HomePage } from '@/pages/customer/HomePage';
import { SearchPage } from '@/pages/customer/SearchPage';
import { ProviderProfilePage } from '@/pages/customer/ProviderProfilePage';
import { BookingPage } from '@/pages/customer/BookingPage';
import { PaymentPage } from '@/pages/customer/PaymentPage';
import { BookingsListPage } from '@/pages/customer/BookingsListPage';
import { ProfilePage } from '@/pages/customer/ProfilePage';

// Provider
import { JobBoardPage } from '@/pages/provider/JobBoardPage';
import { JobDetailPage } from '@/pages/provider/JobDetailPage';
import { ActiveJobPage } from '@/pages/provider/ActiveJobPage';
import { CheckOutPage } from '@/pages/provider/CheckOutPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading, role } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/splash" replace />;
  if (!role) return <Navigate to="/role" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/splash', element: <SplashPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/verify', element: <OTPPage /> },
  { path: '/role', element: <RoleSelectPage /> },

  {
    path: '/',
    element: <RequireAuth><HomePage /></RequireAuth>,
  },
  {
    path: '/search',
    element: <RequireAuth><SearchPage /></RequireAuth>,
  },
  {
    path: '/providers/:id',
    element: <RequireAuth><ProviderProfilePage /></RequireAuth>,
  },
  {
    path: '/book/:providerId',
    element: <RequireAuth><BookingPage /></RequireAuth>,
  },
  {
    path: '/payment',
    element: <RequireAuth><PaymentPage /></RequireAuth>,
  },
  {
    path: '/bookings',
    element: <RequireAuth><BookingsListPage /></RequireAuth>,
  },
  {
    path: '/profile',
    element: <RequireAuth><ProfilePage /></RequireAuth>,
  },

  {
    path: '/provider/jobs',
    element: <RequireAuth><JobBoardPage /></RequireAuth>,
  },
  {
    path: '/provider/jobs/:id',
    element: <RequireAuth><JobDetailPage /></RequireAuth>,
  },
  {
    path: '/provider/jobs/:id/active',
    element: <RequireAuth><ActiveJobPage /></RequireAuth>,
  },
  {
    path: '/provider/jobs/:id/checkout',
    element: <RequireAuth><CheckOutPage /></RequireAuth>,
  },
]);
