import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, MapPin, Plane, Building2, ChevronRight, ChevronDown, ChevronUp,
  Users, Plus, Star, Search, Package, ListChecks, Award, Clock,
  ArrowRight, Sparkles,
} from 'lucide-react';
import { bookingsAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/Navbar';
import ReviewModal from '../components/ReviewModal';
import './Dashboard.css';

/* ── helpers ──────────────────────────────────────────────────────── */
const fmtDate = (s) => s
  ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const isFlight = (b) => Boolean(
  b?.flightDetail || b?.airline || b?.pnr || b?.amadeusOfferId || b?.amadeusBookingRef
);

/** Pulls primary trip-start date out of any booking shape. */
const tripStart = (b) => {
  const fd = b.flightDetail;
  const raw = (fd?.departureDate) || b.departureDate || b.checkIn;
  return raw ? new Date(raw) : null;
};

/** "Welcome, {firstName}" — fall back to email local-part, properly cased. */
const friendlyName = (user) => {
  if (!user) return 'traveller';
  if (user.firstName) return user.firstName;
  if (user.name)      return user.name.split(' ')[0];
  if (user.email)     return user.email.split('@')[0].split('.')[0]
                          .replace(/^./, c => c.toUpperCase());
  return 'traveller';
};

/** Days remaining (positive) until a trip; null if past. */
const daysToGo = (date) => {
  if (!date) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const t = new Date(date); t.setHours(0,0,0,0);
  const diff = Math.round((t - today) / (1000 * 60 * 60 * 24));
  return diff;
};

/* ── Trip card ────────────────────────────────────────────────────── */
const TripCard = ({ booking, onView, onReview }) => {
  const flight    = isFlight(booking);
  const fd        = booking.flightDetail;
  const date      = tripStart(booking);
  const days      = daysToGo(date);
  const isUpcoming = days !== null && days >= 0;

  const title = flight
    ? `${fd?.origin || booking.origin || '?'} → ${fd?.destination || booking.destination || '?'}`
    : (booking.displayHotelName || booking.hotel?.name || 'Hotel booking');
  const sub = flight
    ? (fd?.airline || booking.airline || 'Flight')
    : (booking.displayCity || booking.hotel?.city || '');

  const statusClass = booking.status === 'confirmed' ? 'badge-success'
                    : booking.status === 'pending'   ? 'badge-warning'
                    : booking.status === 'cancelled' || booking.status === 'failed' ? 'badge-danger'
                    : 'badge-primary';

  return (
    <div className="glass" style={{
      padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12,
      border: '1px solid var(--border)', transition: 'var(--transition)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: flight
            ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
            : 'rgba(255,107,0,0.12)',
          display: 'grid', placeItems: 'center',
          color: flight ? '#fff' : 'var(--primary)',
        }}>
          {flight ? <Plane size={20}/> : <Building2 size={20}/>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </h3>
            <span className={`badge ${statusClass}`} style={{ fontSize: 10, textTransform: 'capitalize' }}>
              {booking.status}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11}/> {sub}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={12}/> {fmtDate(date)}
          {!flight && booking.checkOut && ` → ${fmtDate(booking.checkOut)}`}
        </span>
        {booking.bookingReference && (
          <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600 }}>
            {booking.bookingReference}
          </span>
        )}
      </div>

      {/* Countdown for upcoming trips */}
      {isUpcoming && (
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: days <= 3 ? 'rgba(255,107,0,0.12)' : 'var(--bg)',
          border: `1px solid ${days <= 3 ? 'var(--primary)' : 'var(--border)'}`,
          fontSize: 13, fontWeight: 600,
          color: days <= 3 ? 'var(--primary)' : 'var(--text)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Clock size={13}/>
          {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days} days to go`}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onView(booking)} style={{ flex: 1 }}>
          View Details <ChevronRight size={13}/>
        </button>
        {onReview && booking.status === 'confirmed' && !booking.review && !flight && (
          <button className="btn btn-primary btn-sm" onClick={() => onReview(booking)}>
            <Star size={13}/> Review
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Stat card ────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, accent }) => (
  <div className="glass" style={{ padding: 18, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: accent || 'rgba(255,107,0,0.12)',
      color: 'var(--primary)',
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  </div>
);

/* ── Quick action tile ────────────────────────────────────────────── */
const QuickAction = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="glass quick-action-tile" style={{
    padding: 18, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
    cursor: 'pointer', border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text)', fontFamily: 'inherit',
    fontSize: 14, fontWeight: 600, textAlign: 'left',
    transition: 'var(--transition)',
  }}>
    <div style={{
      width: 38, height: 38, borderRadius: 10,
      background: 'rgba(255,107,0,0.12)', color: 'var(--primary)',
      display: 'grid', placeItems: 'center', flexShrink: 0,
    }}>{icon}</div>
    <span style={{ flex: 1 }}>{label}</span>
    <ArrowRight size={16} color="var(--text-muted)"/>
  </button>
);

/* ── Main page ────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user }     = useAuthStore();
  const navigate     = useNavigate();
  const [bookings, setBookings]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [pastExpanded, setPastExpanded] = useState(false);
  const [reviewHotelId, setReviewHotelId] = useState(null);

  /* fetch */
  const fetchBookings = () => {
    setLoading(true);
    setError('');
    bookingsAPI.getMySummary()
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(err => {
        console.error('[Dashboard] /bookings/my failed:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load bookings');
        setBookings([]);
      })
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchBookings(); }, []);

  /* split into upcoming / past */
  const { upcoming, past } = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const u = []; const p = [];
    for (const b of bookings) {
      if (b.status === 'cancelled' || b.status === 'failed') {
        p.push(b); continue;
      }
      const d = tripStart(b);
      if (d && d >= today) u.push(b); else p.push(b);
    }
    /* sort upcoming by closest first, past by most-recent first */
    u.sort((a, b) => (tripStart(a) - tripStart(b)));
    p.sort((a, b) => (tripStart(b) - tripStart(a)));
    return { upcoming: u, past: p };
  }, [bookings]);

  const handleView = (b) => {
    navigate(`/bookings/${b.id}`);
  };

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="container dashboard-content">

        {/* ── Welcome ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>
            Welcome back, {friendlyName(user)}!
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Here&apos;s what&apos;s happening with your trips.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{
            background: 'rgba(220,38,38,0.10)', border: '1px solid var(--error)',
            color: 'var(--error)', padding: '12px 16px', borderRadius: 10,
            marginBottom: 20, fontSize: 13, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span><strong>Couldn&apos;t load bookings:</strong> {error}</span>
            <button onClick={fetchBookings}
              className="btn btn-sm"
              style={{ background: 'var(--error)', color: '#fff', border: 'none' }}>
              Retry
            </button>
          </div>
        )}

        {/* ── Quick stats ──────────────────────────────────────── */}
        <div style={{
          display: 'grid', gap: 14, marginBottom: 32,
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}>
          <StatCard icon={<Plane size={20}/>}      label="Upcoming trips" value={upcoming.length}/>
          <StatCard icon={<ListChecks size={20}/>} label="Past trips"     value={past.length}/>
          <StatCard icon={<Award size={20}/>}      label="Loyalty points" value={user?.loyaltyPoints ?? 0}/>
        </div>

        {/* ── Section 1: Upcoming Trips (priority) ─────────────── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--primary)"/> Upcoming trips
            </h2>
            {upcoming.length > 0 && (
              <button onClick={() => navigate('/my-bookings')}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                View all <ChevronRight size={14}/>
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {[1,2,3].map(i => (
                <div key={i} className="glass" style={{ height: 200, borderRadius: 14 }}/>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="glass" style={{ padding: 36, borderRadius: 14, textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto 14px', borderRadius: '50%',
                background: 'rgba(255,107,0,0.12)', color: 'var(--primary)',
                display: 'grid', placeItems: 'center',
              }}><Plane size={28}/></div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No upcoming trips</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 18 }}>
                Ready for your next adventure?
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => navigate('/flights')}>
                  <Plane size={14}/> Book a flight
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/hotels')}>
                  <Building2 size={14}/> Find a hotel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {upcoming.slice(0, 6).map(b => (
                <TripCard key={b.id} booking={b} onView={handleView}/>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2: Past Trips (collapsible) ───────────────── */}
        <section style={{ marginBottom: 36 }}>
          <button
            onClick={() => setPastExpanded(e => !e)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px', borderRadius: 12,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'var(--transition)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700 }}>
              <ListChecks size={18} color="var(--primary)"/>
              Past trips
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                ({past.length})
              </span>
            </span>
            {pastExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
          </button>

          {pastExpanded && (
            <div style={{ marginTop: 14 }}>
              {past.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                  No past trips yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {past.slice(0, 9).map(b => (
                    <TripCard
                      key={b.id}
                      booking={b}
                      onView={handleView}
                      onReview={!isFlight(b) ? (bk) => setReviewHotelId(bk.hotelId) : undefined}
                    />
                  ))}
                </div>
              )}
              {past.length > 9 && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button className="btn btn-secondary" onClick={() => navigate('/my-bookings')}>
                    View all {past.length} past trips
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Section 3: Saved Travelers ────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="var(--primary)"/> Saved travellers
            </h2>
            <button onClick={() => navigate('/profile?tab=travellers')}
              style={{
                background: 'none', border: 'none', color: 'var(--primary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
              Manage <ChevronRight size={14}/>
            </button>
          </div>

          <div className="glass" style={{ padding: 24, borderRadius: 14, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, margin: '0 auto 12px', borderRadius: '50%',
              background: 'rgba(255,107,0,0.12)', color: 'var(--primary)',
              display: 'grid', placeItems: 'center',
            }}><Users size={24}/></div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 14 }}>
              Save frequent travellers to speed up future bookings.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/profile?tab=travellers')}>
              <Plus size={13}/> Add traveller
            </button>
          </div>
        </section>

        {/* ── Section 4: Quick Actions ──────────────────────────── */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Quick actions</h2>
          <div style={{
            display: 'grid', gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}>
            <QuickAction icon={<Plane size={18}/>}    label="Search flights"     onClick={() => navigate('/flights')}/>
            <QuickAction icon={<Building2 size={18}/>} label="Search hotels"      onClick={() => navigate('/hotels')}/>
            <QuickAction icon={<Package size={18}/>}   label="Browse packages"    onClick={() => navigate('/packages')}/>
            <QuickAction icon={<ListChecks size={18}/>} label="View all bookings" onClick={() => navigate('/my-bookings')}/>
          </div>
        </section>
      </div>

      {reviewHotelId && (
        <ReviewModal
          hotelId={reviewHotelId}
          onClose={() => setReviewHotelId(null)}
          onSuccess={() => { setReviewHotelId(null); fetchBookings(); }}
        />
      )}

      <style>{`
        .quick-action-tile:hover {
          border-color: var(--primary) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
