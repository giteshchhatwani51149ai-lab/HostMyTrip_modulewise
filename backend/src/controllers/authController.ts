import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { emailService } from '../lib/email';
import { validateEmailFormat, normalizeEmail } from '../utils/emailValidation';
import { isEmailVerified, markEmailUsed } from './emailVerificationController';
import { logAudit, AUDIT } from '../services/auditService';


export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;
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
      res.status(400).json({ message: 'This email is already registered. Please login instead.' });
      return;
    }

    // 3. Check if email was verified via OTP (required for customer accounts)
    if (!isEmailVerified(normalizedEmail)) {
      res.status(403).json({ 
        message: 'Email verification required. Please verify your email with the OTP sent to you.',
        code: 'EMAIL_NOT_VERIFIED',
        requiresVerification: true
      });
      return;
    }

    // 4. Create user (already verified via OTP)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: 'customer', // Force customer role for self-registration
      isVerified: true, // Already verified via OTP
      name: name || null,
      phone: phone || null,
    });

    // 5. Mark email as used (clear OTP data)
    markEmailUsed(normalizedEmail);

    // 6. Send welcome email
    try {
      await emailService.sendWelcomeEmail({
        id: user.id,
        email: normalizedEmail,
        name: name || 'Traveler',
      });
    } catch (emailErr) {
      console.warn('[signup] Welcome email failed:', emailErr);
    }

    // 7. Auto-login after signup
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      corporateId: null,
      canBookHotels: true,
      canBookFlights: false,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    logAudit(req, {
      action: AUDIT.AUTH_SIGNUP,
      entityType: 'user',
      entityId: user.id,
      actor: { id: user.id, role: user.role, email: user.email },
      metadata: { name: name || null, phone: phone || null },
    });

    res.status(201).json({ 
      message: 'Registration successful! Welcome to HostMyTrip.',
      token,
      user: payload
    });
  } catch (error) {
    console.error('[signup] Error:', error);
    logAudit(req, {
      action: AUDIT.AUTH_SIGNUP,
      success: false,
      errorMessage: (error as any)?.message || 'signup failed',
      metadata: { email: req.body?.email },
    });
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token) {
      res.status(400).json({ message: 'Missing token' });
      return;
    }

    const user = await User.findOne({ where: { verificationToken: token as string } });
    if (!user) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: 'Email successfully verified. You can now login.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email', 'password', 'role', 'isVerified', 'corporateId', 'canBookHotels', 'canBookFlights'],
    });
    if (!user) {
      logAudit(req, {
        action: AUDIT.AUTH_LOGIN_FAILED,
        success: false,
        errorMessage: 'unknown email',
        metadata: { email },
      });
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    if (!user.isVerified) {
      logAudit(req, {
        action: AUDIT.AUTH_LOGIN_FAILED,
        actor: { id: user.id, email: user.email, role: user.role },
        success: false,
        errorMessage: 'email not verified',
      });
      res.status(403).json({ message: 'Please verify your email before logging in.' });
      return;
    }

    if (!user.password) {
      res.status(400).json({ message: 'This account uses Google sign-in. Please use "Continue with Google".' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logAudit(req, {
        action: AUDIT.AUTH_LOGIN_FAILED,
        actor: { id: user.id, email: user.email, role: user.role },
        success: false,
        errorMessage: 'wrong password',
      });
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      corporateId: (user as any).corporateId || null,
      canBookHotels: (user as any).canBookHotels ?? true,
      canBookFlights: (user as any).canBookFlights ?? false,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

    logAudit(req, {
      action: AUDIT.AUTH_LOGIN_SUCCESS,
      actor: { id: user.id, email: user.email, role: user.role },
      entityType: 'user',
      entityId: user.id,
    });

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: payload
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ message: 'Email is required.' }); return; }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ where: { email: normalizedEmail } });
    
    // Always return 200 to avoid email enumeration
    if (!user || !user.password) {
      res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await user.update({ resetPasswordToken: token, resetPasswordExpires: expires });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    // Send password reset email via production email service
    try {
      await emailService.sendPasswordReset(normalizedEmail, token);
      console.log('[forgotPassword] Password reset email sent to:', normalizedEmail);
    } catch (emailErr) {
      console.error('[forgotPassword] Failed to send email:', emailErr);
      // Still return success to prevent enumeration, but log the error
    }

    logAudit(req, {
      action: AUDIT.AUTH_PASSWORD_RESET_REQ,
      actor: { id: user.id, email: user.email, role: user.role },
      entityType: 'user',
      entityId: user.id,
    });

    res.status(200).json({
      message: 'If that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) { res.status(400).json({ message: 'Token and new password are required.' }); return; }
    if (password.length < 6) { res.status(400).json({ message: 'Password must be at least 6 characters.' }); return; }

    const user = await User.findOne({ where: { resetPasswordToken: token } });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      res.status(400).json({ message: 'Reset link is invalid or has expired.' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    await user.update({ password: hashed, resetPasswordToken: null, resetPasswordExpires: null });

    logAudit(req, {
      action: AUDIT.AUTH_PASSWORD_RESET_DONE,
      actor: { id: user.id, email: user.email, role: user.role },
      entityType: 'user',
      entityId: user.id,
    });

    res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user || null;
  res.status(200).json({
    authenticated: !!user,
    user,
  });
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'name', 'phone', 'dateOfBirth', 'avatar', 'role', 'googleId', 'createdAt'],
    });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { name, phone, dateOfBirth, avatar } = req.body;

    if (name !== undefined && (!name || name.trim().length < 2)) {
      res.status(400).json({ message: 'Name must be at least 2 characters.' });
      return;
    }
    if (phone !== undefined && phone && !/^[+]?[0-9\s\-().]{7,20}$/.test(phone)) {
      res.status(400).json({ message: 'Invalid phone number format.' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    await user.update({
      ...(name !== undefined && { name: name.trim() }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth || null }),
      ...(avatar !== undefined && { avatar: avatar || null }),
    });

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: user.id, email: user.email, name: user.name,
        phone: user.phone, dateOfBirth: user.dateOfBirth,
        avatar: user.avatar, role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
