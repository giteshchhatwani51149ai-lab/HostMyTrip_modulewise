import React, { useState } from 'react';
import { paymentsAPI } from '../../api/index';
import { useAuthStore } from '../../store/authStore';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const s = document.createElement('script');
    s.id  = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function RazorpayCheckout({ bookingId, amount, onSuccess, onFailure }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handlePay = async () => {
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { onFailure('Failed to load Razorpay SDK'); return; }

      const { data } = await paymentsAPI.createOrder({ bookingId, amount });

      const options = {
        key:      data.key,
        amount:   data.amount,
        currency: data.currency || 'INR',
        name:     'HostMyTrip',
        description: `Flight Booking #${bookingId}`,
        order_id: data.orderId,
        prefill: {
          name:  user?.name  || '',
          email: user?.email || '',
        },
        theme: { color: '#FF6B00' },
        handler: async (response) => {
          try {
            const verifyRes = await paymentsAPI.verify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              bookingId,
            });
            onSuccess(verifyRes.data);
          } catch (err) {
            onFailure(err.response?.data?.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onFailure('Payment cancelled');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        onFailure(resp.error?.description || 'Payment failed');
      });
      rzp.open();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'NO_RAZORPAY_KEY') {
        onFailure('Payment gateway not configured. Please contact support.');
      } else {
        onFailure(err.response?.data?.message || 'Could not initiate payment');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`rzp-pay-btn ${loading ? 'loading' : ''}`}
      onClick={handlePay}
      disabled={loading}
    >
      {loading
        ? <><span className="rzp-spinner" /> Processing…</>
        : <>Pay ₹{Number(amount).toLocaleString('en-IN')} Securely</>
      }
    </button>
  );
}
