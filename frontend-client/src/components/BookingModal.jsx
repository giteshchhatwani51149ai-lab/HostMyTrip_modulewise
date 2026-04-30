import React, { useState } from 'react';
import { bookingsAPI } from '../api';
import { X, CreditCard, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useAuthStore } from '../store/authStore';
import './Modal.css';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

// PayPalScriptProvider wraps the whole modal so the script loads early
export default function BookingModal({ hotel, room, checkIn, checkOut, guests, nights, onClose, onSuccess, isLive = false }) {
  const { user } = useAuthStore();
  const isCorporate = ['corporate_admin', 'corporate_employee'].includes(user?.role);
  if (isCorporate) {
    return (
      <BookingModalInner
        hotel={hotel} room={room} checkIn={checkIn} checkOut={checkOut}
        guests={guests} nights={nights} onClose={onClose} onSuccess={onSuccess} isLive={isLive} isCorporate={isCorporate} role={user?.role}
      />
    );
  }
  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}>
      <BookingModalInner
        hotel={hotel} room={room} checkIn={checkIn} checkOut={checkOut}
        guests={guests} nights={nights} onClose={onClose} onSuccess={onSuccess} isLive={isLive} isCorporate={false} role={user?.role}
      />
    </PayPalScriptProvider>
  );
}

