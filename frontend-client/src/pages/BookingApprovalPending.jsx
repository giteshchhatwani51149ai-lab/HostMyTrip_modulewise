import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Clock, Plane, Hotel, CheckCircle, ArrowRight, Copy } from 'lucide-react';
import './BookingApprovalPending.css';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function BookingApprovalPending() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const [copied, setCopied] = React.useState(false);

  if (!state?.bookingId) {
    navigate('/', { replace: true });
    return null;
  }

  const { bookingId, bookingReference, totalAmount, type, flight, hotel, room, checkIn, checkOut } = state;
  const ref = bookingReference || `#${bookingId}`;

  const copyRef = () => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bap-page">
      <Navbar />
      <div className="container bap-wrap">

        {/* Status icon */}
        <div className="bap-icon-wrap">
          <div className="bap-icon-ring">
            <Clock size={36} className="bap-clock-icon" />
          </div>
        </div>

        <h1 className="bap-title">Booking Submitted for Approval</h1>
        <p className="bap-subtitle">
          Your booking request has been sent to your corporate admin for approval.<br/>
          You will be notified once it is reviewed.
        </p>

        {/* Reference card */}
        <div className="bap-ref-card">
          <div className="bap-ref-label">Booking Reference</div>
          <div className="bap-ref-row">
            <span className="bap-ref-value">{ref}</span>
            <button className="bap-copy-btn" onClick={copyRef} title="Copy reference">
              {copied ? <CheckCircle size={15} color="#10b981" /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Booking summary */}
        <div className="bap-summary-card">
          <div className="bap-summary-icon">
            {type === 'flight' ? <Plane size={18} /> : <Hotel size={18} />}
          </div>
          <div className="bap-summary-info">
            {type === 'flight' && flight ? (
              <>
                <div className="bap-summary-title">{flight.airline} — {flight.from} → {flight.to}</div>
                <div className="bap-summary-meta">{flight.dep} → {flight.arr} · {flight.duration}</div>
              </>
            ) : hotel ? (
              <>
                <div className="bap-summary-title">{hotel.name}</div>
                <div className="bap-summary-meta">{checkIn} → {checkOut}{room ? ` · ${room.name}` : ''}</div>
              </>
            ) : null}
            <div className="bap-summary-amount">₹{fmt(totalAmount)} <span className="bap-pending-badge">Pending Approval</span></div>
          </div>
        </div>

        {/* Steps */}
        <div className="bap-steps">
          <div className="bap-step done">
            <div className="bap-step-circle"><CheckCircle size={16} /></div>
            <div className="bap-step-text">
              <strong>Request Submitted</strong>
              <span>Your booking is in the approval queue</span>
            </div>
          </div>
          <div className="bap-step-line" />
          <div className="bap-step pending">
            <div className="bap-step-circle"><Clock size={16} /></div>
            <div className="bap-step-text">
              <strong>Admin Review</strong>
              <span>Corporate admin will approve or reject</span>
            </div>
          </div>
          <div className="bap-step-line" />
          <div className="bap-step pending">
            <div className="bap-step-circle"><CheckCircle size={16} /></div>
            <div className="bap-step-text">
              <strong>Booking Confirmed</strong>
              <span>Credit deducted from corporate account</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bap-actions">
          <button className="bap-btn-primary" onClick={() => navigate('/my-bookings')}>
            View My Bookings <ArrowRight size={15} />
          </button>
          <button className="bap-btn-ghost" onClick={() => navigate('/corporate')}>
            Go to Corporate Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
