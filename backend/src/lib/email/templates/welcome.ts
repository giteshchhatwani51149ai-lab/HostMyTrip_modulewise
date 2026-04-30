import { UserEmailData } from '../index';

export function welcomeTemplate(user: UserEmailData, baseUrl: string): string {
  const name = user.name || user.email.split('@')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to HostMyTrip</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:40px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:32px;font-weight:800">HostMyTrip</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:15px">Your travel companion</p>
        </td></tr>

        <tr><td style="padding:40px;text-align:center">
          <div style="font-size:56px;margin-bottom:20px">🌍</div>
          <h2 style="margin:0;font-size:26px;font-weight:700;color:#111827">Welcome, ${name}!</h2>
          <p style="margin:12px 0 0;color:#6b7280;font-size:15px;line-height:1.7">
            We're thrilled to have you on board. HostMyTrip makes booking hotels and flights simple, fast, and affordable.
          </p>
        </td></tr>

        <!-- Features -->
        <tr><td style="padding:0 40px 32px">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              { icon: '🏨', title: 'Hotels Worldwide', desc: 'Browse thousands of hotels across all budgets.' },
              { icon: '✈️', title: 'Flight Bookings', desc: 'Search and book flights with ease.' },
              { icon: '📱', title: 'Manage Anywhere', desc: 'View and manage bookings from any device.' },
            ].map(f => `
            <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48" style="font-size:28px;vertical-align:top">${f.icon}</td>
                  <td style="vertical-align:top;padding-left:12px">
                    <p style="margin:0;font-weight:700;font-size:15px;color:#111827">${f.title}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${f.desc}</p>
                  </td>
                </tr>
              </table>
            </td></tr>`).join('')}
          </table>
        </td></tr>

        <tr><td style="padding:0 40px 40px;text-align:center">
          <a href="${baseUrl}/hotels" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px">Explore Hotels</a>
        </td></tr>

        <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
          <p style="margin:0;font-size:13px;color:#6b7280">Need help? <a href="mailto:support@hostmytrip.com" style="color:#2563eb;text-decoration:none">support@hostmytrip.com</a></p>
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
