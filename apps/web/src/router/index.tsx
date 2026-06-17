import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';

// Auth
import { SplashPage } from '@/pages/auth/SplashPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { OTPPage } from '@/pages/auth/OTPPage';
import { RoleSelectPage } from '@/pages/auth/RoleSelectPage';

// Customer — Discover
import { HomePage } from '@/pages/customer/HomePage';
import { SearchPage } from '@/pages/customer/SearchPage';
import { ProviderProfilePage } from '@/pages/customer/ProviderProfilePage';

// Customer — Location
import { SavedLocationsPage } from '@/pages/customer/SavedLocationsPage';

// Customer — Book
import { BookingPage } from '@/pages/customer/BookingPage';
import { QuoteRequestPage } from '@/pages/customer/QuoteRequestPage';
import { QuoteRequestsListPage } from '@/pages/customer/QuoteRequestsListPage';
import { QuoteReviewPage } from '@/pages/customer/QuoteReviewPage';
import { PaymentPage } from '@/pages/customer/PaymentPage';

// Customer — Track & Resolve
import { BookingsListPage } from '@/pages/customer/BookingsListPage';
import { BookingDetailPage } from '@/pages/customer/BookingDetailPage';
import { LiveTrackingPage } from '@/pages/customer/LiveTrackingPage';
import { JobCompletePage } from '@/pages/customer/JobCompletePage';
import { RateReviewPage } from '@/pages/customer/RateReviewPage';
import { DisputeFormPage } from '@/pages/customer/DisputeFormPage';
import { DisputeStatusPage } from '@/pages/customer/DisputeStatusPage';

// Customer — Account
import { ProfilePage } from '@/pages/customer/ProfilePage';
import { ProfileEditPage } from '@/pages/customer/ProfileEditPage';
import { NotificationsPage } from '@/pages/customer/NotificationsPage';

// Shared
import { ChatPage } from '@/pages/customer/ChatPage';

// Provider
import { ProviderOnboardingPage } from '@/pages/provider/ProviderOnboardingPage';
import { PayoutRequestPage } from '@/pages/provider/PayoutRequestPage';
import { JobBoardPage } from '@/pages/provider/JobBoardPage';
import { JobDetailPage } from '@/pages/provider/JobDetailPage';
import { ActiveJobPage } from '@/pages/provider/ActiveJobPage';
import { CheckOutPage } from '@/pages/provider/CheckOutPage';
import { ProviderEarningsPage } from '@/pages/provider/ProviderEarningsPage';
import { ProviderQuoteRequestsPage } from '@/pages/provider/ProviderQuoteRequestsPage';
import { SubmitQuotePage } from '@/pages/provider/SubmitQuotePage';

// Shared
import { SettingsPage } from '@/pages/SettingsPage';

// Admin
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminDisputesPage } from '@/pages/admin/AdminDisputesPage';
import { AdminDisputeDetailPage } from '@/pages/admin/AdminDisputeDetailPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminUserDetailPage } from '@/pages/admin/AdminUserDetailPage';
import { AdminVerificationsPage } from '@/pages/admin/AdminVerificationsPage';

// Provider
import { ProviderReputationPage } from '@/pages/provider/ProviderReputationPage';

// Payments
import { PaymentCheckoutPage } from '@/features/payments/pages/PaymentCheckoutPage';
import { PaymentSuccessPage } from '@/features/payments/pages/PaymentSuccessPage';
import { PaymentCancelPage } from '@/features/payments/pages/PaymentCancelPage';
import { PaymentErrorPage } from '@/features/payments/pages/PaymentErrorPage';
import { BankDetailsPage } from '@/features/payments/pages/BankDetailsPage';

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

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { role } = useAuthStore();
  if (role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function auth(element: React.ReactNode) {
  return <RequireAuth>{element}</RequireAuth>;
}

function admin(element: React.ReactNode) {
  return <RequireAuth><RequireAdmin>{element}</RequireAdmin></RequireAuth>;
}

export const router = createBrowserRouter([
  // Auth
  { path: '/splash', element: <SplashPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/verify', element: <OTPPage /> },
  { path: '/role', element: <RoleSelectPage /> },

  // Customer — Discover
  { path: '/', element: auth(<HomePage />) },
  { path: '/search', element: auth(<SearchPage />) },
  { path: '/providers/:id', element: auth(<ProviderProfilePage />) },

  // Customer — Location
  { path: '/profile/locations', element: auth(<SavedLocationsPage />) },

  // Customer — Book
  { path: '/book/:providerId', element: auth(<BookingPage />) },
  { path: '/quote-request', element: auth(<QuoteRequestPage />) },
  { path: '/quote-requests', element: auth(<QuoteRequestsListPage />) },
  { path: '/quote-requests/:id', element: auth(<QuoteReviewPage />) },
  { path: '/payment', element: auth(<PaymentPage />) },

  // Customer — Track & Resolve
  { path: '/bookings', element: auth(<BookingsListPage />) },
  { path: '/bookings/:id', element: auth(<BookingDetailPage />) },
  { path: '/tracking/:id', element: auth(<LiveTrackingPage />) },
  { path: '/complete/:id', element: auth(<JobCompletePage />) },
  { path: '/rate/:id', element: auth(<RateReviewPage />) },
  { path: '/disputes/new/:bookingId', element: auth(<DisputeFormPage />) },
  { path: '/disputes/:id', element: auth(<DisputeStatusPage />) },

  // Customer — Account
  { path: '/notifications', element: auth(<NotificationsPage />) },
  { path: '/profile', element: auth(<ProfilePage />) },
  { path: '/profile/edit', element: auth(<ProfileEditPage />) },

  // Shared
  { path: '/chat/:bookingId', element: auth(<ChatPage />) },
  { path: '/settings', element: auth(<SettingsPage />) },

  // Provider
  { path: '/provider/onboarding', element: auth(<ProviderOnboardingPage />) },
  { path: '/provider/payout', element: auth(<PayoutRequestPage />) },
  { path: '/provider/jobs', element: auth(<JobBoardPage />) },
  { path: '/provider/jobs/:id', element: auth(<JobDetailPage />) },
  { path: '/provider/jobs/:id/active', element: auth(<ActiveJobPage />) },
  { path: '/provider/jobs/:id/checkout', element: auth(<CheckOutPage />) },
  { path: '/provider/earnings', element: auth(<ProviderEarningsPage />) },
  { path: '/provider/quotes', element: auth(<ProviderQuoteRequestsPage />) },
  { path: '/provider/quotes/:id', element: auth(<SubmitQuotePage />) },

  // Provider — reputation
  { path: '/provider/reputation', element: auth(<ProviderReputationPage />) },

  // Payments
  { path: '/payment/checkout/:bookingId', element: auth(<PaymentCheckoutPage />) },
  { path: '/payment/success', element: auth(<PaymentSuccessPage />) },
  { path: '/payment/cancel', element: auth(<PaymentCancelPage />) },
  { path: '/payment/error', element: auth(<PaymentErrorPage />) },
  { path: '/provider/bank-details', element: auth(<BankDetailsPage />) },

  // Admin
  { path: '/admin', element: admin(<AdminDashboardPage />) },
  { path: '/admin/disputes', element: admin(<AdminDisputesPage />) },
  { path: '/admin/disputes/:id', element: admin(<AdminDisputeDetailPage />) },
  { path: '/admin/users', element: admin(<AdminUsersPage />) },
  { path: '/admin/users/:id', element: admin(<AdminUserDetailPage />) },
  { path: '/admin/verifications', element: admin(<AdminVerificationsPage />) },
]);
