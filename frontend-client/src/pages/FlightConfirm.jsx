import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { paymentsAPI } from '../api/index';
import Navbar from '../components/Navbar';
import {
  Plane, ArrowLeft, ArrowRight, Edit2, User,
  Phone, Mail, MessageSquare, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import './FlightConfirm.css';

/* ── helpers ── */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtDate = (str) => {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const CONV_FEE = 99;
const TAX_RATE = 0.05;

export default function FlightConfirm() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const isCorpEmployee = user?.role === 'corporate_employee';
  const isCorpAdmin    = user?.role === 'corporate_admin'; // eslint-disable-line no-unused-vars
  const canProceed     = !isCorpEmployee || user?.canBookFlights !== false;

  const [phone, setPhone]         = useState(user?.phone || '');
  const [whatsapp, setWhatsapp]   = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [tcOpen, setTcOpen]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  if (!state?.flight || !state?.passengers) {
    navigate('/flights/search', { replace: true });
    return null;
  }

  const { flight, passengers, searchParams = {} } = state;

  /* ── Fare calculation ── */
  const paxCount   = passengers.length;
  const baseFare   = flight.price * paxCount;
  const taxes      = Math.round(baseFare * TAX_RATE);
  const totalAmount = baseFare + taxes + CONV_FEE;

  /* ── Submit ── */
  const handleProceed = async () => {
    if (!tcAccepted) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        origin:        flight.from,
        destination:   flight.to,
        departureDate: searchParams.depart || new Date().toISOString().split('T')[0],
        airline:       flight.airline,
        totalAmount,
        currency:      'INR',
        guestName:     `${passengers[0].title} ${passengers[0].firstName} ${passengers[0].lastName}`,
        guestEmail:    user?.email || '',
        guestPhone:    phone || null,
        passengers:    JSON.stringify(passengers),
      };
      const res = await paymentsAPI.flightBooking(payload);
      const bookingId = res.data?.booking?.id || res.data?.id;
      if (res.data?.requiresApproval) {
        navigate('/booking/approval-pending', { state: { bookingId, bookingReference: res.data?.booking?.bookingReference, totalAmount, type: 'flight', flight, passengers, searchParams } });
        return;
      }
      if (res.data?.directlyConfirmed) {
        navigate(`/booking/success?bookingId=${bookingId}`, { state: { bookingId, bookingReference: res.data?.booking?.bookingReference, totalAmount, flight, passengers, searchParams } });
        return;
      }
      navigate('/payment', { state: { bookingId, totalAmount, flight, passengers, searchParams } });
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create booking. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-page">
      <Navbar />

      <div className="container fc-wrap">
        {/* Step progress */}
        <div className="fc-steps">
          {['Passengers', 'Review', 'Payment'].map((label, i) => (
            <React.Fragment key={label}>
              <div className={`fc-step ${i < 1 ? 'done' : ''} ${i === 1 ? 'active' : ''}`}>
                <div className="fc-step-circle">{i + 1}</div>
                <span className="fc-step-label">{label}</span>
              </div>
              {i < 2 && <div className={`fc-step-line ${i < 1 ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="fc-grid">
          {/* ── LEFT COLUMN ── */}
          <div className="fc-left">

            {/* 1. Flight Summary */}
            <section className="fc-card">
              <div className="fc-card-title"><Plane size={16}/> Flight Details</div>
              <div className="fc-flight-summary">
                <img
                  src={`https://pics.avs.io/50/25/${flight.airlineCode || 'XX'}.png`}
                  alt={flight.airline} className="fc-logo"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div className="fc-flight-info">
                  <div className="fc-flight-name">{flight.airline} <span className="fc-fcode">{flight.code}</span></div>
                  <div className="fc-route-row">
                    <div className="fc-endpoint">
                      <div className="fc-big-time">{flight.dep}</div>
                      <div className="fc-iata">{flight.from}</div>
                      <div className="fc-date">{fmtDate(searchParams.depart)}</div>
                    </div>
                    <div className="fc-mid">
                      <div className="fc-dur">{flight.duration}</div>
                      <div className="fc-line-wrap">
                        <div className="fc-dot"/><div className="fc-dash"/><Plane size={12}/><div className="fc-dash"/><div className="fc-dot"/>
                      </div>
                      <div className="fc-stop-txt">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop`}</div>
                    </div>
                    <div className="fc-endpoint">
                      <div className="fc-big-time">{flight.arr}</div>
                      <div className="fc-iata">{flight.to}</div>
                      <div className="fc-date">{fmtDate(searchParams.depart)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Passenger Summary */}
            <section className="fc-card">
              <div className="fc-card-title-row">
                <div className="fc-card-title"><User size={16}/> Passengers ({paxCount})</div>
                <button className="fc-edit-btn" onClick={() => navigate(-1)}>
                  <Edit2 size={13}/> Edit
                </button>
              </div>
              <div className="fc-pax-list">
                {passengers.map((p, i) => (
                  <div key={i} className="fc-pax-row">
                    <div className="fc-pax-num">{i + 1}</div>
                    <div className="fc-pax-info">
                      <div className="fc-pax-name">{p.title} {p.firstName} {p.lastName}</div>
                      <div className="fc-pax-meta">
                        <span className={`fc-pax-type fc-type-${p.type}`}>{p.type}</span>
                        <span>DOB: {p.dob}</span>
                        {p.passportNumber && <span>Passport: {p.passportNumber}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Contact Information */}
            <section className="fc-card">
              <div className="fc-card-title"><Mail size={16}/> Contact Information</div>
              <div className="fc-contact-grid">
                <div className="fc-field">
                  <label className="fc-label">Email</label>
                  <div className="fc-input fc-readonly">{user?.email || '—'}</div>
                </div>
                <div className="fc-field">
                  <label className="fc-label">Phone <span className="fc-req">*</span></label>
                  <div className="fc-input-wrap">
                    <Phone size={14} className="fc-input-icon"/>
                    <input
                      className="fc-input"
                      placeholder="+91 XXXXX XXXXX"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <label className="fc-whatsapp-opt">
                <input type="checkbox" checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)}/>
                <MessageSquare size={14}/>
                Send booking updates via WhatsApp
              </label>
            </section>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="fc-right">

            {/* 4. Fare Breakdown */}
            <section className="fc-card fc-fare-card">
              <div className="fc-card-title">Fare Breakdown</div>
              <table className="fc-fare-table">
                <tbody>
                  <tr>
                    <td>Base fare × {paxCount} pax</td>
                    <td>₹{fmt(baseFare)}</td>
                  </tr>
                  <tr>
                    <td>Taxes & fees (5%)</td>
                    <td>₹{fmt(taxes)}</td>
                  </tr>
                  <tr>
                    <td>Convenience fee</td>
                    <td>₹{fmt(CONV_FEE)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="fc-fare-total">
                <span>Total Amount</span>
                <span className="fc-total-num">₹{fmt(totalAmount)}</span>
              </div>
              <div className="fc-fare-note">All prices in Indian Rupees (INR) • Inclusive of GST</div>
            </section>

            {/* 5. Terms & Conditions */}
            <section className="fc-card">
              <button className="fc-tc-toggle" onClick={() => setTcOpen(o => !o)}>
                <ShieldCheck size={15}/> Terms & Conditions
                {tcOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </button>
              {tcOpen && (
                <div className="fc-tc-body">
                  <p>• Ticket is non-transferable and valid only for the named passenger.</p>
                  <p>• Cancellation charges apply as per airline policy.</p>
                  <p>• Web check-in opens 48 hours before departure.</p>
                  <p>• HostMyTrip acts as an intermediary; the airline is responsible for the flight.</p>
                  <p>• Baggage allowances are as per airline policy.</p>
                </div>
              )}
              <label className="fc-tc-check">
                <input type="checkbox" checked={tcAccepted} onChange={e => setTcAccepted(e.target.checked)}/>
                I have read and agree to the terms and conditions
              </label>
            </section>

            {/* Error */}
            {error && <div className="fc-error">{error}</div>}

            {/* No-permission warning for employees */}
            {isCorpEmployee && !canProceed && (
              <div className="fc-error">Your account does not have permission to book flights. Contact your corporate admin.</div>
            )}

            {/* 6. Proceed button */}
            <button
              className={`fc-proceed-btn ${tcAccepted && !loading && canProceed ? 'active' : ''}`}
              disabled={!tcAccepted || loading || !canProceed}
              onClick={handleProceed}
            >
              {loading
                ? <><div className="fc-spinner"/>Submitting…</>
                : isCorpEmployee
                  ? <>Submit for Approval <ArrowRight size={16}/></>
                  : <>Proceed to Payment <ArrowRight size={16}/></>
              }
            </button>

            <div className="fc-secure-note">
              {isCorpEmployee
                ? <><ShieldCheck size={13}/> Request will be sent to your corporate admin for approval
                </>
                : <><ShieldCheck size={13}/> 100% secure payment · PCI DSS compliant</>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
