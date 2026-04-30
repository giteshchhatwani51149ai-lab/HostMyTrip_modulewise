/**
 * OTP-Based Email Verification Controller
 * For customer accounts - ensures email is real and owned by user
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models';
import { emailService } from '../lib/email';
import { validateEmailFormat, fullEmailValidation, normalizeEmail } from '../utils/emailValidation';

// In-memory OTP store (for production, use Redis or database)
// Structure: { email: { otp: string, expiresAt: Date, attempts: number, verified: boolean } }
const otpStore = new Map<string, {
  otp: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute between requests

// Rate limiting per email
const lastRequestTime = new Map<string, Date>();

/**
 * Generate 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to email for verification
 * POST /api/auth/send-verification-otp
 */
export const sendVerificationOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    // 1. Validate email format and check disposable
    const validation = validateEmailFormat(normalizedEmail);
    if (!validation.valid) {
      res.status(400).json({ message: validation.message, code: validation.code });
      return;
    }

    // 2. Check if email already registered
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      res.status(400).json({ message: 'This email is already registered. Please login or use a different email.', code: 'EMAIL_EXISTS' });
      return;
    }

    // 3. Rate limiting - check last request time
    const lastRequest = lastRequestTime.get(normalizedEmail);
    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest.getTime();
      if (timeSinceLastRequest < RATE_LIMIT_WINDOW_MS) {
        const waitSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - timeSinceLastRequest) / 1000);
        res.status(429).json({ 
          message: `Please wait ${waitSeconds} seconds before requesting another code`,
          retryAfter: waitSeconds 
        });
        return;
      }
    }

    // 4. Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 5. Store OTP
    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    // Update last request time
    lastRequestTime.set(normalizedEmail, new Date());

    // 6. Send email with OTP
    try {
      await emailService.sendOTPEmail({
        email: normalizedEmail,
        otp,
        expiresIn: OTP_EXPIRY_MINUTES,
      });

      res.status(200).json({
        message: 'Verification code sent to your email',
        email: normalizedEmail,
        expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
        mask: maskEmail(normalizedEmail),
      });
    } catch (emailError) {
      console.error('[EmailVerification] Failed to send OTP email:', emailError);
      // Clean up stored OTP
      otpStore.delete(normalizedEmail);
      res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }
  } catch (error) {
    console.error('[EmailVerification] Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Verify OTP code
 * POST /api/auth/verify-otp
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: 'Email and verification code are required' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const storedData = otpStore.get(normalizedEmail);

    if (!storedData) {
      res.status(400).json({ message: 'Verification code expired or not found. Please request a new code.', code: 'OTP_EXPIRED' });
      return;
    }

    // Check expiry
    if (storedData.expiresAt < new Date()) {
      otpStore.delete(normalizedEmail);
      res.status(400).json({ message: 'Verification code expired. Please request a new code.', code: 'OTP_EXPIRED' });
      return;
    }

    // Check attempts
    if (storedData.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(normalizedEmail);
      res.status(400).json({ message: 'Too many failed attempts. Please request a new code.', code: 'MAX_ATTEMPTS' });
      return;
    }

    // Verify OTP
    if (storedData.otp !== otp.trim()) {
      storedData.attempts++;
      const remainingAttempts = MAX_ATTEMPTS - storedData.attempts;
      res.status(400).json({ 
        message: `Invalid verification code. ${remainingAttempts} attempts remaining.`, 
        code: 'INVALID_OTP',
        remainingAttempts 
      });
      return;
    }

    // Mark as verified
    storedData.verified = true;

    res.status(200).json({
      message: 'Email verified successfully',
      verified: true,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('[EmailVerification] Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Check if email is verified (for signup validation)
 */
export function isEmailVerified(email: string): boolean {
  const normalizedEmail = normalizeEmail(email);
  const storedData = otpStore.get(normalizedEmail);
  return storedData?.verified === true && storedData.expiresAt > new Date();
}

/**
 * Mark email as used (after successful registration)
 */
export function markEmailUsed(email: string): void {
  const normalizedEmail = normalizeEmail(email);
  otpStore.delete(normalizedEmail);
  lastRequestTime.delete(normalizedEmail);
}

/**
 * Mask email for display (show only first 2 and last 2 chars of local part)
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 4) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***${localPart.slice(-2)}@${domain}`;
}

/**
 * Resend OTP
 * POST /api/auth/resend-verification-otp
 */
export const resendVerificationOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if already verified
    const storedData = otpStore.get(normalizedEmail);
    if (storedData?.verified) {
      res.status(400).json({ message: 'Email is already verified. Please complete registration.' });
      return;
    }

    // Delete old OTP and send new one
    otpStore.delete(normalizedEmail);

    // Call sendVerificationOTP again
    await sendVerificationOTP(req, res);
  } catch (error) {
    console.error('[EmailVerification] Resend error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Validate email for registration (comprehensive check)
 * Used internally before allowing signup
 */
export const validateEmailForRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, checkMx = false } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    // Check format
    const formatValidation = validateEmailFormat(normalizedEmail);
    if (!formatValidation.valid) {
      res.status(400).json(formatValidation);
      return;
    }

    // Check if already registered
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      res.status(400).json({ 
        valid: false, 
        message: 'This email is already registered', 
        code: 'EMAIL_EXISTS' 
      });
      return;
    }

    // Optional MX check
    if (checkMx) {
      const mxValidation = await fullEmailValidation(normalizedEmail, true);
      res.status(200).json(mxValidation);
      return;
    }

    res.status(200).json({ 
      valid: true, 
      message: 'Email is available for registration',
      code: 'VALID' 
    });
  } catch (error) {
    console.error('[EmailValidation] Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
