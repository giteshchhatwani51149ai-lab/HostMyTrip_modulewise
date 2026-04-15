import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsAPI, bookmarksAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import { MapPin, Calendar, Users, X, Star, Heart, ChevronRight, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import ReviewModal from '../components/ReviewModal';
import './Dashboard.css';

const STATUS_BADGE = { confirmed: 'badge-success', cancelled: 'badge-danger', completed: 'badge-primary', pending: 'badge-warning', failed: 'badge-danger' };
const PAYMENT_BADGE = { paid: 'badge-success', partial: 'badge-warning', pending: 'badge-warning', failed: 'badge-danger' };

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewHotelId, setReviewHotelId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [bRes, bmRes] = await Promise.all([bookingsAPI.getMy(), bookmarksAPI.getMy()]);
      setBookings(bRes.data);
      setBookmarks(bmRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your bookings. Please refresh or log in again.');
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

  const handleRemoveBookmark = async (hotelId) => {
    try {
      await bookmarksAPI.toggle(hotelId);
      setBookmarks(prev => prev.filter(b => b.hotelId !== hotelId));
    } catch (_) {}
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    spent: bookings.filter(b => b.status !== 'cancelled' && b.status !== 'failed').reduce((s, b) => s + b.paidAmount, 0),
  };

  const failedBookings = bookings.filter(b => b.paymentStatus === 'failed' || b.status === 'failed');

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="container dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>My Dashboard</h1>
            <p className="dashboard-sub">Welcome back, {user?.email?.split('@')[0]}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Total Bookings', value: stats.total, icon: '📋' },
            { label: 'Active Bookings', value: stats.confirmed, icon: '✅' },
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
          <button className={`dash-tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>
            My Bookings ({bookings.length})
          </button>
          <button className={`dash-tab ${tab === 'bookmarks' ? 'active' : ''}`} onClick={() => setTab('bookmarks')}>
            Saved Hotels ({bookmarks.length})
          </button>
        </div>

        {failedBookings.length > 0 && tab === 'bookings' && (
          <div className="alert alert-danger" style={{ marginBottom: 20, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '14px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={20} />
            <div>
              <p style={{ fontWeight: 600, margin: 0, fontSize: 14 }}>Payment Failed</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>You have {failedBookings.length} booking(s) with failed or pending payments. Please re-book to secure your reservation.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : error ? (
          <div className="alert alert-danger" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '14px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <AlertCircle size={20} />
            <div>
              <p style={{ fontWeight: 600, margin: 0, fontSize: 14 }}>Error Loading Bookings</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>{error}</p>
            </div>
          </div>
        ) : tab === 'bookings' ? (
          <div className="bookings-list">
            {bookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No bookings yet</h3>
                <p>Start exploring hotels and make your first booking!</p>
                <button className="btn btn-primary" onClick={() => navigate('/hotels')}>Explore Hotels</button>
              </div>
            ) : bookings.map(b => (
              <div key={b.id} className={`booking-card glass ${b.status === 'cancelled' || b.status === 'failed' ? 'cancelled' : ''}`}>
                <div className="booking-hotel-img-wrap">
                  <img src={(b.hotel?.images || [])[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300'} alt="" />
                </div>
                <div className="booking-info">
                  <div className="booking-info-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3>{b.displayHotelName}</h3>
                        {b.isLiveBooking && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '1px 7px', borderRadius: 999 }}>LIVE</span>
                        )}
                      </div>
                      <p className="booking-city"><MapPin size={12} /> {b.displayCity || 'Online Booking'}</p>
                    </div>
                    <div className="booking-badges">
                      <span className={`badge ${STATUS_BADGE[b.status] || 'badge-primary'}`}>{b.status}</span>
                      <span className={`badge ${PAYMENT_BADGE[b.paymentStatus] || 'badge-primary'}`}>{b.paymentStatus}</span>
                    </div>
                  </div>
                  <div className="booking-meta-row">
                    <div className="booking-meta-item"><Calendar size={13} /> {b.checkIn} → {b.checkOut}</div>
                    <div className="booking-meta-item"><Users size={13} /> {b.guests} guest{b.guests > 1 ? 's' : ''}</div>
                    <div className="booking-meta-item">Room: {b.displayRoomType}</div>
                  </div>
                  <div className="booking-footer">
                    <div>
                      <p className="booking-amount">Paid: <strong className="payment-paid">₹{b.paidAmount?.toLocaleString()}</strong></p>
                      {b.paymentStatus === 'partial' && (
                        <p className="booking-remaining">Remaining: ₹{(b.totalAmount - b.paidAmount).toLocaleString()} at check-in</p>
                      )}
                      {b.amadeusBookingRef && b.amadeusBookingRef !== 'MANUAL_CONFIRMATION_REQUIRED' && (
                        <p style={{ fontSize: 11, color: '#10B981', fontWeight: 700, marginTop: 4, fontFamily: 'monospace', letterSpacing: 1 }}>
                          PNR: {b.amadeusBookingRef}
                        </p>
                      )}
                    </div>
                    <div className="booking-actions">
                      {b.status === 'confirmed' && !b.review && !b.isLiveBooking && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setReviewHotelId(b.hotelId)}>
                          <Star size={13} /> Review
                        </button>
                      )}
                      {!b.isLiveBooking && (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/hotels/${b.hotelId}`)}>
                          View Hotel <ChevronRight size={13} />
                        </button>
                      )}
                      {b.status === 'confirmed' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)}>
                          <X size={13} /> Cancel
                        </button>
                      )}
                      {(b.paymentStatus === 'failed' || b.status === 'failed') && (
                         <div style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={12}/> Failed
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bookmarks-grid">
            {bookmarks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">❤️</div>
                <h3>No saved hotels</h3>
                <p>Bookmark hotels you love to find them easily later!</p>
                <button className="btn btn-primary" onClick={() => navigate('/hotels')}>Explore Hotels</button>
              </div>
            ) : bookmarks.map(bm => (
              <div key={bm.id} className="bookmark-card card" onClick={() => navigate(`/hotels/${bm.hotelId}`)}>
                <div className="bookmark-img-wrap">
                  <img src={(bm.hotel?.images || [])[0] || ''} alt={bm.hotel?.name} />
                  <button className="bookmark-remove" onClick={e => { e.stopPropagation(); handleRemoveBookmark(bm.hotelId); }}>
                    <Heart size={14} fill="#EF4444" color="#EF4444" />
                  </button>
                </div>
                <div className="bookmark-info">
                  <h3>{bm.hotel?.name}</h3>
                  <p><MapPin size={12} /> {bm.hotel?.city}</p>
                  <p className="bookmark-rating">★ {bm.hotel?.rating?.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewHotelId && (
        <ReviewModal hotelId={reviewHotelId} onClose={() => setReviewHotelId(null)} onSuccess={() => { setReviewHotelId(null); fetchAll(); }} />
      )}
    </div>
  );
}
