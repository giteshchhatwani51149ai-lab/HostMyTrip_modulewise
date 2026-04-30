export function passwordResetTemplate(email: string, resetToken: string, baseUrl: string): string {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset Password</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:36px 40px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800">HostMyTrip</h1>
        </td></tr>

        <tr><td style="padding:40px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">🔐</div>
          <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827">Reset Your Password</h2>
          <p style="margin:12px 0 0;color:#6b7280;font-size:15px;line-height:1.6">
            We received a request to reset the password for <strong>${email}</strong>.<br>
            Click the button below to set a new password.
          </p>
        </td></tr>

        <tr><td style="padding:0 40px 32px;text-align:center">
          <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:700;font-size:16px">Reset Password</a>
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </td></tr>

        <tr><td style="padding:16px 40px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">Or copy this link: <span style="color:#6b7280;word-break:break-all">${resetUrl}</span></p>
        </td></tr>

        <tr><td style="padding:20px 40px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} HostMyTrip. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
