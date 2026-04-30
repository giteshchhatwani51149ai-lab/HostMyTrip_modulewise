import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, ExternalLink, Loader } from 'lucide-react';
import { authAPI } from '../api/index';
import './Auth.css';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

export default function ForgotPassword() {
  const [status, setStatus] = useState('idle'); // idle | loading | success
  const [previewUrl, setPreviewUrl] = useState(null);
  const [serverError, setServerError] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }) => {
    setStatus('loading');
    setServerError(null);
    try {
      const res = await authAPI.forgotPassword(email);
      setPreviewUrl(res.data.previewUrl || null);
      setStatus('success');
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
          <h1>Forgot Your<br />Password?</h1>
          <p>No worries — enter your email and we'll send you a reset link instantly.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="glass-lg auth-card animate-in">
          <Link to="/auth" className="auth-back-link">
            <ArrowLeft size={15} /> Back to Sign In
          </Link>

          <h2 className="auth-card-title">Reset Password</h2>
          <p className="auth-card-sub">Enter your registered email to receive a reset link.</p>

          {status === 'success' ? (
            <div className="alert alert-success animate-in" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} />
                <strong>Reset link sent!</strong>
              </div>
              <p style={{ fontSize: 13 }}>Check your inbox. The link expires in 1 hour.</p>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer" className="preview-link">
                  <ExternalLink size={13} />
                  <span>Dev: Open Email Preview</span>
                </a>
              )}
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
                  <label className="form-label">Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      className={`form-input ${errors.email ? 'input-error' : ''}`}
                      placeholder="you@example.com"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="field-error">{errors.email.message}</p>}
                </div>

                <button type="submit" className="btn btn-primary btn-lg" disabled={status === 'loading'} style={{ width: '100%' }}>
                  {status === 'loading' ? (
                    <><Loader size={16} className="es-spinner" /> Sending...</>
                  ) : (
                    'Send Reset Link'
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
