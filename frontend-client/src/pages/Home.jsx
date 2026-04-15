import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Search, MapPin, Calendar, Users, Hotel, Plane, Star, ChevronRight, TrendingUp } from 'lucide-react';
import './Home.css';

const POPULAR_CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Goa', 'Hyderabad', 'Chennai'];

const FEATURED_DEALS = [
  { city: 'Goa', label: 'Beach Escape', discount: '35% OFF', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600' },
  { city: 'Hyderabad', label: 'Heritage Stay', discount: '20% OFF', img: 'https://images.unsplash.com/photo-1564778861297-1c95c4ffd73e?w=600' },
  { city: 'Mumbai', label: 'City Luxe', discount: '15% OFF', img: 'https://images.unsplash.com/photo-1565181932553-8c7c11e8d94f?w=600' },
];

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };

export default function Home() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState(today());
  const [checkOut, setCheckOut] = useState(tomorrow());
  const [guests, setGuests] = useState(2);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    navigate(`/hotels?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
  };

  return (
    <div className="home-page">
      {/* Navbar */}
      <nav className="navbar glass">
        <div className="container navbar-inner">
          <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="nav-logo">HMT</div>
            <span className="nav-name">HostMyTrip</span>
          </div>
          <div className="nav-links">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/hotels')}>Hotels</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>My Bookings</button>
          </div>
          <div className="nav-user">
            <span className="nav-email">{user?.email}</span>
            <button className="btn btn-secondary btn-sm" onClick={logout}>Logout</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600" alt="" className="hero-img" />
          <div className="hero-overlay" />
        </div>

        <div className="container hero-content">
          <div className="hero-tabs">
            <button className="hero-tab active"><Hotel size={16} /> Hotels</button>
            <button className="hero-tab" onClick={() => navigate('/flights')}><Plane size={16} /> Flights</button>
          </div>

          <h1 className="hero-title">Find Your Perfect Stay</h1>
          <p className="hero-subtitle">Discover 500+ premium hotels across India with unbeatable rates</p>

          <form className="search-widget glass-lg" onSubmit={handleSearch}>
            <div className="search-field">
              <label><MapPin size={14} /> Destination</label>
              <input
                type="text"
                placeholder="City or Hotel name"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                list="city-list"
              />
              <datalist id="city-list">
                {POPULAR_CITIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="search-divider" />
            <div className="search-field">
              <label><Calendar size={14} /> Check In</label>
              <input type="date" value={checkIn} min={today()} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="search-divider" />
            <div className="search-field">
              <label><Calendar size={14} /> Check Out</label>
              <input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="search-divider" />
            <div className="search-field">
              <label><Users size={14} /> Guests</label>
              <input type="number" value={guests} min={1} max={10} onChange={(e) => setGuests(Number(e.target.value))} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg search-btn">
              <Search size={18} /> Search
            </button>
          </form>

          <div className="popular-cities">
            {POPULAR_CITIES.map(c => (
              <button key={c} className="city-pill" onClick={() => { setCity(c); }}>
                <MapPin size={12} /> {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Deals */}
      <section className="section container">
        <div className="section-header">
          <div>
            <h2 className="section-title">Featured Deals</h2>
            <p className="section-sub">Handpicked offers just for you</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/hotels')}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="deals-grid">
          {FEATURED_DEALS.map(deal => (
            <div key={deal.city} className="deal-card card" onClick={() => navigate(`/hotels?city=${deal.city}`)}>
              <div className="deal-img-wrap">
                <img src={deal.img} alt={deal.city} className="deal-img" />
                <div className="deal-badge">{deal.discount}</div>
              </div>
              <div className="deal-info">
                <h3>{deal.label}</h3>
                <p><MapPin size={12} /> {deal.city}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section container">
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 40 }}>Why HostMyTrip?</h2>
        <div className="features-grid">
          {[
            { icon: '🏨', title: 'Curated Hotels', desc: 'Every hotel is handpicked and verified for quality and comfort.' },
            { icon: '💰', title: 'Best Price Guarantee', desc: "Find a cheaper rate? We'll match it. No questions asked." },
            { icon: '🔒', title: 'Secure Payments', desc: 'Pay with confidence using Stripe-encrypted transactions.' },
            { icon: '🎯', title: 'Lock Price Option', desc: 'Secure your booking with just 30% upfront. Pay the rest at check-in.' },
            { icon: '⭐', title: 'Verified Reviews', desc: 'Only guests who actually stayed can leave reviews. Always authentic.' },
            { icon: '📞', title: '24/7 Support', desc: 'Our concierge team is available round the clock for assistance.' },
          ].map(f => (
            <div key={f.title} className="feature-card glass">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <p>© 2026 HostMyTrip. All rights reserved.</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Powered by Antigravity</p>
        </div>
      </footer>
    </div>
  );
}
