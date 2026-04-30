import dotenv from 'dotenv';
dotenv.config();

import { emailService } from './src/lib/email';

async function main() {
  console.log('Testing email service...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ set' : '❌ NOT SET');

  if (!process.env.SMTP_PASS || process.env.SMTP_PASS === 'YOUR_GMAIL_APP_PASSWORD_HERE') {
    console.error('\n❌ SMTP_PASS is not configured. Add your Gmail App Password to .env first.');
    process.exit(1);
  }

  try {
    await emailService.sendBookingConfirmation({
      id: 999,
      bookingReference: 'HMT-TEST-001',
      guestName: 'Gitesh Chhatwani',
      guestEmail: process.env.SMTP_USER!,
      totalAmount: 14807,
      paidAmount: 14807,
      status: 'confirmed',
      checkIn: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      guests: 2,
      displayHotelName: 'Test Hotel Mumbai',
      displayCity: 'Mumbai',
    });
    console.log('✅ Booking confirmation email sent successfully!');

    await emailService.sendCancellationConfirmation({
      id: 999,
      bookingReference: 'HMT-TEST-001',
      guestName: 'Gitesh Chhatwani',
      guestEmail: process.env.SMTP_USER!,
      totalAmount: 14807,
      paidAmount: 14807,
      status: 'cancelled',
      displayHotelName: 'Test Hotel Mumbai',
      refundAmount: 14807,
      cancellationFee: 0,
      refundTimeline: '7-10 business days',
    });
    console.log('✅ Cancellation email sent successfully!');

    console.log('\n✅ All emails sent! Check your inbox at', process.env.SMTP_USER);
  } catch (err: any) {
    console.error('❌ Email failed:', err?.message);
    if (err?.message?.includes('Invalid login')) {
      console.error('→ App Password is wrong or 2FA is not enabled on Gmail.');
    }
  }
}

main();
