import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import './Auth.css';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);

  const { login, signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setResult(null);

    if (isLogin) {
      const res = await login(email, password);
      if (res.success) navigate('/');
    } else {
      const res = await signup(email, password);
      if (res.success) {
        setResult(res);
      }
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setResult(null);
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

          {error && (
            <div className="alert alert-error animate-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {result?.success && (
            <div className="alert alert-success animate-in" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} />
                <strong>Registration Successful!</strong>
              </div>
              <p style={{ fontSize: 13, marginTop: 4 }}>We've sent a verification link to <strong>{email}</strong>. Please check your inbox.</p>
              {result.previewUrl && (
                <a href={result.previewUrl} target="_blank" rel="noreferrer" className="preview-link">
                  <ExternalLink size={13} />
                  <span>Dev: Open Email Preview</span>
                </a>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
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

            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%' }}>
              {isLoading ? (
                <><div className="spinner" style={{ width: 18, height: 18 }} /> Processing...</>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

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
