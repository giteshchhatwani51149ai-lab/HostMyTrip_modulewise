import { Request, Response } from 'express';
import sequelize from '../config/database';
import { Booking, Room, Hotel, Review, User, Corporate, CorporateBookingApproval, FlightBooking, HotelBooking } from '../models';
import { createOrder, capturePayment } from '../utils/paypal';
import { createAmadeusBooking } from '../services/amadeusService';
import { emailService } from '../lib/email';
import { issueRefund } from '../services/refundService';
import { logAudit, AUDIT } from '../services/auditService';

function safeParseJson(val: any, fallback: any = []) {
  try { return typeof val === 'string' ? JSON.parse(val) : (val ?? fallback); } catch { return fallback; }
}

/**
 * Build user-facing display fields for a booking, regardless of source:
 *   1. DB-linked hotel (hotel relation joined)              → hotel.name / room.type
 *   2. External/legacy field (externalHotelName)             → fallback
 *   3. Affiliate hotel snapshot stored in `passengers` JSON  → hotelName / roomName
 *   4. Flight booking (airline + origin/destination set)     → "Flight: <airline>"
 *   5. Otherwise                                              → "Unknown"
 */
function deriveDisplayFields(bj: any): {
  displayHotelName: string;
  displayRoomType: string;
  displayCity: string;
  isLiveBooking: boolean;
  bookingType: 'hotel' | 'flight' | 'package';
} {
  // Linked DB hotel takes priority
  if (bj.hotel?.name) {
    return {
      displayHotelName: bj.hotel.name,
      displayRoomType:  bj.room?.type || 'Room',
      displayCity:      bj.hotel.city || '',
      isLiveBooking:    false,
      bookingType:      'hotel',
    };
  }

  // Legacy external fields (kept for back-compat)
  if (bj.externalHotelName) {
    return {
      displayHotelName: bj.externalHotelName,
      displayRoomType:  bj.externalRoomType || 'Room',
      displayCity:      bj.externalCity     || '',
      isLiveBooking:    true,
      bookingType:      'hotel',
    };
  }

  // Try parsing the passengers JSON snapshot (used by both flight + affiliate-hotel flows)
  let snapshot: any = null;
  if (bj.passengers) {
    try { snapshot = typeof bj.passengers === 'string' ? JSON.parse(bj.passengers) : bj.passengers; }
    catch { /* ignore */ }
  }

  // Affiliate hotel snapshot — payment route stored hotel info in passengers + destination/origin/airline
  const isHotelSnapshot = snapshot && !Array.isArray(snapshot) && (snapshot.hotelName || snapshot.hotelExternalId);
  if (isHotelSnapshot) {
    return {
      displayHotelName: snapshot.hotelName || bj.destination || 'Hotel',
      displayRoomType:  snapshot.roomName  || bj.airline     || 'Room',
      displayCity:      snapshot.hotelCity || bj.origin      || '',
      isLiveBooking:    true,
      bookingType:      'hotel',
    };
  }

  // Flight booking
  if (bj.airline || (snapshot && Array.isArray(snapshot)) || bj.departureDate) {
    const route = [bj.origin, bj.destination].filter(Boolean).join(' → ');
    return {
      displayHotelName: bj.airline ? `${bj.airline}${route ? ` · ${route}` : ''}` : (route || 'Flight'),
      displayRoomType:  route ? 'Flight' : 'Flight booking',
      displayCity:      bj.destination || '',
      isLiveBooking:    true,
      bookingType:      'flight',
    };
  }

  // Last-resort fallback: surface whatever non-null data we have
  return {
    displayHotelName: bj.destination || 'Unknown Hotel',
    displayRoomType:  bj.airline     || 'Room',
    displayCity:      bj.origin      || '',
    isLiveBooking:    false,
    bookingType:      'package',
  };
}

const bookingDebugEnabled = process.env.BOOKING_DEBUG === 'true';

