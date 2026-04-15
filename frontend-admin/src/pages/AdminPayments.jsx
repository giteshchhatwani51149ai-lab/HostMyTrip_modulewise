import React, { useEffect, useState } from 'react';
import { bookingsAPI } from '../api';
import { CreditCard, Search } from 'lucide-react';

const PAYMENT_BADGE = { paid: 'badge-success', partial: 'badge-warning', pending: 'badge-warning', failed: 'badge-danger' };

export default function AdminPayments() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsAPI.getAll();
      setBookings(res.data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter(b => filter === 'all' || b.paymentStatus === filter);
  
  const stats = {
      paid: bookings.filter(b => b.paymentStatus === 'paid').reduce((s,b)=>s+b.paidAmount, 0),
      partial: bookings.filter(b => b.paymentStatus === 'partial').reduce((s,b)=>s+b.paidAmount, 0),
      failed: bookings.filter(b => b.paymentStatus === 'failed').length
  };

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ fontWeight: 800, fontSize: 32, marginBottom: 8, color: 'var(--text)' }}>Payment Overview</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Track and manage customer payments and transactions.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 30 }}>
         <div className="card" style={{ padding: 20 }}>
           <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Fully Paid (Collected)</p>
           <h2 style={{ marginTop: 5, color: '#10B981' }}>₹{stats.paid.toLocaleString()}</h2>
         </div>
         <div className="card" style={{ padding: 20 }}>
           <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Partially Paid (Locked)</p>
           <h2 style={{ marginTop: 5, color: '#F59E0B' }}>₹{stats.partial.toLocaleString()}</h2>
         </div>
         <div className="card" style={{ padding: 20 }}>
           <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Failed Transactions</p>
           <h2 style={{ marginTop: 5, color: '#EF4444' }}>{stats.failed}</h2>
         </div>
         <div className="card" style={{ padding: 20 }}>
           <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Total Transactions</p>
           <h2 style={{ marginTop: 5 }}>{bookings.length}</h2>
         </div>
      </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18 }}>Recent Transactions</h2>
            <div style={{ display: 'flex', gap: 10 }}>
              {['all', 'paid', 'partial', 'pending', 'failed'].map(f => (
                <button
                  key={f}
                  className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: 13, textTransform: 'capitalize' }}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>Booking ID</th>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>Customer</th>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>Amount</th>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>Payment Type</th>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>Stripe Ref</th>
                  <th style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px', fontSize: 14, fontWeight: 600 }}>#{b.id}</td>
                    <td style={{ padding: '16px', fontSize: 14 }}>
                      <div>{b.guestName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.guestEmail}</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: 14 }}>₹{b.totalAmount.toLocaleString()}</td>
                    <td style={{ padding: '16px', fontSize: 14, textTransform: 'capitalize' }}>{b.paymentType}</td>
                    <td style={{ padding: '16px', fontSize: 13, fontFamily: 'monospace' }}>{b.stripePaymentIntentId || '-'}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${PAYMENT_BADGE[b.paymentStatus] || 'badge-primary'}`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                   <tr>
                     <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found for this filter.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
