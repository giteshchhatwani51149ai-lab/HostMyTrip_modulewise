import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function GoogleAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      navigate('/auth?error=oauth_failed', { replace: true });
      return;
    }

    loginWithToken(token);
    navigate('/', { replace: true });
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid var(--border)', borderTopColor: 'var(--primary)',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Signing you in with Google…</p>
    </div>
  );
}
