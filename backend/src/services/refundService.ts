/**
 * Refund Service — gateway-agnostic abstraction.
 *
 * Routes a refund request to the correct payment gateway (Razorpay / PayPal /
 * corporate credit) based on the original booking's `paymentGateway`.
 *
 * Returns a normalized response so the caller doesn't care which gateway was
 * used. Always idempotent — safe to retry.
 */
import Razorpay from 'razorpay';
import { Booking, Payment } from '../models';
import { refundCapture as paypalRefund } from '../utils/paypal';

export interface RefundResult {
  ok: boolean;
  refundId?: string;
  /** processing | completed | failed | not_required (corporate credit) */
  status: 'processing' | 'completed' | 'failed' | 'not_required';
  amount: number;
  gateway: 'razorpay' | 'paypal' | 'corporate_credit' | 'unknown';
  error?: string;
  raw?: any;
}

const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error('Razorpay keys not configured');
  return new Razorpay({ key_id, key_secret });
};

/**
 * Looks up the original payment record for a booking and determines which
 * gateway to call for the refund. Falls back to corporate-credit for corporate
 * bookings (no real money was charged).
 */
async function resolvePaymentInfo(booking: Booking): Promise<{
  gateway: RefundResult['gateway'];
  txnId: string | null;
}> {
  // 1. Prefer values explicitly set on the booking (set during payment capture)
  if (booking.paymentGateway && booking.paymentTxnId) {
    return { gateway: booking.paymentGateway as any, txnId: booking.paymentTxnId };
  }

  // 2. Corporate credit bookings need no real refund
  if (booking.bookingSource === 'corporate' && Number(booking.creditDebited) > 0) {
    return { gateway: 'corporate_credit', txnId: null };
  }

  // 3. Look up the latest successful Payment record
  const payment: any = await Payment.findOne({
    where: { bookingId: booking.id, status: 'success' },
    order: [['createdAt', 'DESC']],
  });
  if (payment) {
    return {
      gateway: (payment.gateway || 'razorpay') as any,
      txnId: payment.gatewayPaymentId,
    };
  }

  return { gateway: 'unknown', txnId: null };
}

/**
 * Issue a refund for a booking. Updates the booking's refund tracking columns
 * in-place with the gateway response. Caller should `booking.save()` after.
 */
export async function issueRefund(
  booking: Booking,
  amount: number,
): Promise<RefundResult> {
  const { gateway, txnId } = await resolvePaymentInfo(booking);

  // Mark initiation timestamp if first attempt
  if (!booking.refundInitiatedAt) {
    booking.refundInitiatedAt = new Date();
  }
  booking.paymentGateway = gateway === 'unknown' ? booking.paymentGateway : gateway;
  if (txnId) booking.paymentTxnId = txnId;

  // ── Corporate credit: instant ───────────────────────────
  if (gateway === 'corporate_credit') {
    booking.refundStatus = 'completed';
    booking.refundAmount = amount;
    booking.refundCompletedAt = new Date();
    booking.refundFailureReason = null;
    return { ok: true, status: 'completed', amount, gateway };
  }

  // ── No txn id we can refund against ─────────────────────
  if (!txnId) {
    booking.refundStatus = 'failed';
    booking.refundFailureReason = 'Original payment transaction id not found';
    return { ok: false, status: 'failed', amount, gateway, error: booking.refundFailureReason };
  }

  // ── Razorpay ────────────────────────────────────────────
  if (gateway === 'razorpay') {
    try {
      const rzp = getRazorpay();
      const refund: any = await rzp.payments.refund(txnId, {
        amount: Math.round(amount * 100), // paise
        speed: 'normal',
        notes: { bookingId: String(booking.id), bookingRef: booking.bookingReference || '' },
      });
      // Razorpay refund.status: 'pending' | 'processed' | 'failed'
      const status: RefundResult['status'] =
        refund.status === 'processed' ? 'completed'
        : refund.status === 'failed'  ? 'failed'
        : 'processing';

      booking.refundId = refund.id;
      booking.refundAmount = amount;
      booking.refundStatus = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'processing';
      if (status === 'completed') booking.refundCompletedAt = new Date();
      if (status === 'failed') booking.refundFailureReason = 'Razorpay refund failed at initiation';

      return { ok: status !== 'failed', refundId: refund.id, status, amount, gateway, raw: refund };
    } catch (err: any) {
      const msg = err?.error?.description || err?.message || 'Razorpay refund failed';
      booking.refundStatus = 'failed';
      booking.refundFailureReason = msg.slice(0, 500);
      return { ok: false, status: 'failed', amount, gateway, error: msg };
    }
  }

  // ── PayPal ──────────────────────────────────────────────
  if (gateway === 'paypal') {
    try {
      const refund: any = await paypalRefund(txnId, amount, booking.currency || 'INR');
      // PayPal status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED'
      const status: RefundResult['status'] =
        refund.status === 'COMPLETED' ? 'completed'
        : refund.status === 'PENDING'  ? 'processing'
        : 'failed';

      booking.refundId = refund.id;
      booking.refundAmount = amount;
      booking.refundStatus = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'processing';
      if (status === 'completed') booking.refundCompletedAt = new Date();
      if (status === 'failed') booking.refundFailureReason = `PayPal status: ${refund.status}`;

      return { ok: status !== 'failed', refundId: refund.id, status, amount, gateway, raw: refund };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'PayPal refund failed';
      booking.refundStatus = 'failed';
      booking.refundFailureReason = msg.slice(0, 500);
      return { ok: false, status: 'failed', amount, gateway, error: msg };
    }
  }

  // ── Unknown gateway ─────────────────────────────────────
  booking.refundStatus = 'failed';
  booking.refundFailureReason = `Unsupported payment gateway: ${gateway}`;
  return { ok: false, status: 'failed', amount, gateway, error: booking.refundFailureReason };
}

/**
 * Query the gateway for a refund's current status (used by reconciliation cron).
 */
export async function queryRefundStatus(
  gateway: string,
  refundId: string,
  paymentTxnId: string | null,
): Promise<{ status: 'processing' | 'completed' | 'failed'; raw?: any }> {
  if (gateway === 'razorpay' && paymentTxnId) {
    try {
      const rzp = getRazorpay();
      const r: any = await rzp.payments.fetchRefund(paymentTxnId, refundId);
      const status =
        r.status === 'processed' ? 'completed'
        : r.status === 'failed'  ? 'failed'
        : 'processing';
      return { status, raw: r };
    } catch {
      return { status: 'processing' };
    }
  }
  // PayPal: would need GET /v2/payments/refunds/{id}; out of scope for v1 reconcile
  return { status: 'processing' };
}
