import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Auth from './pages/Auth';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import Hotels from './pages/Hotels';
import HotelDetail from './pages/HotelDetail';
import Dashboard from './pages/Dashboard';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const token = useAuthStore(s => s.token);
  return token ? children : <Navigate to="/auth" replace />;
};

const GuestRoute = ({ children }) => {
  const token = useAuthStore(s => s.token);
  return !token ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<GuestRoute><Auth /></GuestRoute>} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/hotels" element={<ProtectedRoute><Hotels /></ProtectedRoute>} />
        <Route path="/hotels/:id" element={<ProtectedRoute><HotelDetail /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
