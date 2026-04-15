import React, { useState, useEffect } from 'react';
import { reviewsAPI, bookingsAPI } from '../api';
import { X, Star, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ReviewModal({ hotelId, onClose, onSuccess }) {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchEligibleBookings();
  }, []);

  const fetchEligibleBookings = async () => {
    try {
      const res = await bookingsAPI.getMy();
      const eligible = res.data.filter(b => String(b.hotelId) === String(hotelId) && b.status === 'confirmed' && !b.review);
      setBookings(eligible);
      if (eligible.length > 0) setSelectedBooking(eligible[0].id);
    } catch (_) {}
  };

  const handleSubmit = async () => {
    if (!selectedBooking) { setError('No eligible booking found for this hotel.'); return; }
    setLoading(true);
    setError('');
    try {
      await reviewsAPI.create({ bookingId: selectedBooking, rating, comment });
      setSuccess(true);
      setTimeout(onSuccess, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container glass-lg animate-in" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Write a Review</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {success ? (
          <div className="booking-success">
            <CheckCircle2 size={48} color="var(--success)" />
            <h3>Review Submitted!</h3>
            <p>Thank you for your feedback.</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="alert alert-info" style={{ margin: '20px 0' }}>
            <AlertCircle size={16} />
            <span>You can only review hotels you have confirmed bookings for via HostMyTrip.</span>
          </div>
        ) : (
          <>
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>Your Rating</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1,2,3,4,5].map(s => (
                    <button
                      key={s}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 32, color: s <= (hoverRating || rating) ? 'var(--accent)' : 'var(--text-dim)',
                        transition: 'var(--transition)', padding: 0
                      }}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                    >★</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Your Review</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Share your experience at this hotel..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  style={{ resize: 'vertical', minHeight: 100 }}
                />
              </div>
              {error && <div className="alert alert-error"><AlertCircle size={16} /> {error}</div>}
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
