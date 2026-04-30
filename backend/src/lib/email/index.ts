import nodemailer from 'nodemailer';
import { bookingConfirmationTemplate } from './templates/booking-confirmation';
import { cancellationTemplate } from './templates/cancellation';
import { passwordResetTemplate } from './templates/password-reset';
import { welcomeTemplate } from './templates/welcome';
import { tripReminderTemplate } from './templates/trip-reminder';
import { reviewRequestTemplate } from './templates/review-request';

export interface BookingEmailData {
  id: number;
  bookingReference?: string;
  guestName: string;
  guestEmail: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  displayHotelName?: string;
  displayCity?: string;
  displayRoomType?: string;
  origin?: string;
  destination?: string;
  airline?: string;
  flightNumber?: string;
  flightDetail?: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    airline?: string;
    flightNumber?: string;
    class?: string;
  };
  refundAmount?: number;
  cancellationFee?: number;
  refundTimeline?: string;
  cancelReason?: string;
}

export interface UserEmailData {
  id: number;
  name?: string;
  email: string;
}

const MAX_RETRIES = 3;

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.resend.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || 'resend';
  const pass = process.env.SMTP_PASS || process.env.RESEND_API_KEY || '';

  // Gmail SMTP: port 587 uses STARTTLS (secure=false), port 465 uses SSL/TLS (secure=true)
  const isSecure = port === 465;

  console.log(`[EmailService] Creating transporter: ${host}:${port} (secure=${isSecure})`);

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: { user, pass },
    tls: isSecure ? undefined : { rejectUnauthorized: false },
    requireTLS: !isSecure, // Require STARTTLS for port 587
  });
}

async function sendWithRetry(
  options: nodemailer.SendMailOptions,
  attempts = MAX_RETRIES,
): Promise<void> {
  const transporter = createTransporter();

  // Verify connection before sending
  try {
    await transporter.verify();
    console.log('[EmailService] SMTP connection verified successfully');
  } catch (verifyErr: any) {
    console.error('[EmailService] SMTP connection verification failed:', verifyErr?.message);
  }

  for (let i = 1; i <= attempts; i++) {
    try {
      const info = await transporter.sendMail(options);
      console.log(`[EmailService] ✅ Sent "${options.subject}" to ${options.to} (messageId: ${info.messageId})`);
      return;
    } catch (err: any) {
      console.warn(`[EmailService] ❌ Attempt ${i}/${attempts} failed: ${err?.message}`);
      if (err?.code) console.warn(`[EmailService] Error code: ${err.code}`);
      if (err?.response) console.warn(`[EmailService] SMTP response: ${err.response}`);
      if (i === attempts) {
        console.error(`[EmailService] All ${attempts} attempts failed for "${options.subject}" to ${options.to}`);
        throw err; // Re-throw so caller can handle it
      } else {
        await new Promise(r => setTimeout(r, 1000 * i));
      }
    }
  }
}

const FROM = process.env.EMAIL_FROM || 'HostMyTrip <noreply@hostmytrip.com>';
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

export class EmailService {
  async sendBookingConfirmation(booking: BookingEmailData): Promise<void> {
    const html = bookingConfirmationTemplate(booking, BASE_URL);
    await sendWithRetry({
      from: FROM,
      to: booking.guestEmail,
      subject: `Booking Confirmed – ${booking.bookingReference || `#${booking.id}`}`,
      html,
    });
  }

  async sendCancellationConfirmation(booking: BookingEmailData): Promise<void> {
    const html = cancellationTemplate(booking, BASE_URL);
    await sendWithRetry({
      from: FROM,
      to: booking.guestEmail,
      subject: `Booking Cancelled – ${booking.bookingReference || `#${booking.id}`}`,
      html,
    });
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const html = passwordResetTemplate(email, resetToken, BASE_URL);
    await sendWithRetry({
      from: FROM,
      to: email,
      subject: 'Reset Your HostMyTrip Password',
      html,
    });
  }

  async sendWelcomeEmail(user: UserEmailData): Promise<void> {
    const html = welcomeTemplate(user, BASE_URL);
    await sendWithRetry({
      from: FROM,
      to: user.email,
      subject: 'Welcome to HostMyTrip! 🌍',
      html,
    });
  }

  async sendTripReminder(booking: BookingEmailData): Promise<void> {
    const html = tripReminderTemplate(booking, BASE_URL);
    await sendWithRetry({
      from: FROM,
      to: booking.guestEmail,
      subject: `Trip Reminder – ${booking.displayHotelName || booking.destination || 'Your Upcoming Trip'}`,
      html,
    });
  }

  async sendFeedbackRequest(booking: BookingEmailData): Promise<void> {
    const html = reviewRequestTemplate(booking, BASE_URL);
    await sendWithRetry({
      from: FROM,
      to: booking.guestEmail,
      subject: `How was your trip? Share your experience – HostMyTrip`,
      html,
    });
  }

  async sendOTPEmail({ email, otp, expiresIn }: { email: string; otp: string; expiresIn: number }): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8533 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">HostMyTrip</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Email Verification</p>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 20px;">Verify Your Email</h2>
      <p style="color: #666; margin: 0 0 32px 0; line-height: 1.6; font-size: 15px;">
        Thank you for signing up! Please use the verification code below to complete your registration. This code will expire in <strong>${expiresIn} minutes</strong>.
      </p>
      <div style="background: #f8f9fa; border: 2px dashed #FF6B00; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0;">Your Verification Code</p>
        <div style="font-size: 36px; font-weight: 700; color: #FF6B00; letter-spacing: 8px;">${otp}</div>
      </div>
      <p style="color: #666; margin: 24px 0 0 0; font-size: 14px; line-height: 1.6;">
        If you didn't request this code, you can safely ignore this email. Your account security is important to us.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
      <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
        Need help? Contact us at <a href="mailto:support@hostmytrip.com" style="color: #FF6B00;">support@hostmytrip.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    await sendWithRetry({
      from: FROM,
      to: email,
      subject: 'Your HostMyTrip Verification Code',
      html,
    });
  }
}

export const emailService = new EmailService();
