/**
 * Email Validation Utility
 * Validates email format, checks against disposable domains, and verifies existence
 */

import dns from 'dns';
import { promisify } from 'util';

const dnsResolveMx = promisify(dns.resolveMx);

// Common disposable/free temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
  'sharklasers.com', 'spam4.me', 'trashmail.com', 'yopmail.com',
  'temp.inbox.com', 'mailnesia.com', 'tempmailaddress.com',
  'burnermail.io', 'tempmailo.com', 'fakeemail.com', 'getairmail.com',
  'gmailinator.com', 'mailcatch.com', 'mohmal.com', 'tempail.com',
  'tempemail.com', 'tempmail.net', 'throwawaymail.com', 'tempmailer.com',
  'tempmail.cc', 'tempmail.plus', 'tmpmail.org', ' disposable.com',
  '10minutemail.com', '20minutemail.com', '24hourmail.com', 'instantemailaddress.com',
  'mailnesia.com', 'jetable.org', 'spamgourmet.com', 'boun.cr', 'prtn.to',
  'uorak.com', 'via.tokyo.jp', 'rcv.se', 'x.ip6.li', 'y.thing',
  'givmail.com', 'getnada.com', 'inboxbear.com', 'temp-mails.com',
  'emailfake.com', 'fakemail.net', 'temp-mail.ru', 'tempmail.de',
  'tempmail.ninja', 'tempmails.com', 'throwaway.email',
]);

// Valid email regex pattern (RFC 5322 compliant simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface EmailValidationResult {
  valid: boolean;
  message: string;
  code: 'VALID' | 'INVALID_FORMAT' | 'DISPOSABLE' | 'NO_MX_RECORD' | 'DOMAIN_NOT_FOUND';
}

/**
 * Validate email format and check if domain is disposable
 */
export function validateEmailFormat(email: string): EmailValidationResult {
  // Check empty
  if (!email || !email.trim()) {
    return { valid: false, message: 'Email is required', code: 'INVALID_FORMAT' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check format
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { valid: false, message: 'Please enter a valid email address', code: 'INVALID_FORMAT' };
  }

  // Check length
  if (normalizedEmail.length > 254) {
    return { valid: false, message: 'Email is too long', code: 'INVALID_FORMAT' };
  }

  // Extract domain
  const domain = normalizedEmail.split('@')[1];
  if (!domain) {
    return { valid: false, message: 'Invalid email domain', code: 'INVALID_FORMAT' };
  }

  // Check disposable domains
  const domainLower = domain.toLowerCase();
  if (DISPOSABLE_DOMAINS.has(domainLower)) {
    return { valid: false, message: 'Disposable email addresses are not allowed. Please use a permanent email.', code: 'DISPOSABLE' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /temp\d+@/,
    /fake\d+@/,
    /test\d+@/,
    /noreply\d+@/,
    /\+.*@/,  // Plus addressing can be abused for multiple accounts
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(normalizedEmail)) {
      // Not blocking, just flagging - could be legitimate use
      console.warn(`[EmailValidation] Suspicious email pattern: ${normalizedEmail}`);
    }
  }

  return { valid: true, message: 'Email format is valid', code: 'VALID' };
}

/**
 * Verify domain has valid MX records (email server exists)
 * Note: This can be slow, use sparingly
 */
export async function verifyEmailDomain(email: string): Promise<EmailValidationResult> {
  const formatCheck = validateEmailFormat(email);
  if (!formatCheck.valid) {
    return formatCheck;
  }

  const domain = email.split('@')[1];

  try {
    // Check MX records
    const mxRecords = await dnsResolveMx(domain);
    
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, message: 'Email domain does not accept emails', code: 'NO_MX_RECORD' };
    }

    // Check if any MX record has valid priority
    const validMx = mxRecords.some(mx => mx.priority >= 0 && mx.exchange);
    if (!validMx) {
      return { valid: false, message: 'Email domain mail server is not configured properly', code: 'NO_MX_RECORD' };
    }

    return { valid: true, message: 'Email domain verified', code: 'VALID' };
  } catch (error) {
    // Domain doesn't exist or DNS lookup failed
    return { valid: false, message: 'Email domain not found or unreachable', code: 'DOMAIN_NOT_FOUND' };
  }
}

/**
 * Full email validation (format + domain MX check)
 * Use this for critical signups, but consider caching results
 */
export async function fullEmailValidation(email: string, checkMx = false): Promise<EmailValidationResult> {
  // Always check format first (fast)
  const formatResult = validateEmailFormat(email);
  if (!formatResult.valid) {
    return formatResult;
  }

  // Optionally check MX records (slow, may timeout)
  if (checkMx) {
    return await verifyEmailDomain(email);
  }

  return formatResult;
}

/**
 * Check if email is from a free provider (Gmail, Yahoo, etc.)
 * Useful for deciding whether to enforce stricter validation
 */
export function isFreeEmailProvider(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  const freeProviders = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
    'live.com', 'msn.com', 'qq.com', '163.com', '126.com', 'sina.com',
    'rediffmail.com', 'inbox.com', 'gmx.com', 'gmx.net', 'hey.com',
  ];

  return freeProviders.includes(domain);
}

/**
 * Normalize email address
 * Gmail: remove dots from local part, remove plus addressing
 * Other providers: just lowercase
 */
export function normalizeEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  const [localPart, domain] = normalized.split('@');
  
  if (!domain) return normalized;

  // Gmail normalization
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove dots and plus addressing for Gmail
    const cleanLocal = localPart.replace(/\./g, '').split('+')[0];
    return `${cleanLocal}@gmail.com`;
  }

  return normalized;
}

/**
 * Check if two emails are the same (accounting for Gmail normalization)
 */
export function emailsAreEqual(email1: string, email2: string): boolean {
  return normalizeEmail(email1) === normalizeEmail(email2);
}
