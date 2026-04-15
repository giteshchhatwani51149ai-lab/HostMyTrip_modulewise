import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/auth/verify?token=${token}`);
        setStatus('success');
        setMessage(response.data.message);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. Token may be invalid or expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at top left, #0f172a, var(--bg-color))'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '400px',
        padding: '40px',
        textAlign: 'center'
      }}>
        {status === 'verifying' && (
          <div>
            <h2 style={{ marginBottom: '16px' }}>Verifying your email...</h2>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
            <style>
              {`@keyframes spin { to { transform: rotate(360deg); } }`}
            </style>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: '16px' }}>Email Verified!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{message}</p>
            <Link to="/auth" className="btn-primary" style={{ textDecoration: 'none' }}>
              Proceed to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertCircle size={48} color="var(--error)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ marginBottom: '16px' }}>Verification Failed</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{message}</p>
            <Link to="/auth" className="btn-primary" style={{ textDecoration: 'none' }}>
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
