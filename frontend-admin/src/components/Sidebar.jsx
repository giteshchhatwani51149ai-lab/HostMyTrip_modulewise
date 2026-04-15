import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../store/adminAuthStore';
import {
  LayoutDashboard, BookOpen, Hotel, PlusCircle, LogOut, Users, Settings, CreditCard
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/bookings', label: 'All Bookings', icon: <BookOpen size={18} /> },
  { path: '/payments', label: 'Payments', icon: <CreditCard size={18} /> },
  { path: '/hotels', label: 'Hotels', icon: <Hotel size={18} /> },
  { path: '/create-booking', label: 'New Booking', icon: <PlusCircle size={18} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAdminAuthStore();

  return (
    <div style={{
      width: 240, minHeight: '100vh', background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 100
    }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, var(--primary), #3B82F6)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, color: 'white', flexShrink: 0
          }}>HMT</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>HostMyTrip</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Admin Portal</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(14,165,233,0.15)' : 'none',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: active ? 600 : 400, fontSize: 14, marginBottom: 2,
                transition: 'var(--transition)',
                borderLeft: active ? '2px solid var(--primary)' : '2px solid transparent'
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'rgba(14,165,233,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email?.split('@')[0]}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</p>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          onClick={logout}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );
}
