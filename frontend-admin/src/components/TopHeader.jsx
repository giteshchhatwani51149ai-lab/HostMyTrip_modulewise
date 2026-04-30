import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, User, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { bookingsAPI } from '../api';
import { useTheme } from '../hooks/useTheme';

export default function TopHeader({ onToggleSidebar }) {
  const navigate           = useNavigate();
  const { user, logout }   = useAdminAuthStore();
  const { theme, toggle }  = useTheme();
  const [query, setQuery]  = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showAvatar, setShowAvatar]   = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState([]);
  const searchRef = useRef(null);
  const avatarRef = useRef(null);
  const notifRef  = useRef(null);

  /* Pull pending bookings as notifications */
  useEffect(() => {
    bookingsAPI.getAll().then(r => {
      const pending = (r.data || [])
        .filter(b => b.status === 'pending')
        .slice(0, 5)
        .map(b => ({
          id:    b.id,
          title: `Pending booking ${b.bookingReference || `#${b.id}`}`,
          sub:   `${b.guestName || b.guestEmail} · ₹${Number(b.totalAmount || 0).toLocaleString('en-IN')}`,
        }));
      setNotifications(pending);
    }).catch(() => {});
  }, []);

  /* Click-outside close */
  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setShowAvatar(false);
      if (notifRef.current  && !notifRef.current.contains(e.target))  setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /* Live search (debounced) */
  useEffect(() => {
    const q = query.trim().toLowerCase();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await bookingsAPI.getAll();
        const matches = (r.data || []).filter(b => {
          return (
            (b.bookingReference || '').toLowerCase().includes(q) ||
            (b.guestEmail       || '').toLowerCase().includes(q) ||
            (b.guestName        || '').toLowerCase().includes(q) ||
            String(b.id).includes(q)
          );
        }).slice(0, 6);
        setResults(matches);
        setShowResults(true);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 90,
      height: 64, padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      background: 'var(--bg-card)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Mobile sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          padding: 6, borderRadius: 8, cursor: 'pointer',
          display: 'none',
        }}
        className="th-mobile-toggle"
        aria-label="Toggle navigation"
      ><Menu size={20}/></button>

      {/* Global search */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}/>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setShowResults(true)}
          placeholder="Search by booking ref, customer email…"
          style={{
            width: '100%', padding: '9px 14px 9px 38px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none',
            transition: 'var(--transition)',
          }}
          onFocusCapture={e => e.target.style.borderColor = 'var(--primary)'}
          onBlurCapture={e => e.target.style.borderColor = 'var(--border)'}
        />

        {showResults && results.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow)',
            maxHeight: 360, overflowY: 'auto',
          }}>
            {results.map(b => (
              <button key={b.id} onClick={() => { navigate('/bookings'); setShowResults(false); setQuery(''); }}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                  color: 'var(--text)', cursor: 'pointer', transition: 'var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.bookingReference || `#${b.id}`} · {b.guestName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.guestEmail} · ₹{Number(b.totalAmount || 0).toLocaleString('en-IN')}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notification bell */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button onClick={() => setNotifOpen(o => !o)}
          style={{
            position: 'relative', background: 'none', border: 'none',
            color: 'var(--text-muted)', padding: 8, borderRadius: 8, cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <Bell size={18}/>
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
              background: 'var(--error)', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'grid', placeItems: 'center',
            }}>{notifications.length}</span>
          )}
        </button>

        {notifOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 320,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
              Notifications {notifications.length > 0 && `(${notifications.length})`}
            </div>
            {notifications.length === 0 ? (
              <div style={{ padding: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>No notifications.</div>
            ) : notifications.map(n => (
              <button key={n.id} onClick={() => { navigate('/bookings'); setNotifOpen(false); }}
                style={{
                  width: '100%', padding: '10px 14px', textAlign: 'left',
                  background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                  color: 'var(--text)', cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.sub}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Avatar dropdown */}
      <div ref={avatarRef} style={{ position: 'relative' }}>
        <button onClick={() => setShowAvatar(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            padding: '6px 10px 6px 6px', borderRadius: 999, cursor: 'pointer', color: 'var(--text)',
            transition: 'var(--transition)',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 12, color: '#fff',
          }}>{(user?.email?.[0] || 'A').toUpperCase()}</div>
          <span style={{ fontSize: 12, fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email?.split('@')[0]}
          </span>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }}/>
        </button>

        {showAvatar && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 200,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button onClick={() => { setShowAvatar(false); navigate('/settings'); }}
              style={dropItem}><User size={14}/> Profile</button>
            <button onClick={() => { setShowAvatar(false); logout(); }}
              style={{ ...dropItem, color: 'var(--error)', borderTop: '1px solid var(--border)' }}><LogOut size={14}/> Logout</button>
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <button
        className="theme-toggle-btn"
        onClick={toggle}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        aria-label="Toggle theme"
      >
        <span className="theme-toggle-knob">
          {theme === 'light' ? <Sun size={10} color="#fff" /> : <Moon size={10} color="#fff" />}
        </span>
      </button>

      <style>{`
        @media (max-width: 900px) {
          .th-mobile-toggle { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}

const dropItem = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 16px', textAlign: 'left',
  background: 'none', border: 'none',
  color: 'var(--text)', fontSize: 13, cursor: 'pointer',
  transition: 'var(--transition)',
};
