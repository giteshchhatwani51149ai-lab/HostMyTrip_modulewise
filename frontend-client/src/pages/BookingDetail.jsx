import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { bookingsAPI } from '../api';
import {
  ArrowLeft, MapPin, Calendar, Users, Hash, Plane, Building2,
  Package, CreditCard, CheckCircle, XCircle, Clock, AlertCircle,
  Download, Phone, Star, ChevronRight, RefreshCw, Share2,
  CalendarPlus, FileText, MessageCircle, HelpCircle, ChevronDown,
  ChevronUp, Luggage, Info, ExternalLink, Mail,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ReviewModal from '../components/ReviewModal';
import RefundTimeline from '../components/RefundTimeline';
import { useToast } from '../hooks/useToast';
import './Dashboard.css';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_COLOR = {
  confirmed: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  cancelled:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
  pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  completed:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  failed:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
};

const PAY_COLOR = {
  paid:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  partial: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  failed:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
};

const StatusBadge = ({ status, map }) => {
  const cfg = (map || STATUS_COLOR)[status] || STATUS_COLOR.pending;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, border: `1px solid ${cfg.border}`, color: cfg.color, background: cfg.bg, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
};

const TimelineIcon = ({ event }) => {
  if (event.toLowerCase().includes('cancel')) return <XCircle size={16} color="#ef4444" />;
  if (event.toLowerCase().includes('fail'))   return <AlertCircle size={16} color="#ef4444" />;
  if (event.toLowerCase().includes('confirm') || event.toLowerCase().includes('success')) return <CheckCircle size={16} color="#10b981" />;
  if (event.toLowerCase().includes('payment')) return <CreditCard size={16} color="#3b82f6" />;
  return <Clock size={16} color="var(--text-muted)" />;
};

const Section = ({ title, children }) => (
  <div className="glass" style={{ borderRadius: 14, padding: '22px 24px', marginBottom: 20 }}>
    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
      {title}
    </h3>
    {children}
  </div>
);

const Row = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', fontSize: 14 }}>
    <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: 12 }}>{label}</span>
    <span style={{ fontWeight: 600, textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</span>
  </div>
);

const FAQS = [
  { q: 'How do I check in online?', a: 'Online check-in opens 48 hours before departure on the airline\'s website. Use your PNR to check in and select seats.' },
  { q: 'What is the baggage allowance?', a: 'Economy typically allows 15–23 kg checked baggage and 7 kg cabin baggage. Check your ticket or the airline\'s website for exact allowances.' },
  { q: 'What is the cancellation policy?', a: 'Cancellations made 24+ hours before departure may be eligible for a refund minus airline penalties. Last-minute cancellations are usually non-refundable.' },
  { q: 'How do I get my e-ticket?', a: 'Your e-ticket is available to download from this page. It was also sent to your registered email at time of booking.' },
  { q: 'How can I change my booking?', a: 'Date/time changes are subject to airline policy and may incur fees. Please contact our support team for assistance.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text)', textAlign: 'left', gap: 8 }}>
        {q}
        {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </button>
      {open && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{a}</p>}
    </div>
  );
}

const CANCEL_REASONS = ['Change of plans', 'Found a better deal', 'Medical emergency', 'Travel restrictions', 'Other'];

