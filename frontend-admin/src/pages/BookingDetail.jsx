import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../api';
import {
  ArrowLeft, Edit2, X, Save, CheckCircle2, Mail, FileDown, RotateCcw,
  User as UserIcon, Phone, AtSign, MapPin, Plane, Building2, CreditCard,
  Clock, FileText, AlertCircle, Calendar, Plus,
} from 'lucide-react';

/* ── helpers ──────────────────────────────────────────────────────── */
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate  = (s) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT    = (s) => s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_BADGE = {
  confirmed: 'badge-success', cancelled: 'badge-danger',
  completed: 'badge-primary', pending: 'badge-warning', failed: 'badge-danger',
};

/* ── card primitive ───────────────────────────────────────────────── */
const Card = ({ title, icon, action, children }) => (
  <div className="glass" style={{ padding: 20, borderRadius: 'var(--radius-lg)', marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
        {icon} {title}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
    <div style={{ width: 160, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</div>
    <div style={{ color: 'var(--text)', flex: 1, wordBreak: 'break-word' }}>{value || '—'}</div>
  </div>
);

/* ── main component ──────────────────────────────────────────────── */
export default function BookingDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [editMode, setEditMode]   = useState(false);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [busy, setBusy] = useState({ confirm: false, resend: false });
  const [toast, setToast] = useState(null);

  const showToast = (kind, msg) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.bookingDetail(id)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load booking');
        setLoading(false);
      });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* ── action handlers ─────────────────────────────────────────── */
  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await adminAPI.updateBooking(id, editForm);
      showToast('success', 'Booking updated');
      setEditMode(false);
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleConfirm = async () => {
    setBusy(b => ({ ...b, confirm: true }));
    try {
      await adminAPI.confirmBooking(id);
      showToast('success', 'Booking confirmed');
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to confirm');
    } finally { setBusy(b => ({ ...b, confirm: false })); }
  };

  const handleCancelSubmit = async () => {
    if (!confirm('Cancel this booking? This action cannot be undone.')) return;
    try {
      await adminAPI.cancelBooking(id, cancelReason);
      showToast('success', 'Booking cancelled');
      setShowCancel(false);
      setCancelReason('');
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleResend = async () => {
    setBusy(b => ({ ...b, resend: true }));
    try {
      const r = await adminAPI.resendEmail(id);
      showToast('success', r.data?.message || 'Email queued');
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to resend');
    } finally { setBusy(b => ({ ...b, resend: false })); }
  };

  const handleAddNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    setAddingNote(true);
    try {
      await adminAPI.addNote(id, text);
      setNoteText('');
      showToast('success', 'Note added');
      load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to add note');
    } finally { setAddingNote(false); }
  };

  /* ── loading / error ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)' }}>
        Loading booking…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: 32 }}>
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={16}/> {error || 'Booking not found'}
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/bookings')}>
          <ArrowLeft size={14}/> Back to bookings
        </button>
      </div>
    );
  }

  const b           = data;
  const isFlight    = b.bookingType === 'flight';
  const isHotel     = b.bookingType === 'hotel';
  const passengers  = isFlight && Array.isArray(b.snapshot) ? b.snapshot : [];
  const hotelSnap   = isHotel  && b.snapshot && !Array.isArray(b.snapshot) ? b.snapshot : null;

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 1000,
          padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: toast.kind === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', boxShadow: 'var(--shadow)',
        }}>{toast.msg}</div>
      )}

      {/* ── 1. HEADER ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('/bookings')}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 13, cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: 6, marginBottom: 12, padding: 0,
          }}>
          <ArrowLeft size={14}/> All bookings
        </button>

        <div className="glass" style={{ padding: 22, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.01em' }}>
                  {b.bookingReference || `#${b.id}`}
                </h1>
                <span className={`badge ${STATUS_BADGE[b.status] || 'badge-primary'}`} style={{ fontSize: 12 }}>
                  {b.status}
                </span>
                <span className="badge badge-secondary" style={{ fontSize: 11, textTransform: 'capitalize' }}>
                  {b.bookingType}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Created {fmtDT(b.createdAt)} · Updated {fmtDT(b.updatedAt)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!editMode ? (
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  setEditForm({
                    guestName:  b.guestName || '',
                    guestEmail: b.guestEmail || '',
                    guestPhone: b.guestPhone || '',
                  });
                  setEditMode(true);
                }}>
                  <Edit2 size={13}/> Edit
                </button>
              ) : (
                <>
                  <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleSaveEdit}>
                    <Save size={13}/> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)}>
                    <X size={13}/> Cancel
                  </button>
                </>
              )}
              {b.status !== 'cancelled' && b.status !== 'failed' && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowCancel(s => !s)}
                  style={{ color: 'var(--error)', borderColor: 'var(--error)' }}>
                  <X size={13}/> Cancel Booking
                </button>
              )}
            </div>
          </div>

          {/* Inline cancel form */}
          {showCancel && (
            <div style={{ marginTop: 14, padding: 14, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Customer request, weather disruption…"
                rows={2}
                style={{
                  width: '100%', padding: 10, background: 'var(--bg-2)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  color: 'var(--text)', fontSize: 13, resize: 'vertical', marginBottom: 10,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={handleCancelSubmit}
                  style={{ background: 'var(--error)', color: '#fff' }}>
                  Confirm cancellation
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowCancel(false)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. CUSTOMER INFO ──────────────────────────────────── */}
      <Card title="Customer Information" icon={<UserIcon size={15} color="var(--primary)"/>}>
        {editMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lblStyle}>Name</label>
              <input value={editForm.guestName} onChange={e => setEditForm(f => ({ ...f, guestName: e.target.value }))} style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Email</label>
              <input value={editForm.guestEmail} onChange={e => setEditForm(f => ({ ...f, guestEmail: e.target.value }))} style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Phone</label>
              <input value={editForm.guestPhone} onChange={e => setEditForm(f => ({ ...f, guestPhone: e.target.value }))} style={inpStyle}/>
            </div>
          </div>
        ) : (
          <>
            <Row label={<><UserIcon size={12} style={{ marginRight: 6 }}/>Name</>}  value={b.guestName}/>
            <Row label={<><AtSign  size={12} style={{ marginRight: 6 }}/>Email</>} value={b.guestEmail}/>
            <Row label={<><Phone   size={12} style={{ marginRight: 6 }}/>Phone</>} value={b.guestPhone}/>
            <Row
              label="Customer profile"
              value={
                <button onClick={() => navigate(`/customers?email=${encodeURIComponent(b.guestEmail || '')}`)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 500 }}>
                  View customer →
                </button>
              }
            />
            <Row label="Previous bookings" value={`${b.previousBookingsCount} previous booking${b.previousBookingsCount === 1 ? '' : 's'}`}/>
          </>
        )}
      </Card>

      {/* ── 3. BOOKING DETAILS (type-specific) ───────────────── */}
      {isFlight && (
        <Card title="Flight Details" icon={<Plane size={15} color="var(--primary)"/>}>
          <Row label="Carrier"       value={b.airline}/>
          <Row label="Route"         value={`${b.origin || '—'} → ${b.destination || '—'}`}/>
          <Row label="Departure"     value={fmtDT(b.departureDate)}/>
          {b.returnDate && <Row label="Return" value={fmtDT(b.returnDate)}/>}
          <Row label="PNR"           value={b.pnr}/>
          <Row label="E-ticket / ref" value={b.amadeusBookingRef || b.bookingReference}/>
          <Row label="Amadeus offer" value={b.amadeusOfferId}/>

          {passengers.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Passengers ({passengers.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', textAlign: 'left' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>DOB</th>
                    <th style={thStyle}>Passport</th>
                    <th style={thStyle}>Nationality</th>
                  </tr>
                </thead>
                <tbody>
                  {passengers.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={tdStyle}>{[p.firstName, p.lastName].filter(Boolean).join(' ') || p.name || '—'}</td>
                      <td style={tdStyle}>{p.type || 'adult'}</td>
                      <td style={tdStyle}>{p.dob || p.dateOfBirth || '—'}</td>
                      <td style={tdStyle}>{p.passport || p.passportNumber || '—'}</td>
                      <td style={tdStyle}>{p.nationality || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {isHotel && (
        <Card title="Hotel Details" icon={<Building2 size={15} color="var(--primary)"/>}>
          <Row label="Hotel"     value={b.displayHotelName}/>
          <Row label="Address"   value={b.hotel?.address || hotelSnap?.hotelAddress || '—'}/>
          <Row label="City"      value={b.displayCity}/>
          <Row label="Check-in"  value={fmtDate(b.checkIn)}/>
          <Row label="Check-out" value={fmtDate(b.checkOut)}/>
          <Row label="Room type" value={b.displayRoomType}/>
          <Row label="Guests"    value={`${b.guests} guest${b.guests === 1 ? '' : 's'} · ${b.rooms || 1} room${b.rooms === 1 ? '' : 's'}`}/>
          {hotelSnap?.specialRequests && <Row label="Special requests" value={hotelSnap.specialRequests}/>}
        </Card>
      )}

      {/* ── 4. PAYMENT INFO ─────────────────────────────────── */}
      <Card title="Payment Information" icon={<CreditCard size={15} color="var(--primary)"/>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
          <KpiBox label="Total amount" value={fmtMoney(b.totalAmount)} primary/>
          <KpiBox label="Paid"          value={fmtMoney(b.paidAmount)}/>
          <KpiBox label="Balance"       value={fmtMoney((b.totalAmount || 0) - (b.paidAmount || 0))}/>
          <KpiBox label="Currency"      value={b.currency || 'INR'}/>
        </div>
        <Row label="Payment method"  value={b.paymentType ? `${b.paymentType} payment` : '—'}/>
        <Row label="Payment status"  value={<span className={`badge ${b.paymentStatus === 'paid' ? 'badge-success' : b.paymentStatus === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{b.paymentStatus}</span>}/>
        <Row label="Gateway txn ID"  value={b.stripePaymentIntentId}/>
        <Row label="Payment date"    value={b.paymentStatus === 'paid' ? fmtDT(b.updatedAt) : '—'}/>
      </Card>

      {/* ── 5. TIMELINE ─────────────────────────────────────── */}
      <Card title="Timeline / Activity Log" icon={<Clock size={15} color="var(--primary)"/>}>
        <div style={{ position: 'relative', paddingLeft: 22 }}>
          <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'var(--border)' }}/>
          {b.timeline.map((t, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
              <div style={{
                position: 'absolute', left: -22, top: 4,
                width: 14, height: 14, borderRadius: '50%',
                background: 'var(--primary)', border: '3px solid var(--bg-2)',
              }}/>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.event}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {fmtDT(t.at)}{t.meta ? ` · ${t.meta}` : ''}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 6. ADMIN ACTIONS ─────────────────────────────────── */}
      <Card title="Admin Actions" icon={<RotateCcw size={15} color="var(--primary)"/>}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {b.status === 'pending' && (
            <button className="btn btn-primary btn-sm" disabled={busy.confirm} onClick={handleConfirm}>
              <CheckCircle2 size={13}/> {busy.confirm ? 'Confirming…' : 'Manually confirm'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" disabled={busy.resend} onClick={handleResend}>
            <Mail size={13}/> {busy.resend ? 'Sending…' : 'Send confirmation email'}
          </button>
          <a className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer"
             href={`${adminAPI.invoiceUrl(b.id)}?token=${localStorage.getItem('admin_token') || ''}`}>
            <FileDown size={13}/> Download invoice
          </a>
          {b.status === 'cancelled' && (
            <button className="btn btn-secondary btn-sm" disabled
              title="Refund flow — connect to gateway provider in production">
              <CreditCard size={13}/> Initiate refund
            </button>
          )}
        </div>
        {b.cancelReason && (
          <div style={{ marginTop: 12, padding: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid var(--error)', borderRadius: 6, fontSize: 13 }}>
            <strong>Cancellation reason:</strong> {b.cancelReason}
          </div>
        )}
      </Card>

      {/* ── 7. INTERNAL NOTES ────────────────────────────────── */}
      <Card title="Internal Notes" icon={<FileText size={15} color="var(--primary)"/>}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add an internal note (visible to admins only)…"
            rows={2}
            style={{
              flex: 1, padding: 10, background: 'var(--bg-2)',
              border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text)', fontSize: 13, resize: 'vertical',
            }}
          />
          <button className="btn btn-primary btn-sm" disabled={addingNote || !noteText.trim()}
            onClick={handleAddNote} style={{ alignSelf: 'flex-start' }}>
            <Plus size={13}/> {addingNote ? 'Saving…' : 'Save'}
          </button>
        </div>

        {b.internalNotes.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '14px 0' }}>
            No internal notes yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {b.internalNotes.slice().reverse().map((n, i) => (
              <div key={i} style={{
                padding: 12, background: 'var(--bg)', borderRadius: 8,
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 6 }}>
                  {n.text}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={10}/> {fmtDT(n.at)} · <strong>{n.author}</strong>
                  {n.authorRole && <span style={{ textTransform: 'capitalize' }}>({n.authorRole})</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── small helpers ───────────────────────────────────────────────── */
const KpiBox = ({ label, value, primary }) => (
  <div style={{
    padding: 14, background: 'var(--bg)', borderRadius: 8,
    border: '1px solid var(--border)',
  }}>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: primary ? 'var(--primary)' : 'var(--text)' }}>{value}</div>
  </div>
);

const lblStyle = { display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 };
const inpStyle = {
  width: '100%', padding: 9, background: 'var(--bg-2)',
  border: '1px solid var(--border)', borderRadius: 6,
  color: 'var(--text)', fontSize: 13,
};
const thStyle = { padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '10px 12px' };
