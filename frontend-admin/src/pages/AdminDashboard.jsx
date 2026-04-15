import React, { useEffect, useState } from 'react';
import { bookingsAPI } from '../api';
import { TrendingUp, BookOpen, XCircle, DollarSign } from 'lucide-react';

const STATUS_BADGE = { confirmed: 'badge-success', cancelled: 'badge-danger', completed: 'badge-primary' };

export default function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsAPI.getAll().then(r => { setBookings(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    revenue: bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.paidAmount, 0),
  };

  const recent = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Dashboard Overview</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Welcome back! Here's what's happening today.</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        {[
          { label: 'Total Bookings', value: stats.total, icon: <BookOpen size={22} />, color: 'var(--primary)' },
          { label: 'Active Bookings', value: stats.confirmed, icon: <TrendingUp size={22} />, color: 'var(--success)' },
          { label: 'Cancelled', value: stats.cancelled, icon: <XCircle size={22} />, color: 'var(--error)' },
          { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: <DollarSign size={22} />, color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Recent Bookings</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['#', 'Guest', 'Hotel', 'Room', 'Check-in', 'Check-out', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((b, i) => (
                <tr key={b.id} style={{ borderTop: '1px solid var(--border)', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-dim)' }}>#{b.id}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13 }}>
                    <p style={{ fontWeight: 500 }}>{b.guestName}</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>{b.guestEmail}</p>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13 }}>
                    {b.displayHotelName || b.hotel?.name || '—'}
                    {b.isLiveBooking && <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', padding: '1px 5px', borderRadius: 999, marginLeft: 5 }}>LIVE</span>}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{b.displayRoomType || b.room?.type || '—'}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13 }}>{b.checkIn}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13 }}>{b.checkOut}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>₹{b.paidAmount?.toLocaleString()}</td>
                  <td style={{ padding: '13px 16px' }}><span className={`badge ${STATUS_BADGE[b.status] || 'badge-primary'}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
