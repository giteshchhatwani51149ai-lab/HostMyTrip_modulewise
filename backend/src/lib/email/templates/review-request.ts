import { BookingEmailData } from '../index';

export function reviewRequestTemplate(booking: BookingEmailData, baseUrl: string): string {
  const tripName = booking.displayHotelName || booking.destination || 'your recent trip';
  const reviewUrl = `${baseUrl}/bookings/${booking.id}?review=1`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>How was your trip?</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:36px 40px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800">HostMyTrip</h1>
        </td></tr>

        <tr><td style="padding:40px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">⭐</div>
          <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827">How was your trip?</h2>
          <p style="margin:10px 0 0;color:#6b7280;font-size:15px;line-height:1.6">
            Hi ${booking.guestName}, we hope you had a wonderful time at <strong>${tripName}</strong>!<br>
            Your feedback helps other travellers make better decisions.
          </p>
        </td></tr>

        <!-- Star rating visual -->
        <tr><td style="padding:0 40px 28px;text-align:center">
          <p style="margin:0 0 16px;font-size:28px;letter-spacing:6px">⭐⭐⭐⭐⭐</p>
          <a href="${reviewUrl}" style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px">Write a Review</a>
          <p style="margin:12px 0 0;font-size:12px;color:#9ca3af">Takes less than 2 minutes</p>
        </td></tr>

        <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:13px;color:#6b7280;text-align:center">Questions? <a href="mailto:support@hostmytrip.com" style="color:#2563eb;text-decoration:none">support@hostmytrip.com</a></p>
        </td></tr>

        <tr><td style="padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} HostMyTrip. All rights reserved.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">
            <a href="${baseUrl}" style="color:#9ca3af;text-decoration:none">Website</a> &nbsp;·&nbsp;
            <a href="${baseUrl}/unsubscribe" style="color:#9ca3af;text-decoration:none">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
