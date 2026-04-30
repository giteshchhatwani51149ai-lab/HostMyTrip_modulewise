import { Router, Request, Response } from 'express';
import { signup, verifyEmail, login, getMe, forgotPassword, resetPassword, getProfile, updateProfile } from '../controllers/authController';
import { sendVerificationOTP, verifyOTP, resendVerificationOTP, validateEmailForRegistration } from '../controllers/emailVerificationController';
import { authenticate } from '../middleware/auth';
import passport from '../config/passport';
import jwt from 'jsonwebtoken';

const router = Router();

// ── Email Verification (OTP) ──
router.post('/validate-email', validateEmailForRegistration);
router.post('/send-verification-otp', sendVerificationOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-verification-otp', resendVerificationOTP);

router.post('/signup', signup);
router.get('/verify', verifyEmail);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ── Google OAuth ──
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth?error=oauth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/google/success?token=${token}`);
  }
);

export default router;
