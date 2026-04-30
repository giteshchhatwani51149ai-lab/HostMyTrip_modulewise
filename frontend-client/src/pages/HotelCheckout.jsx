import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Star, Calendar, Users, MapPin, ShieldCheck, AlertTriangle,
  CreditCard, Smartphone, Building2, Hotel, Lock, ArrowLeft, Plus, Minus,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { paymentsAPI } from '../api';
import { useAuthStore } from '../store/authStore';
import './HotelCheckout.css';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

/* ── Zod schema ─────────────────────────────────────────────────────────── */
const guestSchema = z.object({
  title:     z.enum(['Mr', 'Mrs', 'Ms', 'Dr']),
  firstName: z.string().trim().min(2, 'First name required'),
  lastName:  z.string().trim().min(1, 'Last name required'),
});

const checkoutSchema = z.object({
  primary:    guestSchema,
  additional: z.array(z.object({
    firstName: z.string().trim().min(2, 'First name required'),
    lastName:  z.string().trim().min(1, 'Last name required'),
  })),
  email:        z.string().email('Valid email required'),
  phone:        z.string().regex(/^\+?[0-9\s-]{8,16}$/, 'Valid phone required'),
  specialRequests: z.string().max(500).optional(),
  paymentMethod:   z.enum(['card', 'upi', 'netbanking', 'payAtHotel', 'corporate']).optional(),
  acceptTerms:     z.literal(true, { errorMap: () => ({ message: 'You must accept terms' }) }),
});

/* ── Helpers ────────────────────────────────────────────────────────────── */
const TAX_RATE = 0.12;        // 12% combined GST + service
const CONV_FEE  = 99;

function calcBreakdown(pricePerNight, nights, rooms) {
  const subtotal = pricePerNight * nights * rooms;
  const taxes    = Math.round(subtotal * TAX_RATE);
  const total    = subtotal + taxes + CONV_FEE;
  return { subtotal, taxes, convFee: CONV_FEE, total };
}

/* ─────────────────────────────────────────────────────────────────────────
   Hotel Checkout Page
   ───────────────────────────────────────────────────────────────────────── */
