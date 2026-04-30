import React, { useState } from 'react';
import { Star, MapPin, Wifi, Waves, ParkingCircle, Dumbbell, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHotelSearchStore } from '../../store/hotelSearchStore';

const AMENITY_ICONS = {
  WiFi: Wifi, Pool: Waves, Parking: ParkingCircle, Gym: Dumbbell, Breakfast: Coffee,
};

function ratingLabel(score) {
  if (score >= 9) return 'Exceptional';
  if (score >= 8) return 'Excellent';
  if (score >= 7) return 'Very Good';
  if (score >= 6) return 'Good';
  return 'Pleasant';
}

function distanceKm(centerLat, centerLng, lat, lng) {
  if (!centerLat || !centerLng) return null;
  const R = 6371;
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLng = (lng - centerLng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(centerLat*Math.PI/180) * Math.cos(lat*Math.PI/180) * Math.sin(dLng/2)**2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

export default function HotelCard({ hotel, cardRef }) {
  const navigate    = useNavigate();
  const center      = useHotelSearchStore((s) => s.center);
  const hoveredId   = useHotelSearchStore((s) => s.hoveredId);
  const selectedId  = useHotelSearchStore((s) => s.selectedId);
  const setHovered  = useHotelSearchStore((s) => s.setHoveredId);
  const setSelected = useHotelSearchStore((s) => s.setSelectedId);

  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = hotel.photos?.length ? hotel.photos : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'];

  const dist = distanceKm(center?.lat, center?.lng, hotel.latitude, hotel.longitude);
  const isHighlighted = hoveredId === hotel.id || selectedId === hotel.id;

  const onPrevPhoto = (e) => { e.stopPropagation(); setPhotoIdx((i) => (i - 1 + photos.length) % photos.length); };
  const onNextPhoto = (e) => { e.stopPropagation(); setPhotoIdx((i) => (i + 1) % photos.length); };

  return (
    <div
      ref={cardRef}
      className={`hc-card ${isHighlighted ? 'hc-card-highlight' : ''}`}
      onMouseEnter={() => setHovered(hotel.id)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => setSelected(hotel.id)}
    >
      {/* Image carousel */}
      <div className="hc-carousel">
        <img src={photos[photoIdx]} alt={hotel.name} loading="lazy" />
        {photos.length > 1 && (
          <>
            <button className="hc-arrow hc-arrow-left"  onClick={onPrevPhoto} aria-label="Previous photo"><ChevronLeft size={18}/></button>
            <button className="hc-arrow hc-arrow-right" onClick={onNextPhoto} aria-label="Next photo"><ChevronRight size={18}/></button>
            <div className="hc-dots">
              {photos.map((_, i) => (
                <span key={i} className={`hc-dot ${i === photoIdx ? 'hc-dot-active' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="hc-info">
        <div className="hc-row">
          <h3 className="hc-name">{hotel.name}</h3>
          <div className="hc-stars">
            {Array.from({ length: hotel.starRating }).map((_, i) => (
              <Star key={i} size={13} fill="#ffb400" stroke="#ffb400" />
            ))}
          </div>
        </div>

        <div className="hc-location">
          <MapPin size={13} />
          <span>{hotel.address}</span>
          {dist && <span className="hc-dist">· {dist} km from city centre</span>}
        </div>

        <div className="hc-amenities">
          {(hotel.amenities || []).slice(0, 5).map((a) => {
            const Icon = AMENITY_ICONS[a];
            return (
              <span key={a} className="hc-amenity">
                {Icon ? <Icon size={12}/> : null}{a}
              </span>
            );
          })}
        </div>

        <div className="hc-bottom">
          <div className="hc-rating">
            <span className="hc-rating-score">{hotel.rating.score.toFixed(1)}</span>
            <div className="hc-rating-text">
              <strong>{ratingLabel(hotel.rating.score)}</strong>
              <small>{hotel.rating.reviewCount.toLocaleString('en-IN')} reviews</small>
            </div>
          </div>

          <div className="hc-price-block">
            <div className="hc-price">₹{hotel.price.amount.toLocaleString('en-IN')}</div>
            <div className="hc-price-note">per night · incl. taxes</div>
            <div className="hc-buttons">
              <button
                className="hc-btn hc-btn-secondary"
                onClick={(e) => { e.stopPropagation(); navigate(`/hotels/${hotel.id}`); }}
              >View Details</button>
              <button
                className="hc-btn hc-btn-primary"
                onClick={(e) => { e.stopPropagation(); navigate(`/hotels/${hotel.id}#rooms`); }}
              >Book Now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
