import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuthStore } from './store/adminAuthStore';
import AdminLogin from './pages/AdminLogin';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import AdminDashboard from './pages/AdminDashboard';
import AllBookings from './pages/AllBookings';
import BookingDetail from './pages/BookingDetail';
import AdminHotels from './pages/AdminHotels';
import CreateBooking from './pages/CreateBooking';
import AdminSettings from './pages/AdminSettings';
import AdminPayments from './pages/AdminPayments';
import CorporateAccounts from './pages/CorporateAccounts';
import AdminCustomers from './pages/AdminCustomers';
import AdminRevenue from './pages/AdminRevenue';
import AdminFlightSearch from './pages/AdminFlightSearch';
import AdminHotelSearch from './pages/AdminHotelSearch';
import PendingCollections from './pages/PendingCollections';
import './index.css';

const ProtectedLayout = ({ children }) => {
  const token = useAdminAuthStore(s => s.token);
  const user  = useAdminAuthStore(s => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!token) return <Navigate to="/login" replace />;
  // Spec: middleware check user.role === 'admin' (allow employee too for parity)
  if (user && user.role !== 'admin' && user.role !== 'employee') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="al-main" style={{ marginLeft: 240, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <TopHeader onToggleSidebar={() => setMobileOpen(o => !o)} />
        <main style={{ flex: 1, padding: '32px', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .al-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/"               element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
        <Route path="/bookings"       element={<ProtectedLayout><AllBookings /></ProtectedLayout>} />
        <Route path="/bookings/:id"   element={<ProtectedLayout><BookingDetail /></ProtectedLayout>} />
        <Route path="/flight-search"  element={<ProtectedLayout><AdminFlightSearch /></ProtectedLayout>} />
        <Route path="/hotel-search"   element={<ProtectedLayout><AdminHotelSearch /></ProtectedLayout>} />
        <Route path="/customers"      element={<ProtectedLayout><AdminCustomers /></ProtectedLayout>} />
        <Route path="/revenue"        element={<ProtectedLayout><AdminRevenue /></ProtectedLayout>} />
        <Route path="/payments"       element={<ProtectedLayout><AdminPayments /></ProtectedLayout>} />
        <Route path="/pending-collections" element={<ProtectedLayout><PendingCollections /></ProtectedLayout>} />
        <Route path="/corporates"     element={<ProtectedLayout><CorporateAccounts /></ProtectedLayout>} />
        <Route path="/hotels"         element={<ProtectedLayout><AdminHotels /></ProtectedLayout>} />
        <Route path="/create-booking" element={<ProtectedLayout><CreateBooking /></ProtectedLayout>} />
        <Route path="/settings"       element={<ProtectedLayout><AdminSettings /></ProtectedLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