export default function HotelCheckout() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const user       = useAuthStore((s) => s.user);
  const isCorpEmployee = user?.role === 'corporate_employee';
  const canProceed     = !isCorpEmployee || user?.canBookHotels !== false;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const hasState = !!(state?.hotel && state?.room && state?.checkIn && state?.checkOut);
  const hotel    = state?.hotel    || {};
  const room     = state?.room     || { pricePerNight: 0 };
  const checkIn  = state?.checkIn  || '';
  const checkOut = state?.checkOut || '';
  const adults   = state?.adults   ?? 2;
  const rooms    = state?.rooms    ?? 1;

  const nights = useMemo(
    () => hasState ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)) : 1,
    [checkIn, checkOut, hasState],
  );
  const breakdown = useMemo(
    () => calcBreakdown(room.pricePerNight, nights, rooms),
    [room.pricePerNight, nights, rooms],
  );

  /* ── Form ─────────────────────────────────────────── */
  const defaults = useMemo(() => {
    const [first, ...rest] = (user?.name || user?.fullName || '').split(' ');
    return {
      primary: {
        title:     'Mr',
        firstName: first || '',
        lastName:  rest.join(' ') || '',
      },
      additional: Array.from({ length: Math.max(0, adults - 1) }, () => ({ firstName: '', lastName: '' })),
      email: user?.email || '',
      phone: user?.phone || '',
      specialRequests: '',
      paymentMethod:   isCorpEmployee ? 'corporate' : 'card',
      acceptTerms:     false,
    };
  }, [user, adults, isCorpEmployee]);

  const {
    register, control, handleSubmit, watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: defaults,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'additional' });

  const acceptTerms = watch('acceptTerms');

  /* ── Submit ───────────────────────────────────────── */
  const onSubmit = async (data) => {
    setSubmitting(true); setSubmitError('');
    try {
      const guestName = `${data.primary.title} ${data.primary.firstName} ${data.primary.lastName}`;
      const res = await paymentsAPI.hotelBooking({
        hotelExternalId: hotel.id,
        hotelName:       hotel.name,
        hotelCity:       hotel.city,
        hotelAddress:    hotel.address,
        roomId:          room.id,
        roomName:        room.name,
        checkIn, checkOut,
        guests:          adults,
        totalAmount:     breakdown.total,
        currency:        'INR',
        guestName,
        guestEmail:      data.email,
        guestPhone:      data.phone,
      });
      const bookingId = res.data?.booking?.id || res.data?.id;

      // Corporate: skip payment — go to approval pending
      if (res.data?.requiresApproval) {
        navigate('/booking/approval-pending', { state: { bookingId, bookingReference: res.data?.booking?.bookingReference, totalAmount: breakdown.total, type: 'hotel', hotel, room, checkIn, checkOut, nights, adults, rooms } });
        return;
      }
      // Corporate admin: directly confirmed — go to success
      if (res.data?.directlyConfirmed) {
        navigate(`/booking/success?bookingId=${bookingId}`, { state: { bookingId, bookingReference: res.data?.booking?.bookingReference, totalAmount: breakdown.total, hotel: { ...hotel, photo: hotel.photo || hotel.photos?.[0] }, room, checkIn, checkOut, nights, adults, rooms } });
        return;
      }

      // Pay-at-hotel: skip Razorpay — go straight to success
      if (data.paymentMethod === 'payAtHotel') {
        navigate(`/booking/success?bookingId=${bookingId}`, {
          state: {
            bookingId, totalAmount: 0, paymentMethod: 'payAtHotel',
            hotel, room, checkIn, checkOut, nights, adults, rooms,
          },
        });
        return;
      }

      navigate('/payment', {
        state: {
          bookingId,
          totalAmount: breakdown.total,
          hotel: { ...hotel, photo: hotel.photo || hotel.photos?.[0] },
          room,
          checkIn, checkOut, nights, adults, rooms,
        },
      });
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to create booking';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Cancellation indicator ───────────────────────── */
  const refundable = room.refundable !== false;
  const freeCancelDate = useMemo(() => {
    if (!hasState) return '';
    const d = new Date(checkIn); d.setDate(d.getDate() - 2);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [checkIn, hasState]);

  const guestCount = 1 + fields.length;

  // Guard: redirect after all hooks have been called
  if (!hasState) return <Navigate to="/hotels" replace />;

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="hco-page">
      <Navbar />
      <div className="hco-container">

        <button className="hco-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16}/> Back to hotel
        </button>

        <div className="hco-grid">
          {/* ── LEFT: form ─────────────────────────────── */}
          <form className="hco-main" onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* 2. Guest details */}
            <section className="hco-card">
              <h2>Guest details</h2>
              <p className="hco-card-subtitle">Primary guest will receive booking confirmation</p>

              <div className="hco-grid-3">
                <div className="hco-field">
                  <label>Title</label>
                  <select {...register('primary.title')}>
                    <option>Mr</option><option>Mrs</option><option>Ms</option><option>Dr</option>
                  </select>
                </div>
                <div className="hco-field hco-field-2">
                  <label>First name *</label>
                  <input type="text" {...register('primary.firstName')} />
                  {errors.primary?.firstName && <small className="hco-err">{errors.primary.firstName.message}</small>}
                </div>
                <div className="hco-field hco-field-2">
                  <label>Last name *</label>
                  <input type="text" {...register('primary.lastName')} />
                  {errors.primary?.lastName && <small className="hco-err">{errors.primary.lastName.message}</small>}
                </div>
              </div>

              {/* Contact */}
              <div className="hco-grid-2">
                <div className="hco-field">
                  <label>Email *</label>
                  <input type="email" {...register('email')} />
                  {errors.email && <small className="hco-err">{errors.email.message}</small>}
                </div>
                <div className="hco-field">
                  <label>Phone *</label>
                  <input type="tel" {...register('phone')} placeholder="+91 9876543210"/>
                  {errors.phone && <small className="hco-err">{errors.phone.message}</small>}
                </div>
              </div>
            </section>

            {/* Additional guests */}
            <section className="hco-card">
              <div className="hco-card-head">
                <div>
                  <h2>Additional guests</h2>
                  <p className="hco-card-subtitle">{guestCount} of {adults} guests</p>
                </div>
                <div className="hco-counter">
                  <button type="button" onClick={() => fields.length && remove(fields.length - 1)}><Minus size={14}/></button>
                  <span>{fields.length}</span>
                  <button type="button" onClick={() => append({ firstName: '', lastName: '' })}><Plus size={14}/></button>
                </div>
              </div>

              {fields.length === 0 && <p className="hco-empty">No additional guests. Add one if travelling together.</p>}

              {fields.map((f, i) => (
                <div key={f.id} className="hco-grid-2">
                  <div className="hco-field">
                    <label>Guest {i + 2} first name</label>
                    <input type="text" {...register(`additional.${i}.firstName`)} />
                    {errors.additional?.[i]?.firstName && <small className="hco-err">{errors.additional[i].firstName.message}</small>}
                  </div>
                  <div className="hco-field">
                    <label>Guest {i + 2} last name</label>
                    <input type="text" {...register(`additional.${i}.lastName`)} />
                    {errors.additional?.[i]?.lastName && <small className="hco-err">{errors.additional[i].lastName.message}</small>}
                  </div>
                </div>
              ))}
            </section>

            {/* 3. Special requests */}
            <section className="hco-card">
              <h2>Special requests <span className="hco-optional">(optional)</span></h2>
              <textarea
                rows={3}
                placeholder="Late check-in, extra bed, dietary requirements…"
                {...register('specialRequests')}
              />
              <small className="hco-hint">Requests are subject to availability and not guaranteed.</small>
            </section>

            {/* 4. Payment method — hidden for corporate employees (approval flow) */}
            {!isCorpEmployee && (
              <section className="hco-card">
                <h2>Payment method</h2>
                <div className="hco-pay-options">
                  <label className="hco-pay-option">
                    <input type="radio" value="card" {...register('paymentMethod')} />
                    <CreditCard size={18}/>
                    <div><strong>Credit/Debit Card</strong><small>Visa, Mastercard, Amex, RuPay</small></div>
                  </label>
                  <label className="hco-pay-option">
                    <input type="radio" value="upi" {...register('paymentMethod')} />
                    <Smartphone size={18}/>
                    <div><strong>UPI</strong><small>GPay, PhonePe, Paytm, BHIM</small></div>
                  </label>
                  <label className="hco-pay-option">
                    <input type="radio" value="netbanking" {...register('paymentMethod')} />
                    <Building2 size={18}/>
                    <div><strong>Net Banking</strong><small>All major banks</small></div>
                  </label>
                  <label className="hco-pay-option">
                    <input type="radio" value="payAtHotel" {...register('paymentMethod')} />
                    <Hotel size={18}/>
                    <div><strong>Pay at Hotel</strong><small>No advance payment required</small></div>
                  </label>
                </div>
              </section>
            )}

            {/* 5. Cancellation policy */}
            <section className="hco-card">
              <h2>Cancellation policy</h2>
              {refundable ? (
                <div className="hco-cancel hco-cancel-free">
                  <ShieldCheck size={18}/>
                  <div>
                    <strong>Free cancellation until {freeCancelDate}</strong>
                    <small>Cancel for free up to 48 hours before check-in. After that, the first night is non-refundable.</small>
                  </div>
                </div>
              ) : (
                <div className="hco-cancel hco-cancel-warn">
                  <AlertTriangle size={18}/>
                  <div>
                    <strong>Non-refundable</strong>
                    <small>This rate is non-refundable. Modifications and cancellations are not allowed.</small>
                  </div>
                </div>
              )}
            </section>

            {/* 6. Terms & 7. Confirm */}
            <section className="hco-card">
              <label className="hco-tc">
                <input type="checkbox" {...register('acceptTerms')} />
                <span>
                  I agree to the <a href="#terms">Terms of Service</a>, <a href="#privacy">Privacy Policy</a>, and the <a href="#cancel">cancellation policy</a> above.
                </span>
              </label>
              {errors.acceptTerms && <small className="hco-err">{errors.acceptTerms.message}</small>}

              {submitError && <div className="hco-submit-err">{submitError}</div>}

              {isCorpEmployee && !canProceed && (
                <div className="hco-submit-err">Your account does not have permission to book hotels. Contact your corporate admin.</div>
              )}

              <button
                type="submit"
                className="hco-confirm-btn"
                disabled={!isValid || !acceptTerms || submitting || !canProceed}
              >
                <Lock size={15}/>
                {submitting
                  ? 'Submitting…'
                  : isCorpEmployee
                    ? `Submit for Approval · ₹${fmt(breakdown.total)}`
                    : `Confirm booking · ₹${fmt(breakdown.total)}`}
              </button>
            </section>
          </form>

          {/* ── RIGHT: sticky summary ─────────────────── */}
          <aside className="hco-summary">
            <div className="hco-summary-card">
              {(hotel.photo || hotel.photos?.[0]) && (
                <img src={hotel.photo || hotel.photos[0]} alt={hotel.name} className="hco-summary-photo"/>
              )}
              <div className="hco-summary-head">
                <h3>{hotel.name}</h3>
                <div className="hco-summary-stars">
                  {Array.from({ length: hotel.starRating || 0 }).map((_, i) => (
                    <Star key={i} size={11} fill="#ffb400" stroke="#ffb400" />
                  ))}
                </div>
                {hotel.address && (
                  <div className="hco-summary-addr"><MapPin size={11}/> {hotel.address}</div>
                )}
                <div className="hco-summary-room">{room.name}{room.bedConfig ? ` · ${room.bedConfig}` : ''}</div>
              </div>

              <div className="hco-summary-section">
                <div className="hco-summary-row"><Calendar size={13}/> Check-in <strong>{checkIn}</strong></div>
                <div className="hco-summary-row"><Calendar size={13}/> Check-out <strong>{checkOut}</strong></div>
                <div className="hco-summary-row"><Users size={13}/> {nights} night{nights > 1 ? 's' : ''} · {adults} guest{adults > 1 ? 's' : ''} · {rooms} room{rooms > 1 ? 's' : ''}</div>
              </div>

              <div className="hco-summary-section">
                <div className="hco-price-line"><span>₹{fmt(room.pricePerNight)} × {nights} night{nights>1?'s':''} × {rooms}</span><span>₹{fmt(breakdown.subtotal)}</span></div>
                <div className="hco-price-line"><span>Taxes & fees ({Math.round(TAX_RATE*100)}%)</span><span>₹{fmt(breakdown.taxes)}</span></div>
                <div className="hco-price-line"><span>Convenience fee</span><span>₹{fmt(breakdown.convFee)}</span></div>
              </div>

              <div className="hco-total">
                <span>Total payable</span>
                <strong>₹{fmt(breakdown.total)}</strong>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
