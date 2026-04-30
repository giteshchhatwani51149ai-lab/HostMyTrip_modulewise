import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../store/adminAuthStore';
import {
  LayoutDashboard, Plane, Users, DollarSign, Hotel, PlusCircle,
  CreditCard, Building2, Settings, LogOut, X, Search, Wallet,
} from 'lucide-react';

const navItems = [
  { path: '/',                label: 'Dashboard',    icon: <LayoutDashboard size={18}/> },
  { path: '/bookings',        label: 'Bookings',     icon: <Plane size={18}/> },
  { path: '/flight-search',   label: 'Flight Search', icon: <Plane size={18}/> },
  { path: '/hotel-search',   label: 'Hotel Search', icon: <Hotel size={18}/> },
  { path: '/customers',       label: 'Customers',    icon: <Users size={18}/> },
  { path: '/revenue',         label: 'Revenue',      icon: <DollarSign size={18}/> },
  { path: '/payments',        label: 'Payments',     icon: <CreditCard size={18}/> },
  { path: '/pending-collections', label: 'Pending Collections', icon: <Wallet size={18}/> },
  { path: '/corporates',      label: 'Corporates',   icon: <Building2 size={18}/> },
  { path: '/hotels',          label: 'Hotels DB',    icon: <Hotel size={18}/> },
  { path: '/create-booking',  label: 'New Booking',  icon: <PlusCircle size={18}/> },
  { path: '/settings',        label: 'Settings',     icon: <Settings size={18}/> },
];

export default function Sidebar({ open = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAdminAuthStore();

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onClose}
          className="sb-overlay"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99, display: 'none',
          }}
        />
      )}

      <aside
        className={`sb-aside ${open ? 'sb-open' : ''}`}
        style={{
          width: 240, minHeight: '100vh',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, zIndex: 100,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Brand + mobile close */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, color: 'white', flexShrink: 0,
            }}>HMT</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>HostMyTrip</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Admin Portal</p>
            </div>
          </div>
          <button onClick={onClose}
            className="sb-close"
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              padding: 4, cursor: 'pointer', display: 'none',
            }}
          ><X size={18}/></button>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: active ? 'var(--bg-sidebar-active)' : 'none',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400, fontSize: 14, marginBottom: 2,
                  transition: 'var(--transition)',
                  borderLeft: active ? '2px solid var(--primary)' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-sidebar-active)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
      </aside>

      <style>{`
        @media (max-width: 900px) {
          .sb-aside { transform: translateX(-100%); box-shadow: 4px 0 24px rgba(0,0,0,0.5); }
          .sb-aside.sb-open { transform: translateX(0); }
          .sb-aside.sb-open ~ .sb-overlay,
          .sb-overlay { display: block !important; }
          .sb-close { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
}
