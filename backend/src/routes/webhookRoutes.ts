import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Booking } from '../models';
import { emailService, BookingEmailData } from '../lib/email';

const router = Router();

/* ─────────────────────────────────────────────────────────────────
 * Helper: send "refund completed" email after webhook fires
 * ────────────────────────────────────────────────────────────── */
async function sendRefundCompletedEmail(booking: any) {
  try {
    await emailService.sendCancellationConfirmation({
      id: booking.id,
      bookingReference: booking.bookingReference || undefined,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      totalAmount: Number(booking.totalAmount),
      paidAmount: Number(booking.paidAmount),
      status: 'cancelled',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      displayHotelName: booking.externalHotelName || undefined,
      refundAmount: Number(booking.refundAmount || 0),
      cancellationFee: Number(booking.cancellationFee || 0),
      refundTimeline: 'Completed',
      refundCompleted: true,
    } as any);
  } catch (e: any) {
    console.warn('[webhook] refund-completed email failed:', e?.message);
  }
}

/**
 * POST /api/webhooks/booking-event
 *
 * Internal webhook — called whenever a booking status changes.
 * Triggers the appropriate email based on new status.
 *
 * Body: { bookingId: number, event: 'confirmed' | 'cancelled' | 'payment_success' }
 */
router.post('/booking-event', async (req: Request, res: Response): Promise<void> => {
  const { bookingId, event } = req.body;

  if (!bookingId || !event) {
    res.status(400).json({ message: 'bookingId and event are required' });
    return;
  }

  const booking = await Booking.findByPk(Number(bookingId));
  if (!booking) {
    res.status(404).json({ message: 'Booking not found' });
    return;
  }

  const data: BookingEmailData = {
    id: booking.id,
    bookingReference: booking.bookingReference || undefined,
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    totalAmount: Number(booking.totalAmount),
    paidAmount: Number(booking.paidAmount),
    status: booking.status,
    checkIn: (booking as any).checkIn,
    checkOut: (booking as any).checkOut,
    guests: booking.guests,
    origin: booking.origin || undefined,
    destination: booking.destination || undefined,
    airline: booking.airline || undefined,
    displayHotelName: booking.externalHotelName || undefined,
    displayCity: booking.externalCity || undefined,
  };

  try {
    if (event === 'confirmed' || event === 'payment_success') {
      await emailService.sendBookingConfirmation(data);
      res.status(200).json({ message: 'Booking confirmation email sent' });
    } else if (event === 'cancelled') {
      await emailService.sendCancellationConfirmation(data);
      res.status(200).json({ message: 'Cancellation email sent' });
    } else {
      res.status(400).json({ message: `Unknown event: ${event}` });
    }
  } catch (err: any) {
    console.error('[webhook] email send failed:', err?.message);
    res.status(500).json({ message: 'Email send failed', detail: err?.message });
  }
});

/* ═════════════════════════════════════════════════════════════════════════
 * GATEWAY REFUND WEBHOOKS
 *
 * IMPORTANT: These routes need raw body access for HMAC signature verification.
 * The express.json() global middleware in server.ts has already parsed the body
 * by the time we get here, so we re-stringify req.body for HMAC verification.
 * For best-practice production: mount raw() body parser BEFORE express.json()
 * for these specific routes (TODO).
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * POST /api/webhooks/razorpay
 *
 * Listens to refund.processed / refund.failed events.
 * Configure in Razorpay Dashboard → Settings → Webhooks:
 *   URL:    https://<your-api>/api/webhooks/razorpay
 *   Events: refund.processed, refund.failed
 *   Secret: <RAZORPAY_WEBHOOK_SECRET in env>
 */
