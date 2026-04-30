import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Plane, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const isCorporate = user?.role === 'corporate_admin' || user?.role === 'corporate_employee';

  const links = isCorporate ? [
    { label: 'Corporate', path: '/corporate' },
    ...(user?.canBookFlights ? [{ label: 'Flights', path: '/flights' }] : []),
    ...(user?.canBookHotels  ? [{ label: 'Hotels',  path: '/hotels'  }] : []),
    { label: 'My Bookings', path: '/my-bookings' },
  ] : [
    { label: 'Flights', path: '/flights' },
    { label: 'Hotels', path: '/hotels' },
    { label: 'Packages', path: '/packages' },
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Bookings', path: '/my-bookings' },
  ];

  return (
    <nav className="main-nav">
      <div className="container nav-inner">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <div className="brand-logo"><Plane size={18} /></div>
          <span className="brand-name">HostMyTrip</span>
        </div>

        <div className="nav-center-links">
          {links.map(l => (
            <button
              key={l.path}
              className={`nav-link-btn ${location.pathname === l.path ? 'nav-link-active' : ''}`}
              onClick={() => navigate(l.path)}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <button className="theme-toggle-btn" onClick={toggle} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            <span className="theme-toggle-knob">
              {theme === 'light' ? <Sun size={10} color="#fff" /> : <Moon size={10} color="#fff" />}
            </span>
          </button>
          <button
            className="nav-user-info"
            onClick={() => navigate('/profile')}
            title="My Profile"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}
          >
            <div className="nav-avatar">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="nav-uname">{user?.name || user?.email?.split('@')[0]}</span>
          </button>
          <button className="nav-logout-btn" onClick={logout} title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
