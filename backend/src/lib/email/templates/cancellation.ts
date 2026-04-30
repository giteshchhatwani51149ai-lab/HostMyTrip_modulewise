import { BookingEmailData } from '../index';

export function cancellationTemplate(booking: BookingEmailData, baseUrl: string): string {
  const ref = booking.bookingReference || `#${booking.id}`;
  const refundAmount = booking.refundAmount ?? 0;
  const cancellationFee = booking.cancellationFee ?? 0;
  const paidAmount = Number(booking.paidAmount || 0);
  const timeline = booking.refundTimeline || '7–10 business days';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booking Cancelled</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:36px 40px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800">HostMyTrip</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Your travel companion</p>
        </td></tr>

        <!-- Title -->
        <tr><td style="padding:32px 40px 0;text-align:center">
          <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px">❌</div>
          <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827">Booking Cancelled</h2>
          <p style="margin:8px 0 0;color:#6b7280;font-size:15px">Hi ${booking.guestName}, your booking has been cancelled.</p>
        </td></tr>

        <!-- Ref -->
        <tr><td style="padding:24px 40px">
          <div style="background:#fef2f2;border-radius:10px;padding:16px;text-align:center;border:1px solid #fecaca">
            <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Booking Reference</p>
            <p style="margin:6px 0 0;font-size:26px;font-weight:800;color:#dc2626;letter-spacing:2px;font-family:monospace">${ref}</p>
          </div>
        </td></tr>

        <!-- Refund breakdown -->
        <tr><td style="padding:0 40px 24px">
          <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Refund Breakdown</h3>
          <div style="background:#f9fafb;border-radius:10px;padding:16px">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
              <tr><td style="color:#6b7280;padding:5px 0">Original Amount</td><td style="font-weight:600;text-align:right">₹${paidAmount.toLocaleString('en-IN')}</td></tr>
              <tr><td style="color:#6b7280;padding:5px 0">Cancellation Fee</td><td style="font-weight:600;text-align:right;color:#dc2626">– ₹${cancellationFee.toLocaleString('en-IN')}</td></tr>
              <tr style="border-top:1px solid #e5e7eb">
                <td style="font-weight:700;padding:8px 0 5px">Refund Amount</td>
                <td style="font-weight:800;text-align:right;color:#059669;font-size:16px">₹${refundAmount.toLocaleString('en-IN')}</td>
              </tr>
            </table>
            <p style="margin:10px 0 0;font-size:12px;color:#9ca3af">Refund will be processed in ${timeline} to your original payment method.</p>
          </div>
        </td></tr>

        ${booking.cancelReason ? `
        <!-- Reason -->
        <tr><td style="padding:0 40px 24px">
          <p style="margin:0;font-size:13px;color:#6b7280"><strong>Reason:</strong> ${booking.cancelReason}</p>
        </td></tr>` : ''}

        <!-- CTA -->
        <tr><td style="padding:0 40px 32px;text-align:center">
          <a href="${baseUrl}/hotels" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px">Book Again</a>
        </td></tr>

        <!-- Support -->
        <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:13px;color:#6b7280;text-align:center">Questions? Email us at <a href="mailto:support@hostmytrip.com" style="color:#2563eb;text-decoration:none">support@hostmytrip.com</a></p>
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
