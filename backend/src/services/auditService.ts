import type { Request } from 'express';
import { AuditLog } from '../models';

/**
 * Standardised audit-action names.
 * Format: `<domain>.<verb>`  (lowercased, dot-separated).
 *
 * Add new entries here so call sites get autocompletion and we can do a
 * codebase-wide audit of what's tracked.
 */
export const AUDIT = {
  // Authentication & user account
  AUTH_LOGIN_SUCCESS:        'auth.login.success',
  AUTH_LOGIN_FAILED:         'auth.login.failed',
  AUTH_LOGOUT:               'auth.logout',
  AUTH_SIGNUP:               'auth.signup',
  AUTH_OTP_SENT:             'auth.otp.sent',
  AUTH_OTP_VERIFIED:         'auth.otp.verified',
  AUTH_PASSWORD_RESET_REQ:   'auth.password.reset_request',
  AUTH_PASSWORD_RESET_DONE:  'auth.password.reset_complete',
  AUTH_EMAIL_VERIFIED:       'auth.email.verified',

  // User management
  USER_ROLE_CHANGED:         'user.role.changed',
  USER_PROFILE_UPDATED:      'user.profile.updated',
  USER_DELETED:              'user.deleted',

  // Bookings
  BOOKING_CREATED:           'booking.created',
  BOOKING_CONFIRMED:         'booking.confirmed',
  BOOKING_CANCELLED:         'booking.cancelled',
  BOOKING_MODIFIED:          'booking.modified',

  // Payments
  PAYMENT_CAPTURED:          'payment.captured',
  PAYMENT_FAILED:            'payment.failed',
  PAYMENT_REFUND_INITIATED:  'payment.refund.initiated',
  PAYMENT_REFUND_COMPLETED:  'payment.refund.completed',
  PAYMENT_REFUND_FAILED:     'payment.refund.failed',

  // Corporate
  CORP_BOOKING_APPROVED:     'corporate.booking.approved',
  CORP_BOOKING_REJECTED:     'corporate.booking.rejected',
  CORP_CREDIT_UPDATED:       'corporate.credit.updated',
  CORP_MEMBER_REMOVED:       'corporate.member.removed',

  // Admin
  ADMIN_BOOKING_EXPORTED:    'admin.booking.exported',
  ADMIN_HOTEL_CREATED:       'admin.hotel.created',
  ADMIN_HOTEL_UPDATED:       'admin.hotel.updated',
  ADMIN_HOTEL_DELETED:       'admin.hotel.deleted',
  ADMIN_AUDIT_VIEWED:        'admin.audit.viewed',

  // Webhooks (system-originated; actor will be null)
  WEBHOOK_RAZORPAY:          'webhook.razorpay',
  WEBHOOK_PAYPAL:            'webhook.paypal',
} as const;

export type AuditAction = (typeof AUDIT)[keyof typeof AUDIT];

// ─────────────────────────────────────────────────────────────────────────────
// PII / PCI redaction
// ─────────────────────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'password', 'newpassword', 'oldpassword', 'currentpassword',
  'pwd', 'pass',
  'token', 'accesstoken', 'refreshtoken', 'authorization',
  'otp', 'pin', 'secret', 'apikey', 'api_key',
  'cvv', 'cvc', 'cardnumber', 'card_number', 'pan',
  'cardexpiry', 'expiry',
]);

/** Mask card-number-like strings: keep first 6 + last 4. */
function maskPan(s: string): string {
  const digits = s.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return s;
  return `${digits.slice(0, 6)}******${digits.slice(-4)}`;
}

/**
 * Recursively walk an object and:
 *  • Drop sensitive keys (replace value with `[REDACTED]`)
 *  • Mask card-number-shaped strings
 *  • Cap depth & string length to avoid bloated rows
 */
export function redact(input: any, depth = 0): any {
  if (depth > 5) return '[truncated]';
  if (input == null) return input;
  if (typeof input === 'string') {
    if (input.length > 1000) return input.slice(0, 1000) + '…[truncated]';
    if (/\b(?:\d[ -]*?){13,19}\b/.test(input)) return maskPan(input);
    return input;
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.slice(0, 50).map((v) => redact(v, depth + 1));

  const out: any = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface LogAuditOptions {
  action: AuditAction | string;
  entityType?: string | null;
  entityId?: number | string | null;
  metadata?: Record<string, any> | null;
  before?: any;
  after?: any;
  success?: boolean;
  errorMessage?: string | null;
  /** Override actor (e.g. system actions). */
  actor?: { id?: number; role?: string; email?: string } | null;
}

/**
 * Fire-and-forget audit writer.
 * Never throws — failures are logged to stderr so the request flow is unaffected.
 */
export function logAudit(req: Request | null, opts: LogAuditOptions): void {
  // Run async without blocking caller
  setImmediate(async () => {
    try {
      const reqUser: any = (req as any)?.user ?? null;
      const actor = opts.actor ?? reqUser ?? null;

      const entityIdNum =
        opts.entityId == null
          ? null
          : Number.isFinite(Number(opts.entityId))
            ? Number(opts.entityId)
            : null;

      // Resolve client IP — prefer real IP behind proxy
      let ip: string | null = null;
      let userAgent: string | null = null;
      if (req) {
        const xff = (req.headers['x-forwarded-for'] || '') as string;
        ip = (xff.split(',')[0] || req.ip || '').trim() || null;
        userAgent = (req.headers['user-agent'] as string) || null;
        if (userAgent && userAgent.length > 500) userAgent = userAgent.slice(0, 500);
      }

      await AuditLog.create({
        actorUserId: actor?.id ?? null,
        actorRole:   actor?.role ?? null,
        actorEmail:  actor?.email ?? null,
        action:      opts.action,
        entityType:  opts.entityType ?? null,
        entityId:    entityIdNum,
        ip,
        userAgent,
        metadata:    opts.metadata ? redact(opts.metadata) : null,
        before:      opts.before   ? redact(opts.before)   : null,
        after:       opts.after    ? redact(opts.after)    : null,
        success:     opts.success ?? true,
        errorMessage: opts.errorMessage
          ? String(opts.errorMessage).slice(0, 1000)
          : null,
      });
    } catch (err: any) {
      console.warn('[auditService] write failed:', err?.message);
    }
  });
}

/** Compute a shallow before/after diff (only changed fields). */
export function diff(before: Record<string, any> | null | undefined, after: Record<string, any>) {
  const b: Record<string, any> = {};
  const a: Record<string, any> = {};
  if (!before) return { before: null, after: redact(after) };
  for (const k of Object.keys(after || {})) {
    if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) {
      b[k] = before?.[k];
      a[k] = after?.[k];
    }
  }
  return { before: redact(b), after: redact(a) };
}

export default { logAudit, diff, AUDIT, redact };
