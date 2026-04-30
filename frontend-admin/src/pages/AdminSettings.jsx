import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../api';
import { Save, AlertCircle, Plane, Hotel } from 'lucide-react';

export default function AdminSettings() {
  const [hotelMargin, setHotelMargin] = useState('10');
  const [flightMargin, setFlightMargin] = useState('10');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await settingsAPI.getAll();
      if (res.data.hotel_margin_percent) {
        setHotelMargin(res.data.hotel_margin_percent);
      }
      if (res.data.flight_margin_percent) {
        setFlightMargin(res.data.flight_margin_percent);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      await Promise.all([
        settingsAPI.update('hotel_margin_percent', hotelMargin),
        settingsAPI.update('flight_margin_percent', flightMargin),
      ]);
      setMsg({ text: 'Settings updated successfully.', type: 'success' });
    } catch {
      setMsg({ text: 'Failed to update settings.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 800 }}>
      <h1 style={{ fontWeight: 800, fontSize: 32, marginBottom: 8, color: 'var(--text)' }}>Platform Settings</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Manage your application configuration and business logic variables.</p>

      <div className="card" style={{ padding: 30, background: 'var(--bg-panel)' }}>
        <h2 style={{ fontSize: 20, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 15 }}>Margins & Pricing</h2>

        {/* Hotel Margin */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            <Hotel size={18} /> Global Hotel Margin Percentage (%)
          </label>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            This percentage is added on top of the base price from live hotel APIs (SerpApi, Amadeus). Visible to users as the final price.
          </p>
          <input
            type="number"
            className="form-input"
            style={{ width: 150, fontSize: 18 }}
            value={hotelMargin}
            onChange={e => setHotelMargin(e.target.value)}
            min="0"
            max="100"
          />
        </div>

        {/* Flight Margin */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            <Plane size={18} /> Global Flight Margin Percentage (%)
          </label>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            This percentage is added on top of the base price from live flight APIs (Kiwi, Travelpayouts). Visible to users as the final price.
          </p>
          <input
            type="number"
            className="form-input"
            style={{ width: 150, fontSize: 18 }}
            value={flightMargin}
            onChange={e => setFlightMargin(e.target.value)}
            min="0"
            max="100"
          />
        </div>

        {msg.text && (
          <div className={`alert alert-${msg.type}`} style={{ marginBottom: 20 }}>
            <AlertCircle size={16} /> {msg.text}
          </div>
        )}

        <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Save size={16} /> {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
