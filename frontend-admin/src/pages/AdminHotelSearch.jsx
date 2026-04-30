import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { hotelsAPI, bookingsAPI } from '../api';
import {
  Hotel, Search, MapPin, Calendar, Star,
  CheckCircle2, AlertCircle, Loader2, IndianRupee,
  Wifi, Car, Coffee, Dumbbell, Waves, X, ChevronLeft, ChevronRight, Building2
} from 'lucide-react';

const todayStr = () => new Date().toISOString().split('T')[0];
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const POPULAR_CITIES = [
  // India
  { city:'Mumbai', country:'India' },
  { city:'New Delhi', country:'India' },
  { city:'Bengaluru', country:'India' },
  { city:'Hyderabad', country:'India' },
  { city:'Chennai', country:'India' },
  { city:'Kolkata', country:'India' },
  { city:'Goa', country:'India' },
  { city:'Jaipur', country:'India' },
  { city:'Ahmedabad', country:'India' },
  { city:'Pune', country:'India' },
  { city:'Kochi', country:'India' },
  { city:'Udaipur', country:'India' },
  { city:'Agra', country:'India' },
  { city:'Shimla', country:'India' },
  { city:'Manali', country:'India' },
  { city:'Darjeeling', country:'India' },
  { city:'Rishikesh', country:'India' },
  { city:'Varanasi', country:'India' },
  { city:'Amritsar', country:'India' },
  { city:'Lucknow', country:'India' },
  // Middle East
  { city:'Dubai', country:'UAE' },
  { city:'Abu Dhabi', country:'UAE' },
  { city:'Doha', country:'Qatar' },
  // Asia
  { city:'Singapore', country:'Singapore' },
  { city:'Bangkok', country:'Thailand' },
  { city:'Phuket', country:'Thailand' },
  { city:'Bali', country:'Indonesia' },
  { city:'Kuala Lumpur', country:'Malaysia' },
  { city:'Hong Kong', country:'Hong Kong' },
  { city:'Tokyo', country:'Japan' },
  // Europe
  { city:'London', country:'UK' },
  { city:'Paris', country:'France' },
  { city:'Rome', country:'Italy' },
  { city:'Barcelona', country:'Spain' },
  { city:'Amsterdam', country:'Netherlands' },
  { city:'Istanbul', country:'Turkey' },
  { city:'Zurich', country:'Switzerland' },
  // Americas
  { city:'New York', country:'USA' },
  { city:'Las Vegas', country:'USA' },
  { city:'Los Angeles', country:'USA' },
  { city:'Miami', country:'USA' },
  { city:'Toronto', country:'Canada' },
];

