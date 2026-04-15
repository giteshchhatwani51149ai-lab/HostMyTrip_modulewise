import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const { login, isLoading, error, clearError } = useAdminAuthStore();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    clearError();
    const ok = await login(email, pass);
    if (ok) navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'radial-gradient(ellipse at 30% 20%, rgba(14,165,233,0.08) 0%, transparent 70%), var(--bg)'
    }}>
      <div className="glass animate-in" style={{ width: '100%', maxWidth: 420, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, background: 'linear-gradient(135deg, var(--primary), #3B82F6)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 22, fontWeight: 800, color: 'white'
          }}>HMT</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Admin Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sign in with your admin or employee credentials</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@hostmytrip.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" required value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', padding: '13px 0', marginTop: 8, fontSize: 15 }}>
            {isLoading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Authenticating...</> : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
          Demo: admin@hostmytrip.com / Admin@123
        </p>
      </div>
    </div>
  );
}
