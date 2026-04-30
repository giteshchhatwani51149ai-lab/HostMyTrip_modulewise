import cron from 'node-cron';
import { sendReminders, sendFeedbackRequests } from './emailAutomation';

/**
 * Starts the background cron jobs for automated email triggers.
 * - Reminders:  daily at 6:00 AM
 * - Feedback:   daily at 8:00 AM
 */
export function startEmailScheduler(): void {
  // Trip reminders — daily at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('[emailScheduler] Running trip reminders…');
    try {
      const result = await sendReminders();
      console.log('[emailScheduler] Reminders done:', result);
    } catch (err: any) {
      console.error('[emailScheduler] Reminders error:', err?.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // Feedback requests — daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[emailScheduler] Running feedback requests…');
    try {
      const result = await sendFeedbackRequests();
      console.log('[emailScheduler] Feedback done:', result);
    } catch (err: any) {
      console.error('[emailScheduler] Feedback error:', err?.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('✅ Email scheduler started (reminders @ 6 AM, feedback @ 8 AM IST)');
}