function bookingDebugLog(message: string, meta?: Record<string, any>) {
  if (!bookingDebugEnabled) return;
  console.log(`[BOOKING_DEBUG] ${message}`, meta || {});
}

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const corporateId = (req as any).user?.corporateId || null;
    const canBookHotels = (req as any).user?.canBookHotels ?? true;
    const {
      roomId, hotelId, checkIn, checkOut, guests, paymentType,
      guestName, guestEmail, guestPhone,
      // Live hotel fields (no DB room)
      isLive, liveHotelName, liveRoomType, livePricePerNight, liveCity,
    } = req.body;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) { res.status(400).json({ message: 'Invalid check-in/check-out dates' }); return; }

    let totalAmount: number;
    let bookingRoomId: number;
    let bookingHotelId: number;

    if (isLive) {
      if (!livePricePerNight || !liveHotelName) {
        res.status(400).json({ message: 'Missing live hotel pricing info' }); return;
      }
      totalAmount = Number(livePricePerNight) * nights;
      bookingRoomId = null as any;
      bookingHotelId = null as any;
    } else {
      const room = await Room.findByPk(Number(roomId));
      if (!room) { res.status(404).json({ message: 'Room not found' }); return; }
      totalAmount = room.pricePerNight * nights;
      bookingRoomId = Number(roomId);
      bookingHotelId = Number(hotelId);
    }

    const isCorporateUser = !!corporateId && ['corporate_admin', 'corporate_employee'].includes(userRole);
    const chargeAmount = isCorporateUser ? totalAmount : (paymentType === 'partial' ? Math.round(totalAmount * 0.3) : totalAmount);

    let paypalOrderId: string | null = null;
    if (!isCorporateUser) {
      // Create PayPal order – amount is in USD (PayPal sandbox standard)
      // Convert from INR to USD (approximate rate) for sandbox.
      const amountInUSD = (chargeAmount / 85).toFixed(2); // ~1 USD = 85 INR
      try {
        const order = await createOrder(Number(amountInUSD));
        paypalOrderId = order.id;
      } catch (paypalError: any) {
        console.error('PayPal order creation failed:', paypalError?.response?.data || paypalError.message);
        res.status(500).json({ message: 'Payment gateway error. Could not create PayPal order.' });
        return;
      }
    }

    const booking = await Booking.create({
      userId: userId || null,
      roomId: bookingRoomId,
      hotelId: bookingHotelId,
      checkIn,
      checkOut,
      guests,
      totalAmount,
      paidAmount: chargeAmount,
      paymentType,
      paymentStatus: isCorporateUser && userRole === 'corporate_admin' ? 'paid' : 'pending',
      status: isCorporateUser && userRole === 'corporate_admin' ? 'confirmed' : 'pending',
      stripePaymentIntentId: paypalOrderId, // reusing this column to store PayPal Order ID
      guestName,
      guestEmail,
      guestPhone: guestPhone || null,
      externalHotelName: isLive ? liveHotelName : null,
      externalRoomType: isLive ? liveRoomType : null,
      externalCity: isLive ? liveCity : null,
      amadeusOfferId: req.body.amadeusOfferId || null,
      bookingSource: corporateId ? 'corporate' : 'direct',
      corporateId,
      bookedByUserId: corporateId ? userId : null,
      approvalStatus: corporateId && userRole === 'corporate_employee' ? 'pending' : 'not_required',
    });

    if (corporateId) {
      if (!canBookHotels) {
        res.status(403).json({ message: 'Your account cannot book hotels.' });
        return;
      }

      if (userRole === 'corporate_employee') {
        await CorporateBookingApproval.create({
          bookingId: (booking as any).id,
          requesterUserId: userId,
          status: 'pending',
        });
        res.status(201).json({
          message: 'Booking request submitted for corporate admin approval.',
          booking,
          requiresApproval: true,
        });
        return;
      }

      if (userRole === 'corporate_admin') {
        const corporate = await Corporate.findByPk(corporateId);
        if (!corporate) {
          res.status(404).json({ message: 'Corporate account not found' });
          return;
        }
        const remaining = Number(corporate.creditLimit) - Number(corporate.creditUsed);
        if (remaining < totalAmount) {
          res.status(400).json({ message: 'Insufficient corporate credit balance.' });
          return;
        }
        corporate.creditUsed = Number(corporate.creditUsed) + Number(totalAmount);
        await corporate.save();

        booking.status = 'confirmed';
        booking.paymentStatus = 'paid';
        booking.approvalStatus = 'approved';
        booking.approvedByUserId = userId;
        booking.approvedAt = new Date() as any;
        booking.creditDebited = totalAmount as any;
        await booking.save();

        // Send booking confirmation email for corporate bookings
        emailService.sendBookingConfirmation({
          id: booking.id,
          bookingReference: (booking as any).bookingReference || undefined,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          totalAmount: Number(booking.totalAmount),
          paidAmount: Number(booking.totalAmount),
          status: 'confirmed',
          checkIn: (booking as any).checkIn,
          checkOut: (booking as any).checkOut,
          guests: booking.guests,
          origin: (booking as any).origin || undefined,
          destination: (booking as any).destination || undefined,
          airline: (booking as any).airline || undefined,
          displayHotelName: (booking as any).externalHotelName || undefined,
        }).catch(e => console.warn('[email] corporate booking confirmation failed:', e?.message));

        res.status(201).json({
          message: 'Corporate booking confirmed and credit debited.',
          booking,
          remainingCredit: Number(corporate.creditLimit) - Number(corporate.creditUsed),
        });
        return;
      }
    }

    res.status(201).json({
      message: 'Booking initialized. Complete payment via PayPal.',
      booking,
      paypalOrderId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const corporateId = (req as any).user?.corporateId || null;

    bookingDebugLog('Fetching user bookings', {
      userId,
      userRole,
      hasTokenUser: !!(req as any).user,
    });

    const where: any = { userId };

    /* Lean summary mode — skips heavy joins (Review/Corporate/Users) and
       Hotel images blob. Used by the customer Dashboard for fast loads. */
    const summary = String(req.query.summary || '') === '1';

    const include: any[] = summary
      ? [
          { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'city', 'rating'] },
          { model: FlightBooking, as: 'flightDetail' },
        ]
      : [
          { model: Room, as: 'room' },
          { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'city', 'images', 'rating'] },
          { model: Review, as: 'review' },
          { model: Corporate, as: 'corporate', attributes: ['id', 'name', 'creditLimit', 'creditUsed'] },
          { model: User, as: 'bookedByUser', attributes: ['id', 'email', 'role'] },
          { model: User, as: 'approvedByUser', attributes: ['id', 'email', 'role'] },
          { model: FlightBooking, as: 'flightDetail' },
          { model: HotelBooking, as: 'hotelDetail' },
        ];

    const bookings = await Booking.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit: summary ? 50 : undefined,
    });

    const enriched = (bookings as any[]).map((b) => {
      const bj = b.toJSON();
      if (bj.hotel) bj.hotel.images = safeParseJson(bj.hotel.images);
      if (bj.room) bj.room.images = safeParseJson(bj.room.images);
      Object.assign(bj, deriveDisplayFields(bj));
      return bj;
    });

    bookingDebugLog('User bookings fetched', {
      userId,
      count: enriched.length,
      bookingIds: enriched.map((b: any) => b.id),
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const userRole = (req as any).user?.role;
    const reason: string | undefined = req.body?.reason;

    const booking = await Booking.findByPk(Number(id));
    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }

    const corpId = (req as any).user?.corporateId || null;
    let canCancel = booking.userId === userId || userRole === 'admin' || userRole === 'employee';
    if (!canCancel && userRole === 'corporate_admin' && corpId) {
      // Allow if booking is directly under this corporate
      if ((booking as any).corporateId === corpId) canCancel = true;
      // Allow if the booking's owner is a member of this corporate
      if (!canCancel && (booking as any).userId) {
        const owner = await User.findByPk((booking as any).userId, { attributes: ['corporateId'] });
        if (owner && (owner as any).corporateId === corpId) canCancel = true;
      }
    }
    if (!canCancel) { res.status(403).json({ message: 'Unauthorized' }); return; }
    if (booking.status === 'cancelled') { res.status(400).json({ message: 'Already cancelled' }); return; }

    /* ── Refund calculation rules ── */
    const paidAmount = Number(booking.paidAmount || 0);

    let hoursUntilDeparture: number | null = null;
    try {
      const raw = (booking as any).checkIn;
      if (raw) {
        const departureDate = new Date(raw);
        if (!isNaN(departureDate.getTime())) {
          hoursUntilDeparture = (departureDate.getTime() - Date.now()) / (1000 * 60 * 60);
        }
      }
    } catch { hoursUntilDeparture = null; }

    let cancellationFee = 0;
    let refundTimeline = '7-10 business days';
    let refundPolicyDesc = '';

    if (hoursUntilDeparture === null || hoursUntilDeparture > 24) {
      cancellationFee = 0;
      refundPolicyDesc = 'Free cancellation (> 24 hours before departure)';
    } else if (hoursUntilDeparture >= 0) {
      cancellationFee = Math.round(paidAmount * 0.5);
      refundPolicyDesc = 'Partial refund (50% cancellation fee applies)';
    } else {
      res.status(400).json({
        message: 'Cancellation window closed',
        detail: 'Bookings cannot be cancelled after the departure/check-in date.',
      });
      return;
    }

    const refundAmount = Math.max(0, paidAmount - cancellationFee);

    // ── Mark booking cancelled (refund tracking handled below) ──
    // NOTE: refundService.issueRefund() mutates booking object in-place with refund fields.
    // We then write back via targeted Booking.update() to avoid Sequelize re-serializing
    // unrelated date fields (checkIn/checkOut/departureDate) which causes MSSQL conversion errors.
    booking.status = 'cancelled';
    booking.cancelReason = reason || null;
    booking.cancelledAt = new Date();
    booking.cancellationFee = cancellationFee;

    // ── Issue refund via gateway (if amount > 0) ──
    let refundResult: { ok: boolean; status: string; refundId?: string; gateway: string; error?: string } | null = null;
    if (refundAmount > 0) {
      const result = await issueRefund(booking, refundAmount);
      refundResult = result;
    } else {
      // No money to refund (free cancellation with paidAmount=0)
      booking.refundStatus = 'completed';
      booking.refundAmount = 0;
      booking.refundCompletedAt = new Date();
    }

    // Persist via raw SQL to avoid Sequelize/MSSQL type-binding mismatches that
    // were causing "Conversion failed when converting date and/or time from character string."
    const toSqlDate = (d: any): string | null => {
      if (!d) return null;
      const dt = d instanceof Date ? d : new Date(d);
      if (isNaN(dt.getTime())) return null;
      // MSSQL DATETIMEOFFSET-friendly literal: 'YYYY-MM-DD HH:mm:ss.SSS +00:00'
      const iso = dt.toISOString(); // 2026-04-28T17:54:41.211Z
      return iso.replace('T', ' ').replace('Z', ' +00:00');
    };
    await sequelize.query(
      `UPDATE bookings SET
         status              = :status,
         cancelReason        = :cancelReason,
         cancelledAt         = :cancelledAt,
         cancellationFee     = :cancellationFee,
         refundStatus        = :refundStatus,
         refundAmount        = :refundAmount,
         refundId            = :refundId,
         refundInitiatedAt   = :refundInitiatedAt,
         refundCompletedAt   = :refundCompletedAt,
         refundFailureReason = :refundFailureReason,
         paymentGateway      = :paymentGateway,
         paymentTxnId        = :paymentTxnId
       WHERE id = :id`,
      {
        replacements: {
          id:                  Number(id),
          status:              'cancelled',
          cancelReason:        booking.cancelReason ?? null,
          cancelledAt:         toSqlDate(booking.cancelledAt),
          cancellationFee:     booking.cancellationFee ?? null,
          refundStatus:        booking.refundStatus ?? 'none',
          refundAmount:        booking.refundAmount ?? null,
          refundId:            booking.refundId ?? null,
          refundInitiatedAt:   toSqlDate(booking.refundInitiatedAt),
          refundCompletedAt:   toSqlDate(booking.refundCompletedAt),
          refundFailureReason: booking.refundFailureReason ?? null,
          paymentGateway:      booking.paymentGateway ?? null,
          paymentTxnId:        booking.paymentTxnId ?? null,
        },
      }
    );

    // ── Restore corporate credit if this was an approved/confirmed corporate booking ──
    const bookingCorpId = (booking as any).corporateId;
    const wasApproved = (booking as any).approvalStatus === 'approved' || (booking as any).approvalStatus === 'not_required';
    if (bookingCorpId && wasApproved) {
      try {
        const corporate = await Corporate.findByPk(bookingCorpId);
        if (corporate) {
          const restoreAmount = Number(booking.totalAmount || 0);
          corporate.creditUsed = Math.max(0, Number(corporate.creditUsed) - restoreAmount);
          await corporate.save();
        }
      } catch (e) { console.warn('[cancelBooking] failed to restore credit:', e); }
    }

    // ── Email: cancellation + refund initiated ──
    emailService.sendCancellationConfirmation({
      id: booking.id,
      bookingReference: (booking as any).bookingReference || undefined,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      totalAmount: Number(booking.totalAmount),
      paidAmount: Number(booking.paidAmount),
      status: 'cancelled',
      checkIn: (booking as any).checkIn,
      checkOut: (booking as any).checkOut,
      displayHotelName: (booking as any).externalHotelName || undefined,
      refundAmount,
      cancellationFee,
      refundTimeline,
      cancelReason: reason,
    }).catch(e => console.warn('[email] cancellation email failed:', e?.message));

    res.status(200).json({
      message: 'Booking cancelled successfully',
      booking,
      refundAmount,
      cancellationFee,
      refundTimeline,
      refundPolicyDesc,
      originalAmount: paidAmount,
      refundStatus: booking.refundStatus,
      refundId: booking.refundId,
      gateway: refundResult?.gateway,
      refundError: refundResult?.error,
    });
  } catch (error: any) {
    console.error('[cancelBooking] ERROR:', error?.message || error);
    res.status(500).json({ message: 'Internal Server Error', detail: error?.message });
  }
};

