import React from 'react';
import { CheckCircle2, Clock, AlertCircle, XCircle, Loader2 } from 'lucide-react';

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

function Step({ done, current, icon, title, subtitle, time }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '6px 0' }}>
      <div style={{
        width: 32, height: 32, minWidth: 32, borderRadius: '50%',
        background: done ? '#10b981' : current ? '#3b82f6' : 'var(--bg-elevated)',
        border: done || current ? 'none' : '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: done || current ? '#fff' : 'var(--text-muted)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: done || current ? 'var(--text)' : 'var(--text-muted)' }}>
          {title}
        </p>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>}
        {time && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(time)}</p>}
      </div>
    </div>
  );
}

/**
 * RefundTimeline — Visualizes refund progress for a cancelled booking.
 *
 * Props (all from booking object):
 *  - refundStatus:        'none' | 'initiated' | 'processing' | 'completed' | 'failed'
 *  - refundAmount:        number
 *  - cancellationFee:     number
 *  - refundInitiatedAt:   ISO date string
 *  - refundCompletedAt:   ISO date string | null
 *  - refundFailureReason: string | null
 *  - paymentGateway:      'razorpay' | 'paypal' | 'corporate_credit' | string | null
 *  - cancelledAt:         ISO date string
 */
export default function RefundTimeline({
  refundStatus = 'none',
  refundAmount = 0,
  cancellationFee = 0,
  refundInitiatedAt,
  refundCompletedAt,
  refundFailureReason,
  paymentGateway,
  cancelledAt,
}) {
  if (refundStatus === 'none') return null;

  // Determine which steps are reached
  const isInitiated   = ['initiated', 'processing', 'completed', 'failed'].includes(refundStatus);
  const isCompleted   = refundStatus === 'completed';
  const isFailed      = refundStatus === 'failed';

  const gatewayLabel = {
    razorpay:         'Razorpay',
    paypal:           'PayPal',
    corporate_credit: 'Corporate Credit',
  }[paymentGateway] || 'Payment gateway';

  // Pretty status badge
  const badge = (() => {
    switch (refundStatus) {
      case 'initiated':  return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: 'Refund Initiated' };
      case 'processing': return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', text: 'Refund Processing' };
      case 'completed':  return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', text: 'Refund Completed' };
      case 'failed':     return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  text: 'Refund Failed' };
      default:           return { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', text: 'Unknown' };
    }
  })();

  return (
    <div>
      {/* Status badge + amount */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
          color: badge.color, background: badge.bg, border: `1px solid ${badge.color}33`,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {refundStatus === 'processing' && <Loader2 size={12} style={{ animation: 'spin 1.2s linear infinite' }} />}
          {badge.text}
        </span>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Refund Amount</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#10b981' }}>₹{Number(refundAmount || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Failure banner */}
      {isFailed && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <strong>Refund could not be processed automatically.</strong>
            {refundFailureReason && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{refundFailureReason}</div>}
            <div style={{ marginTop: 6, fontSize: 12 }}>Please contact support at <a href="mailto:support@hostmytrip.com" style={{ color: '#ef4444', fontWeight: 600 }}>support@hostmytrip.com</a> with your booking reference.</div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div style={{ position: 'relative' }}>
        <Step
          done
          icon={<CheckCircle2 size={16} />}
          title="Cancellation requested"
          subtitle={cancellationFee > 0 ? `Cancellation fee of ₹${Number(cancellationFee).toLocaleString('en-IN')} applied` : 'Free cancellation'}
          time={cancelledAt}
        />
        <Step
          done={isInitiated}
          icon={isInitiated ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          title="Refund initiated"
          subtitle={`We've sent the refund request to ${gatewayLabel}`}
          time={refundInitiatedAt}
        />
        <Step
          done={isCompleted}
          current={refundStatus === 'processing'}
          icon={
            isCompleted   ? <CheckCircle2 size={16} /> :
            isFailed      ? <XCircle size={16} /> :
            refundStatus === 'processing' ? <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} /> :
            <Clock size={16} />
          }
          title={isFailed ? 'Refund failed at gateway' : `Processing with ${gatewayLabel}`}
          subtitle={
            isCompleted ? 'Money returned to your original payment method' :
            isFailed    ? 'See error message above' :
            paymentGateway === 'corporate_credit' ? 'Restoring corporate credit balance' :
            'Usually takes 5–7 business days for bank to credit'
          }
        />
        <Step
          done={isCompleted}
          icon={isCompleted ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          title={isCompleted ? 'Refund completed' : 'Refund will appear in your account'}
          subtitle={isCompleted ? `₹${Number(refundAmount || 0).toLocaleString('en-IN')} credited to your ${gatewayLabel} account` : 'You\'ll receive an email when the refund is credited'}
          time={refundCompletedAt}
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
