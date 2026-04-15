import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { hotelsAPI, bookmarksAPI } from '../api';
import { MapPin, Star, Heart, Filter, SlidersHorizontal, ChevronLeft, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import LiveHotelModal from '../components/LiveHotelModal';
import './Hotels.css';

const StarRating = ({ rating }) => (
  <div className="stars">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={i <= Math.round(rating) ? 'star' : 'star star-empty'}>★</span>
    ))}
    <span className="rating-num">{Number(rating).toFixed(1)}</span>
  </div>
);

export default function Hotels() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const city = searchParams.get('city') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || 2;

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookmarked, setBookmarked] = useState(new Set());
  const [sortBy, setSortBy] = useState('rating');
  const [filterStar, setFilterStar] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [liveHotel, setLiveHotel] = useState(null); // for modal

  useEffect(() => {
    const controller = new AbortController();
    fetchHotels(controller.signal);
    fetchBookmarks();
    return () => controller.abort(); // Cancel on unmount or city change
  }, [city]);

  const fetchHotels = async (signal) => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (city) {
        res = await hotelsAPI.search({ city, checkIn, checkOut, guests }, { signal });
      } else {
        res = await hotelsAPI.getAll({ signal });
      }
      if (!signal?.aborted) {
        const data = res.data || [];
        setHotels(data);
        setIsLive(data.length > 0 && data[0].source === 'live');
      }
    } catch (e) {
      if (!signal?.aborted) {
        setError('Could not load hotels. Make sure the backend is running.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await bookmarksAPI.getMy();
      setBookmarked(new Set(res.data.map(b => b.hotelId)));
    } catch (_) {}
  };

  const toggleBookmark = async (hotelId) => {
    // Only DB hotels can be bookmarked
    if (isLive) return;
    try {
      await bookmarksAPI.toggle(hotelId);
      setBookmarked(prev => {
        const next = new Set(prev);
        next.has(hotelId) ? next.delete(hotelId) : next.add(hotelId);
        return next;
      });
    } catch (_) {}
  };

  const handleViewHotel = (hotel) => {
    if (hotel.source === 'live') {
      setLiveHotel(hotel);
    } else {
      navigate(`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
    }
  };

  const sorted = [...hotels]
    .filter(h => filterStar === 0 || h.starRating >= filterStar)
    .sort((a, b) => {
      if (sortBy === 'price') return (a.minPrice || 0) - (b.minPrice || 0);
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

  return (
    <div className="hotels-page">
      <Navbar />
      <div className="hotels-header">
        <div className="container">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1>{city ? `Hotels in ${city}` : 'All Hotels'}</h1>
            {isLive && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#10B981', fontSize: 12, fontWeight: 600, padding: '3px 10px',
                borderRadius: 999, letterSpacing: '0.05em'
              }}>
                <Zap size={12} fill="#10B981" /> LIVE
              </span>
            )}
          </div>
          {city && (
            <p className="hotels-meta">
              {checkIn && checkOut && `${checkIn} → ${checkOut} · `}
              {guests} Guest{guests > 1 ? 's' : ''}
              {loading ? '' : ` · ${sorted.length} properties found`}
              {isLive && ' (Real-time prices from Google Hotels)'}
            </p>
          )}
        </div>
      </div>

      <div className="container hotels-body">
        {/* Filters */}
        <div className="hotels-filters glass">
          <div className="filter-group">
            <SlidersHorizontal size={16} />
            <span>Sort by:</span>
            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="rating">Rating</option>
              <option value="price">Price</option>
            </select>
          </div>
          <div className="filter-divider" />
          <div className="filter-group">
            <Filter size={16} />
            <span>Min Star:</span>
            {[0, 3, 4, 5].map(s => (
              <button key={s} className={`star-filter-btn ${filterStar === s ? 'active' : ''}`} onClick={() => setFilterStar(s)}>
                {s === 0 ? 'All' : `${s}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="hotels-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="hotel-card-skeleton card">
                <div className="skeleton" style={{ height: 200, width: '100%' }} />
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 20, width: '70%' }} />
                  <div className="skeleton" style={{ height: 14, width: '50%' }} />
                  <div className="skeleton" style={{ height: 28, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="alert alert-error" style={{ marginTop: 32 }}>{error}</div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏨</div>
            <h3>No hotels found</h3>
            <p>Try a different city or adjust your filters</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>Search Again</button>
          </div>
        ) : (
          <div className="hotels-grid">
            {sorted.map((hotel, i) => (
              <div
                key={hotel.serpApiId || hotel.id}
                className="hotel-card card animate-in"
                style={{ animationDelay: `${i * 0.05}s`, cursor: 'pointer' }}
                onClick={() => handleViewHotel(hotel)}
              >
                <div className="hotel-img-wrap">
                  <img
                    src={(hotel.images || [])[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'}
                    alt={hotel.name}
                    className="hotel-img"
                    loading="lazy"
                    onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'; }}
                  />
                  {!isLive && (
                    <button
                      className={`bookmark-btn ${bookmarked.has(hotel.id) ? 'bookmarked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(hotel.id); }}
                    >
                      <Heart size={16} fill={bookmarked.has(hotel.id) ? '#EF4444' : 'none'} />
                    </button>
                  )}
                  <div className="hotel-star-badge">
                    {'★'.repeat(Math.min(hotel.starRating || 3, 5))}
                  </div>
                  {hotel.source === 'live' && (
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      background: 'rgba(16,185,129,0.85)', color: 'white',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 999, letterSpacing: '0.05em'
                    }}>LIVE</div>
                  )}
                </div>
                <div className="hotel-card-body">
                  <h3 className="hotel-name">{hotel.name}</h3>
                  <p className="hotel-location"><MapPin size={13} /> {hotel.city} · {(hotel.address || '').split(',').slice(-2).join(',').trim()}</p>
                  <StarRating rating={hotel.rating} />
                  <p className="hotel-reviews">{hotel.reviewCount ? `${hotel.reviewCount.toLocaleString()} reviews` : 'No reviews yet'}</p>
                  <div className="hotel-amenities">
                    {(hotel.amenities || []).slice(0, 3).map(a => <span key={a} className="tag">{a}</span>)}
                  </div>
                  <div className="hotel-footer">
                    <div className="hotel-price">
                      <span className="price-from">from</span>
                      <span className="price-amount">₹{(hotel.minPrice || 0).toLocaleString()}</span>
                      <span className="price-night">/night</span>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); handleViewHotel(hotel); }}>
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Hotel Modal */}
      {liveHotel && (
        <LiveHotelModal
          hotel={liveHotel}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={Number(guests)}
          onClose={() => setLiveHotel(null)}
        />
      )}
    </div>
  );
}
