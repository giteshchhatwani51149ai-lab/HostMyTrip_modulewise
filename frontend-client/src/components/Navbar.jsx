import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav className="navbar glass">
      <div className="container navbar-inner">
        <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="nav-logo">HMT</div>
          <span className="nav-name">HostMyTrip</span>
        </div>
        <div className="nav-links">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/hotels')}>Hotels</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>My Bookings</button>
        </div>
        <div className="nav-user">
          <span className="nav-email">{user?.email}</span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
