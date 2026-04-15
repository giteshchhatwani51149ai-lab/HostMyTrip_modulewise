import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { hotelsAPI, bookmarksAPI, bookingsAPI } from '../api';
import { MapPin, Star, Heart, ChevronLeft, Wifi, Coffee, Dumbbell, Waves, Utensils, Car } from 'lucide-react';
import Navbar from '../components/Navbar';
import BookingModal from '../components/BookingModal';
import ReviewModal from '../components/ReviewModal';
import './HotelDetail.css';

const StarRating = ({ rating, large = false }) => (
  <div className="stars">
    {[1,2,3,4,5].map(i => (
      <span key={i} className={i <= Math.round(rating) ? 'star' : 'star star-empty'} style={large ? { fontSize: 18 } : {}}>★</span>
    ))}
    <span className="rating-num" style={large ? { fontSize: 18 } : {}}>{Number(rating).toFixed(1)}</span>
  </div>
);

const AMENITY_ICONS = {
  'Free WiFi': <Wifi size={14} />, 'Gym': <Dumbbell size={14} />, 'Swimming Pool': <Waves size={14} />,
  'Restaurant': <Utensils size={14} />, 'Parking': <Car size={14} />, 'default': <Coffee size={14} />
};

export default function HotelDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const checkIn = sp.get('checkIn') || '';
  const checkOut = sp.get('checkOut') || '';
  const guests = sp.get('guests') || 2;

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    fetchHotel();
  }, [id]);

  const fetchHotel = async () => {
    setLoading(true);
    try {
      const res = await hotelsAPI.getById(id);
      setHotel(res.data);
      checkIfBookmarked();
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const checkIfBookmarked = async () => {
    try {
      const res = await bookmarksAPI.getMy();
      setBookmarked(res.data.some(b => String(b.hotelId) === String(id)));
    } catch (_) {}
  };

  const toggleBookmark = async () => {
    try {
      await bookmarksAPI.toggle(Number(id));
      setBookmarked(!bookmarked);
    } catch (_) {}
  };

  const handleBook = (room) => {
    setSelectedRoom(room);
    setShowBooking(true);
  };

  if (loading) return (
    <div className="hotel-detail-page">
      <Navbar />
      <div className="container" style={{ padding: '40px 24px' }}>
        <div className="skeleton" style={{ height: 480, borderRadius: 20 }} />
      </div>
    </div>
  );
  if (!hotel) return <div className="container" style={{ padding: 40 }}>Hotel not found.</div>;

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)
    : 1;

  return (
    <div className="hotel-detail-page">
      <Navbar />

      <div className="container detail-content">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
          <ChevronLeft size={16} /> Back to results
        </button>

        {/* Gallery */}
        <div className="gallery">
          <div className="gallery-main">
            <img src={hotel.images[activeImg] || hotel.images[0]} alt={hotel.name} className="gallery-main-img" />
          </div>
          <div className="gallery-thumbs">
            {hotel.images.map((img, i) => (
              <img key={i} src={img} alt="" className={`gallery-thumb ${activeImg === i ? 'active' : ''}`} onClick={() => setActiveImg(i)} />
            ))}
          </div>
        </div>

        <div className="detail-grid">
          {/* Left: Info */}
          <div className="detail-left">
            <div className="detail-header">
              <div>
                <div className="detail-star-row">
                  <span className="badge badge-primary">{'★'.repeat(hotel.starRating)} Star</span>
                </div>
                <h1 className="detail-title">{hotel.name}</h1>
                <p className="detail-location"><MapPin size={14} /> {hotel.address}</p>
              </div>
              <button className={`bookmark-btn-lg ${bookmarked ? 'bookmarked' : ''}`} onClick={toggleBookmark}>
                <Heart size={20} fill={bookmarked ? '#EF4444' : 'none'} />
              </button>
            </div>

            <div className="detail-rating-row">
              <StarRating rating={hotel.rating} large />
              <span className="detail-review-count">({hotel.reviewCount} reviews)</span>
            </div>

            <p className="detail-description">{hotel.description}</p>

            {/* Amenities */}
            <div className="detail-section">
              <h2>Amenities</h2>
              <div className="amenities-grid">
                {(hotel.amenities || []).map(a => (
                  <div key={a} className="amenity-item">
                    {AMENITY_ICONS[a] || AMENITY_ICONS['default']}
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2>Guest Reviews</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReview(true)}>
                  Write a Review
                </button>
              </div>
              {(hotel.reviews || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first!</p>
              ) : (
                <div className="reviews-list">
                  {hotel.reviews.map(r => (
                    <div key={r.id} className="review-card glass">
                      <div className="review-header">
                        <span className="review-author">{r.user?.email?.split('@')[0]}</span>
                        <StarRating rating={r.rating} />
                      </div>
                      <p className="review-comment">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Rooms */}
          <div className="detail-right">
            <div className="rooms-panel glass-lg">
              <h2>Select a Room</h2>
              {checkIn && checkOut && (
                <p className="rooms-dates">{checkIn} → {checkOut} · {nights} night{nights > 1 ? 's' : ''} · {guests} guest{guests > 1 ? 's' : ''}</p>
              )}
              <div className="rooms-list">
                {(hotel.rooms || []).filter(r => r.available).map(room => (
                  <div key={room.id} className="room-card">
                    <div className="room-info">
                      <h3>{room.type}</h3>
                      <p>{room.description}</p>
                      <p className="room-capacity">👥 Up to {room.maxOccupancy} guests</p>
                    </div>
                    <div className="room-price-area">
                      <div>
                        <span className="room-price">₹{room.pricePerNight.toLocaleString()}</span>
                        <span className="room-price-unit">/night</span>
                      </div>
                      {nights > 1 && (
                        <p className="room-total">₹{(room.pricePerNight * nights).toLocaleString()} total</p>
                      )}
                      <button className="btn btn-primary btn-sm" onClick={() => handleBook(room)}>
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBooking && selectedRoom && (
        <BookingModal
          hotel={hotel}
          room={selectedRoom}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={Number(guests)}
          nights={nights}
          onClose={() => setShowBooking(false)}
          onSuccess={() => { setShowBooking(false); navigate('/dashboard'); }}
        />
      )}

      {showReview && (
        <ReviewModal
          hotelId={hotel.id}
          onClose={() => setShowReview(false)}
          onSuccess={() => { setShowReview(false); fetchHotel(); }}
        />
      )}
    </div>
  );
}