// ========== City Autocomplete ==========
function CityAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (val.length < 2) { setSuggestions([]); setOpen(false); return; }
    const q = val.toLowerCase();
    const filtered = POPULAR_CITIES.filter(c =>
      c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    ).slice(0, 8);
    setSuggestions(filtered);
    setOpen(true);
  };

  const select = (s) => {
    setQuery(s.city);
    onChange(s.city);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>City</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
        <MapPin size={16} color="var(--text-dim)" />
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Mumbai, Goa, Dubai..."
          style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: 14, color: 'var(--text)' }}
          required
        />
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 20, maxHeight: 280, overflowY: 'auto' }}>
          {suggestions.map((s, idx) => (
            <div
              key={`${s.city}-${idx}`}
              onClick={() => select(s)}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Building2 size={14} color="var(--text-dim)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.city}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.country}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Mini Calendar ==========
function MiniCalendar({ value, onChange, min, onClose }) {
  const [view, setView] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minDate = min ? new Date(min) : today;
  minDate.setHours(0, 0, 0, 0);
  const selected = value ? new Date(value) : null;
  if (selected) selected.setHours(0, 0, 0, 0);

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => setView(v => v.month === 0 ? { month: 11, year: v.year - 1 } : { month: v.month - 1, year: v.year });
  const next = () => setView(v => v.month === 11 ? { month: 0, year: v.year + 1 } : { month: v.month + 1, year: v.year });

  const select = (d) => {
    const dt = new Date(view.year, view.month, d);
    if (dt < minDate) return;
    onChange(`${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    onClose();
  };

  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', zIndex: 30, width: 290 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}><ChevronLeft size={18} /></button>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{FULL_MONTHS[view.month]} {view.year}</div>
        <button type="button" onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex' }}><ChevronRight size={18} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {DAYS_SHORT.map(d => <div key={d} style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', color: 'var(--text-dim)', padding: 4 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dt = new Date(view.year, view.month, d);
          const isPast = dt < minDate;
          const isToday = dt.getTime() === today.getTime();
          const isSelected = selected && dt.getTime() === selected.getTime();
          return (
            <button
              key={i}
              type="button"
              onClick={() => select(d)}
              disabled={isPast}
              style={{
                padding: 8, borderRadius: 8, fontSize: 13, fontWeight: isToday ? 700 : 500, cursor: isPast ? 'not-allowed' : 'pointer',
                background: isSelected ? 'var(--primary)' : (isToday ? 'rgba(255,107,0,0.1)' : 'transparent'),
                color: isSelected ? '#fff' : (isPast ? 'var(--text-dim)' : 'var(--text)'),
                border: 'none', opacity: isPast ? 0.4 : 1,
              }}
            >{d}</button>
          );
        })}
      </div>
    </div>
  );
}

// ========== Date Field ==========
function DateField({ label, value, onChange, min }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const display = value ? (() => {
    const d = new Date(value);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  })() : 'Select date';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>{label}</label>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
      >
        <Calendar size={16} color="var(--text-dim)" />
        <span style={{ fontSize: 14, color: value ? 'var(--text)' : 'var(--text-dim)', flex: 1 }}>{display}</span>
      </div>
      {open && <MiniCalendar value={value} onChange={onChange} min={min} onClose={() => setOpen(false)} />}
    </div>
  );
}

// ========== Main Component ==========
export default function AdminHotelSearch() {
  const [searchParams, setSearchParams] = useState({
    city: '',
    checkIn: todayStr(),
    checkOut: tomorrowStr(),
    guests: 2,
    rooms: 1,
  });

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchParams.city) { setError('Please enter a city'); return; }
    if (new Date(searchParams.checkOut) <= new Date(searchParams.checkIn)) {
      setError('Check-out must be after check-in'); return;
    }

    setLoading(true);
    setError('');
    setHotels([]);
    setSelectedHotel(null);
    setSelectedRoom(null);

    try {
      const res = await hotelsAPI.affiliateSearch({
        city: searchParams.city,
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        rooms: searchParams.rooms,
        adults: searchParams.guests,
      });
      setHotels(res.data.results || []);
      if ((res.data.results || []).length === 0) {
        setError('No hotels found for this city. Try different dates or city.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search hotels');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedHotel) return;

    setBookingLoading(true);
    setError('');

    const nights = Math.max(1, Math.ceil((new Date(searchParams.checkOut) - new Date(searchParams.checkIn)) / 86400000));
    const pricePerNight = selectedRoom?.pricePerNight || selectedRoom?.price?.amount || selectedHotel.price?.amount || 0;
    const totalAmount = pricePerNight * nights;

    try {
      const bookingData = {
        type: 'hotel',
        hotelExternalId: String(selectedHotel.id),
        hotelName: selectedHotel.name,
        hotelCity: selectedHotel.city || searchParams.city,
        hotelAddress: selectedHotel.address || '',
        roomId: selectedRoom?.id ? String(selectedRoom.id) : null,
        roomName: selectedRoom?.type || 'Standard Room',
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut,
        guests: searchParams.guests,
        totalAmount,
        currency: 'INR',
        guestName,
        guestEmail,
        guestPhone,
      };

      const res = await bookingsAPI.adminCreate(bookingData);
      setBookingSuccess(res.data.booking);
      setTimeout(() => {
        setShowBookingModal(false);
        setBookingSuccess(null);
        setSelectedHotel(null);
        setSelectedRoom(null);
        setGuestName(''); setGuestEmail(''); setGuestPhone('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const nights = searchParams.checkIn && searchParams.checkOut
    ? Math.max(1, Math.ceil((new Date(searchParams.checkOut) - new Date(searchParams.checkIn)) / 86400000))
    : 0;

  const getAmenityIcon = (amenity) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <Wifi size={14} />;
    if (lower.includes('park')) return <Car size={14} />;
    if (lower.includes('gym') || lower.includes('fitness')) return <Dumbbell size={14} />;
    if (lower.includes('pool') || lower.includes('swim')) return <Waves size={14} />;
    if (lower.includes('breakfast') || lower.includes('restaurant')) return <Coffee size={14} />;
    return null;
  };

  const openBookingModal = (hotel, room = null) => {
    setSelectedHotel(hotel);
    setSelectedRoom(room || hotel.rooms?.[0] || null);
    setShowBookingModal(true);
  };

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Hotel Search & Booking</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Search live hotels and book on behalf of customers.
      </p>

      {/* Search Form */}
      <div className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.7fr', gap: 16, alignItems: 'end' }}>
            <CityAutocomplete value={searchParams.city} onChange={v => setSearchParams(p => ({ ...p, city: v }))} />
            <DateField
              label="Check-in"
              value={searchParams.checkIn}
              onChange={v => {
                const newCheckOut = new Date(searchParams.checkOut) <= new Date(v)
                  ? new Date(new Date(v).getTime() + 86400000).toISOString().split('T')[0]
                  : searchParams.checkOut;
                setSearchParams(p => ({ ...p, checkIn: v, checkOut: newCheckOut }));
              }}
              min={todayStr()}
            />
            <DateField
              label="Check-out"
              value={searchParams.checkOut}
              onChange={v => setSearchParams(p => ({ ...p, checkOut: v }))}
              min={new Date(new Date(searchParams.checkIn).getTime() + 86400000).toISOString().split('T')[0]}
            />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Guests</label>
              <input className="form-input" type="number" min={1} max={10} value={searchParams.guests} onChange={e => setSearchParams(p => ({ ...p, guests: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 32px', fontSize: 15 }}>
              {loading ? <><Loader2 size={16} className="spinner" /> Searching...</> : <><Search size={16} /> Search Hotels</>}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><AlertCircle size={16} /> {error}</div>}

      {/* Results */}
      {hotels.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Available Hotels ({hotels.length})</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{nights} night{nights > 1 ? 's' : ''} stay</span>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {hotels.map((hotel) => {
              const startPrice = hotel.price?.amount || hotel.rooms?.[0]?.pricePerNight || 0;
              return (
                <div key={hotel.id} className="glass" style={{ padding: 20, borderRadius: 12, display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: 20, border: selectedHotel?.id === hotel.id ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                  <div style={{ width: 200, height: 150, borderRadius: 10, background: hotel.photos?.[0] ? `url(${hotel.photos[0]}) center/cover` : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    {!hotel.photos?.[0] && <Hotel size={32} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700 }}>{hotel.name}</h4>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: hotel.starRating || 4 }).map((_, i) => (
                          <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={14} /> {hotel.address || hotel.city}
                    </div>
                    {hotel.amenities && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {hotel.amenities.slice(0, 4).map((amenity, i) => (
                          <span key={i} style={{ fontSize: 11, background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {getAmenityIcon(amenity)} {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                    {hotel.rooms && hotel.rooms.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Available Rooms:</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {hotel.rooms.map((room) => (
                            <button
                              key={room.id}
                              type="button"
                              onClick={() => openBookingModal(hotel, room)}
                              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', textAlign: 'left' }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{room.type}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Max {room.maxOccupancy || 2} guests</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
                                ₹{(room.pricePerNight || room.price?.amount)?.toLocaleString()}/night
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Starting from</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                      <IndianRupee size={20} style={{ display: 'inline' }} />
                      {startPrice?.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>per night</div>
                    <button type="button" className="btn btn-primary" onClick={() => openBookingModal(hotel)} style={{ width: '100%' }}>
                      Book Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking Modal - rendered via Portal to escape transform contexts */}
      {showBookingModal && selectedHotel && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowBookingModal(false)}>
          <div style={{ width: 520, maxWidth: '100%', background: '#ffffff', color: '#1a1a1a', borderRadius: 20, padding: 0, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>Book Hotel</h3>
              <button onClick={() => setShowBookingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><X size={20} /></button>
            </div>

            <div style={{ padding: '24px 28px', overflowY: 'auto' }}>
              {bookingSuccess ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle2 size={40} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Booking Confirmed!</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Reference: <strong>#{bookingSuccess.bookingReference || bookingSuccess.id}</strong></p>
                  <p style={{ fontSize: 16, marginBottom: 24 }}>{bookingSuccess.guestName} · {selectedHotel.name}</p>
                  <button className="btn btn-primary" onClick={() => setShowBookingModal(false)} style={{ padding: '12px 32px' }}>Done</button>
                </div>
              ) : (
                <>
                  <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Hotel size={24} color="var(--primary)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedHotel.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {selectedHotel.address || selectedHotel.city}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Check-in</div>
                        <div style={{ fontWeight: 700 }}>{searchParams.checkIn}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Check-out</div>
                        <div style={{ fontWeight: 700 }}>{searchParams.checkOut}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8 }}>
                      <div style={{ fontSize: 13 }}>
                        <strong>{selectedRoom?.type || 'Standard Room'}</strong> · {nights} night{nights > 1 ? 's' : ''} · {searchParams.guests} guest{searchParams.guests > 1 ? 's' : ''}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
                        <IndianRupee size={18} style={{ display: 'inline' }} />
                        {(((selectedRoom?.pricePerNight || selectedRoom?.price?.amount || selectedHotel.price?.amount || 0) * nights))?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleBook}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Guest Details</h4>
                    <div style={{ display: 'grid', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Full Name *</label>
                        <input className="form-input" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Enter guest full name" required style={{ padding: '12px 14px' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Email *</label>
                          <input className="form-input" type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="guest@example.com" required style={{ padding: '12px 14px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Phone</label>
                          <input className="form-input" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+91 98765 43210" style={{ padding: '12px 14px' }} />
                        </div>
                      </div>
                    </div>

                    {error && <div className="alert alert-error" style={{ marginTop: 16 }}><AlertCircle size={14} /> {error}</div>}

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowBookingModal(false)} style={{ flex: 1, padding: '14px' }}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={bookingLoading} style={{ flex: 2, padding: '14px', fontSize: 15 }}>
                        {bookingLoading ? <><Loader2 size={16} className="spinner" /> Processing...</> : <>Confirm Booking · <IndianRupee size={14} style={{display:'inline'}} />{(((selectedRoom?.pricePerNight || selectedRoom?.price?.amount || selectedHotel.price?.amount || 0) * nights))?.toLocaleString('en-IN')}</>}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
