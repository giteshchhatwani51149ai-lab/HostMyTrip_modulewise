import React, { useEffect, useState } from 'react';
import { hotelsAPI } from '../api';
import { MapPin, Star } from 'lucide-react';

export default function AdminHotels() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hotelsAPI.getAll().then(r => { setHotels(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Hotels</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>{hotels.length} hotels in the database</p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {hotels.map(hotel => (
            <div key={hotel.id} className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                <img src={(hotel.images || [])[0]} alt={hotel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span className="badge badge-primary">{'★'.repeat(hotel.starRating)}</span>
                </div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{hotel.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <MapPin size={12} /> {hotel.city}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--accent)' }}>★ {hotel.rating?.toFixed(1)} ({hotel.reviewCount} reviews)</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                    from ₹{(hotel.minPrice || hotel.rooms?.reduce((m, r) => Math.min(m, r.pricePerNight), Infinity) || 0).toLocaleString()}/night
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {(hotel.rooms || []).map(r => (
                    <span key={r.id} style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 999, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{r.type}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
