import express, { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';

const router = express.Router();

const getRazorpay = () => {
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error('Razorpay keys not configured');
  return new Razorpay({ key_id, key_secret });
};

/* ─── POST /api/payments/flight-booking ───────────────────────── */
router.post('/flight-booking', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const {
      origin, destination, departureDate, airline,
      totalAmount, currency = 'INR',
      guestName, guestEmail, guestPhone,
      passengers,
    } = req.body;

    if (!origin || !destination || !departureDate || !totalAmount || !guestName || !guestEmail) {
      res.status(400).json({ message: 'Missing required fields: origin, destination, departureDate, totalAmount, guestName, guestEmail' });
      return;
    }

    // Detect corporate user type
    const userDb = userId ? await User.findByPk(userId) : null;
    const isCorpEmployee = userDb?.role === 'corporate_employee' && !!userDb?.corporateId;
    const isCorpAdmin    = userDb?.role === 'corporate_admin'    && !!userDb?.corporateId;
    const isCorporate    = isCorpEmployee || isCorpAdmin;

    // Block corporate_employee if flights not permitted
    if (isCorpEmployee && !(userDb as any).canBookFlights) {
      res.status(403).json({ message: 'Your account does not have permission to book flights.' });
      return;
    }

    const ref     = `HMT${Date.now().toString(36).toUpperCase()}`;
    const depDate = departureDate.split('T')[0];

    // Corporate admin: book directly and deduct credit immediately
    if (isCorpAdmin) {
      const corporate = await (await import('../models')).Corporate.findByPk(userDb!.corporateId!);
      if (!corporate) { res.status(404).json({ message: 'Corporate account not found' }); return; }
      const remaining = Number(corporate.creditLimit) - Number(corporate.creditUsed);
      if (remaining < Number(totalAmount)) {
        res.status(400).json({ message: 'Insufficient corporate credit balance.' });
        return;
      }
      corporate.creditUsed = Number(corporate.creditUsed) + Number(totalAmount);
      await corporate.save();
    }

    const booking = await Booking.create({
      userId:           userId || null,
      roomId:           null as any,
      hotelId:          null as any,
      checkIn:          depDate,
      checkOut:         depDate,
      guests:           passengers ? JSON.parse(passengers).length : 1,
      totalAmount:      Number(totalAmount),
      paidAmount:       isCorpAdmin ? Number(totalAmount) : 0,
      paymentType:      'full',
      paymentStatus:    isCorpAdmin ? 'paid' : 'pending',
      status:           isCorpAdmin ? 'confirmed' : 'pending',
      guestName,
      guestEmail,
      guestPhone:       guestPhone || null,
      origin,
      destination,
      airline:          airline || null,
      passengers:       passengers || null,
      currency,
      bookingReference: ref,
      bookingSource:    isCorporate ? 'corporate' : 'direct',
      corporateId:      isCorporate ? userDb!.corporateId : null,
      bookedByUserId:   userId || null,
      approvalStatus:   isCorpEmployee ? 'pending' : 'not_required',
      creditDebited:    isCorpAdmin ? Number(totalAmount) : 0,
    });

    res.status(201).json({
      booking,
      message:          isCorpEmployee ? 'Booking submitted for approval' : 'Flight booking created',
      requiresApproval: isCorpEmployee,
      directlyConfirmed: isCorpAdmin,
    });
  } catch (err: any) {
    const detail = err?.errors?.map((e: any) => `${e.path}: ${e.message}`).join(', ') || err?.message || String(err);
    console.error('[payment/flight-booking] ERROR:', detail);
    res.status(500).json({ message: 'Failed to create flight booking', detail });
  }
});

