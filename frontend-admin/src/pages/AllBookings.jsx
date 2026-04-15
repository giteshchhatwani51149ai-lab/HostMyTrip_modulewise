import React, { useEffect, useState } from 'react';
import { bookingsAPI } from '../api';
import { Search, X, MapPin, Calendar } from 'lucide-react';

const STATUS_BADGE = { confirmed: 'badge-success', cancelled: 'badge-danger', completed: 'badge-primary', pending: 'badge-warning', failed: 'badge-danger' };
const PAYMENT_BADGE = { paid: 'badge-success', partial: 'badge-warning', pending: 'badge-warning', failed: 'badge-danger' };

export default function AllBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    bookingsAPI.getAll()
      .then(r => { setBookings(r.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load bookings. Check your login session.');
        setLoading(false);
      });
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const filtered = bookings.filter(b => {
    const matchSearch = !search ||
      b.guestName?.toLowerCase().includes(search.toLowerCase()) ||
      b.guestEmail?.toLowerCase().includes(search.toLowerCase()) ||
      b.displayHotelName?.toLowerCase().includes(search.toLowerCase()) ||
      b.hotel?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 24 }}>All Bookings</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            style={{ background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none', flex: 1 }}
            placeholder="Search by guest, email, or hotel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'confirmed', 'cancelled'].map(s => (
            <button
              key={s}
              className="btn btn-sm"
              style={{
                background: statusFilter === s ? 'var(--primary)' : 'var(--bg-card)',
                color: statusFilter === s ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                textTransform: 'capitalize'
              }}
              onClick={() => setStatusFilter(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : error ? (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', borderRadius: 10, padding: '16px 20px', fontWeight: 500, fontSize: 14 }}>
          ⚠️ {error}
        </div>
      ) : (
        <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} bookings found</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['#', 'Guest', 'Hotel / Room', 'Dates', 'Guests', 'Status', 'Payment', 'Paid', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} style={{ borderTop: '1px solid var(--border)', opacity: b.status === 'cancelled' || b.status === 'failed' ? 0.6 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-dim)' }}>#{b.id}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{b.guestName}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{b.guestEmail}</p>
                      {b.guestPhone && <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{b.guestPhone}</p>}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{b.displayHotelName}</p>
                        {b.isLiveBooking && <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', padding: '1px 6px', borderRadius: 999 }}>LIVE</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.displayRoomType}</p>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <p>{b.checkIn}</p>
                      <p>→ {b.checkOut}</p>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{b.guests}</td>
                    <td style={{ padding: '13px 16px' }}><span className={`badge ${STATUS_BADGE[b.status] || ''}`}>{b.status}</span></td>
                    <td style={{ padding: '13px 16px' }}><span className={`badge ${PAYMENT_BADGE[b.paymentStatus] || ''}`}>{b.paymentStatus}</span></td>
                    <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>₹{b.paidAmount?.toLocaleString()}</td>
                    <td style={{ padding: '13px 16px' }}>
                      {b.status === 'confirmed' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)}>
                          <X size={13} /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