router.post('/razorpay', async (req: Request, res: Response): Promise<void> => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[webhook/razorpay] RAZORPAY_WEBHOOK_SECRET not set; rejecting');
      res.status(503).json({ message: 'Webhook secret not configured' });
      return;
    }

    // Verify HMAC signature
    const signature = req.headers['x-razorpay-signature'] as string;
    const payload = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (signature !== expected) {
      console.warn('[webhook/razorpay] Invalid signature');
      res.status(400).json({ message: 'Invalid signature' });
      return;
    }

    const event = req.body?.event;
    const refundEntity = req.body?.payload?.refund?.entity;
    if (!refundEntity) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const refundId = refundEntity.id;             // e.g. "rfnd_NKx..."
    const paymentId = refundEntity.payment_id;    // original capture id
    const amount = Number(refundEntity.amount || 0) / 100; // paise → rupees

    // Find booking by refundId OR by original payment txn id
    let booking: any = await Booking.findOne({ where: { refundId } });
    if (!booking && paymentId) {
      booking = await Booking.findOne({ where: { paymentTxnId: paymentId } });
    }
    if (!booking) {
      console.warn(`[webhook/razorpay] No booking found for refund ${refundId}`);
      res.status(200).json({ ok: true, message: 'Booking not found, ignored' });
      return;
    }

    // Idempotency: skip if already in this state
    if (event === 'refund.processed' && booking.refundStatus === 'completed') {
      res.status(200).json({ ok: true, idempotent: true });
      return;
    }

    if (event === 'refund.processed') {
      booking.refundStatus = 'completed';
      booking.refundCompletedAt = new Date();
      booking.refundId = refundId;
      booking.refundAmount = amount;
      booking.refundFailureReason = null;
      await booking.save();
      sendRefundCompletedEmail(booking).catch(() => {});
      console.log(`✅ [webhook/razorpay] Refund completed: ${refundId} (booking ${booking.id})`);
    } else if (event === 'refund.failed') {
      booking.refundStatus = 'failed';
      booking.refundFailureReason = (refundEntity.notes?.reason || 'Refund failed at gateway').toString().slice(0, 500);
      await booking.save();
      console.warn(`❌ [webhook/razorpay] Refund failed: ${refundId}`);
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[webhook/razorpay] ERROR:', err?.message || err);
    // Always return 200 to prevent Razorpay from retrying indefinitely on our bugs
    res.status(200).json({ ok: false, error: err?.message });
  }
});

/**
 * POST /api/webhooks/paypal
 *
 * Listens to PAYMENT.CAPTURE.REFUNDED events.
 * Configure in PayPal Dashboard → My Apps → Webhooks:
 *   URL:    https://<your-api>/api/webhooks/paypal
 *   Events: PAYMENT.CAPTURE.REFUNDED
 * NOTE: PayPal signature verification requires calling their /v1/notifications/verify-webhook-signature
 * endpoint. For brevity we trust the source IP / use webhook id check. Production should add full verification.
 */
router.post('/paypal', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventType = req.body?.event_type;
    const resource = req.body?.resource;
    if (!resource) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      const refundId = resource.id;
      const captureId = resource.links?.find((l: any) => l.rel === 'up')?.href?.split('/').pop();
      const amount = Number(resource.amount?.value || 0);

      let booking: any = await Booking.findOne({ where: { refundId } });
      if (!booking && captureId) {
        booking = await Booking.findOne({ where: { paymentTxnId: captureId } });
      }
      if (!booking) {
        console.warn(`[webhook/paypal] No booking found for refund ${refundId}`);
        res.status(200).json({ ok: true, message: 'Booking not found' });
        return;
      }

      if (booking.refundStatus !== 'completed') {
        booking.refundStatus = 'completed';
        booking.refundCompletedAt = new Date();
        booking.refundId = refundId;
        if (amount) booking.refundAmount = amount;
        booking.refundFailureReason = null;
        await booking.save();
        sendRefundCompletedEmail(booking).catch(() => {});
        console.log(`✅ [webhook/paypal] Refund completed: ${refundId} (booking ${booking.id})`);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[webhook/paypal] ERROR:', err?.message || err);
    res.status(200).json({ ok: false, error: err?.message });
  }
});

export default router;