/* ─── POST /api/payments/hotel-booking ────────────────────────── */
router.post('/hotel-booking', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const {
      hotelExternalId, hotelName, hotelCity, hotelAddress,
      roomId: roomExtId, roomName,
      checkIn, checkOut, guests = 1,
      totalAmount, currency = 'INR',
      guestName, guestEmail, guestPhone,
    } = req.body;

    if (!hotelExternalId || !hotelName || !checkIn || !checkOut || !totalAmount || !guestName || !guestEmail) {
      res.status(400).json({ message: 'Missing required fields: hotelExternalId, hotelName, checkIn, checkOut, totalAmount, guestName, guestEmail' });
      return;
    }

    const ci = String(checkIn).split('T')[0];
    const co = String(checkOut).split('T')[0];
    if (new Date(co) <= new Date(ci)) {
      res.status(400).json({ message: 'checkOut must be after checkIn' });
      return;
    }

    const ref = `HMT${Date.now().toString(36).toUpperCase()}`;

    // Detect corporate user type
    const userDb2       = userId ? await User.findByPk(userId) : null;
    const isCorpEmp2    = userDb2?.role === 'corporate_employee' && !!userDb2?.corporateId;
    const isCorpAdmin2  = userDb2?.role === 'corporate_admin'    && !!userDb2?.corporateId;
    const isCorporate2  = isCorpEmp2 || isCorpAdmin2;

    // Block corporate_employee if hotels not permitted
    if (isCorpEmp2 && !(userDb2 as any).canBookHotels) {
      res.status(403).json({ message: 'Your account does not have permission to book hotels.' });
      return;
    }

    // Corporate admin: deduct credit immediately
    if (isCorpAdmin2) {
      const corporate2 = await (await import('../models')).Corporate.findByPk(userDb2!.corporateId!);
      if (!corporate2) { res.status(404).json({ message: 'Corporate account not found' }); return; }
      const remaining2 = Number(corporate2.creditLimit) - Number(corporate2.creditUsed);
      if (remaining2 < Number(totalAmount)) {
        res.status(400).json({ message: 'Insufficient corporate credit balance.' });
        return;
      }
      corporate2.creditUsed = Number(corporate2.creditUsed) + Number(totalAmount);
      await corporate2.save();
    }

    const booking = await Booking.create({
      userId:           userId || null,
      roomId:           null as any,
      hotelId:          null as any,
      checkIn:          ci,
      checkOut:         co,
      guests:           Number(guests) || 1,
      totalAmount:      Number(totalAmount),
      paidAmount:       isCorpAdmin2 ? Number(totalAmount) : 0,
      paymentType:      'full',
      paymentStatus:    isCorpAdmin2 ? 'paid' : 'pending',
      status:           isCorpAdmin2 ? 'confirmed' : 'pending',
      guestName,
      guestEmail,
      guestPhone:       guestPhone || null,
      origin:           hotelCity || null,
      destination:      hotelName,
      airline:          roomName || null,
      passengers:       JSON.stringify({ hotelExternalId, hotelName, hotelCity, hotelAddress, roomId: roomExtId, roomName }),
      currency,
      bookingReference: ref,
      bookingSource:    isCorporate2 ? 'corporate' : 'direct',
      corporateId:      isCorporate2 ? userDb2!.corporateId : null,
      bookedByUserId:   userId || null,
      approvalStatus:   isCorpEmp2 ? 'pending' : 'not_required',
      creditDebited:    isCorpAdmin2 ? Number(totalAmount) : 0,
    });

    res.status(201).json({
      booking,
      message:           isCorpEmp2 ? 'Booking submitted for approval' : 'Hotel booking created',
      requiresApproval:  isCorpEmp2,
      directlyConfirmed: isCorpAdmin2,
    });
  } catch (err: any) {
    const detail = err?.errors?.map((e: any) => `${e.path}: ${e.message}`).join(', ') || err?.message || String(err);
    console.error('[payment/hotel-booking] ERROR:', detail);
    res.status(500).json({ message: 'Failed to create hotel booking', detail });
  }
});

/* ─── POST /api/payments/create-order ─────────────────────────── */
router.post('/create-order', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookingId, amount } = req.body as { bookingId: number; amount: number };
    if (!bookingId || !amount) {
      res.status(400).json({ message: 'bookingId and amount are required' });
      return;
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Idempotency: if already paid, return error
    if (booking.paymentStatus === 'paid') {
      res.status(409).json({ message: 'Booking already paid' });
      return;
    }

    const razorpay   = getRazorpay();
    const amountPaise = Math.round(amount * 100); // Razorpay uses paise

    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  `booking_${bookingId}`,
      notes:    { bookingId: String(bookingId) },
    });

    // Create pending Payment record
    await Payment.create({
      bookingId,
      amount,
      gateway:          'razorpay',
      gatewayPaymentId: order.id,
      status:           'pending',
    });

    res.json({
      orderId:  order.id,
      amount:   amountPaise,
      currency: 'INR',
      key:      process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    if (msg.includes('not configured')) {
      res.status(503).json({ code: 'NO_RAZORPAY_KEY', message: msg });
    } else {
      console.error('[payment/create-order]', err);
      res.status(500).json({ message: 'Failed to create payment order' });
    }
  }
});

/* ─── POST /api/payments/verify ───────────────────────────────── */
router.post('/verify', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } =
      req.body as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        bookingId: number;
      };

    const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!key_secret) {
      res.status(503).json({ code: 'NO_RAZORPAY_KEY', message: 'Razorpay not configured' });
      return;
    }

    // Verify signature
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', key_secret as string)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      res.status(400).json({ message: 'Payment signature verification failed' });
      return;
    }

    // Update Payment record
    await Payment.update(
      { status: 'success', gatewayPaymentId: razorpay_payment_id },
      { where: { gatewayPaymentId: razorpay_order_id } }
    );

    // Update Booking
    const booking = await Booking.findByPk(bookingId);
    if (booking) {
      const ref = `HMT${Date.now().toString(36).toUpperCase()}`;
      await booking.update({
        paymentStatus:    'paid',
        paidAmount:       booking.totalAmount,
        status:           'confirmed',
        bookingReference: booking.bookingReference || ref,
        paymentGateway:   'razorpay',
        paymentTxnId:     razorpay_payment_id, // needed for future refunds
      });
    }

    res.json({
      success:          true,
      bookingId,
      bookingReference: booking?.bookingReference,
      message:          'Payment verified successfully',
    });
  } catch (err) {
    console.error('[payment/verify]', err);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

/* ─── GET /api/payments/booking/:id ───────────────────────────── */
router.get('/booking/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findByPk(Number(req.params.id));
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
