import React, { useEffect, useMemo, useState } from 'react';
import { bookingsAPI } from '../api';
import { Mail, Phone, ChevronRight, Search } from 'lucide-react';

export default function AdminCustomers() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');

  useEffect(() => {
    bookingsAPI.getAll()
      .then(r => { setBookings(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  /* Derive unique customers from bookings */
  const customers = useMemo(() => {
    const map = new Map();
    bookings.forEach(b => {
      const key = b.guestEmail || b.userId || b.guestName;
      if (!key) return;
      const ex = map.get(key) || {
        email:    b.guestEmail,
        name:     b.guestName,
        phone:    b.guestPhone,
        bookings: 0,
        spent:    0,
        lastDate: null,
      };
      ex.bookings += 1;
      ex.spent    += Number(b.paidAmount || 0);
      const d = new Date(b.createdAt);
      if (!ex.lastDate || d > ex.lastDate) ex.lastDate = d;
      map.set(key, ex);
    });
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      (c.name  || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [customers, query]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Customers</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        {customers.length} unique customers · derived from bookings
      </p>

      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}/>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, email, phone…"
          style={{ width: '100%', padding: '9px 14px 9px 38px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none' }}
        />
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Customer', 'Contact', 'Bookings', 'Total spent', 'Last booking'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '13px 16px', fontSize: 13 }}>
                    <div style={{ fontWeight: 500 }}>{c.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.email || '—'}</div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11}/> {c.email || '—'}</div>
                    {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={11}/> {c.phone}</div>}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600 }}>{c.bookings}</td>
                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>₹{c.spent.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.lastDate ? c.lastDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No customers match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
