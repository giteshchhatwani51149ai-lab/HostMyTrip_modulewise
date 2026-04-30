import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Auth from './pages/Auth'; // eager: login is the entry point for guests
import { Toaster } from 'sonner';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

/* Lazy-loaded routes — split into separate chunks so initial bundle stays small.
   Each page is loaded on-demand when the user navigates to it. */
const VerifyEmail              = lazy(() => import('./pages/VerifyEmail'));
const Home                     = lazy(() => import('./pages/Home'));
const HotelSearch              = lazy(() => import('./pages/HotelSearch'));
const HotelDetail              = lazy(() => import('./pages/HotelDetail'));
const HotelCheckout            = lazy(() => import('./pages/HotelCheckout'));
const Dashboard                = lazy(() => import('./pages/Dashboard'));
const MyBookings               = lazy(() => import('./pages/MyBookings'));
const FlightSearch             = lazy(() => import('./pages/FlightSearch'));
const GoogleAuthSuccess        = lazy(() => import('./pages/GoogleAuthSuccess'));
const ForgotPassword           = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword            = lazy(() => import('./pages/ResetPassword'));
const Profile                  = lazy(() => import('./pages/Profile'));
const FlightBooking            = lazy(() => import('./pages/FlightBooking'));
const FlightConfirm            = lazy(() => import('./pages/FlightConfirm'));
const Payment                  = lazy(() => import('./pages/Payment'));
const BookingSuccess           = lazy(() => import('./pages/BookingSuccess'));
const BookingDetail            = lazy(() => import('./pages/BookingDetail'));
const CorporateDashboard       = lazy(() => import('./pages/CorporateDashboard'));
const BookingApprovalPending   = lazy(() => import('./pages/BookingApprovalPending'));

/* Lightweight fallback shown while a chunk loads */
const RouteFallback = () => (
  <div style={{
    minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#888', fontSize: 14, fontFamily: 'inherit',
  }}>
    <div style={{
      width: 28, height: 28, border: '3px solid #eee', borderTopColor: '#f97316',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/auth" replace />;
};

const CorporateRoute = ({ children }) => {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/auth" replace />;
  const isCorp = user?.role === 'corporate_admin' || user?.role === 'corporate_employee';
  return isCorp ? children : <Navigate to="/" replace />;
};

const GuestRoute = ({ children }) => {
  const token = useAuthStore(s => s.token);
  return !token ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          style: { fontFamily: 'inherit' },
          classNames: {
            toast: 'hmt-toast',
            success: 'hmt-toast-success',
            error: 'hmt-toast-error',
            warning: 'hmt-toast-warning',
            info: 'hmt-toast-info',
          },
        }}
        visibleToasts={3}
      />
      <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/auth" element={<GuestRoute><Auth /></GuestRoute>} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/hotels" element={<ProtectedRoute><HotelSearch /></ProtectedRoute>} />
        <Route path="/hotels/search" element={<ProtectedRoute><HotelSearch /></ProtectedRoute>} />
        <Route path="/hotels/checkout" element={<ProtectedRoute><HotelCheckout /></ProtectedRoute>} />
        <Route path="/hotels/:id" element={<ProtectedRoute><HotelDetail /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/flights" element={<ProtectedRoute><FlightSearch /></ProtectedRoute>} />
        <Route path="/flights/search" element={<ProtectedRoute><FlightSearch /></ProtectedRoute>} />
        <Route path="/flights/book" element={<ProtectedRoute><FlightBooking /></ProtectedRoute>} />
        <Route path="/flights/confirm" element={<ProtectedRoute><FlightConfirm /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/booking/success" element={<ProtectedRoute><BookingSuccess /></ProtectedRoute>} />
        <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
        <Route path="/corporate" element={<CorporateRoute><CorporateDashboard /></CorporateRoute>} />
        <Route path="/booking/approval-pending" element={<ProtectedRoute><BookingApprovalPending /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
