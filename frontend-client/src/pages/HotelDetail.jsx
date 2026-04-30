import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
const HotelDetailMap = lazy(() => import('../components/hotels/HotelDetailMap'));
import {
  Star, MapPin, Heart, Share2, ChevronLeft, ChevronRight, X, Wifi, Coffee,
  Dumbbell, Waves, Utensils, Car, Snowflake, Tv, ShieldCheck, Clock,
  Users, CreditCard, Baby, PawPrint,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { hotelsAPI } from '../api';
import SEO from '../components/SEO';
import './HotelDetail.css';


/* ── Helpers ────────────────────────────────────────────────────────────── */
const ratingLabel = (s) => s >= 9 ? 'Exceptional' : s >= 8 ? 'Excellent' : s >= 7 ? 'Very Good' : s >= 6 ? 'Good' : 'Pleasant';

const AMENITY_ICON_MAP = {
  'Free WiFi': Wifi, 'WiFi': Wifi, 'Air conditioning': Snowflake, 'AC': Snowflake,
  'Flat-screen TV': Tv, 'Tv': Tv,
  'Swimming pool': Waves, 'Pool': Waves, 'Fitness centre': Dumbbell, 'Gym': Dumbbell,
  'Restaurant': Utensils, 'Bar': Coffee, 'Coffee/Tea maker': Coffee, 'Breakfast included': Coffee,
  'Parking': Car, 'Airport shuttle': Car, '24-hour front desk': Clock,
};
const AmenityIcon = ({ name, size = 14 }) => {
  const Icon = AMENITY_ICON_MAP[name] || ShieldCheck;
  return <Icon size={size} />;
};

/* ── Reviews summary bar ────────────────────────────────────────────────── */
const ReviewBar = ({ label, score }) => (
  <div className="hd-rev-bar">
    <span className="hd-rev-bar-label">{label}</span>
    <div className="hd-rev-bar-track"><div className="hd-rev-bar-fill" style={{ width: `${score * 10}%` }} /></div>
    <span className="hd-rev-bar-score">{score.toFixed(1)}</span>
  </div>
);

/* ── Lightbox gallery ───────────────────────────────────────────────────── */
const Lightbox = ({ photos, startIdx, onClose }) => {
  const [idx, setIdx] = useState(startIdx);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft')  setIdx((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length, onClose]);
  return (
    <div className="hd-lightbox" onClick={onClose}>
      <button className="hd-lb-close" onClick={onClose}><X size={24}/></button>
      <button className="hd-lb-arrow hd-lb-left"  onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + photos.length) % photos.length); }}><ChevronLeft size={32}/></button>
      <img src={photos[idx]} alt="" onClick={(e) => e.stopPropagation()} />
      <button className="hd-lb-arrow hd-lb-right" onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % photos.length); }}><ChevronRight size={32}/></button>
      <div className="hd-lb-counter">{idx + 1} / {photos.length}</div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────────────────── */
