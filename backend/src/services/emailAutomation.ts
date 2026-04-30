import { Op } from 'sequelize';
import sequelize from '../config/database';
import { Booking } from '../models';
import { emailService, BookingEmailData } from '../lib/email';

function toEmailData(b: any): BookingEmailData {
  return {
    id: b.id,
    bookingReference: b.bookingReference || undefined,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    totalAmount: Number(b.totalAmount),
    paidAmount: Number(b.paidAmount),
    status: b.status,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests: b.guests,
    origin: b.origin || undefined,
    destination: b.destination || undefined,
    airline: b.airline || undefined,
    displayHotelName: b.externalHotelName || undefined,
    displayCity: b.externalCity || undefined,
  };
}

function nowIso(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

/**
 * Send trip reminder emails for bookings departing in 24–72 hours.
 * Marks reminderSentAt to prevent duplicate sends.
 */
export async function sendReminders(): Promise<{ sent: number; failed: number; skipped: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);   // 24h from now
  const windowEnd   = new Date(now.getTime() + 72 * 60 * 60 * 1000);   // 72h from now

  let sent = 0, failed = 0, skipped = 0;

  const bookings = await Booking.findAll({
    where: {
      status: ['confirmed', 'pending'],
      checkIn: { [Op.between]: [windowStart, windowEnd] },
    } as any,
  });

  for (const booking of bookings) {
    const b = booking.toJSON() as any;

    if (b.reminderSentAt) { skipped++; continue; }
    if (!b.guestEmail)    { skipped++; continue; }

    try {
      await emailService.sendTripReminder(toEmailData(b));
      await Booking.update(
        { reminderSentAt: nowIso() } as any,
        { where: { id: b.id }, validate: false }
      );
      sent++;
    } catch (err: any) {
      console.error(`[emailAutomation] Reminder failed for booking ${b.id}: ${err?.message}`);
      failed++;
    }
  }

  console.log(`[emailAutomation] Reminders → sent: ${sent}, failed: ${failed}, skipped: ${skipped}`);
  return { sent, failed, skipped };
}

/**
 * Send feedback request emails for bookings where check-out was 20–28 hours ago.
 * Marks feedbackSentAt to prevent duplicate sends.
 */
export async function sendFeedbackRequests(): Promise<{ sent: number; failed: number; skipped: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 28 * 60 * 60 * 1000);  // 28h ago
  const windowEnd   = new Date(now.getTime() - 20 * 60 * 60 * 1000);  // 20h ago

  let sent = 0, failed = 0, skipped = 0;

  const bookings = await Booking.findAll({
    where: {
      status: ['confirmed', 'completed'],
      checkOut: { [Op.between]: [windowStart, windowEnd] },
    } as any,
  });

  for (const booking of bookings) {
    const b = booking.toJSON() as any;

    if (b.feedbackSentAt) { skipped++; continue; }
    if (!b.guestEmail)    { skipped++; continue; }

    try {
      await emailService.sendFeedbackRequest(toEmailData(b));
      await Booking.update(
        { feedbackSentAt: nowIso() } as any,
        { where: { id: b.id }, validate: false }
      );
      sent++;
    } catch (err: any) {
      console.error(`[emailAutomation] Feedback req failed for booking ${b.id}: ${err?.message}`);
      failed++;
    }
  }

  console.log(`[emailAutomation] Feedback → sent: ${sent}, failed: ${failed}, skipped: ${skipped}`);
  return { sent, failed, skipped };
}
