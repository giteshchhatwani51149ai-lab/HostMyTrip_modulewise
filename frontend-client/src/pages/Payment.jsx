import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RazorpayCheckout from '../components/payment/RazorpayCheckout';
import { ShieldCheck, Plane, ArrowLeft, Lock, Hotel as HotelIcon, Calendar, Users } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import './Payment.css';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function Payment() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const toast       = useToast();

  const { bookingId, totalAmount, flight, hotel, room, passengers = [],
          searchParams = {}, checkIn, checkOut, nights, adults, rooms } = state || {};

  if (!state?.bookingId) {
    navigate(hotel ? '/hotels' : '/flights/search', { replace: true });
    return null;
  }

  const isHotel = !!hotel;

  const handleSuccess = (data) => {
    navigate(`/booking/success?bookingId=${bookingId}`, {
      state: {
        bookingId, bookingReference: data.bookingReference, totalAmount,
        flight, passengers, searchParams,
        hotel, room, checkIn, checkOut, nights, adults, rooms,
      },
    });
  };

  const handleFailure = (msg) => {
    if (msg !== 'Payment cancelled') toast.paymentFailed(msg);
  };

  return (
    <div className="pay-page">
      <Navbar />
      <div className="container pay-wrap">

        {/* Header */}
        <div className="pay-header">
          <button className="pay-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16}/> Back
          </button>
          <div className="pay-title-wrap">
            <Lock size={18} className="pay-lock"/>
            <h2 className="pay-title">Secure Payment</h2>
          </div>
        </div>

        <div className="pay-grid">
          {/* Left: order summary */}
          <div className="pay-summary">
            <div className="pay-card">
              <div className="pay-card-title">
                {isHotel ? <><HotelIcon size={15}/> Booking Summary</> : <><Plane size={15}/> Order Summary</>}
              </div>

              {isHotel ? (
                <>
                  {hotel.photo && <img src={hotel.photo} alt={hotel.name} className="pay-hotel-photo" />}
                  <div className="pay-hotel-info">
                    <div className="pay-hotel-name">{hotel.name}</div>
                    <div className="pay-hotel-addr">{hotel.address}</div>
                    {room && <div className="pay-hotel-room">{room.name} · {room.bedConfig}</div>}
                  </div>

                  <div className="pay-divider"/>

                  <div className="pay-hotel-rows">
                    <div className="pay-hotel-row"><Calendar size={13}/> Check-in <strong>{checkIn}</strong></div>
                    <div className="pay-hotel-row"><Calendar size={13}/> Check-out <strong>{checkOut}</strong></div>
                    <div className="pay-hotel-row"><Users size={13}/> Guests <strong>{adults} adults · {rooms} room(s)</strong></div>
                  </div>

                  {nights > 1 && room && (
                    <div className="pay-breakdown">
                      <span>₹{fmt(room.pricePerNight)} × {nights} nights</span>
                      <span>₹{fmt(room.pricePerNight * nights)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="pay-flight-row">
                    <img
                      src={`https://pics.avs.io/50/25/${flight?.airlineCode || 'XX'}.png`}
                      alt={flight?.airline} className="pay-logo"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <div className="pay-airline">{flight?.airline} <span className="pay-fno">{flight?.code}</span></div>
                      <div className="pay-route">{flight?.from} → {flight?.to}</div>
                      <div className="pay-time">{flight?.dep} – {flight?.arr} · {flight?.duration}</div>
                    </div>
                  </div>

                  <div className="pay-divider"/>

                  <div className="pay-pax-list">
                    {passengers.map((p, i) => (
                      <div key={i} className="pay-pax">{p.title} {p.firstName} {p.lastName}
                        <span className={`pay-pax-type type-${p.type}`}>{p.type}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="pay-divider"/>
              <div className="pay-total-row">
                <span>Total Payable</span>
                <span className="pay-total-amt">₹{fmt(totalAmount)}</span>
              </div>
            </div>

            <div className="pay-trust">
              <ShieldCheck size={14}/> 100% Secure · SSL Encrypted · PCI DSS Compliant
            </div>
          </div>

          {/* Right: payment */}
          <div className="pay-right">
            <div className="pay-card">
              <div className="pay-card-title"><Lock size={15}/> Complete Payment</div>
              <div className="pay-amount-display">₹{fmt(totalAmount)}</div>
              <div className="pay-amount-label">Total amount (INR)</div>

              <RazorpayCheckout
                bookingId={bookingId}
                amount={totalAmount}
                onSuccess={handleSuccess}
                onFailure={handleFailure}
              />

              <div className="pay-methods">
                <span>UPI</span><span>Cards</span><span>Net Banking</span><span>Wallets</span>
              </div>
              <div className="pay-rzp-badge">Powered by <strong>Razorpay</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
