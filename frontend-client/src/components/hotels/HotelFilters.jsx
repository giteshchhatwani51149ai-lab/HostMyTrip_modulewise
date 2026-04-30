import React from 'react';
import { useHotelSearchStore } from '../../store/hotelSearchStore';
import { Star, RotateCcw } from 'lucide-react';

const STAR_OPTIONS    = [5, 4, 3];
const GUEST_OPTIONS   = [
  { val: 8, label: '8+ Excellent' },
  { val: 7, label: '7+ Very Good' },
  { val: 6, label: '6+ Good' },
];
const AMENITY_OPTIONS = ['WiFi', 'Pool', 'Parking', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Breakfast'];
const PROPERTY_OPTIONS = ['Hotel', 'Resort', 'Apartment', 'Hostel'];

export default function HotelFilters() {
  const s              = useHotelSearchStore();
  const setFilter      = useHotelSearchStore((x) => x.setFilter);
  const toggleArrayFilter = useHotelSearchStore((x) => x.toggleArrayFilter);
  const resetFilters   = useHotelSearchStore((x) => x.resetFilters);

  return (
    <aside className="hf-panel">
      <div className="hf-header">
        <h3>Filters</h3>
        <button className="hf-reset" onClick={resetFilters} title="Reset filters">
          <RotateCcw size={13}/> Reset
        </button>
      </div>

      {/* Price range */}
      <div className="hf-section">
        <h4>Price per night</h4>
        <div className="hf-price-values">
          <span>₹{s.priceMin.toLocaleString('en-IN')}</span>
          <span>₹{s.priceMax.toLocaleString('en-IN')}</span>
        </div>
        <input
          type="range" min={500} max={25000} step={500}
          value={s.priceMin}
          onChange={(e) => setFilter('priceMin', Math.min(Number(e.target.value), s.priceMax - 500))}
        />
        <input
          type="range" min={500} max={25000} step={500}
          value={s.priceMax}
          onChange={(e) => setFilter('priceMax', Math.max(Number(e.target.value), s.priceMin + 500))}
        />
      </div>

      {/* Star rating */}
      <div className="hf-section">
        <h4>Star rating</h4>
        {STAR_OPTIONS.map((star) => (
          <label key={star} className="hf-checkbox">
            <input
              type="checkbox"
              checked={s.starRating.includes(star)}
              onChange={() => toggleArrayFilter('starRating', star)}
            />
            <span className="hf-stars-row">
              {Array.from({ length: star }).map((_, i) => (
                <Star key={i} size={13} fill="#ffb400" stroke="#ffb400" />
              ))}
            </span>
          </label>
        ))}
      </div>

      {/* Guest rating */}
      <div className="hf-section">
        <h4>Guest rating</h4>
        {GUEST_OPTIONS.map((g) => (
          <label key={g.val} className="hf-radio">
            <input
              type="radio" name="guest"
              checked={s.guestRating === g.val}
              onChange={() => setFilter('guestRating', g.val)}
            />
            <span>{g.label}</span>
          </label>
        ))}
        <label className="hf-radio">
          <input type="radio" name="guest" checked={s.guestRating === 0} onChange={() => setFilter('guestRating', 0)} />
          <span>Any</span>
        </label>
      </div>

      {/* Amenities */}
      <div className="hf-section">
        <h4>Amenities</h4>
        {AMENITY_OPTIONS.map((a) => (
          <label key={a} className="hf-checkbox">
            <input
              type="checkbox"
              checked={s.amenities.includes(a)}
              onChange={() => toggleArrayFilter('amenities', a)}
            />
            <span>{a}</span>
          </label>
        ))}
      </div>

      {/* Property type */}
      <div className="hf-section">
        <h4>Property type</h4>
        {PROPERTY_OPTIONS.map((p) => (
          <label key={p} className="hf-checkbox">
            <input
              type="checkbox"
              checked={s.propertyTypes.includes(p)}
              onChange={() => toggleArrayFilter('propertyTypes', p)}
            />
            <span>{p}</span>
          </label>
        ))}
      </div>

      {/* Free cancellation */}
      <div className="hf-section">
        <label className="hf-toggle">
          <input
            type="checkbox"
            checked={s.freeCancellation}
            onChange={(e) => setFilter('freeCancellation', e.target.checked)}
          />
          <span>Free cancellation only</span>
        </label>
      </div>
    </aside>
  );
}
