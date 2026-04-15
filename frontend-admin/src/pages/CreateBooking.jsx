import React, { useEffect, useState } from 'react';
import { hotelsAPI, bookingsAPI } from '../api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };

export default function CreateBooking() {
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [guests, setGuests] = useState(1);
  const [paymentType, setPaymentType] = useState('full');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    hotelsAPI.getAll().then(r => setHotels(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedHotel) {
      hotelsAPI.getById(selectedHotel).then(r => {
        setRooms(r.data.rooms || []);
        setSelectedRoom('');
      }).catch(() => setRooms([]));
    }
  }, [selectedHotel]);

  const nights = checkIn && checkOut ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000) : 0;
  const room = rooms.find(r => String(r.id) === String(selectedRoom));
  const total = room ? room.pricePerNight * nights : 0;
  const charge = paymentType === 'partial' ? Math.round(total * 0.3) : total;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHotel || !selectedRoom) { setError('Please select a hotel and room'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await bookingsAPI.adminCreate({
        roomId: Number(selectedRoom), hotelId: Number(selectedHotel),
        checkIn, checkOut, guests, paymentType,
        guestName, guestEmail, guestPhone,
      });
      setSuccess(res.data.booking);
      setGuestName(''); setGuestEmail(''); setGuestPhone('');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in" style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Create Booking</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Create a manual booking on behalf of a client.</p>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: 24, borderRadius: 12 }}>
          <CheckCircle2 size={18} />
          <span>Booking #{success.id} created for {success.guestName}! Status: {success.status}</span>
        </div>
      )}
      {error && <div className="alert alert-error" style={{ marginBottom: 20, borderRadius: 12 }}><AlertCircle size={16} /> {error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="glass" style={{ padding: 28, borderRadius: 'var(--radius-lg)', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 20, fontSize: 15 }}>Hotel & Room</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Hotel</label>
              <select className="form-input" value={selectedHotel} onChange={e => setSelectedHotel(e.target.value)} required>
                <option value="">Select Hotel...</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name} – {h.city}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Room Type</label>
              <select className="form-input" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} required disabled={!selectedHotel}>
                <option value="">Select Room...</option>
                {rooms.filter(r => r.available).map(r => <option key={r.id} value={r.id}>{r.type} – ₹{r.pricePerNight.toLocaleString()}/night</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Check-in</label>
              <input className="form-input" type="date" value={checkIn} min={today()} onChange={e => setCheckIn(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Check-out</label>
              <input className="form-input" type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Guests</label>
              <input className="form-input" type="number" value={guests} min={1} max={10} onChange={e => setGuests(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Type</label>
              <select className="form-input" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                <option value="full">Full Payment</option>
                <option value="partial">Lock Price (30%)</option>
              </select>
            </div>
          </div>
          {room && nights > 0 && (
            <div style={{ padding: '14px 16px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 10, fontSize: 14 }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Booking Summary</p>
              <p>₹{room.pricePerNight.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''} = <strong style={{ color: 'var(--primary)' }}>₹{total.toLocaleString()}</strong></p>
              <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>Charging today: ₹{charge.toLocaleString()} ({paymentType === 'partial' ? '30% lock' : 'full'})</p>
            </div>
          )}
        </div>

        <div className="glass" style={{ padding: 28, borderRadius: 'var(--radius-lg)', marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 20, fontSize: 15 }}>Guest Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Full Name *</label>
              <input className="form-input" required value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" required value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px 0', fontSize: 15, borderRadius: 12 }}>
          {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Creating Booking...</> : 'Confirm & Create Booking'}
        </button>
      </form>
    </div>
  );
}
