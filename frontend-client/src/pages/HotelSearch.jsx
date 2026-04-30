import React, { useEffect, useRef, useCallback, Suspense, lazy, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import HotelCard    from '../components/hotels/HotelCard';
import HotelFilters from '../components/hotels/HotelFilters';
const HotelMap = lazy(() => import('../components/hotels/HotelMap'));
import { useHotelSearchStore, paramsFromURL, paramsToURL } from '../store/hotelSearchStore';
import { hotelsAPI } from '../api';
import { Filter, MapIcon, List as ListIcon, Loader2, Search, MapPin, Calendar, Users } from 'lucide-react';
import './HotelSearch.css';

const SORT_OPTIONS = [
  { val: 'recommended', label: 'Recommended' },
  { val: 'price_asc',   label: 'Price: Low to High' },
  { val: 'price_desc',  label: 'Price: High to Low' },
  { val: 'rating',      label: 'Guest Rating' },
  { val: 'stars',       label: 'Star Rating' },
];

const INDIAN_CITIES = [
  'Mumbai','Delhi','Bengaluru','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad',
  'Goa','Jaipur','Udaipur','Agra','Varanasi','Kochi','Mysuru','Shimla','Manali',
  'Darjeeling','Rishikesh','Amritsar','Srinagar','Dehradun','Jodhpur','Bhopal',
  'Indore','Nagpur','Chandigarh','Bhubaneswar','Guwahati','Pondicherry',
];

export default function HotelSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sentinelRef = useRef(null);
  const [mobileView, setMobileView]     = useState('list');   // list | map
  const [showFilters, setShowFilters]   = useState(false);

  // Local search form state
  const s = useHotelSearchStore();
  const [localCity, setLocalCity]       = useState('');
  const [localCheckIn, setLocalCheckIn] = useState('');
  const [localCheckOut, setLocalCheckOut] = useState('');
  const [localAdults, setLocalAdults]   = useState(2);
  const [localRooms, setLocalRooms]     = useState(1);
  const [cityQuery, setCityQuery]       = useState('');
  const [showCitySuggest, setShowCitySuggest] = useState(false);
  const cityRef = useRef(null);

  const todayStr = () => new Date().toISOString().split('T')[0];
  const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };
  const dayAfterStr = () => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0]; };

  const filtered = s.getFilteredHotels();
  const visible  = filtered.slice(0, s.visibleCount);

  /* ── Sync local form from store on mount ─────────────────── */
  useEffect(() => {
    setLocalCity(s.city || '');
    setCityQuery(s.city || '');
    setLocalCheckIn(s.checkIn || tomorrowStr());
    setLocalCheckOut(s.checkOut || dayAfterStr());
    setLocalAdults(s.adults || 2);
    setLocalRooms(s.rooms || 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Close city suggestions on outside click ──────────────── */
  useEffect(() => {
    const handler = (e) => { if (cityRef.current && !cityRef.current.contains(e.target)) setShowCitySuggest(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Handle search submit ──────────────────────────────────── */
  const handleSearch = (e) => {
    e.preventDefault();
    if (!localCity.trim()) return;
    s.setSearchParams({ city: localCity, checkIn: localCheckIn, checkOut: localCheckOut, adults: localAdults, rooms: localRooms, children: 0 });
  };

  /* ── Hydrate store from URL on mount ──────────────────────── */
  useEffect(() => {
    const params = paramsFromURL(searchParams);
    s.setSearchParams(params);
    Object.entries(params).forEach(([k, v]) => {
      if (k in s && JSON.stringify(s[k]) !== JSON.stringify(v)) {
        s.setFilter(k, v);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync store -> URL whenever relevant state changes ─────── */
  useEffect(() => {
    const qs = paramsToURL(s);
    if (qs !== searchParams.toString()) {
      setSearchParams(qs, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    s.city, s.checkIn, s.checkOut, s.rooms, s.adults, s.children,
    s.priceMin, s.priceMax, s.starRating, s.guestRating,
    s.amenities, s.propertyTypes, s.freeCancellation, s.sort,
  ]);

  /* ── Fetch results when search params change ──────────────── */
  const fetchResults = useCallback(async (city, checkIn, checkOut, rooms, adults, children) => {
    if (!city) return;
    s.setLoading(true);
    try {
      const today = new Date(); today.setDate(today.getDate() + 1);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 2);
      const res = await hotelsAPI.affiliateSearch({
        city,
        checkIn:  checkIn  || today.toISOString().split('T')[0],
        checkOut: checkOut || tomorrow.toISOString().split('T')[0],
        rooms, adults, children,
      });
      s.setResults({
        results: res.data.results || [],
        center:  res.data.center,
        source:  res.data.source,
      });
    } catch (err) {
      s.setError(err.response?.data?.message || 'Failed to load hotels');
      s.setResults({ results: [], center: s.center, source: 'mock' });
    } finally {
      s.setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!s.city) return; // don't auto-search without a city
    fetchResults(s.city, s.checkIn, s.checkOut, s.rooms, s.adults, s.children);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.city, s.checkIn, s.checkOut, s.rooms, s.adults, s.children]);

  /* ── Infinite scroll via Intersection Observer ────────────── */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && s.visibleCount < filtered.length) {
        s.loadMore();
      }
    }, { rootMargin: '300px' });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [filtered.length, s.visibleCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const citySuggestions = INDIAN_CITIES.filter(c =>
    c.toLowerCase().includes(cityQuery.toLowerCase()) && cityQuery.length > 0
  ).slice(0, 6);

  return (
    <div className="hs-page">
      <SEO
        title="Search Hotels – Best Deals on Rooms"
        description="Find and book hotels across India. Compare prices, read reviews, and get instant confirmation."
      />
      <Navbar />

      {/* ── Search Bar ── */}
      <div className="hs-search-bar-wrap">
        <form className="hs-search-bar" onSubmit={handleSearch}>
          {/* City */}
          <div className="hs-search-field hs-city-field" ref={cityRef}>
            <MapPin size={14} className="hs-field-icon" />
            <div className="hs-field-inner">
              <label className="hs-field-label">Destination</label>
              <input
                className="hs-field-input"
                placeholder="City or area"
                value={cityQuery}
                onChange={e => { setCityQuery(e.target.value); setLocalCity(e.target.value); setShowCitySuggest(true); }}
                onFocus={() => setShowCitySuggest(true)}
                autoComplete="off"
              />
            </div>
            {showCitySuggest && citySuggestions.length > 0 && (
              <div className="hs-city-dropdown">
                {citySuggestions.map(c => (
                  <div key={c} className="hs-city-option" onMouseDown={() => { setLocalCity(c); setCityQuery(c); setShowCitySuggest(false); }}>
                    <MapPin size={11}/> {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check-in */}
          <div className="hs-search-field">
            <Calendar size={14} className="hs-field-icon" />
            <div className="hs-field-inner">
              <label className="hs-field-label">Check-in</label>
              <input type="date" className="hs-field-input"
                value={localCheckIn}
                min={todayStr()}
                onChange={e => setLocalCheckIn(e.target.value)}
              />
            </div>
          </div>

          {/* Check-out */}
          <div className="hs-search-field">
            <Calendar size={14} className="hs-field-icon" />
            <div className="hs-field-inner">
              <label className="hs-field-label">Check-out</label>
              <input type="date" className="hs-field-input"
                value={localCheckOut}
                min={localCheckIn || tomorrowStr()}
                onChange={e => setLocalCheckOut(e.target.value)}
              />
            </div>
          </div>

          {/* Guests & Rooms */}
          <div className="hs-search-field hs-guests-field">
            <Users size={14} className="hs-field-icon" />
            <div className="hs-field-inner">
              <label className="hs-field-label">Guests & Rooms</label>
              <div className="hs-guests-row">
                <span>{localAdults} Adult{localAdults !== 1 ? 's' : ''}</span>
                <span className="hs-guests-sep">·</span>
                <span>{localRooms} Room{localRooms !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="hs-guests-controls">
              <div className="hs-gc-row">
                <span>Adults</span>
                <div className="hs-gc-btns">
                  <button type="button" onClick={() => setLocalAdults(a => Math.max(1, a-1))}>−</button>
                  <span>{localAdults}</span>
                  <button type="button" onClick={() => setLocalAdults(a => Math.min(10, a+1))}>+</button>
                </div>
              </div>
              <div className="hs-gc-row">
                <span>Rooms</span>
                <div className="hs-gc-btns">
                  <button type="button" onClick={() => setLocalRooms(r => Math.max(1, r-1))}>−</button>
                  <span>{localRooms}</span>
                  <button type="button" onClick={() => setLocalRooms(r => Math.min(5, r+1))}>+</button>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="hs-search-btn">
            <Search size={16}/> Search
          </button>
        </form>
      </div>

      {/* Top bar with city + sort + counts + mobile toggle */}
      <div className="hs-toolbar">
        <div className="hs-search-summary">
          <strong>{s.center?.name || s.city || 'Hotels'}</strong>
          <span className="hs-summary-meta">
            {filtered.length} properties
            {s.source === 'mock' && <span className="hs-mock-badge">demo data</span>}
          </span>
        </div>

        <div className="hs-toolbar-right">
          <button className="hs-mobile-btn hs-filter-btn" onClick={() => setShowFilters(true)}>
            <Filter size={15}/> Filters
          </button>

          <select
            className="hs-sort"
            value={s.sort}
            onChange={(e) => s.setFilter('sort', e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.val} value={o.val}>Sort: {o.label}</option>
            ))}
          </select>

          <div className="hs-mobile-toggle">
            <button
              className={mobileView === 'list' ? 'active' : ''}
              onClick={() => setMobileView('list')}
            ><ListIcon size={15}/> List</button>
            <button
              className={mobileView === 'map' ? 'active' : ''}
              onClick={() => setMobileView('map')}
            ><MapIcon size={15}/> Map</button>
          </div>
        </div>
      </div>

      {/* Main split layout */}
      <div className="hs-layout">
        {/* Filters sidebar — desktop */}
        <div className="hs-sidebar"><HotelFilters /></div>

        {/* Hotel list */}
        <div className={`hs-list ${mobileView === 'map' ? 'hs-hide-mobile' : ''}`}>
          {s.loading && (
            <div className="hs-loading"><Loader2 size={20} className="hs-spin"/> Searching hotels…</div>
          )}
          {!s.loading && filtered.length === 0 && (
            <div className="hs-empty">
              No hotels match your filters. Try adjusting them.
            </div>
          )}
          {visible.map((h) => <HotelCard key={h.id} hotel={h} />)}
          {s.visibleCount < filtered.length && (
            <div ref={sentinelRef} className="hs-sentinel">
              <Loader2 size={18} className="hs-spin"/> Loading more…
            </div>
          )}
        </div>

        {/* Map — lazy loaded to keep initial bundle small */}
        <div className={`hs-map ${mobileView === 'list' ? 'hs-hide-mobile' : ''}`}>
          <Suspense fallback={<div className="hs-loading"><Loader2 size={20} className="hs-spin"/> Loading map…</div>}>
            <HotelMap hotels={filtered} />
          </Suspense>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {showFilters && (
        <div className="hs-drawer-backdrop" onClick={() => setShowFilters(false)}>
          <div className="hs-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="hs-drawer-close" onClick={() => setShowFilters(false)}>×</button>
            <HotelFilters />
          </div>
        </div>
      )}
    </div>
  );
}