function CancelModal({ booking, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(null); // { refundAmount, cancellationFee, refundTimeline, originalAmount }
  const [cancelError, setCancelError] = useState('');

  const paidAmount = Number(booking?.paidAmount || 0);
  const checkIn = booking?.checkIn ? new Date(booking.checkIn) : null;
  const now = new Date();
  const hoursUntil = checkIn ? (checkIn - now) / (1000 * 60 * 60) : null;

  let estFee = 0;
  let policyText = '';
  let policyColor = '#10b981';
  let cancellationBlocked = false;
  if (hoursUntil === null || hoursUntil > 24) {
    estFee = 0;
    policyText = 'Free cancellation — no fee applies (> 24 hours before check-in).';
    policyColor = '#10b981';
  } else if (hoursUntil >= 0) {
    estFee = Math.round(paidAmount * 0.5);
    policyText = 'Partial refund — 50% cancellation fee applies (within 24 hours of check-in).';
    policyColor = '#f59e0b';
  } else {
    estFee = paidAmount;
    policyText = 'Cannot cancel — the check-in/departure date has already passed.';
    policyColor = '#ef4444';
    cancellationBlocked = true;
  }
  const estRefund = Math.max(0, paidAmount - estFee);

  const handleConfirm = async () => {
    if (cancellationBlocked) return; // safety guard
    setCancelError('');
    try {
      const res = await onConfirm(reason);
      if (res) setSuccess(res);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Cancellation failed. Please try again.';
      setCancelError(msg);
    }
  };

  if (success) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="glass" style={{ borderRadius: 16, padding: '32px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="#10b981" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Booking Cancelled</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.55 }}>Your booking has been cancelled. A refund has been initiated.</p>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '16px', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Original Amount</span>
              <span style={{ fontWeight: 600 }}>₹{Number(success.originalAmount || paidAmount).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cancellation Fee</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>– ₹{Number(success.cancellationFee || 0).toLocaleString()}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ fontWeight: 700 }}>Refund Amount</span>
              <span style={{ fontWeight: 800, color: '#10b981' }}>₹{Number(success.refundAmount || 0).toLocaleString()}</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Refund Timeline: {success.refundTimeline || '7–10 business days'}</p>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onClose(success)}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="glass" style={{ borderRadius: 16, padding: '28px 32px', maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={20} color="#ef4444" />
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Cancel Booking?</h3>
        </div>

        {/* Policy summary */}
        <div style={{ background: `${policyColor}14`, border: `1px solid ${policyColor}40`, borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: policyColor, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {policyText}
        </div>

        {/* Refund breakdown — hidden when cancellation is not allowed */}
        {!cancellationBlocked && (
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>Refund Breakdown</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Original Amount</span>
              <span style={{ fontWeight: 600 }}>₹{paidAmount.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cancellation Fee</span>
              <span style={{ fontWeight: 600, color: '#ef4444' }}>– ₹{estFee.toLocaleString()}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ fontWeight: 700 }}>Refund Amount</span>
              <span style={{ fontWeight: 800, color: '#10b981' }}>₹{estRefund.toLocaleString()}</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Refund Timeline: 7–10 business days to original payment method.</p>
          </div>
        )}

        {/* Reason dropdown */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Reason for Cancellation <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
            <option value="">Select a reason…</option>
            {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {cancelError && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#ef4444', display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={14} /> {cancelError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onClose()} disabled={loading}>
            {cancellationBlocked ? 'Close' : 'Keep Booking'}
          </button>
          {!cancellationBlocked && (
            <button className="btn btn-danger" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={handleConfirm} disabled={loading}>
              {loading ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Cancelling…</> : 'Confirm Cancellation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCorporate = location.state?.from === 'corporate';
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchBooking(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for refund status updates every 30s while refund is in flight.
  // Stops automatically when status becomes 'completed' or 'failed'.
  useEffect(() => {
    if (!booking) return;
    const inFlight = booking.refundStatus === 'initiated' || booking.refundStatus === 'processing';
    if (!inFlight) return;
    const interval = setInterval(() => { fetchBooking(); }, 30_000);
    return () => clearInterval(interval);
  }, [booking?.refundStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBooking = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingsAPI.getMySingle(id);
      setBooking(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelModalClose = (refundData) => {
    setCancelModalOpen(false);
    // Only fire toast for actual refund result objects (not click events / undefined)
    if (refundData && typeof refundData === 'object' && 'refundAmount' in refundData) {
      toast.bookingCancelled({ refundAmount: refundData.refundAmount });
    }
  };

  const handleCancel = async (reason) => {
    setCancelling(true);
    try {
      const res = await bookingsAPI.cancel(id, reason);
      const d = res.data || {};
      setBooking(prev => ({
        ...prev,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationFee: d.cancellationFee,
        refundAmount: d.refundAmount,
        refundStatus: d.refundStatus || 'initiated',
        refundId: d.refundId,
        refundInitiatedAt: new Date().toISOString(),
        paymentGateway: d.gateway || prev?.paymentGateway,
      }));
      return d;
    } finally {
      setCancelling(false);
    }
  };

  const handleAddToCalendar = () => {
    if (!booking) return;
    const b = booking;
    const fd = b.flightDetail;
    const start = fd?.departureDate || b.checkIn;
    const end = fd?.returnDate || b.checkOut || start;
    if (!start) { alert('No date available for calendar export.'); return; }
    const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = fd ? `Flight: ${fd.origin || '?'} → ${fd.destination || '?'}` : `Hotel: ${b.displayHotelName || 'Booking'}`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:Booking Ref: ${b.bookingReference || id}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `booking-${id}.ics`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = (method) => {
    const b = booking;
    const text = `My booking with HostMyTrip:\n${b?.displayHotelName || b?.flightDetail?.origin + ' → ' + b?.flightDetail?.destination || 'Trip'}\nRef: ${b?.bookingReference || id}\nStatus: ${b?.status}`;
    if (method === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    else window.open(`mailto:?subject=My Travel Itinerary&body=${encodeURIComponent(text)}`);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Navbar />
        <div className="container dashboard-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="dashboard-page">
        <Navbar />
        <div className="container dashboard-content">
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '18px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <AlertCircle size={20} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, margin: 0 }}>Could not load booking</p>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{error}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={fetchBooking} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-bookings')} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ArrowLeft size={14} /> Back to My Bookings
          </button>
        </div>
      </div>
    );
  }

  const b = booking;
  const fd = b.flightDetail;
  const isFlight = b.bookingType === 'flight' || b.bookingSource === 'flight' || !!fd;
  const safeSnapshot = (() => { try { return typeof b.snapshot === 'string' ? JSON.parse(b.snapshot) : b.snapshot; } catch { return null; } })();
  const isPackage = b.bookingType === 'package' || b.bookingSource === 'package';
  // Cancel only allowed for confirmed bookings whose check-in/departure is still in the future
  const refDate = b.checkIn || b.departureDate || b.flightDetail?.departureDate || null;
  const isPastDated = refDate ? new Date(refDate) < new Date() : false;
  const canCancel = b.status === 'confirmed' && !isPastDated;
  const canReview = b.status === 'confirmed' && !b.review && !b.isLiveBooking && !isFlight;
  const hotelImages = (() => { try { const img = b.hotel?.images; return Array.isArray(img) ? img : (typeof img === 'string' ? JSON.parse(img) : []); } catch { return []; } })();
  const hotelImg = hotelImages[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600';

  const taxes = b.totalAmount && b.paidAmount
    ? Math.round(Number(b.totalAmount) * 0.12)
    : null;
  const baseFare = taxes ? Math.round(Number(b.totalAmount) - taxes) : null;

  return (
    <div className="dashboard-page">
      <Navbar />
      <div className="container dashboard-content">

        {/* ── 1. Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(fromCorporate ? '/corporate' : '/my-bookings')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ArrowLeft size={14} /> {fromCorporate ? 'Back to Corporate' : 'Back to My Bookings'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge status={b.status} />
            {b.bookingReference && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hash size={11} /> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.bookingReference}</span>
              </span>
            )}
            <button onClick={() => window.open('mailto:support@hostmytrip.com')}
              style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <MessageCircle size={12} /> Need help?
            </button>
          </div>
        </div>

        {/* Hero banner */}
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24, position: 'relative', height: 200 }}>
          {isFlight
            ? <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plane size={64} color="rgba(255,255,255,0.25)" /></div>
            : isPackage
            ? <div style={{ background: 'linear-gradient(135deg,#3b1f6e,#7c3aed)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={64} color="rgba(255,255,255,0.25)" /></div>
            : <img src={hotelImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 60%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {isFlight ? <Plane size={20} color="#fff" /> : isPackage ? <Package size={20} color="#fff" /> : <Building2 size={20} color="#fff" />}
              <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>
                {isFlight ? `${fd?.origin || b.origin || '?'} → ${fd?.destination || b.destination || '?'}` : (b.displayHotelName || b.hotel?.name || 'Booking')}
              </h1>
            </div>
            {!isFlight && b.displayCity && (
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {b.displayCity}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          {/* ── Left column ── */}
          <div>

            {/* ── 2. Trip Summary ── */}
            <Section title={isFlight ? '✈️ Flight Summary' : isPackage ? '📦 Package Summary' : '🏨 Hotel Summary'}>
              {isFlight ? (
                <>
                  {/* Outbound */}
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>Outbound Flight</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{fd?.origin || b.origin || '?'}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{fd?.departureTime || fmtDate(fd?.departureDate || b.checkIn)}</p>
                        {fd?.departureTerminal && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>Terminal {fd.departureTerminal}</p>}
                      </div>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <Plane size={14} color="var(--primary)" />
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                        {fd?.duration && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', textAlign: 'center' }}>{fd.duration}</p>}
                        {fd?.stops !== undefined && <p style={{ fontSize: 10, color: fd.stops === 0 ? '#10b981' : '#f59e0b', margin: '2px 0 0', textAlign: 'center', fontWeight: 600 }}>{fd.stops === 0 ? 'Non-stop' : `${fd.stops} stop(s)`}</p>}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{fd?.destination || b.destination || '?'}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{fd?.arrivalTime || '—'}</p>
                        {fd?.arrivalTerminal && <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>Terminal {fd.arrivalTerminal}</p>}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>✈ {fd?.airline || b.airline || '—'}</span>
                      {(fd?.flightNumber || b.flightNumber) && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Flight {fd?.flightNumber || b.flightNumber}</span>}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Class: {fd?.class || b.cabinClass || 'Economy'}</span>
                    </div>
                  </div>
                  {/* Return */}
                  {fd?.returnDate && (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>Return Flight</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{fd?.destination || '?'}</p>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          <Plane size={13} color="var(--primary)" style={{ transform: 'scaleX(-1)' }} />
                          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                        <p style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{fd?.origin || '?'}</p>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>Return: {fmtDate(fd.returnDate)}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Row label="Hotel" value={b.displayHotelName || b.hotel?.name} />
                  <Row label="City" value={b.displayCity || b.hotel?.city} />
                  {b.hotel?.address && <Row label="Address" value={b.hotel.address} />}
                  <Row label="Check-in" value={fmtDate(b.checkIn)} />
                  <Row label="Check-out" value={fmtDate(b.checkOut)} />
                  <Row label="Room Type" value={b.displayRoomType || b.room?.type} />
                  <Row label="Guests" value={b.guests} />
                  {b.hotel?.rating && <Row label="Hotel Rating" value={`★ ${Number(b.hotel.rating).toFixed(1)}`} />}
                </>
              )}
              {b.bookingReference && <Row label="Booking Ref" value={b.bookingReference} mono />}
              {b.amadeusBookingRef && b.amadeusBookingRef !== 'MANUAL_CONFIRMATION_REQUIRED' && <Row label="PNR" value={b.amadeusBookingRef} mono />}
            </Section>

            {/* ── Refund Status (visible only for cancelled bookings) ── */}
            {b.status === 'cancelled' && b.refundStatus && b.refundStatus !== 'none' && (
              <Section title={<><CreditCard size={15} /> Refund Status</>}>
                <RefundTimeline
                  refundStatus={b.refundStatus}
                  refundAmount={b.refundAmount}
                  cancellationFee={b.cancellationFee}
                  refundInitiatedAt={b.refundInitiatedAt}
                  refundCompletedAt={b.refundCompletedAt}
                  refundFailureReason={b.refundFailureReason}
                  paymentGateway={b.paymentGateway}
                  cancelledAt={b.cancelledAt}
                />
              </Section>
            )}

            {/* ── 3. Passenger / Guest Details ── */}
            {safeSnapshot && (
              <Section title="👤 Passenger / Guest Details">
                {Array.isArray(safeSnapshot) ? safeSnapshot.map((p, i) => (
                  <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={13} /> Passenger {i + 1} {p.name || p.firstName ? `– ${p.name || (p.firstName + ' ' + (p.lastName || ''))}` : ''}
                    </p>
                    {p.seat && <Row label="Seat" value={p.seat} />}
                    {p.mealPreference && <Row label="Meal Preference" value={p.mealPreference} />}
                    {p.passport && <Row label="Passport" value={p.passport} mono />}
                    {p.dob && <Row label="Date of Birth" value={fmtDate(p.dob)} />}
                    {p.gender && <Row label="Gender" value={p.gender} />}
                    {!p.seat && !p.mealPreference && !p.passport && !p.dob &&
                      Object.entries(p).filter(([k]) => !['name','firstName','lastName'].includes(k)).map(([k, v]) => v && <Row key={k} label={k} value={String(v)} />)
                    }
                  </div>
                )) : (safeSnapshot && typeof safeSnapshot === 'object' && (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 14px' }}>
                    {Object.entries(safeSnapshot).map(([k, v]) => v && <Row key={k} label={k} value={String(v)} />)}
                  </div>
                ))}
              </Section>
            )}

            {/* ── 4. Fare Summary ── */}
            <Section title="💳 Fare Summary">
              {baseFare !== null && <Row label="Base Fare" value={`₹${baseFare.toLocaleString()}`} />}
              {taxes !== null && <Row label="Taxes & Fees (est. 12%)" value={`₹${taxes.toLocaleString()}`} />}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <Row label="Total Amount" value={`₹${Number(b.totalAmount || 0).toLocaleString()}`} />
                <Row label="Total Paid" value={`₹${Number(b.paidAmount || 0).toLocaleString()}`} />
              </div>
              {b.paymentStatus === 'partial' && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
                  <Row label="Balance Due at Check-in" value={`₹${(b.totalAmount - b.paidAmount).toLocaleString()}`} />
                </div>
              )}
              {b.paymentStatus && <Row label="Payment Status" value={<StatusBadge status={b.paymentStatus} map={PAY_COLOR} />} />}
              {b.paymentMethod && <Row label="Payment Method" value={b.paymentMethod} />}
            </Section>

            {/* ── 7. Important Information ── */}
            <Section title={<><Info size={15} /> Important Information</>}>
              {[
                { icon: <Clock size={14} />, text: isFlight ? 'Online check-in opens 48 hours before departure on the airline\'s website.' : 'Check-in time is usually 2:00 PM. Early check-in subject to availability.' },
                { icon: <Luggage size={14} />, text: isFlight ? 'Baggage allowance: Economy — 15–23 kg checked, 7 kg cabin. Verify on airline website.' : 'Hotel cancellation and amendment policies vary. Check your booking terms.' },
                { icon: <XCircle size={14} />, text: 'Cancellation charges may apply. Please review the cancellation policy before proceeding.' },
                { icon: <ExternalLink size={14} />, text: isFlight ? `Contact airline: ${fd?.airline || 'your airline\'s'} helpline for seat changes, meal requests, or special assistance.` : `Contact hotel: ${b.hotel?.name || 'the hotel'} directly for special requests.` },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>{item.text}</p>
                </div>
              ))}
            </Section>

            {/* ── 8. Support Section ── */}
            <Section title={<><HelpCircle size={15} /> Frequently Asked Questions</>}>
              {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
              <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.open('mailto:support@hostmytrip.com')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> Email Support
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => window.open('https://wa.me/919999999999')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} /> WhatsApp Support
                </button>
              </div>
            </Section>

            {/* ── Timeline ── */}
            {b.timeline && b.timeline.length > 0 && (
              <Section title="📋 Activity Timeline">
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--border)', borderRadius: 2 }} />
                  {b.timeline.map((t, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ position: 'absolute', left: -24, top: 2, width: 16, height: 16, background: 'var(--bg-card)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TimelineIcon event={t.event} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{t.event}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(t.at)}</p>
                        {t.meta && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{t.meta}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ position: 'sticky', top: 90 }}>
            {/* Quick info */}
            <div className="glass" style={{ borderRadius: 14, padding: '20px', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Paid</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', margin: '0 0 12px' }}>
                ₹{Number(b.paidAmount || 0).toLocaleString()}
              </p>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span><StatusBadge status={b.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment</span><StatusBadge status={b.paymentStatus} map={PAY_COLOR} />
                </div>
                {b.bookingReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Hash size={10} /> Ref</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.bookingReference}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 5. Action Buttons ── */}
            <div className="glass" style={{ borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Actions</p>

              <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-start', width: '100%' }}
                onClick={() => alert('E-ticket PDF generation coming soon')}>
                <Download size={14} /> Download E-ticket (PDF)
              </button>

              <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-start', width: '100%' }}
                onClick={() => alert('Invoice PDF coming soon')}>
                <FileText size={14} /> Download Invoice (PDF)
              </button>

              <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-start', width: '100%' }}
                onClick={handleAddToCalendar}>
                <CalendarPlus size={14} /> Add to Calendar (iCal)
              </button>

              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}
                  onClick={() => handleShare('email')}>
                  <Mail size={13} /> Email
                </button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}
                  onClick={() => handleShare('whatsapp')}>
                  <Share2 size={13} /> WhatsApp
                </button>
              </div>

              {canReview && (
                <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-start', width: '100%' }}
                  onClick={() => setReviewOpen(true)}>
                  <Star size={14} /> Write a Review
                </button>
              )}

              {!isFlight && !b.isLiveBooking && b.hotelId && (
                <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-start', width: '100%' }}
                  onClick={() => navigate(`/hotels/${b.hotelId}`)}>
                  <Building2 size={14} /> View Hotel <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                </button>
              )}

              <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-start', width: '100%' }}
                onClick={() => window.open('mailto:support@hostmytrip.com')}>
                <Phone size={14} /> Contact Support
              </button>

              {/* ── 6. Cancellation ── */}
              {canCancel && (
                <>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  <button className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => setCancelModalOpen(true)}>
                    <XCircle size={14} /> Cancel Booking
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {cancelModalOpen && (
        <CancelModal
          booking={b}
          onConfirm={handleCancel}
          onClose={handleCancelModalClose}
          loading={cancelling}
        />
      )}

      {reviewOpen && (
        <ReviewModal hotelId={b.hotelId} onClose={() => setReviewOpen(false)} onSuccess={() => { setReviewOpen(false); fetchBooking(); }} />
      )}
    </div>
  );
}
