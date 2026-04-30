import { BookingEmailData } from '../index';

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export function tripReminderTemplate(booking: BookingEmailData, baseUrl: string): string {
  const isFlight = !!booking.flightDetail || !!booking.origin;
  const ref = booking.bookingReference || `#${booking.id}`;
  const manageUrl = `${baseUrl}/bookings/${booking.id}`;
  const tripName = isFlight
    ? `${booking.flightDetail?.origin || booking.origin} → ${booking.flightDetail?.destination || booking.destination}`
    : (booking.displayHotelName || 'Your Trip');
  const tripDate = fmtDate(
    isFlight ? (booking.flightDetail?.departureDate || booking.checkIn) : booking.checkIn
  );

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trip Reminder</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:36px 40px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800">HostMyTrip</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Your travel companion</p>
        </td></tr>

        <tr><td style="padding:40px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">${isFlight ? '✈️' : '🏨'}</div>
          <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827">Your Trip is Coming Up!</h2>
          <p style="margin:10px 0 0;color:#6b7280;font-size:15px">Hi ${booking.guestName}, don't forget — you have a trip coming up soon.</p>
        </td></tr>

        <!-- Trip card -->
        <tr><td style="padding:0 40px 24px">
          <div style="background:#eff6ff;border-radius:12px;padding:20px;border-left:4px solid #2563eb">
            <p style="margin:0;font-size:18px;font-weight:800;color:#1e3a5f">${tripName}</p>
            <p style="margin:6px 0 0;font-size:14px;color:#6b7280">${isFlight ? '✈️ Flight' : '🏨 Hotel Stay'} &nbsp;·&nbsp; ${tripDate}</p>
            ${!isFlight && booking.checkOut ? `<p style="margin:4px 0 0;font-size:13px;color:#9ca3af">Check-out: ${fmtDate(booking.checkOut)}</p>` : ''}
          </div>
        </td></tr>

        <!-- Checklist -->
        <tr><td style="padding:0 40px 24px">
          <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Pre-Trip Checklist</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151">
            ${isFlight ? `
            <tr><td style="padding:6px 0">☑️ &nbsp; Check in online (opens 48 hrs before departure)</td></tr>
            <tr><td style="padding:6px 0">☑️ &nbsp; Confirm baggage allowance with airline</td></tr>
            <tr><td style="padding:6px 0">☑️ &nbsp; Arrive at airport 2–3 hours early</td></tr>
            <tr><td style="padding:6px 0">☑️ &nbsp; Carry valid ID / passport</td></tr>
            ` : `
            <tr><td style="padding:6px 0">☑️ &nbsp; Check-in time: usually 2:00 PM</td></tr>
            <tr><td style="padding:6px 0">☑️ &nbsp; Carry booking confirmation / e-voucher</td></tr>
            <tr><td style="padding:6px 0">☑️ &nbsp; Contact hotel for special requests</td></tr>
            <tr><td style="padding:6px 0">☑️ &nbsp; Check local weather forecast</td></tr>
            `}
          </table>
        </td></tr>

        <!-- Booking ref -->
        <tr><td style="padding:0 40px 32px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Booking Reference</p>
          <p style="margin:6px 0 16px;font-size:22px;font-weight:800;color:#2563eb;font-family:monospace">${ref}</p>
          <a href="${manageUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px">View Booking</a>
        </td></tr>

        <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:13px;color:#6b7280;text-align:center">Need help? <a href="mailto:support@hostmytrip.com" style="color:#2563eb;text-decoration:none">support@hostmytrip.com</a></p>
        </td></tr>

        <tr><td style="padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} HostMyTrip. All rights reserved.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">
            <a href="${baseUrl}" style="color:#9ca3af;text-decoration:none">Website</a> &nbsp;·&nbsp;
            <a href="mailto:support@hostmytrip.com" style="color:#9ca3af;text-decoration:none">Contact</a> &nbsp;·&nbsp;
            <a href="${baseUrl}/unsubscribe" style="color:#9ca3af;text-decoration:none">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
