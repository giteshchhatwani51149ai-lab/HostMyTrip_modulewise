import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { sendReminders, sendFeedbackRequests } from '../services/emailAutomation';
import { Booking } from '../models';
import { queryRefundStatus } from '../services/refundService';

const router = Router();

/**
 * POST /api/cron/send-reminders
 *
 * Queries bookings with departure/check-in in ~48 hours and sends trip reminder emails.
 * Protected by CRON_SECRET to prevent abuse.
 * Call this daily at 6 AM via your scheduler.
 */
router.post('/send-reminders', async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-cron-secret'] || req.body?.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  try {
    const result = await sendReminders();
    res.status(200).json({ message: 'Reminders processed', ...result });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed', detail: err?.message });
  }
});

/**
 * POST /api/cron/send-feedback
 *
 * Queries bookings where check-out was ~24 hours ago and sends feedback request emails.
 */
router.post('/send-feedback', async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-cron-secret'] || req.body?.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  try {
    const result = await sendFeedbackRequests();
    res.status(200).json({ message: 'Feedback requests processed', ...result });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed', detail: err?.message });
  }
});

/**
 * POST /api/cron/reconcile-refunds
 *
 * Sweeps refunds stuck in 'processing' state for > 1 hour and queries the
 * gateway for their current status. Run hourly via your scheduler.
 *
 * Why we need this: webhook delivery isn't 100% reliable. If Razorpay/PayPal
 * fails to deliver a refund.processed event (network blip, downtime, etc.)
 * this cron catches it and updates the booking so the customer sees the right
 * status without manual intervention.
 */
router.post('/reconcile-refunds', async (req: Request, res: Response): Promise<void> => {
  const secret = req.headers['x-cron-secret'] || req.body?.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stale: any[] = await Booking.findAll({
      where: {
        refundStatus: 'processing',
        refundInitiatedAt: { [Op.lt]: oneHourAgo },
        refundId: { [Op.ne]: null },
      },
      limit: 50,
    });

    let updated = 0;
    let stillProcessing = 0;
    let failed = 0;

    for (const b of stale) {
      try {
        const result = await queryRefundStatus(
          b.paymentGateway || 'razorpay',
          b.refundId,
          b.paymentTxnId,
        );
        if (result.status === 'completed') {
          b.refundStatus = 'completed';
          b.refundCompletedAt = new Date();
          await b.save();
          updated++;
        } else if (result.status === 'failed') {
          b.refundStatus = 'failed';
          b.refundFailureReason = 'Gateway reports refund failed (reconciliation)';
          await b.save();
          failed++;
        } else {
          stillProcessing++;
        }
      } catch (e: any) {
        console.warn(`[cron/reconcile] booking ${b.id} query failed:`, e?.message);
      }
    }

    res.status(200).json({
      message: 'Reconciliation complete',
      checked: stale.length,
      updated,
      stillProcessing,
      failed,
    });
  } catch (err: any) {
    console.error('[cron/reconcile-refunds] ERROR:', err?.message || err);
    res.status(500).json({ message: 'Failed', detail: err?.message });
  }
});

export default router;