function BookingModalInner({ hotel, room, checkIn, checkOut, guests, nights, onClose, onSuccess, isLive, isCorporate, role }) {
  const [paymentType, setPaymentType] = useState('full');
  const [guestName, setGuestName]     = useState('');
  const [guestEmail, setGuestEmail]   = useState('');
  const [guestPhone, setGuestPhone]   = useState('');

  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [capturing, setCapturing] = useState(false);
  // We store these in a ref-like state so PayPal callbacks can access them
  const [bookingId, setBookingId] = useState(null);
  const [bookingRef, setBookingRef] = useState(null); // Amadeus PNR

  const totalAmount  = room.pricePerNight * (nights || 1);
  const chargeAmount = paymentType === 'partial' ? Math.round(totalAmount * 0.3) : totalAmount;
  const chargeUSD    = (chargeAmount / 85).toFixed(2); // INR → USD (sandbox)

  const handleProceed = () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      setError('Guest name and email are required.');
      return;
    }
    setError('');
    setPaymentStep(true);
  };

  const handleCorporateSubmit = async () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      setError('Guest name and email are required.');
      return;
    }
    setError('');
    try {
      const res = await bookingsAPI.create({
        roomId: room.id,
        hotelId: hotel.id,
        checkIn, checkOut, guests, paymentType: 'full',
        guestName, guestEmail, guestPhone,
        isLive: isLive || false,
        liveHotelName: isLive ? hotel.name : undefined,
        liveRoomType: isLive ? room.type : undefined,
        livePricePerNight: isLive ? room.pricePerNight : undefined,
        liveCity: isLive ? hotel.city : undefined,
        amadeusOfferId: room?.amadeusOfferId || undefined,
      });
      const msg = res.data?.message || (role === 'corporate_employee' ? 'Booking request sent for approval.' : 'Corporate booking confirmed.');
      setSuccess(true);
      setError(msg);
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit booking.');
    }
  };

  /**
   * PayPal SDK calls this to get the order ID.
   * IMPORTANT: must NOT set loading state here — that disables the PayPal button mid-flight.
   */
  const handleCreateOrder = async () => {
    setError('');
    try {
      const res = await bookingsAPI.create({
        roomId:   room.id,
        hotelId:  hotel.id,
        checkIn,  checkOut, guests, paymentType,
        guestName, guestEmail, guestPhone,
        isLive: isLive || false,
        liveHotelName:     isLive ? hotel.name           : undefined,
        liveRoomType:      isLive ? room.type            : undefined,
        livePricePerNight: isLive ? room.pricePerNight   : undefined,
        liveCity:          isLive ? hotel.city           : undefined,
        amadeusOfferId:    room.amadeusOfferId            || undefined,
      });

      const { booking, paypalOrderId } = res.data;
      setBookingId(booking.id);
      if (booking.amadeusBookingRef) setBookingRef(booking.amadeusBookingRef);
      return paypalOrderId; // SDK uses this to open the PayPal window
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not create booking. Please try again.';
      setError(msg);
      throw new Error(msg); // Tell PayPal SDK something went wrong
    }
  };

  /**
   * Called after the customer approves in the PayPal popup.
   * data.orderID is the PayPal Order ID confirmed by buyer.
   */
  const handleApprove = async (data) => {
    setCapturing(true);
    setError('');
    try {
      const { booking: confirmedBooking } = (await bookingsAPI.confirmPayment(bookingId, data.orderID)).data;
      if (confirmedBooking?.amadeusBookingRef) setBookingRef(confirmedBooking.amadeusBookingRef);
      setSuccess(true);
      setTimeout(() => onSuccess(), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment approved but confirmation failed. Contact support.');
    } finally {
      setCapturing(false);
    }
  };

  const handleCancel = async () => {
    setError('Payment was cancelled. You can try again.');
    if (bookingId) {
      try { await bookingsAPI.failPayment(bookingId); } catch (_) {}
    }
    // Reset so user can try again fresh
    setBookingId(null);
  };

  const handleError = async (err) => {
    console.error('PayPal error:', err);
    setError('A PayPal error occurred. Please try again.');
    if (bookingId) {
      try { await bookingsAPI.failPayment(bookingId); } catch (_) {}
    }
    setBookingId(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container glass-lg animate-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <h2>{paymentStep ? 'Complete Payment' : 'Booking Details'}</h2>
            <p className="modal-sub">{hotel.name} · {room.type}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* ── Success ── */}
        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircle2 size={56} color="var(--success)" style={{ margin: '0 auto 16px' }} />
            <h3>Booking Confirmed! 🎉</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {isCorporate
                ? (role === 'corporate_employee' ? 'Booking request submitted. Waiting for corporate admin approval.' : 'Corporate credit booking confirmed.')
                : 'Your PayPal payment was captured and your booking is confirmed.'}
            </p>
            {bookingRef && bookingRef !== 'MANUAL_CONFIRMATION_REQUIRED' && (
              <div style={{ marginTop: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 20px' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Amadeus Booking Reference (PNR)</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#10B981', margin: '4px 0 0', fontFamily: 'monospace', letterSpacing: 2 }}>{bookingRef}</p>
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>Redirecting to your dashboard…</p>
          </div>

        ) : capturing ? (
          /* ── Capturing payment spinner ── */
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <Loader2 size={40} className="spin" style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)' }}>Capturing your payment…</p>
          </div>

        ) : paymentStep && !isCorporate ? (
          /* ── PayPal Payment Step ── */
          <div style={{ padding: '0 4px' }}>
            {/* Booking summary strip */}
            <div className="booking-summary glass" style={{ marginBottom: 20 }}>
              <div className="summary-row"><span>Hotel</span><strong>{hotel.name}</strong></div>
              <div className="summary-row"><span>Room</span><strong>{room.type}</strong></div>
              <div className="summary-row summary-total" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
                <span>Charge Today (INR)</span>
                <strong className="total-price">₹{chargeAmount.toLocaleString()}</strong>
              </div>
              <div className="summary-row">
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Approx. (PayPal USD)</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>${chargeUSD}</span>
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* PayPal Buttons — rendered directly, no extra disabled wrapper */}
            <PayPalButtons
              style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 }}
              createOrder={handleCreateOrder}
              onApprove={handleApprove}
              onError={handleError}
              onCancel={handleCancel}
              forceReRender={[chargeUSD, paymentType]}
            />

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => { setPaymentStep(false); setError(''); setBookingId(null); }}
            >
              ← Back to Details
            </button>
          </div>

        ) : (
          /* ── Step 1: Booking Details Form ── */
          <>
            <div className="booking-summary glass" style={{ marginBottom: 20 }}>
              <div className="summary-row"><span>Hotel</span><strong>{hotel.name}</strong></div>
              <div className="summary-row"><span>Room</span><strong>{room.type}</strong></div>
              <div className="summary-row"><span>Check-in</span><strong>{checkIn}</strong></div>
              <div className="summary-row"><span>Check-out</span><strong>{checkOut}</strong></div>
              <div className="summary-row summary-total" style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
                <span>Total Amount</span>
                <strong className="total-price">₹{totalAmount.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Payment Option</h3>
              {isCorporate ? (
                <div className="alert alert-success">Corporate credit mode: this booking will not use PayPal.</div>
              ) : <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                <div
                  className={`payment-card glass ${paymentType === 'full' ? 'selected' : ''}`}
                  onClick={() => setPaymentType('full')}
                  style={{ cursor: 'pointer', padding: 12, border: paymentType === 'full' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: 10 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <CreditCard size={18} color="var(--primary)" />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Full Payment</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>₹{totalAmount.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Pay full amount now</p>
                </div>
                <div
                  className={`payment-card glass ${paymentType === 'partial' ? 'selected' : ''}`}
                  onClick={() => setPaymentType('partial')}
                  style={{ cursor: 'pointer', padding: 12, border: paymentType === 'partial' ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 10 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Lock size={18} color="var(--accent)" />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Lock Price</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>₹{chargeAmount.toLocaleString()}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Pay 30% to lock price</p>
                </div>
              </div>}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Guest Details</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <input className="form-input" placeholder="Full Name *" value={guestName} onChange={e => setGuestName(e.target.value)} />
                <input className="form-input" type="email" placeholder="Email *" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
                <input className="form-input" placeholder="Phone (optional)" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
              </div>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertCircle size={16} /> {error}</div>}

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Charge today</p>
                <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>₹{(isCorporate ? totalAmount : chargeAmount).toLocaleString()}</p>
              </div>
              {isCorporate ? (
                <button className="btn btn-primary btn-lg" onClick={handleCorporateSubmit}>
                  {role === 'corporate_employee' ? 'Send For Approval' : 'Book With Corporate Credit'}
                </button>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={handleProceed}>
                  Proceed to Pay →
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
