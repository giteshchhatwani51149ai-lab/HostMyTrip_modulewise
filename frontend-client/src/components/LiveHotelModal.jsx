import React, { useState } from 'react';
import { X, MapPin, Wifi, Coffee, Dumbbell, Waves, Utensils, Car, Zap } from 'lucide-react';
import BookingModal from './BookingModal';
import './Modal.css';

const AMENITY_ICONS = {
  'Free WiFi': <Wifi size={14} />, 'Gym': <Dumbbell size={14} />, 'Swimming Pool': <Waves size={14} />,
  'Pool': <Waves size={14} />, 'Restaurant': <Utensils size={14} />, 'Parking': <Car size={14} />,
  'default': <Coffee size={14} />
};

const StarRating = ({ rating }) => (
  <div className="stars">
    {[1,2,3,4,5].map(i => (
      <span key={i} className={i <= Math.round(rating) ? 'star' : 'star star-empty'} style={{ fontSize: 18 }}>★</span>
    ))}
    <span className="rating-num" style={{ fontSize: 18 }}>{Number(rating).toFixed(1)}</span>
  </div>
);

export default function LiveHotelModal({ hotel, checkIn, checkOut, guests, onClose }) {
  const [activeImg, setActiveImg] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Use detail images for gallery (up to 4), fallback to listing thumbnail
  const galleryImages = (hotel.detailImages?.length ? hotel.detailImages : hotel.images) || [];

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 1;

  const handleBookRoom = (room) => {
    setSelectedRoom({ ...room, id: null });
    setShowBooking(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container glass-lg animate-in"
        style={{ maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#10B981', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999
              }}>
                <Zap size={11} fill="#10B981" /> LIVE · Real-time Google Hotels data
              </span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{hotel.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <MapPin size={13} /> {hotel.address}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, marginBottom: 28 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '16/8' }}>
              <img
                src={galleryImages[activeImg] || galleryImages[0]}
                alt={hotel.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'; }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
              {galleryImages.map((img, i) => (
                <img
                  key={i} src={img} alt=""
                  loading="lazy"
                  onError={e => { e.target.style.display = 'none'; }}
                  style={{
                    borderRadius: 10, aspectRatio: '1', objectFit: 'cover',
                    cursor: 'pointer', opacity: activeImg === i ? 1 : 0.6,
                    border: `2px solid ${activeImg === i ? 'var(--primary)' : 'transparent'}`,
                    transition: 'var(--transition)'
                  }}
                  onClick={() => setActiveImg(i)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Rating + Description + Amenities */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <StarRating rating={hotel.rating} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              {hotel.reviewCount ? `${hotel.reviewCount.toLocaleString()} reviews` : 'No reviews yet'} ·
              {'★'.repeat(Math.min(hotel.starRating || 4, 5))} star hotel
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginTop: 16 }}>
              {hotel.description}
            </p>
          </div>
          <div>
            <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Amenities</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(hotel.amenities || []).map(a => (
                <div key={a} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  fontSize: 12, color: 'var(--text-muted)'
                }}>
                  {AMENITY_ICONS[a] || AMENITY_ICONS['default']}
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rooms */}
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>
            Available Rooms{' '}
            {checkIn && checkOut && (
              <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-muted)' }}>
                · {checkIn} → {checkOut} · {nights} night{nights > 1 ? 's' : ''}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(hotel.rooms || []).map((room, i) => (
              <div key={room.id || i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                padding: 18, background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)', borderRadius: 14, gap: 16
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{room.type}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{room.description}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>👥 Up to {room.maxOccupancy} guests</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>₹{room.pricePerNight.toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>/night</span>
                  </div>
                  {nights > 1 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>₹{(room.pricePerNight * nights).toLocaleString()} total</p>}
                  <button className="btn btn-primary btn-sm" onClick={() => handleBookRoom(room)}>
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 0 0', borderTop: '1px solid var(--border)', marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={13} color="var(--text-dim)" />
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Live prices from Google Hotels via SerpApi. Prices are indicative and may vary at booking time.
          </p>
        </div>
      </div>

      {showBooking && selectedRoom && (
        <BookingModal
          hotel={hotel}
          room={selectedRoom}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          nights={nights}
          isLive={true}
          onClose={() => setShowBooking(false)}
          onSuccess={() => { setShowBooking(false); onClose(); }}
        />
      )}
    </div>
  );
}
