import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsAPI } from '../api/index';
import Navbar from '../components/Navbar';
import {
  CheckCircle, Copy, Check, Plane, Hotel as HotelIcon, Download, Calendar,
  MessageSquare, Phone, ArrowRight, Home, MapPin, Users, BedDouble,
  CreditCard, Mail,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '../hooks/useToast';
import './BookingSuccess.css';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtDate = (str) => {
  if (!str) return '—';
  try { return new Date(String(str).split('T')[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return str; }
};

export default function BookingSuccess() {
  const { state }      = useLocation();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const bookingId      = searchParams.get('bookingId') || state?.bookingId;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);
  const firedRef              = useRef(false);
  const toastFiredRef         = useRef(false);
  const toast                 = useToast();

  /* ── Fetch booking ─────────────────────────────────────────── */
  useEffect(() => {
    if (!bookingId) { navigate('/', { replace: true }); return; }
    (async () => {
      try {
        const res = await paymentsAPI.getBooking(bookingId);
        setBooking(res.data.booking);
      } catch {
        // Fallback: build a synthetic booking from navigation state
        if (state?.hotel || state?.flight) {
          setBooking({
            bookingReference: state.bookingReference || `HMT${Date.now().toString(36).toUpperCase()}`,
            totalAmount:      state.totalAmount,
            checkIn:          state.checkIn,
            checkOut:         state.checkOut,
            guests:           state.adults,
            airline:          state.flight?.airline || state.room?.name,
            origin:           state.flight?.from || state.hotel?.city,
            destination:      state.flight?.to   || state.hotel?.name,
            departureDate:    state.searchParams?.depart,
            passengers:       state.hotel
              ? JSON.stringify({ hotelName: state.hotel.name, hotelCity: state.hotel.city, hotelAddress: state.hotel.address, roomName: state.room?.name })
              : JSON.stringify(state.passengers || []),
          });
        } else {
          setError('Could not load booking details.');
        }
      } finally { setLoading(false); }
    })();
  }, [bookingId]); // eslint-disable-line

  /* ── Success toasts once */
  useEffect(() => {
    if (!booking || toastFiredRef.current) return;
    toastFiredRef.current = true;
    toast.bookingConfirmed({ id: bookingId, ref: booking.bookingReference });
    setTimeout(() => toast.eTicketSent(), 1500);
  }, [booking]); // eslint-disable-line

  /* ── Confetti once ─────────────────────────────────────────── */
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const end = Date.now() + 2500;
    const fire = () => {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 }, colors: ['#FF6B00','#10b981','#3b82f6','#f59e0b'] });
      if (Date.now() < end) requestAnimationFrame(fire);
    };
    fire();
  }, []);

  /* ── Determine booking type ────────────────────────────────── */
  const { isHotel, hotelInfo, passengers, nights } = useMemo(() => {
    let hotelInfo = state?.hotel
      ? { name: state.hotel.name, city: state.hotel.city, address: state.hotel.address, photo: state.hotel.photo, roomName: state.room?.name, bedConfig: state.room?.bedConfig, pricePerNight: state.room?.pricePerNight, starRating: state.hotel.starRating }
      : null;
    let passengers = state?.passengers || [];

    // Try to parse hotel info from booking.passengers (backend stored snapshot there)
    if (!hotelInfo && booking?.passengers) {
      try {
        const parsed = JSON.parse(booking.passengers);
        if (parsed?.hotelName || parsed?.hotelExternalId) {
          hotelInfo = {
            name: parsed.hotelName, city: parsed.hotelCity,
            address: parsed.hotelAddress, roomName: parsed.roomName,
          };
        } else if (Array.isArray(parsed)) {
          passengers = parsed;
        }
      } catch { /* ignore */ }
    }

    const isHotel = !!hotelInfo;

    // Compute nights
    const ci = state?.checkIn  || booking?.checkIn;
    const co = state?.checkOut || booking?.checkOut;
    const nights = (ci && co)
      ? Math.max(1, Math.ceil((new Date(co) - new Date(ci)) / 86400000))
      : (state?.nights || 1);

    return { isHotel, hotelInfo, passengers, nights };
  }, [state, booking]);

  /* ── GA purchase event ─────────────────────────────────────── */
  useEffect(() => {
    if (!booking) return;
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: booking.bookingReference,
        value:          booking.totalAmount,
        currency:       'INR',
        items: [{
          item_name:     isHotel ? hotelInfo?.name : `${booking.origin}→${booking.destination}`,
          item_category: isHotel ? 'hotel' : 'flight',
        }],
      });
    }
  }, [booking, isHotel, hotelInfo]);

  /* ── Copy reference ────────────────────────────────────────── */
  const copyRef = () => {
    navigator.clipboard.writeText(booking?.bookingReference || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Download iCal ─────────────────────────────────────────── */
  const downloadICal = () => {
    let summary, dtStart, dtEnd, description;
    if (isHotel) {
      const ci = (state?.checkIn  || booking?.checkIn  || '').toString().split('T')[0];
      const co = (state?.checkOut || booking?.checkOut || '').toString().split('T')[0];
      dtStart  = ci.replace(/-/g, '') + 'T140000';   // 14:00 check-in
      dtEnd    = co.replace(/-/g, '') + 'T110000';   // 11:00 check-out
      summary  = `Hotel: ${hotelInfo?.name || 'Stay'}`;
      description = `Booking ref: ${booking?.bookingReference}\\n${hotelInfo?.address || ''}`;
    } else {
      const dep = booking?.departureDate || state?.searchParams?.depart || new Date().toISOString().split('T')[0];
      dtStart   = dep.replace(/-/g, '') + 'T060000Z';
      dtEnd     = dep.replace(/-/g, '') + 'T100000Z';
      summary   = `Flight ${booking?.origin}→${booking?.destination}`;
      description = `Booking ref: ${booking?.bookingReference}`;
    }
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${(isHotel ? hotelInfo?.address : `${booking?.origin} → ${booking?.destination}`) || ''}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ical], { type: 'text/calendar' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${isHotel ? 'hotel' : 'flight'}-booking.ics` });
    a.click();
  };

  /* ── Loading / error ───────────────────────────────────────── */
  if (loading) return (
    <div className="bs-page"><Navbar/>
      <div className="bs-loading"><div className="bs-spinner-lg"/><p>Loading booking details…</p></div>
    </div>
  );

  if (error && !booking) return (
    <div className="bs-page"><Navbar/>
      <div className="bs-error"><p>{error}</p>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    </div>
  );

  /* ── Derived display ───────────────────────────────────────── */
  const ci = state?.checkIn  || booking?.checkIn;
  const co = state?.checkOut || booking?.checkOut;
  const adults = state?.adults || booking?.guests || 1;
  const rooms  = state?.rooms  || 1;
  const isPayAtHotel = state?.paymentMethod === 'payAtHotel';

  return (
    <div className="bs-page">
      <Navbar />
      <div className="container bs-wrap">

        {/* ── Hero ── */}
        <div className="bs-hero">
          <div className="bs-check-anim">
            <CheckCircle size={72} className="bs-check-icon"/>
          </div>
          <h1 className="bs-heading">Booking Confirmed!</h1>
          <p className="bs-sub">
            {isHotel
              ? `Your stay at ${hotelInfo?.name} is confirmed. Confirmation sent to your email.`
              : 'Your flight has been booked successfully. E-ticket sent to your email.'}
          </p>
        </div>

        {/* ── Reference card ── */}
        <div className="bs-ref-card">
          <div className="bs-ref-label">Booking Reference</div>
          <div className="bs-ref-num">{booking?.bookingReference || '—'}</div>
          <button className="bs-copy-btn" onClick={copyRef}>
            {copied ? <><Check size={13}/> Copied!</> : <><Copy size={13}/> Copy</>}
          </button>
        </div>

        {/* ────────────── HOTEL VIEW ────────────── */}
        {isHotel ? (
          <>
            <div className="bs-grid">
              {/* Hotel details */}
              <div className="bs-card">
                <div className="bs-card-title"><HotelIcon size={15}/> Hotel Details</div>
                {hotelInfo?.photo && (
                  <img src={hotelInfo.photo} alt={hotelInfo.name} className="bs-hotel-img"/>
                )}
                <div className="bs-hotel-name">{hotelInfo?.name}</div>
                {hotelInfo?.address && (
                  <div className="bs-hotel-addr"><MapPin size={12}/> {hotelInfo.address}</div>
                )}
                <div className="bs-detail-row"><span>City</span><span>{hotelInfo?.city || '—'}</span></div>
                <div className="bs-detail-row"><span>Room</span><span>{hotelInfo?.roomName || '—'}</span></div>
                {hotelInfo?.bedConfig && (
                  <div className="bs-detail-row"><span><BedDouble size={12} style={{verticalAlign:'middle'}}/> Bed</span><span>{hotelInfo.bedConfig}</span></div>
                )}
                <div className="bs-detail-row"><span>Status</span><span className="bs-status-badge">Confirmed</span></div>
              </div>

              {/* Stay summary */}
              <div className="bs-card">
                <div className="bs-card-title"><Calendar size={15}/> Stay Summary</div>
                <div className="bs-detail-row"><span>Check-in</span><span><strong>{fmtDate(ci)}</strong> · From 14:00</span></div>
                <div className="bs-detail-row"><span>Check-out</span><span><strong>{fmtDate(co)}</strong> · Before 11:00</span></div>
                <div className="bs-detail-row"><span>Duration</span><span>{nights} night{nights > 1 ? 's' : ''}</span></div>
                <div className="bs-detail-row"><span><Users size={12} style={{verticalAlign:'middle'}}/> Guests</span><span>{adults} adult{adults > 1 ? 's' : ''} · {rooms} room{rooms > 1 ? 's' : ''}</span></div>
                <div className="bs-detail-row"><span>Payment</span>
                  <span>{isPayAtHotel ? <span className="bs-pah-badge">Pay at Hotel</span> : <span>Paid online</span>}</span>
                </div>

                <div className="bs-fare-row">
                  <span>{isPayAtHotel ? 'Amount due at hotel' : 'Total Paid'}</span>
                  <span className="bs-total">₹{fmt(booking?.totalAmount || state?.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Important info */}
            <div className="bs-card bs-info">
              <div className="bs-card-title">Important information</div>
              <ul className="bs-info-list">
                <li>Please carry a valid government photo ID at check-in.</li>
                <li>Standard check-in is 14:00 local time. Early check-in is subject to availability.</li>
                <li>{isPayAtHotel ? 'Payment will be collected directly at the hotel during check-in.' : 'Your payment has been processed and a tax invoice has been emailed.'}</li>
                <li>Free cancellation available up to 48 hours before check-in (where applicable).</li>
              </ul>
            </div>
          </>
        ) : (
          /* ────────────── FLIGHT VIEW (existing) ────────────── */
          <div className="bs-grid">
            <div className="bs-card">
              <div className="bs-card-title"><Plane size={15}/> Flight Details</div>
              <div className="bs-detail-row"><span>Airline</span><span>{booking?.airline || state?.flight?.airline || '—'}</span></div>
              <div className="bs-detail-row"><span>Route</span><span>{booking?.origin} → {booking?.destination}</span></div>
              <div className="bs-detail-row"><span>Date</span><span>{fmtDate(booking?.departureDate?.toString().split('T')[0] || state?.searchParams?.depart)}</span></div>
              <div className="bs-detail-row"><span>Departure</span><span>{state?.flight?.dep || '—'}</span></div>
              <div className="bs-detail-row"><span>Arrival</span><span>{state?.flight?.arr || '—'}</span></div>
              <div className="bs-detail-row"><span>Duration</span><span>{state?.flight?.duration || '—'}</span></div>
              <div className="bs-detail-row"><span>Status</span><span className="bs-status-badge">Confirmed</span></div>
            </div>

            <div className="bs-card">
              <div className="bs-card-title"><span>👤</span> Passengers</div>
              {passengers.length > 0 ? passengers.map((p, i) => (
                <div key={i} className="bs-pax-row">
                  <div className="bs-pax-num">{i+1}</div>
                  <div>
                    <div className="bs-pax-name">{p.title} {p.firstName} {p.lastName}</div>
                    <div className="bs-pax-meta">{p.type} · DOB: {p.dob}</div>
                  </div>
                </div>
              )) : <p className="bs-no-pax">Passenger details saved.</p>}

              <div className="bs-fare-row">
                <span>Total Paid</span>
                <span className="bs-total">₹{fmt(booking?.totalAmount || state?.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Next steps ── */}
        <div className="bs-card bs-next">
          <div className="bs-card-title">Next Steps</div>
          <div className="bs-next-grid">
            <div className="bs-next-item">
              <Mail size={18} style={{ color: '#f97316' }}/>
              <div>
                <div className="bs-next-label">{isHotel ? 'Confirmation' : 'E-Ticket'}</div>
                <div className="bs-next-sub">Sent to your email</div>
              </div>
            </div>
            <div className="bs-next-item">
              <button className="bs-action-btn" onClick={downloadICal}>
                <Calendar size={14}/> Add to Calendar
              </button>
            </div>
            <div className="bs-next-item">
              <button className="bs-action-btn">
                <Download size={14}/> Download {isHotel ? 'Voucher' : 'Invoice'}
              </button>
            </div>
            {!isPayAtHotel && (
              <div className="bs-next-item">
                <CreditCard size={18} style={{ color: '#10b981' }}/>
                <div>
                  <div className="bs-next-label">Payment received</div>
                  <div className="bs-next-sub">Tax invoice emailed</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Support ── */}
        <div className="bs-card bs-support">
          <div className="bs-card-title">Need Help?</div>
          <div className="bs-support-row">
            <a href="tel:+911800001234" className="bs-support-btn"><Phone size={14}/> Call Support</a>
            <a href="https://wa.me/911800001234" target="_blank" rel="noopener noreferrer" className="bs-support-btn bs-wa">
              <MessageSquare size={14}/> WhatsApp
            </a>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="bs-actions">
          <button className="bs-btn-secondary" onClick={() => navigate('/')}>
            <Home size={15}/> Go Home
          </button>
          <button className="bs-btn-secondary" onClick={() => navigate(`/dashboard`)}>
            View My Bookings <ArrowRight size={14}/>
          </button>
          <button className="bs-btn-primary" onClick={() => navigate(isHotel ? '/hotels' : '/flights/search')}>
            {isHotel ? <><HotelIcon size={15}/> Book Another Hotel</> : <><Plane size={15}/> Book Another Flight</>}
          </button>
        </div>

      </div>
    </div>
  );
}
