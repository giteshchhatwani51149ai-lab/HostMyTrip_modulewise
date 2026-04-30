import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { adminAPI } from '../api';
import {
  Wallet, AlertCircle, Loader2, CheckCircle2, IndianRupee,
  User, Mail, Phone, Calendar, Tag, X, Receipt, Clock
} from 'lucide-react';

const fmtINR = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function PendingCollections() {
  const [bookings, setBookings] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showCollectModal, setShowCollectModal] = useState(false);

  // Collection form state
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.pendingCollections();
      setBookings(res.data.bookings || []);
      setTotalPending(res.data.totalPending || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCollectModal = (booking) => {
    setSelected(booking);
    setAmount(String(booking.totalAmount));
    setMethod('cash');
    setNotes('');
    setSuccess('');
    setShowCollectModal(true);
  };

  const handleCollect = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setCollecting(true);
    setError('');
    try {
      await adminAPI.collectPayment(selected.id, {
        amount: Number(amount),
        method,
        notes,
      });
      setSuccess('Payment collected successfully!');
      setTimeout(() => {
        setShowCollectModal(false);
        setSelected(null);
        setSuccess('');
        load();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark payment collected');
    } finally {
      setCollecting(false);
    }
  };

  const getBookingTypeLabel = (b) => {
    if (b.airline && b.origin && b.destination) return { label: 'Flight', color: '#0ea5e9' };
    let snap = null;
    try { snap = typeof b.passengers === 'string' ? JSON.parse(b.passengers) : b.passengers; } catch { /* ignore */ }
    if (snap?.hotelName) return { label: 'Hotel', color: '#10b981' };
    return { label: 'Booking', color: '#6366f1' };
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet size={26} color="#f59e0b" /> Pending Collections
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Admin-booked reservations awaiting cash/payment collection from customers.
          </p>
        </div>
        <div className="glass" style={{ padding: '16px 24px', borderRadius: 12, textAlign: 'right', minWidth: 200 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>Total Outstanding</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
            <IndianRupee size={22} style={{ display: 'inline' }} />{fmtINR(totalPending)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} pending
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><AlertCircle size={16} /> {error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="spinner" /> Loading...
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass" style={{ padding: 60, borderRadius: 16, textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>All Caught Up!</h3>
          <p style={{ color: 'var(--text-muted)' }}>No pending payment collections at the moment.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {bookings.map((b) => {
            const typeLabel = getBookingTypeLabel(b);
            return (
              <div key={b.id} className="glass" style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 20, alignItems: 'center' }}>
                  {/* Type badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, background: `${typeLabel.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Receipt size={26} color={typeLabel.color} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: typeLabel.color, textTransform: 'uppercase' }}>{typeLabel.label}</span>
                  </div>

                  {/* Details */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{b.bookingReference || `#${b.id}`}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,107,0,0.15)', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Admin Booked
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                      {b.airline ? `${b.airline} · ${b.origin} → ${b.destination}` : (b.destination || 'Booking')}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> {b.guestName}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> {b.guestEmail}</span>
                      {b.guestPhone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> {b.guestPhone}</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> Booked {fmtDate(b.createdAt)}</span>
                      {b.bookedByUser?.name && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={12} /> by {b.bookedByUser.name}</span>}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>To Collect</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>
                      <IndianRupee size={18} style={{ display: 'inline' }} />{fmtINR(b.totalAmount)}
                    </div>
                    {Number(b.paidAmount) > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Partial: ₹{fmtINR(b.paidAmount)} collected
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <button
                    className="btn btn-primary"
                    onClick={() => openCollectModal(b)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
                  >
                    <CheckCircle2 size={16} /> Mark Collected
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Collect Payment Modal */}
      {showCollectModal && selected && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => !collecting && setShowCollectModal(false)}>
          <div style={{ width: 480, maxWidth: '100%', background: '#ffffff', color: '#1a1a1a', borderRadius: 20, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>Collect Payment</h3>
              <button onClick={() => !collecting && setShowCollectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><X size={20} /></button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {success ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <CheckCircle2 size={56} color="#10b981" style={{ marginBottom: 16 }} />
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{success}</h3>
                  <p style={{ color: '#6b7280' }}>Booking marked as paid. Reloading list...</p>
                </div>
              ) : (
                <>
                  {/* Booking Info */}
                  <div style={{ background: '#fef3c7', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid #fcd34d' }}>
                    <div style={{ fontSize: 12, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Booking</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {selected.bookingReference || `#${selected.id}`} · {selected.guestName}
                    </div>
                    <div style={{ fontSize: 13, color: '#78350f' }}>
                      {selected.airline ? `${selected.airline} · ${selected.origin} → ${selected.destination}` : (selected.destination || 'Booking')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #fcd34d' }}>
                      <span style={{ fontSize: 13, color: '#78350f' }}>Total Amount</span>
                      <span style={{ fontWeight: 700, fontSize: 18, color: '#92400e' }}>
                        ₹{fmtINR(selected.totalAmount)}
                      </span>
                    </div>
                    {Number(selected.paidAmount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#78350f' }}>
                        <span>Already Collected</span>
                        <span>₹{fmtINR(selected.paidAmount)}</span>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleCollect}>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Amount Collected (INR) *</label>
                      <input
                        type="number"
                        min="1"
                        max={selected.totalAmount - (selected.paidAmount || 0)}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        required
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                      />
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                        Max: ₹{fmtINR(selected.totalAmount - (selected.paidAmount || 0))} (partial collection allowed)
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Payment Method *</label>
                      <select
                        value={method}
                        onChange={e => setMethod(e.target.value)}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card (POS)</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Notes / Receipt # (optional)</label>
                      <input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Receipt number, UPI ref, etc."
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                      />
                    </div>

                    {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={14} /> {error}</div>}

                    <div style={{ display: 'flex', gap: 12 }}>
                      <button type="button" onClick={() => setShowCollectModal(false)} disabled={collecting} style={{ flex: 1, padding: '14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={collecting} style={{ flex: 2, padding: '14px', fontSize: 15 }}>
                        {collecting ? <><Loader2 size={16} className="spinner" /> Processing...</> : <><CheckCircle2 size={16} /> Confirm Collection</>}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
