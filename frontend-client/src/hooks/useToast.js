import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * useToast — wrapper around sonner with app-specific helpers.
 *
 * Usage:
 *   const { success, error, warning, info, loading, bookingConfirmed } = useToast();
 *   success('Booking confirmed!', { description: 'Ref: HMT-001' });
 *   bookingConfirmed({ id: 42, ref: 'HMT-001' });
 *   const id = loading('Processing payment...');
 *   toast.dismiss(id);
 */
export function useToast() {
  const navigate = useNavigate();

  const success = (message, opts = {}) =>
    toast.success(message, { duration: 4000, ...opts });

  const error = (message, opts = {}) =>
    toast.error(message, { duration: 5000, ...opts });

  const warning = (message, opts = {}) =>
    toast.warning(message, { duration: 5000, ...opts });

  const info = (message, opts = {}) =>
    toast.info(message, { duration: 4000, ...opts });

  const loading = (message, opts = {}) =>
    toast.loading(message, { ...opts });

  const promise = (promiseFn, opts) =>
    toast.promise(promiseFn, opts);

  // ── App-specific helpers ──

  const bookingConfirmed = ({ id, ref } = {}) =>
    toast.success('Booking confirmed!', {
      description: ref ? `Booking ref: ${ref}` : 'Your booking is confirmed.',
      duration: 6000,
      action: id ? {
        label: 'View',
        onClick: () => navigate(`/bookings/${id}`),
      } : undefined,
    });

  const paymentFailed = (message = 'Payment failed. Please try again.') =>
    toast.error('Payment Failed', {
      description: message,
      duration: 5000,
    });

  const bookingCancelled = ({ refundAmount } = {}) =>
    toast.success('Booking cancelled', {
      description: refundAmount
        ? `Refund of ₹${Number(refundAmount).toLocaleString('en-IN')} will be processed in 7–10 business days.`
        : 'Your booking has been cancelled.',
      duration: 6000,
    });

  const priceChanged = () =>
    toast.warning('Price changed since search', {
      description: 'Review the updated price before booking.',
      duration: 6000,
    });

  const eTicketSent = () =>
    toast.info('Your e-ticket has been sent to your email.', {
      duration: 5000,
    });

  const processingPayment = () =>
    toast.loading('Processing payment...', {
      description: 'Please do not close this window.',
    });

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss: toast.dismiss,
    bookingConfirmed,
    paymentFailed,
    bookingCancelled,
    priceChanged,
    eTicketSent,
    processingPayment,
  };
}