export default function HotelDetail() {
  const { id } = useParams();
  const [sp]   = useSearchParams();
  const navigate = useNavigate();

  const [hotel, setHotel]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activePhoto] = useState(0);
  const [lightboxAt, setLightboxAt]   = useState(null);   // null | photo index
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [bookmarked, setBookmarked]     = useState(false);
  const [reviewPage, setReviewPage]     = useState(1);
  const [checkIn,  setCheckIn]  = useState(sp.get('checkIn')  || '');
  const [checkOut, setCheckOut] = useState(sp.get('checkOut') || '');
  const [adults,   setAdults]   = useState(Number(sp.get('adults') || 2));
  const [rooms,    setRooms]    = useState(Number(sp.get('rooms')  || 1));
  const isAffiliate = id?.startsWith('mock-');

  /* ── Fetch ─────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = isAffiliate
          ? await hotelsAPI.affiliateGetById(id)
          : await hotelsAPI.getById(id);
        if (!cancelled) setHotel(res.data);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load hotel');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isAffiliate]);

  /* ── Derived ───────────────────────────────────────── */
  const photos = useMemo(() => {
    if (!hotel?.photos?.length) return [];
    // pad to ≥ 8 photos by recycling
    const p = [...hotel.photos];
    while (p.length < 8) p.push(...hotel.photos);
    return p.slice(0, 12);
  }, [hotel]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const n = Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000);
    return n > 0 ? n : 1;
  }, [checkIn, checkOut]);

  const reviewsToShow = useMemo(() => {
    if (!hotel?.reviews) return [];
    const start = (reviewPage - 1) * 10;
    return hotel.reviews.slice(start, start + 10);
  }, [hotel, reviewPage]);

  /* ── Actions ───────────────────────────────────────── */
  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: hotel.name, url }); } catch { /* user cancelled */ }
    } else {
      navigator.clipboard?.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  const onSelectRoom = (room) => {
    // Default dates if user hasn't picked any yet
    let ci = checkIn, co = checkOut;
    if (!ci || !co) {
      const t1 = new Date(); t1.setDate(t1.getDate() + 1);
      const t2 = new Date(); t2.setDate(t2.getDate() + 2);
      ci = t1.toISOString().split('T')[0];
      co = t2.toISOString().split('T')[0];
      setCheckIn(ci); setCheckOut(co);
    }

    navigate('/hotels/checkout', {
      state: {
        hotel: {
          id: hotel.id, name: hotel.name, city: hotel.city, address: hotel.address,
          starRating: hotel.starRating, photo: photos[0], photos: hotel.photos,
        },
        room: {
          id: room.id, name: room.name, bedConfig: room.bedConfig,
          pricePerNight: room.pricePerNight, refundable: room.refundable,
        },
        checkIn: ci, checkOut: co, adults, rooms,
      },
    });
  };

  /* ── Loading / Error ───────────────────────────────── */
  if (loading) {
    return (
      <div className="hd-page">
        <Navbar />
        <div className="hd-loading">Loading hotel details…</div>
      </div>
    );
  }
  if (error || !hotel) {
    return (
      <div className="hd-page">
        <Navbar />
        <div className="hd-error">
          <h2>{error || 'Hotel not found'}</h2>
          <button className="hd-btn hd-btn-secondary" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    );
  }

  const totalReviews = hotel.reviews?.length || hotel.rating?.reviewCount || 0;
  const totalPages   = Math.max(1, Math.ceil((hotel.reviews?.length || 0) / 10));

  return (
    <div className="hd-page">
      <SEO
        title={`${hotel.name} – ${hotel.city}`}
        description={hotel.description || `Book ${hotel.name} in ${hotel.city}. ${hotel.rooms?.length || ''} room types available.`}
        image={Array.isArray(hotel.images) ? hotel.images[0] : undefined}
        schema="hotel"
        schemaData={{ name: hotel.name, city: hotel.city, rating: hotel.rating, description: hotel.description }}
      />
      <Navbar />

      {/* ── 1. HERO GALLERY ───────────────────────────── */}
      <section className="hd-gallery">
        <div className="hd-gallery-grid">
          <div className="hd-gallery-main" onClick={() => setLightboxAt(activePhoto)}>
            <img src={photos[activePhoto]} alt={hotel.name} />
          </div>
          <div className="hd-gallery-side">
            {photos.slice(1, 5).map((p, i) => (
              <div key={i} className="hd-gallery-thumb" onClick={() => setLightboxAt(i + 1)}>
                <img src={p} alt="" />
                {i === 3 && photos.length > 5 && (
                  <div className="hd-gallery-more">+{photos.length - 5} photos</div>
                )}
              </div>
            ))}
          </div>
        </div>
        <button className="hd-show-all" onClick={() => setLightboxAt(0)}>
          Show all {photos.length} photos
        </button>
      </section>

      {lightboxAt !== null && (
        <Lightbox photos={photos} startIdx={lightboxAt} onClose={() => setLightboxAt(null)} />
      )}

      <div className="hd-container">
        <div className="hd-main">
          {/* ── 2. HEADER ──────────────────────────────── */}
          <section className="hd-header">
            <div className="hd-header-left">
              <h1 className="hd-name">{hotel.name}</h1>
              <div className="hd-stars">
                {Array.from({ length: hotel.starRating || 0 }).map((_, i) => (
                  <Star key={i} size={16} fill="#ffb400" stroke="#ffb400" />
                ))}
              </div>
              <div className="hd-address">
                <MapPin size={14}/>
                <span>{hotel.address}</span>
                <a href={`#location`} className="hd-map-link">View on Map</a>
              </div>
            </div>
            <div className="hd-header-right">
              <div className="hd-rating-badge">
                <span className="hd-rating-num">{hotel.rating?.score?.toFixed?.(1) ?? '-'}</span>
                <div>
                  <strong>{ratingLabel(hotel.rating?.score || 0)}</strong>
                  <small>{totalReviews.toLocaleString('en-IN')} reviews</small>
                </div>
              </div>
              <div className="hd-header-actions">
                <button className="hd-icon-btn" onClick={onShare} title="Share"><Share2 size={16}/></button>
                <button className={`hd-icon-btn ${bookmarked ? 'hd-icon-btn-active' : ''}`} onClick={() => setBookmarked((b) => !b)} title="Save">
                  <Heart size={16} fill={bookmarked ? '#ef4444' : 'none'} stroke={bookmarked ? '#ef4444' : 'currentColor'}/>
                </button>
              </div>
            </div>
          </section>

          {/* ── 3. QUICK INFO CARDS ────────────────────── */}
          <section className="hd-quick">
            <div className="hd-quick-card">
              <Clock size={18}/>
              <div><strong>Check-in</strong><span>From {hotel.checkInTime || '14:00'}</span></div>
            </div>
            <div className="hd-quick-card">
              <Clock size={18}/>
              <div><strong>Check-out</strong><span>By {hotel.checkOutTime || '11:00'}</span></div>
            </div>
            <div className="hd-quick-card">
              <ShieldCheck size={18}/>
              <div><strong>Free cancellation</strong><span>Up to 48 hrs before</span></div>
            </div>
            <div className="hd-quick-card hd-quick-popular">
              <strong>Most popular facilities</strong>
              <div className="hd-popular-list">
                {(hotel.amenities || ['WiFi','Pool','Parking','Gym','Spa']).slice(0, 5).map((a) => (
                  <span key={a} className="hd-popular-pill"><AmenityIcon name={a} size={12}/> {a}</span>
                ))}
              </div>
            </div>
          </section>

          {/* ── 5. ABOUT ───────────────────────────────── */}
          <section className="hd-section">
            <h2>About this property</h2>
            <p className={`hd-desc ${descExpanded ? 'hd-desc-expanded' : ''}`}>{hotel.description || 'No description available.'}</p>
            {(hotel.description?.length || 0) > 240 && (
              <button className="hd-link-btn" onClick={() => setDescExpanded((e) => !e)}>
                {descExpanded ? 'Read less' : 'Read more'}
              </button>
            )}
          </section>

          {/* ── 4. ROOM TYPES ──────────────────────────── */}
          <section className="hd-section" id="rooms">
            <h2>Available rooms</h2>
            <div className="hd-rooms">
              <div className="hd-rooms-head">
                <span>Room type</span><span>Sleeps</span><span>Price / night</span><span></span>
              </div>
              {(hotel.rooms || []).map((r) => (
                <div key={r.id} className="hd-room">
                  <div className="hd-room-info">
                    <strong>{r.name}</strong>
                    <small>{r.bedConfig}</small>
                    <div className="hd-room-amenities">
                      {r.amenities.map((a) => (
                        <span key={a} className="hd-room-amenity"><AmenityIcon name={a} size={11}/> {a}</span>
                      ))}
                    </div>
                    {r.refundable && <span className="hd-room-refund"><ShieldCheck size={11}/> Free cancellation</span>}
                  </div>
                  <div className="hd-room-sleeps"><Users size={14}/> {r.sleeps} guests</div>
                  <div className="hd-room-price">
                    <strong>₹{r.pricePerNight.toLocaleString('en-IN')}</strong>
                    <small>per night</small>
                    {nights > 1 && <small>₹{(r.pricePerNight * nights).toLocaleString('en-IN')} for {nights} nights</small>}
                  </div>
                  <button className="hd-btn hd-btn-primary" onClick={() => onSelectRoom(r)}>
                    Select Room
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ── 6. AMENITIES ───────────────────────────── */}
          <section className="hd-section">
            <h2>Amenities</h2>
            <div className="hd-amenity-groups">
              {Object.entries(hotel.amenityGroups || {}).slice(0, showAllAmenities ? 99 : 3).map(([group, list]) => (
                <div key={group} className="hd-amenity-group">
                  <h4>{group}</h4>
                  <ul>
                    {list.map((a) => (
                      <li key={a}><AmenityIcon name={a}/> {a}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {Object.keys(hotel.amenityGroups || {}).length > 3 && (
              <button className="hd-link-btn" onClick={() => setShowAllAmenities((v) => !v)}>
                {showAllAmenities ? 'Show fewer amenities' : 'Show all amenities'}
              </button>
            )}
          </section>

          {/* ── 7. LOCATION & MAP ──────────────────────── */}
          <section className="hd-section" id="location">
            <h2>Location</h2>
            <div className="hd-location-grid">
              <div className="hd-map-wrap" style={{ height: 320 }}>
                <Suspense fallback={<div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>Loading map…</div>}>
                  <HotelDetailMap lat={hotel.latitude} lng={hotel.longitude} name={hotel.name} />
                </Suspense>
              </div>
              <div className="hd-nearby">
                <h4>What's nearby</h4>
                <ul>
                  {(hotel.nearbyAttractions || []).map((a) => (
                    <li key={a.name}><MapPin size={12}/> {a.name} <small>· {a.distanceKm} km</small></li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── 8. REVIEWS ─────────────────────────────── */}
          <section className="hd-section" id="reviews">
            <h2>Guest reviews</h2>
            <div className="hd-rev-summary">
              <div className="hd-rev-overall">
                <div className="hd-rev-overall-score">{hotel.rating?.score?.toFixed?.(1) ?? '-'}</div>
                <div>
                  <strong>{ratingLabel(hotel.rating?.score || 0)}</strong>
                  <small>Based on {totalReviews.toLocaleString('en-IN')} reviews</small>
                </div>
              </div>
              <div className="hd-rev-bars">
                {Object.entries(hotel.ratingBreakdown || {}).map(([k, v]) => (
                  <ReviewBar key={k} label={k} score={v} />
                ))}
              </div>
            </div>

            <div className="hd-reviews">
              {reviewsToShow.map((r) => (
                <div key={r.id} className="hd-review">
                  <div className="hd-review-head">
                    <div className="hd-review-author">
                      <div className="hd-review-avatar">{r.author.charAt(0)}</div>
                      <div>
                        <strong>{r.author}</strong>
                        <small>{new Date(r.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</small>
                      </div>
                    </div>
                    <span className="hd-review-score">{r.score.toFixed(1)}</span>
                  </div>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="hd-pagination">
                <button disabled={reviewPage === 1} onClick={() => setReviewPage((p) => p - 1)}><ChevronLeft size={14}/> Prev</button>
                <span>Page {reviewPage} of {totalPages}</span>
                <button disabled={reviewPage === totalPages} onClick={() => setReviewPage((p) => p + 1)}>Next <ChevronRight size={14}/></button>
              </div>
            )}
          </section>

          {/* ── 9. POLICIES ────────────────────────────── */}
          <section className="hd-section">
            <h2>Hotel policies</h2>
            <div className="hd-policies">
              <div className="hd-policy"><ShieldCheck size={16}/><div><strong>Cancellation</strong><p>{hotel.policies?.cancellation || 'Contact hotel for cancellation policy.'}</p></div></div>
              <div className="hd-policy"><CreditCard size={16}/><div><strong>Payment methods</strong><p>{hotel.policies?.payment || 'All major cards accepted.'}</p></div></div>
              <div className="hd-policy"><Baby size={16}/><div><strong>Children & extra beds</strong><p>{hotel.policies?.children || 'Children welcome.'}</p></div></div>
              <div className="hd-policy"><PawPrint size={16}/><div><strong>Pets</strong><p>{hotel.policies?.pets || 'Pets not allowed.'}</p></div></div>
            </div>
          </section>
        </div>

        {/* ── 10. STICKY BOOKING WIDGET ───────────────── */}
        <aside className="hd-sticky">
          <div className="hd-sticky-card">
            <div className="hd-sticky-price">
              <strong>₹{hotel.price?.amount?.toLocaleString('en-IN') || 0}</strong>
              <small>per night</small>
            </div>
            <div className="hd-field">
              <label>Check-in</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="hd-field">
              <label>Check-out</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="hd-field-row">
              <div className="hd-field">
                <label>Rooms</label>
                <select value={rooms} onChange={(e) => setRooms(Number(e.target.value))}>
                  {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="hd-field">
                <label>Adults</label>
                <select value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
                  {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {nights > 1 && checkIn && checkOut && (
              <div className="hd-sticky-total">
                <span>{nights} nights total</span>
                <strong>₹{((hotel.price?.amount || 0) * nights).toLocaleString('en-IN')}</strong>
              </div>
            )}
            <button
              className="hd-btn hd-btn-primary hd-btn-block"
              onClick={() => {
                const room = hotel.rooms?.[0];
                if (room) onSelectRoom(room);
                else document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Reserve
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
