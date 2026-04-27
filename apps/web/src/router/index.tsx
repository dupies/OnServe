import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/authStore';

const Home = () => <div className="p-6 text-white">Home</div>;
const Search = () => <div className="p-6 text-white">Search</div>;
const Login = () => <div className="p-6 text-white">Login</div>;
const OTPVerify = () => <div className="p-6 text-white">OTP Verify</div>;
const RoleSelect = () => <div className="p-6 text-white">Role Select</div>;
const BookingsList = () => <div className="p-6 text-white">Bookings</div>;
const Profile = () => <div className="p-6 text-white">Profile</div>;
const ProviderJobBoard = () => <div className="p-6 text-white">Job Board</div>;
const ProviderEarnings = () => <div className="p-6 text-white">Earnings</div>;

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <div className="p-6 text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/verify', element: <OTPVerify /> },
  { path: '/role', element: <RoleSelect /> },

  { path: '/', element: <RequireAuth><Home /></RequireAuth> },
  { path: '/search', element: <RequireAuth><Search /></RequireAuth> },
  { path: '/bookings', element: <RequireAuth><BookingsList /></RequireAuth> },
  { path: '/profile', element: <RequireAuth><Profile /></RequireAuth> },

  { path: '/provider/jobs', element: <RequireAuth><ProviderJobBoard /></RequireAuth> },
  { path: '/provider/earnings', element: <RequireAuth><ProviderEarnings /></RequireAuth> },
]);
