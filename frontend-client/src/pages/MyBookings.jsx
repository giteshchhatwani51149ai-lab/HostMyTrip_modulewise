import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../api';
import apiClient from '../api';
import { useAuthStore } from '../store/authStore';
import {
  MapPin, Calendar, Users, X, Star, ChevronRight, AlertCircle,
  Plane, Building2, Hash, Search, MoreVertical, Download, Phone,
  Package, SlidersHorizontal, ArrowUpDown, RefreshCw,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ReviewModal from '../components/ReviewModal';
import './Dashboard.css';

const STATUS_BADGE = {
  confirmed: 'badge-success', cancelled: 'badge-danger',
  completed: 'badge-primary', pending: 'badge-warning', failed: 'badge-danger',
};
const PAYMENT_BADGE = {
  paid: 'badge-success', partial: 'badge-warning',
  pending: 'badge-warning', failed: 'badge-danger',
};

const isFlightBooking = (b) =>
  b.bookingType === 'flight' ||
  b.bookingSource === 'flight' ||
  !!b.flightDetail ||
  (b.airline && b.origin);
const isPackageBooking = (b) => b.bookingType === 'package' || b.bookingSource === 'package';

const getBookingType = (b) => {
  if (b.bookingType) return b.bookingType;
  if (isFlightBooking(b)) return 'flight';
  if (isPackageBooking(b)) return 'package';
  return 'hotel';
};

const TypeIcon = ({ b, size = 16 }) => {
  const t = getBookingType(b);
  if (t === 'flight') return <Plane size={size} />;
  if (t === 'package') return <Package size={size} />;
  return <Building2 size={size} />;
};

const TypeBadge = ({ b }) => {
  const t = getBookingType(b);
  const cfg = {
    flight: { label: 'FLIGHT', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
    package: { label: 'PACKAGE', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
    hotel: { label: 'HOTEL', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  }[t];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, border: `1px solid ${cfg.border}`, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
};

function SkeletonCard() {
  return (
    <div className="booking-card glass" style={{ minHeight: 130 }}>
      <div style={{ width: 180, flexShrink: 0, background: 'var(--bg-elevated)', borderRadius: 0 }} />
      <div className="booking-info" style={{ gap: 10 }}>
        {[200, 140, 100].map(w => (
          <div key={w} style={{ height: 14, width: w, borderRadius: 6, background: 'var(--bg-elevated)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
        <div style={{ height: 12, width: 260, borderRadius: 6, background: 'var(--bg-elevated)', animation: 'pulse 1.5s ease-in-out infinite', marginTop: 'auto' }} />
      </div>
    </div>
  );
}

function ActionMenu({ b, onCancel, onReview, onViewHotel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isFlight = getBookingType(b) === 'flight';
  const refDate = b.checkIn || b.departureDate || b.flightDetail?.departureDate || null;
  const isPastDated = refDate ? new Date(refDate) < new Date() : false;
  const canCancel = b.status === 'confirmed' && !isPastDated;
  const canReview = b.status === 'confirmed' && !b.review && !b.isLiveBooking && !isFlight;
  const canViewHotel = !isFlight && !b.isLiveBooking;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
        <MoreVertical size={15} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '110%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 0', zIndex: 50, minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
          {[
            { label: 'Download E-ticket', icon: <Download size={13} />, action: () => { alert('E-ticket download coming soon'); setOpen(false); } },
            canViewHotel && { label: 'View Hotel', icon: <Building2 size={13} />, action: () => { onViewHotel(); setOpen(false); } },
            canReview && { label: 'Write Review', icon: <Star size={13} />, action: () => { onReview(); setOpen(false); } },
            canCancel && { label: 'Cancel Booking', icon: <X size={13} />, action: () => { onCancel(); setOpen(false); }, danger: true },
            { label: 'Contact Support', icon: <Phone size={13} />, action: () => { window.open('mailto:support@hostmytrip.com'); setOpen(false); } },
          ].filter(Boolean).map(item => (
            <button key={item.label} onClick={item.action}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: item.danger ? '#ef4444' : 'var(--text)', textAlign: 'left', fontFamily: 'inherit' }}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const isUpcoming = (b) => {
  const ref = b.checkOut || b.flightDetail?.returnDate || b.flightDetail?.departureDate || b.checkIn;
  if (!ref) return b.status === 'confirmed';
  return new Date(ref) >= new Date() && b.status !== 'cancelled' && b.status !== 'failed';
};
const isPast = (b) => {
  const ref = b.checkOut || b.flightDetail?.returnDate || b.flightDetail?.departureDate || b.checkIn;
  if (!ref) return b.status === 'completed';
  return new Date(ref) < new Date() && b.status !== 'cancelled' && b.status !== 'failed';
};

export default function MyBookings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState('upcoming');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewHotelId, setReviewHotelId] = useState(null);

  useEffect(() => { fetchBookings(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await apiClient.get('/bookings/my?summary=1', { signal: controller.signal });
      clearTimeout(timer);
      setBookings(res.data || []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        setError('Request timed out. The server is taking too long. Please try again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load bookings. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel booking');
    }
  };

  /* ── Derived counts ── */
  const upcomingAll = bookings.filter(isUpcoming);
  const pastAll = bookings.filter(isPast);
  const cancelledAll = bookings.filter(b => b.status === 'cancelled' || b.status === 'failed');

  const byTab = tab === 'upcoming' ? upcomingAll : tab === 'past' ? pastAll : cancelledAll;

  /* ── Apply filters ── */
  const filtered = byTab.filter(b => {
    if (typeFilter !== 'all' && getBookingType(b) !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const ref = (b.bookingReference || '').toLowerCase();
      const dest = (b.flightDetail?.destination || b.destination || b.hotel?.city || b.displayCity || '').toLowerCase();
      const hotel = (b.displayHotelName || b.hotel?.name || '').toLowerCase();
      const date = (b.checkIn || b.flightDetail?.departureDate || '').toLowerCase();
      if (!ref.includes(q) && !dest.includes(q) && !hotel.includes(q) && !date.includes(q)) return false;
    }
    if (dateFrom) {
      const d = new Date(b.checkIn || b.flightDetail?.departureDate || b.createdAt);
      if (d < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const d = new Date(b.checkIn || b.flightDetail?.departureDate || b.createdAt);
      if (d > new Date(dateTo)) return false;
    }
    return true;
  });

  /* ── Sorting ── */
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'amount_desc') return (b.totalAmount || 0) - (a.totalAmount || 0);
    if (sort === 'amount_asc') return (a.totalAmount || 0) - (b.totalAmount || 0);
    return new Date(b.createdAt) - new Date(a.createdAt); // newest
  });

  const stats = {
    total: bookings.length,
    upcoming: upcomingAll.length,
    cancelled: cancelledAll.length,
    spent: bookings.filter(b => b.status !== 'cancelled' && b.status !== 'failed').reduce((s, b) => s + (b.paidAmount || 0), 0),
  };

  const TABS = [
    { key: 'upcoming', label: 'Upcoming', count: upcomingAll.length },
    { key: 'past', label: 'Past', count: pastAll.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledAll.length },
  ];

  const TYPE_FILTERS = [
    { val: 'all', label: 'All', icon: null },
    { val: 'hotel', label: 'Hotels', icon: <Building2 size={12} /> },
    { val: 'flight', label: 'Flights', icon: <Plane size={12} /> },
    { val: 'package', label: 'Packages', icon: <Package size={12} /> },
  ];

  const SORT_OPTIONS = [
    { val: 'newest', label: 'Newest First' },
    { val: 'oldest', label: 'Oldest First' },
    { val: 'amount_desc', label: 'Amount: High → Low' },
    { val: 'amount_asc', label: 'Amount: Low → High' },
  ];

  const emptyMessages = {
    upcoming: { icon: '✈️', title: "No upcoming trips", msg: "Ready for your next adventure?", cta: 'Book Now', path: '/hotels' },
    past: { icon: '🗺️', title: "No past bookings", msg: "Your travel history will appear here." },
    cancelled: { icon: '🙌', title: "No cancelled bookings", msg: "Great news — you haven't cancelled anything!" },
  };

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="container dashboard-content">

        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>My Bookings</h1>
            <p className="dashboard-sub">Manage all your trips in one place</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchBookings} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Total Bookings', value: stats.total, icon: '📋' },
            { label: 'Upcoming', value: stats.upcoming, icon: '✈️' },
            { label: 'Cancelled', value: stats.cancelled, icon: '❌' },
            { label: 'Total Spent', value: `₹${stats.spent.toLocaleString()}`, icon: '💰' },
          ].map(s => (
            <div key={s.label} className="stat-card glass">
              <div className="stat-icon">{s.icon}</div>
              <div>
                <p className="stat-label">{s.label}</p>
                <p className="stat-value">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`dash-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search by ref, destination, or date…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={() => setShowFilters(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: showFilters ? 'var(--primary)' : 'var(--bg-card)', color: showFilters ? '#fff' : 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <SlidersHorizontal size={13} /> Filters
          </button>
          <div style={{ position: 'relative' }}>
            <ArrowUpDown size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ paddingLeft: 28, paddingRight: 12, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', appearance: 'none' }}>
              {SORT_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
            {/* Type filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 2 }}>Type:</span>
              {TYPE_FILTERS.map(f => (
                <button key={f.val} onClick={() => setTypeFilter(f.val)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: typeFilter === f.val ? 'var(--primary)' : 'var(--border)',
                    background: typeFilter === f.val ? 'var(--primary)' : 'transparent',
                    color: typeFilter === f.val ? '#fff' : 'var(--text-muted)' }}>
                  {f.icon}{f.label}
                </button>
              ))}
            </div>
            {/* Date range */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>From:</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12, padding: '0 8px', fontFamily: 'inherit' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>To:</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12, padding: '0 8px', fontFamily: 'inherit' }} />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '14px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <AlertCircle size={20} />
            <div>
              <p style={{ fontWeight: 600, margin: 0, fontSize: 14 }}>Error Loading Bookings</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>{error}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={fetchBookings} style={{ marginLeft: 'auto' }}>Retry</button>
          </div>
        )}

        {/* Booking List */}
        <div className="bookings-list">
          {loading ? (
            [1, 2, 3].map(i => <SkeletonCard key={i} />)
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{emptyMessages[tab].icon}</div>
              <h3>{emptyMessages[tab].title}</h3>
              <p>{emptyMessages[tab].msg}</p>
              {emptyMessages[tab].cta && (
                <button className="btn btn-primary" onClick={() => navigate(emptyMessages[tab].path)}>
                  {emptyMessages[tab].cta}
                </button>
              )}
            </div>
          ) : sorted.map(b => {
            const fd = b.flightDetail;
            const bType = getBookingType(b);
            const isFlight = bType === 'flight';
            return (
              <div key={b.id} className={`booking-card glass ${b.status === 'cancelled' || b.status === 'failed' ? 'cancelled' : ''}`}>
                {/* Left thumbnail */}
                <div className="booking-hotel-img-wrap"
                  style={isFlight
                    ? { background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                    : bType === 'package'
                    ? { background: 'linear-gradient(135deg,#3b1f6e,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                    : {}}>
                  {isFlight
                    ? <Plane size={36} color="#fff" />
                    : bType === 'package'
                    ? <Package size={36} color="#fff" />
                    : <img src={(b.hotel?.images || [])[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300'} alt="" />}
                </div>

                <div className="booking-info">
                  <div className="booking-info-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <TypeIcon b={b} size={15} />
                        {isFlight
                          ? <h3 style={{ margin: 0 }}>{fd?.origin || b.origin || '?'} → {fd?.destination || b.destination || '?'}</h3>
                          : <h3 style={{ margin: 0 }}>{b.displayHotelName || b.hotel?.name}</h3>}
                        <TypeBadge b={b} />
                        {b.isLiveBooking && !isFlight && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 7px', borderRadius: 999 }}>LIVE</span>
                        )}
                      </div>
                      {isFlight
                        ? <p className="booking-city"><Plane size={12} /> {fd?.airline || b.airline || 'Unknown Airline'}</p>
                        : <p className="booking-city"><MapPin size={12} /> {b.displayCity || b.hotel?.city || 'Online Booking'}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div className="booking-badges">
                        <span className={`badge ${STATUS_BADGE[b.status] || 'badge-primary'}`}>{b.status}</span>
                        <span className={`badge ${PAYMENT_BADGE[b.paymentStatus] || 'badge-primary'}`}>{b.paymentStatus}</span>
                        {b.status === 'cancelled' && b.refundStatus && b.refundStatus !== 'none' && (
                          <span className={`badge ${
                            b.refundStatus === 'completed' ? 'badge-success' :
                            b.refundStatus === 'failed'    ? 'badge-danger'  :
                            'badge-warning'
                          }`} title={`Refund ${b.refundStatus}`}>
                            Refund: {b.refundStatus}
                          </span>
                        )}
                      </div>
                      <ActionMenu
                        b={b}
                        onCancel={() => handleCancel(b.id)}
                        onReview={() => setReviewHotelId(b.hotelId)}
                        onViewHotel={() => navigate(`/hotels/${b.hotelId}`)}
                      />
                    </div>
                  </div>

                  <div className="booking-meta-row">
                    {isFlight ? (
                      <>
                        <div className="booking-meta-item"><Calendar size={13} /> {fmtDate(fd?.departureDate || b.checkIn)}</div>
                        {fd?.returnDate && <div className="booking-meta-item">Return: {fmtDate(fd.returnDate)}</div>}
                        <div className="booking-meta-item"><Users size={13} /> {b.guests} passenger{b.guests > 1 ? 's' : ''}</div>
                        {(fd?.pnr || b.pnr) && <div className="booking-meta-item" style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>PNR: {fd?.pnr || b.pnr}</div>}
                      </>
                    ) : (
                      <>
                        <div className="booking-meta-item"><Calendar size={13} /> {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</div>
                        <div className="booking-meta-item"><Users size={13} /> {b.guests} guest{b.guests > 1 ? 's' : ''}</div>
                        {b.displayRoomType && <div className="booking-meta-item">Room: {b.displayRoomType}</div>}
                      </>
                    )}
                  </div>

                  <div className="booking-footer">
                    <div>
                      <p className="booking-amount">Paid: <strong className="payment-paid">₹{Number(b.paidAmount || 0).toLocaleString()}</strong></p>
                      {b.paymentStatus === 'partial' && (
                        <p className="booking-remaining">Remaining: ₹{(b.totalAmount - b.paidAmount).toLocaleString()} at check-in</p>
                      )}
                      {b.bookingReference && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Hash size={10} /> Ref: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.bookingReference}</span>
                        </p>
                      )}
                      {b.amadeusBookingRef && b.amadeusBookingRef !== 'MANUAL_CONFIRMATION_REQUIRED' && (
                        <p style={{ fontSize: 11, color: '#10B981', fontWeight: 700, marginTop: 4, fontFamily: 'monospace', letterSpacing: 1 }}>
                          PNR: {b.amadeusBookingRef}
                        </p>
                      )}
                    </div>
                    <div className="booking-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/bookings/${b.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        View Details <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {reviewHotelId && (
        <ReviewModal hotelId={reviewHotelId} onClose={() => setReviewHotelId(null)} onSuccess={() => { setReviewHotelId(null); fetchBookings(); }} />
      )}
    </div>
  );
}
