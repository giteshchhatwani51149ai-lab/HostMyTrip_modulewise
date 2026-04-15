import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuthStore } from './store/adminAuthStore';
import AdminLogin from './pages/AdminLogin';
import Sidebar from './components/Sidebar';
import AdminDashboard from './pages/AdminDashboard';
import AllBookings from './pages/AllBookings';
import AdminHotels from './pages/AdminHotels';
import CreateBooking from './pages/CreateBooking';
import AdminSettings from './pages/AdminSettings';
import AdminPayments from './pages/AdminPayments';
import './index.css';

const ProtectedLayout = ({ children }) => {
  const token = useAdminAuthStore(s => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 240, padding: '40px 32px', minHeight: '100vh', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/" element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
        <Route path="/bookings" element={<ProtectedLayout><AllBookings /></ProtectedLayout>} />
        <Route path="/hotels" element={<ProtectedLayout><AdminHotels /></ProtectedLayout>} />
        <Route path="/create-booking" element={<ProtectedLayout><CreateBooking /></ProtectedLayout>} />
        <Route path="/settings" element={<ProtectedLayout><AdminSettings /></ProtectedLayout>} />
        <Route path="/payments" element={<ProtectedLayout><AdminPayments /></ProtectedLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
