import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Shield, RefreshCw, ArrowLeft, User } from 'lucide-react';
import './Auth.css';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPass, setShowPass] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  // Verification flow states
  const [signupStep, setSignupStep] = useState('email'); // 'email' | 'otp' | 'details' | 'success'
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [emailMask, setEmailMask] = useState('');

  const { login, signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error') === 'oauth_failed';

  // OTP input refs
  const otpRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleLogin = async (e) => {
    e.preventDefault();
    clearError();

    const res = await login(email, password);
    if (res.success) {
      const role = useAuthStore.getState().user?.role;
      if (role === 'corporate_admin' || role === 'corporate_employee') {
        navigate('/corporate');
      } else {
        navigate('/');
      }
    }
  };

  // Step 1: Validate email and send OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    clearError();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      useAuthStore.setState({ error: 'Please enter a valid email address' });
      return;
    }

    setOtpSending(true);
    try {
      // Send OTP
      const res = await authAPI.sendVerificationOTP(email);
      setEmailMask(res.data.mask || email);
      setSignupStep('otp');
      setResendTimer(60); // 60 seconds cooldown
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send verification code';
      useAuthStore.setState({ error: msg });
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      useAuthStore.setState({ error: 'Please enter the complete 6-digit code' });
      return;
    }

    setOtpVerifying(true);
    try {
      await authAPI.verifyOTP(email, otpString);
      setSignupStep('details');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid verification code';
      useAuthStore.setState({ error: msg });
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setOtpVerifying(false);
    }
  };

  // Step 3: Complete signup with password
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (password.length < 8) {
      useAuthStore.setState({ error: 'Password must be at least 8 characters' });
      return;
    }

    const res = await signup({ email, password, name });
    if (res.success) {
      setSignupStep('success');
      // Auto-login after 1 second
      setTimeout(() => {
        navigate('/');
      }, 1500);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    clearError();

    setOtpSending(true);
    try {
      await authAPI.resendVerificationOTP(email);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code';
      useAuthStore.setState({ error: msg });
    } finally {
      setOtpSending(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    clearError();
    // Reset signup flow
    setSignupStep('email');
    setOtp(['', '', '', '', '', '']);
    setName('');
  };

  const goBackToEmail = () => {
    setSignupStep('email');
    clearError();
    setOtp(['', '', '', '', '', '']);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
        <div className="auth-bg-orb orb-3" />
      </div>

      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">HMT</div>
          <span className="auth-brand-name">HostMyTrip</span>
        </div>
        <div className="auth-tagline">
          <h1>Your Journey<br />Starts Here</h1>
          <p>Book hotels, flights, and experiences across India with the best prices guaranteed.</p>
        </div>
        <div className="auth-features">
          {['500+ Premium Hotels', 'Instant Confirmation', 'Free Cancellation', '24/7 Support'].map((f) => (
            <div key={f} className="auth-feature-item">
              <CheckCircle2 size={16} color="var(--primary)" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="glass-lg auth-card animate-in">
          <div className="auth-tabs">
            <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => isLogin || switchMode()}>
              Sign In
            </button>
            <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => !isLogin || switchMode()}>
              Sign Up
            </button>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            className="auth-google-btn"
            onClick={() => { window.location.href = 'http://localhost:5000/api/auth/google'; }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          {(error || oauthError) && (
            <div className="alert alert-error animate-in">
              <AlertCircle size={16} />
              <span>{oauthError ? 'Google sign-in failed. Please try again.' : error}</span>
            </div>
          )}

          {/* Success message after complete signup */}
          {signupStep === 'success' && (
            <div className="alert alert-success animate-in" style={{ flexDirection: 'column', alignItems: 'center', padding: 24 }}>
              <CheckCircle2 size={48} color="#10b981" />
              <strong style={{ fontSize: 18, marginTop: 16 }}>Welcome to HostMyTrip!</strong>
              <p style={{ fontSize: 14, marginTop: 8, textAlign: 'center' }}>Your account has been created successfully. Redirecting...</p>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLogin && (
            <form onSubmit={handleLogin} className="auth-form" autoComplete="off">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="you@example.com"
                    autoComplete="off"
                    name="login-email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                    minLength={6}
                    autoComplete="new-password"
                    name="login-password"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginTop: -12 }}>
                <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%' }}>
                {isLoading ? (
                  <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</>
                ) : 'Sign In'}
              </button>
            </form>
          )}

          {/* SIGNUP STEP 1: Email */}
          {!isLogin && signupStep === 'email' && (
            <form onSubmit={handleEmailSubmit} className="auth-form">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Shield size={20} color="var(--primary)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Verify Your Email</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                We'll send a 6-digit verification code to confirm your email address.
              </p>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={otpSending}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={otpSending} style={{ width: '100%' }}>
                {otpSending ? (
                  <><div className="spinner" style={{ width: 18, height: 18 }} /> Sending code...</>
                ) : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* SIGNUP STEP 2: OTP Verification */}
          {!isLogin && signupStep === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="auth-form">
              <button type="button" onClick={goBackToEmail} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
                <ArrowLeft size={14} /> Change email
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Shield size={20} color="var(--primary)" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Enter Verification Code</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Enter the 6-digit code sent to <strong>{emailMask}</strong>
              </p>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="form-input"
                    style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: 0 }}
                    disabled={otpVerifying}
                  />
                ))}
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={otpVerifying} style={{ width: '100%' }}>
                {otpVerifying ? (
                  <><div className="spinner" style={{ width: 18, height: 18 }} /> Verifying...</>
                ) : 'Verify Email'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendTimer > 0 || otpSending}
                  style={{ fontSize: 13, color: resendTimer > 0 ? 'var(--text-muted)' : 'var(--primary)', background: 'none', border: 'none', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto' }}
                >
                  <RefreshCw size={14} />
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {/* SIGNUP STEP 3: Password & Name */}
          {!isLogin && signupStep === 'details' && (
            <form onSubmit={handleSignupSubmit} className="auth-form">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircle2 size={20} color="#10b981" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Email Verified!</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Complete your profile to finish registration.
              </p>

              <div className="form-group">
                <label className="form-label">Full Name (Optional)</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    placeholder="John Doe"
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Min 8 characters"
                    minLength={8}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Must be at least 8 characters</p>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%' }}>
                {isLoading ? (
                  <><div className="spinner" style={{ width: 18, height: 18 }} /> Creating account...</>
                ) : 'Create Account'}
              </button>
            </form>
          )}

          <p className="auth-switch">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button type="button" className="auth-switch-btn" onClick={switchMode}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
