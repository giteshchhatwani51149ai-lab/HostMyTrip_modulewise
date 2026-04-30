import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { authAPI } from '../api/index';
import './Auth.css';

const schema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success
  const [serverError, setServerError] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-bg"><div className="auth-bg-orb orb-1" /></div>
        <div className="auth-right" style={{ width: '100%', justifyContent: 'center' }}>
          <div className="glass-lg auth-card animate-in" style={{ textAlign: 'center' }}>
            <AlertCircle size={40} color="var(--error)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: 'var(--text)', marginBottom: 8 }}>Invalid Reset Link</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              This password reset link is missing or invalid.
            </p>
            <Link to="/forgot-password" className="btn btn-primary">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async ({ password }) => {
    setStatus('loading');
    setServerError(null);
    try {
      await authAPI.resetPassword(token, password);
      setStatus('success');
      setTimeout(() => navigate('/auth'), 3000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setStatus('idle');
    }
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
          <h1>Create a New<br />Password</h1>
          <p>Choose a strong password to keep your account secure.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="glass-lg auth-card animate-in">
          <Link to="/auth" className="auth-back-link">
            <ArrowLeft size={15} /> Back to Sign In
          </Link>

          <h2 className="auth-card-title">Set New Password</h2>
          <p className="auth-card-sub">Your new password must be at least 6 characters.</p>

          {status === 'success' ? (
            <div className="alert alert-success animate-in" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} />
                <strong>Password reset successfully!</strong>
              </div>
              <p style={{ fontSize: 13 }}>Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="alert alert-error animate-in">
                  <AlertCircle size={16} />
                  <span>{serverError}</span>
                </div>
              )}

              <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      className={`form-input ${errors.password ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      style={{ paddingRight: 44 }}
                      {...register('password')}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="field-error">{errors.password.message}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      style={{ paddingRight: 44 }}
                      {...register('confirmPassword')}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" className="btn btn-primary btn-lg" disabled={status === 'loading'} style={{ width: '100%' }}>
                  {status === 'loading' ? (
                    <><Loader size={16} className="es-spinner" /> Resetting...</>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
