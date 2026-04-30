import { BookingEmailData } from '../index';

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function bookingConfirmationTemplate(booking: BookingEmailData, baseUrl: string): string {
  const isFlight = !!booking.flightDetail || !!booking.origin;
  const ref = booking.bookingReference || `#${booking.id}`;
  const manageUrl = `${baseUrl}/bookings/${booking.id}`;

  const tripSummary = isFlight
    ? `
      <tr><td style="color:#6b7280;padding:6px 0">Route</td><td style="font-weight:600;text-align:right">${booking.flightDetail?.origin || booking.origin} → ${booking.flightDetail?.destination || booking.destination}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Airline</td><td style="font-weight:600;text-align:right">${booking.flightDetail?.airline || booking.airline || '—'}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Flight</td><td style="font-weight:600;text-align:right">${booking.flightDetail?.flightNumber || booking.flightNumber || '—'}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Departure</td><td style="font-weight:600;text-align:right">${fmtDate(booking.flightDetail?.departureDate || booking.checkIn)}</td></tr>
      ${booking.flightDetail?.returnDate ? `<tr><td style="color:#6b7280;padding:6px 0">Return</td><td style="font-weight:600;text-align:right">${fmtDate(booking.flightDetail.returnDate)}</td></tr>` : ''}
      <tr><td style="color:#6b7280;padding:6px 0">Class</td><td style="font-weight:600;text-align:right">${booking.flightDetail?.class || 'Economy'}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Passengers</td><td style="font-weight:600;text-align:right">${booking.guests || 1}</td></tr>
    `
    : `
      <tr><td style="color:#6b7280;padding:6px 0">Hotel</td><td style="font-weight:600;text-align:right">${booking.displayHotelName || '—'}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">City</td><td style="font-weight:600;text-align:right">${booking.displayCity || '—'}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Room</td><td style="font-weight:600;text-align:right">${booking.displayRoomType || '—'}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Check-in</td><td style="font-weight:600;text-align:right">${fmtDate(booking.checkIn)}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Check-out</td><td style="font-weight:600;text-align:right">${fmtDate(booking.checkOut)}</td></tr>
      <tr><td style="color:#6b7280;padding:6px 0">Guests</td><td style="font-weight:600;text-align:right">${booking.guests || 1}</td></tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booking Confirmed</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:36px 40px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px">HostMyTrip</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Your travel companion</p>
        </td></tr>

        <!-- Success badge -->
        <tr><td style="padding:32px 40px 0;text-align:center">
          <div style="display:inline-block;background:#d1fae5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">✅</div>
          <h2 style="margin:0;font-size:24px;font-weight:700;color:#111827">Booking Confirmed!</h2>
          <p style="margin:8px 0 0;color:#6b7280;font-size:15px">Hi ${booking.guestName}, your booking is confirmed.</p>
        </td></tr>

        <!-- Booking ref -->
        <tr><td style="padding:24px 40px">
          <div style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center">
            <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Booking Reference</p>
            <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#2563eb;letter-spacing:2px;font-family:monospace">${ref}</p>
          </div>
        </td></tr>

        <!-- Trip summary -->
        <tr><td style="padding:0 40px 24px">
          <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Trip Summary</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            ${tripSummary}
          </table>
        </td></tr>

        <!-- Fare -->
        <tr><td style="padding:0 40px 24px">
          <div style="border-top:1px solid #e5e7eb;padding-top:16px">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
              <tr><td style="color:#6b7280;padding:4px 0">Amount Paid</td><td style="font-weight:700;text-align:right;color:#2563eb">₹${Number(booking.paidAmount || 0).toLocaleString('en-IN')}</td></tr>
            </table>
          </div>
        </td></tr>

        <!-- CTA buttons -->
        <tr><td style="padding:0 40px 32px;text-align:center">
          <a href="${manageUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;margin-right:12px">Manage Booking</a>
          <a href="${manageUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">Download E-ticket</a>
        </td></tr>

        <!-- Support -->
        <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:13px;color:#6b7280;text-align:center">Need help? Email us at <a href="mailto:support@hostmytrip.com" style="color:#2563eb;text-decoration:none">support@hostmytrip.com</a></p>
        </td></tr>

        <!-- Footer -->
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