/**
 * Called by frontend after PayPal approves the payment.
 * Captures the payment server-side for security, then confirms the booking.
 */
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paypalOrderId } = req.body;

    const booking = await Booking.findByPk(Number(id));
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Capture payment on PayPal's servers to actually move the funds
    let paypalCaptureId: string | null = null;
    if (paypalOrderId) {
      try {
        const captureData = await capturePayment(paypalOrderId);
        const captureStatus = captureData?.status;
        if (captureStatus !== 'COMPLETED') {
          res.status(402).json({ message: `Payment capture not completed. Status: ${captureStatus}` });
          return;
        }
        // Extract the capture id (needed for any future refund)
        paypalCaptureId = captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;
      } catch (captureErr: any) {
        console.error('PayPal capture failed:', captureErr?.response?.data || captureErr.message);
        res.status(500).json({ message: 'Failed to capture PayPal payment. Please contact support.' });
        return;
      }
    }

    // Update booking status after successful PayPal capture
    booking.status = 'confirmed';
    booking.paymentStatus = booking.paymentType === 'full' ? 'paid' : 'partial';
    booking.paymentGateway = 'paypal';
    if (paypalCaptureId) booking.paymentTxnId = paypalCaptureId;

    // --- Amadeus Hotel Booking ---
    // If this booking came from an Amadeus offer, now create the real reservation
    if (booking.amadeusOfferId && process.env.AMADEUS_CLIENT_ID) {
      try {
        const nameParts = booking.guestName.trim().split(' ');
        const amadeusRes = await createAmadeusBooking({
          offerId:    booking.amadeusOfferId,
          guests: [{
            firstName: nameParts[0],
            lastName:  nameParts.slice(1).join(' ') || 'GUEST',
            email:     booking.guestEmail,
            phone:     booking.guestPhone || undefined,
          }],
          paymentRef: paypalOrderId || booking.stripePaymentIntentId || 'PAYPAL',
        });

        // Extract the Amadeus booking reference (PNR)
        const pnr = amadeusRes?.data?.id ||
                    amadeusRes?.data?.associatedRecords?.[0]?.reference ||
                    amadeusRes?.id ||
                    null;
        if (pnr) {
          booking.amadeusBookingRef = pnr;
          console.log(`✅ Amadeus booking created. PNR: ${pnr}`);
        }
      } catch (amadeusErr: any) {
        // Don't fail the booking if Amadeus call fails — payment is already captured
        console.error('⚠️ Amadeus booking attempt failed (payment already captured):', amadeusErr?.description || amadeusErr?.message);
        booking.amadeusBookingRef = 'MANUAL_CONFIRMATION_REQUIRED';
      }
    }

    await booking.save();

    emailService.sendBookingConfirmation({
      id: booking.id,
      bookingReference: (booking as any).bookingReference || undefined,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      totalAmount: Number(booking.totalAmount),
      paidAmount: Number(booking.paidAmount),
      status: 'confirmed',
      checkIn: (booking as any).checkIn,
      checkOut: (booking as any).checkOut,
      guests: booking.guests,
      origin: (booking as any).origin || undefined,
      destination: (booking as any).destination || undefined,
      airline: (booking as any).airline || undefined,
    }).catch(e => console.warn('[email] confirmation email failed:', e?.message));

    res.status(200).json({ message: 'Payment captured and booking confirmed!', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const failPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByPk(Number(id));
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    booking.status = 'failed';
    booking.paymentStatus = 'failed';
    await booking.save();

    res.status(200).json({ message: 'Payment marked as failed', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getAllBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;
    bookingDebugLog('Fetching all bookings', { userId, userRole });
    if (userRole !== 'admin' && userRole !== 'employee') { res.status(403).json({ message: 'Forbidden' }); return; }

    const bookings = await Booking.findAll({
      include: [
        { model: Room, as: 'room', attributes: ['id', 'type', 'pricePerNight', 'maxOccupancy'] },
        { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'city', 'images', 'rating'] },
        { model: Corporate, as: 'corporate', attributes: ['id', 'name', 'creditLimit', 'creditUsed'] },
        { model: User, as: 'bookedByUser', attributes: ['id', 'email', 'role'] },
        { model: User, as: 'approvedByUser', attributes: ['id', 'email', 'role'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 500, // safety cap; admin UI uses paginated /admin/bookings instead
    });

    const enriched = (bookings as any[]).map((b) => {
      const bj = b.toJSON();
      if (bj.hotel?.images) bj.hotel.images = safeParseJson(bj.hotel.images);
      if (bj.room?.images) bj.room.images = safeParseJson(bj.room.images);
      Object.assign(bj, deriveDisplayFields(bj));
      return bj;
    });

    bookingDebugLog('All bookings fetched', {
      userId,
      userRole,
      count: enriched.length,
      bookingIds: enriched.map((b: any) => b.id),
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const adminCreateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin' && userRole !== 'employee') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const {
      type, // 'flight' | 'hotel'
      // Flight fields
      flightId, airline, flightNumber, origin, destination,
      departureTime, arrivalTime,
      // Hotel fields
      roomId, hotelId, checkIn, checkOut,
      // Common fields
      adults, children, infants, price, guestName, guestEmail, guestPhone
    } = req.body;

    console.log('[adminCreateBooking] Request:', { type, flightId, airline, origin, destination, price, guestName });

    // Handle Flight Booking - mirrors /api/payments/flight-booking pattern
    if (type === 'flight') {
      if (!flightId || !airline || !origin || !destination || !departureTime || !price) {
        console.log('[adminCreateBooking] Missing fields:', { flightId, airline, origin, destination, departureTime, price });
        res.status(400).json({ message: 'Missing required flight booking fields' });
        return;
      }

      const totalAmount = Number(price) * (Number(adults) || 1) + Number(price) * 0.5 * (Number(children) || 0);
      
      // Extract YYYY-MM-DD only (DATEONLY column) - exactly like customer endpoint
      const depDate = String(departureTime).split('T')[0];
      console.log('[adminCreateBooking] depDate:', depDate, 'totalAmount:', totalAmount);

      const ref = `HMT${Date.now().toString(36).toUpperCase()}`;

      try {
        // Admin booking: confirmed but payment pending until admin collects cash
        const booking = await Booking.create({
          userId:           null,
          roomId:           null as any,
          hotelId:          null as any,
          checkIn:          depDate,
          checkOut:         depDate,
          guests:           (Number(adults) || 1) + (Number(children) || 0),
          totalAmount:      Number(totalAmount),
          paidAmount:       0,
          paymentType:      'full',
          paymentStatus:    'pending',
          status:           'confirmed',
          guestName,
          guestEmail,
          guestPhone:       guestPhone || null,
          origin,
          destination,
          airline:          airline || null,
          passengers:       JSON.stringify({
            adults: Number(adults) || 1,
            children: Number(children) || 0,
            infants: Number(infants) || 0,
          }),
          currency:         'INR',
          bookingReference: ref,
          bookingSource:    'admin',
          corporateId:      null,
          bookedByUserId:   (req as any).user?.id || null,
          approvalStatus:   'not_required',
          creditDebited:    0,
          paymentGateway:   'cash_pending',
        });

        console.log('[adminCreateBooking] Booking created:', (booking as any).id);

        res.status(201).json({
          message: 'Flight booking confirmed',
          booking: {
            id: (booking as any).id,
            bookingReference: ref,
            guestName,
            totalAmount,
            status: 'confirmed',
            origin,
            destination,
            airline,
          }
        });
        return;
      } catch (err: any) {
        const detail = err?.errors?.map((e: any) => `${e.path}: ${e.message}`).join(', ') || err?.message || String(err);
        console.error('[adminCreateBooking] Booking creation error:', detail);
        res.status(500).json({ message: 'Booking failed', detail });
        return;
      }
    }

    // Handle Hotel Booking - mirrors /api/payments/hotel-booking pattern
    if (type === 'hotel') {
      const {
        hotelExternalId, hotelName, hotelCity, hotelAddress,
        roomId: roomExtId, roomName,
        checkIn, checkOut, guests = 1, totalAmount, currency = 'INR'
      } = req.body;

      if (!hotelExternalId || !hotelName || !checkIn || !checkOut || !totalAmount || !guestName || !guestEmail) {
        res.status(400).json({ message: 'Missing required hotel booking fields' });
        return;
      }

      const ci = String(checkIn).split('T')[0];
      const co = String(checkOut).split('T')[0];
      if (new Date(co) <= new Date(ci)) {
        res.status(400).json({ message: 'checkOut must be after checkIn' });
        return;
      }

      const ref = `HMT${Date.now().toString(36).toUpperCase()}`;
      console.log('[adminCreateBooking] Hotel booking:', { hotelName, ci, co, totalAmount });

      try {
        // Admin booking: confirmed but payment pending until admin collects cash
        const booking = await Booking.create({
          userId:           null,
          roomId:           null as any,
          hotelId:          null as any,
          checkIn:          ci,
          checkOut:         co,
          guests:           Number(guests) || 1,
          totalAmount:      Number(totalAmount),
          paidAmount:       0,
          paymentType:      'full',
          paymentStatus:    'pending',
          status:           'confirmed',
          guestName,
          guestEmail,
          guestPhone:       guestPhone || null,
          origin:           hotelCity || null,
          destination:      hotelName,
          airline:          roomName || null,
          passengers:       JSON.stringify({ hotelExternalId, hotelName, hotelCity, hotelAddress, roomId: roomExtId, roomName }),
          currency,
          bookingReference: ref,
          bookingSource:    'admin',
          corporateId:      null,
          bookedByUserId:   (req as any).user?.id || null,
          approvalStatus:   'not_required',
          creditDebited:    0,
          paymentGateway:   'cash_pending',
        });

        console.log('[adminCreateBooking] Hotel booking created:', (booking as any).id);

        res.status(201).json({
          message: 'Hotel booking confirmed',
          booking: {
            id: (booking as any).id,
            bookingReference: ref,
            guestName,
            totalAmount,
            status: 'confirmed',
            hotelName,
            hotelCity,
          }
        });
        return;
      } catch (err: any) {
        const detail = err?.errors?.map((e: any) => `${e.path}: ${e.message}`).join(', ') || err?.message || String(err);
        console.error('[adminCreateBooking] Hotel booking error:', detail);
        res.status(500).json({ message: 'Booking failed', detail });
        return;
      }
    }

    // Fallback to legacy behaviour for unrecognised types
    req.body.userId = null;
    return createBooking(req, res);

  } catch (error: any) {
    console.error('[adminCreateBooking] Top level error:', error?.message || error);
    res.status(500).json({ message: 'Internal Server Error: ' + (error?.message || 'Unknown') });
  }
};

export const getMemberBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const adminUser = await User.findByPk(actor.id);
    if (!adminUser || adminUser.role !== 'corporate_admin' || !adminUser.corporateId) {
      res.status(403).json({ message: 'Corporate admin access required' }); return;
    }
    const { memberId } = req.params;
    const member = await User.findByPk(Number(memberId));
    if (!member || member.corporateId !== adminUser.corporateId) {
      res.status(404).json({ message: 'Member not found in your corporate' }); return;
    }
    const { Op } = require('sequelize');
    const bookings = await Booking.findAll({
      where: {
        [Op.or]: [
          { userId: member.id },
          { corporateId: adminUser.corporateId, userId: member.id },
        ],
      },
      include: [
        { model: Room,  as: 'room' },
        { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'city', 'images'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    const enriched = (bookings as any[]).map((b) => {
      const bj = b.toJSON();
      if (bj.hotel?.images) bj.hotel.images = safeParseJson(bj.hotel.images);
      Object.assign(bj, deriveDisplayFields(bj));
      return bj;
    });
    const m = member as any;
    res.status(200).json({ member: { id: m.id, email: m.email, name: m.name, role: m.role, canBookFlights: m.canBookFlights, canBookHotels: m.canBookHotels, createdAt: m.createdAt }, bookings: enriched });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const adminUser = await User.findByPk(actor.id);
    if (!adminUser || adminUser.role !== 'corporate_admin' || !adminUser.corporateId) {
      res.status(403).json({ message: 'Corporate admin access required' }); return;
    }
    const { memberId } = req.params;
    const member = await User.findByPk(Number(memberId));
    if (!member || member.corporateId !== adminUser.corporateId) {
      res.status(404).json({ message: 'Member not found in your corporate' }); return;
    }
    if (member.id === adminUser.id) {
      res.status(400).json({ message: 'You cannot delete your own account' }); return;
    }
    await member.destroy();
    res.status(200).json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getCorporatePendingApprovals = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const user = await User.findByPk(actor.id);
    if (!user?.corporateId) {
      res.status(403).json({ message: 'Corporate access required' });
      return;
    }
    const pending = await Booking.findAll({
      where: {
        corporateId: user.corporateId,
        approvalStatus: 'pending',
      },
      include: [
        { model: Room, as: 'room' },
        { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'city', 'images', 'rating'] },
        { model: CorporateBookingApproval, as: 'corporateApproval' },
        { model: User, as: 'bookedByUser', attributes: ['id', 'email', 'role'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(pending);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const approveCorporateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const { id } = req.params;
    const user = await User.findByPk(actor.id);
    if (!user || user.role !== 'corporate_admin' || !user.corporateId) {
      res.status(403).json({ message: 'Corporate admin access required' });
      return;
    }
    const booking = await Booking.findByPk(Number(id));
    if (!booking || booking.corporateId !== user.corporateId) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    if (booking.approvalStatus !== 'pending') {
      res.status(400).json({ message: 'Booking is not pending approval' });
      return;
    }
    const corporate = await Corporate.findByPk(user.corporateId);
    if (!corporate) {
      res.status(404).json({ message: 'Corporate account not found' });
      return;
    }
    const remaining = Number(corporate.creditLimit) - Number(corporate.creditUsed);
    if (remaining < Number(booking.totalAmount)) {
      res.status(400).json({ message: 'Insufficient corporate credit balance.' });
      return;
    }
    corporate.creditUsed = Number(corporate.creditUsed) + Number(booking.totalAmount);
    await corporate.save();

    booking.approvalStatus = 'approved';
    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.approvedByUserId = user.id;
    booking.approvedAt = new Date() as any;
    booking.creditDebited = Number(booking.totalAmount) as any;
    await booking.save();

    const approval = await CorporateBookingApproval.findOne({ where: { bookingId: booking.id } });
    if (approval) {
      approval.status = 'approved';
      approval.approverUserId = user.id;
      approval.note = req.body?.note || null;
      await approval.save();
    }

    // Send booking confirmation email when corporate booking is approved
    emailService.sendBookingConfirmation({
      id: booking.id,
      bookingReference: (booking as any).bookingReference || undefined,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      totalAmount: Number(booking.totalAmount),
      paidAmount: Number(booking.totalAmount),
      status: 'confirmed',
      checkIn: (booking as any).checkIn,
      checkOut: (booking as any).checkOut,
      guests: booking.guests,
      origin: (booking as any).origin || undefined,
      destination: (booking as any).destination || undefined,
      airline: (booking as any).airline || undefined,
      displayHotelName: (booking as any).externalHotelName || undefined,
    }).catch(e => console.warn('[email] corporate approval confirmation failed:', e?.message));

    res.status(200).json({
      message: 'Booking approved and corporate credit debited.',
      booking,
      remainingCredit: Number(corporate.creditLimit) - Number(corporate.creditUsed),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const rejectCorporateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const { id } = req.params;
    const user = await User.findByPk(actor.id);
    if (!user || user.role !== 'corporate_admin' || !user.corporateId) {
      res.status(403).json({ message: 'Corporate admin access required' });
      return;
    }
    const booking = await Booking.findByPk(Number(id));
    if (!booking || booking.corporateId !== user.corporateId) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    if (booking.approvalStatus !== 'pending') {
      res.status(400).json({ message: 'Booking is not pending approval' });
      return;
    }
    booking.approvalStatus = 'rejected';
    booking.status = 'cancelled';
    booking.paymentStatus = 'failed';
    booking.approvedByUserId = user.id;
    booking.approvedAt = new Date() as any;
    await booking.save();

    const approval = await CorporateBookingApproval.findOne({ where: { bookingId: booking.id } });
    if (approval) {
      approval.status = 'rejected';
      approval.approverUserId = user.id;
      approval.note = req.body?.note || null;
      await approval.save();
    }

    res.status(200).json({ message: 'Booking request rejected.', booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getBookingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const corporateId = (req as any).user?.corporateId || null;
    const userRole = (req as any).user?.role;
    const id = parseInt(String(req.params.id), 10);

    const booking: any = await Booking.findByPk(id, {
      include: [
        { model: Room,          as: 'room' },
        { model: Hotel,         as: 'hotel', attributes: ['id', 'name', 'city', 'rating', 'address', 'images'] },
        { model: Review,        as: 'review' },
        { model: FlightBooking, as: 'flightDetail' },
        { model: HotelBooking,  as: 'hotelDetail' },
        { model: Corporate,     as: 'corporate', attributes: ['id', 'name'] },
      ],
    });

    if (!booking) { res.status(404).json({ message: 'Booking not found' }); return; }

    const bj = booking.toJSON();

    let ownsBooking = bj.userId === userId;

    if (!ownsBooking && corporateId && ['corporate_admin', 'corporate_employee'].includes(userRole)) {
      // Allow access if booking belongs to this corporate directly
      if (bj.corporateId === corporateId) {
        ownsBooking = true;
      }
      // For corporate_admin: also allow if the booking's userId is a member of their corporate
      if (!ownsBooking && userRole === 'corporate_admin' && bj.userId) {
        const bookingOwner = await User.findByPk(bj.userId, { attributes: ['corporateId'] });
        if (bookingOwner && (bookingOwner as any).corporateId === corporateId) {
          ownsBooking = true;
        }
      }
    }

    if (!ownsBooking) { res.status(403).json({ message: 'Access denied' }); return; }

    if (bj.hotel) bj.hotel.images = safeParseJson(bj.hotel.images);
    if (bj.room)  bj.room.images  = safeParseJson(bj.room.images);

    let snapshot: any = null;
    if (bj.passengers) {
      try { snapshot = typeof bj.passengers === 'string' ? JSON.parse(bj.passengers) : bj.passengers; }
      catch { snapshot = bj.passengers; }
    }

    const timeline: { event: string; at: string; meta?: string }[] = [];
    timeline.push({ event: 'Booking created', at: bj.createdAt });
    if (bj.paymentStatus === 'paid' || bj.paymentStatus === 'partial') {
      timeline.push({ event: 'Payment initiated', at: bj.createdAt });
      timeline.push({ event: bj.paymentStatus === 'paid' ? 'Payment successful' : 'Partial payment received', at: bj.updatedAt });
    } else if (bj.paymentStatus === 'failed') {
      timeline.push({ event: 'Payment failed', at: bj.updatedAt });
    }
    if (bj.status === 'confirmed') {
      timeline.push({ event: 'Booking confirmed · Confirmation email sent', at: bj.updatedAt });
    }
    if (bj.status === 'cancelled') {
      timeline.push({ event: 'Booking cancelled', at: bj.cancelledAt || bj.updatedAt, meta: bj.cancelReason || undefined });
    }

    Object.assign(bj, deriveDisplayFields(bj));

    res.status(200).json({ ...bj, snapshot, timeline });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
