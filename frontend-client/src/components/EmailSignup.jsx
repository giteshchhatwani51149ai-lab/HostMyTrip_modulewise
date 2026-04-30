import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowRight, CheckCircle, X, Loader } from 'lucide-react';
import { newsletterAPI } from '../api/index';
import './EmailSignup.css';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

export default function EmailSignup({ compact = false }) {
  const [status, setStatus] = useState('idle'); // idle | loading | success
  const [toast, setToast] = useState(null); // { type: 'error'|'info', msg }

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
  });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const onSubmit = async ({ email }) => {
    setStatus('loading');
    try {
      const res = await newsletterAPI.subscribe(email);
      setStatus('success');
      reset();
      showToast('success', res.data.message);
    } catch (err) {
      setStatus('idle');
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      showToast('error', msg);
    }
  };

  if (status === 'success') {
    return (
      <div className={`es-wrap ${compact ? 'es-compact' : ''} es-success-state`}>
        <CheckCircle size={40} className="es-success-icon" />
        <h3 className="es-success-title">You're in!</h3>
        <p className="es-success-sub">Your ₹500 coupon is on its way to your inbox.</p>
        <button className="es-reset-btn" onClick={() => setStatus('idle')}>
          Subscribe another email
        </button>
      </div>
    );
  }

  return (
    <div className={`es-wrap ${compact ? 'es-compact' : ''}`}>
      {/* Toast */}
      {toast && (
        <div className={`es-toast es-toast-${toast.type}`}>
          <span>{toast.msg}</span>
          <button className="es-toast-close" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {!compact && (
        <div className="es-header">
          <div className="es-icon-wrap"><Mail size={22} /></div>
          <div>
            <h2 className="es-title">Get ₹500 Off on Your First Booking</h2>
            <p className="es-sub">Join 50,000+ travellers. No spam, unsubscribe anytime.</p>
          </div>
        </div>
      )}

      {compact && (
        <p className="es-compact-label">
          <Mail size={14} /> Get ₹500 off — subscribe to our newsletter
        </p>
      )}

      <form className="es-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={`es-input-wrap ${errors.email ? 'es-input-err' : ''}`}>
          <Mail size={16} className="es-input-icon" />
          <input
            type="email"
            className="es-input"
            placeholder="Enter your email address"
            {...register('email')}
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            className="es-submit-btn"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <Loader size={16} className="es-spinner" />
            ) : (
              <>
                {compact ? <ArrowRight size={16} /> : <><ArrowRight size={16} /> Get ₹500 Off</>}
              </>
            )}
          </button>
        </div>
        {errors.email && (
          <span className="es-field-err">{errors.email.message}</span>
        )}
      </form>

      {!compact && (
        <p className="es-disclaimer">
          🔒 We respect your privacy. Unsubscribe at any time.
        </p>
      )}
    </div>
  );
}
