import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/Navbar';
import EmailSignup from '../components/EmailSignup';
import {
  Search, MapPin, Calendar, Users, Hotel, Plane, Package,
  ChevronRight, ArrowLeftRight, Plus, Minus, User, ChevronDown,
  Phone, Mail, Shield, Star, Zap, Clock, Award, Globe,
} from 'lucide-react';
import './Home.css';

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Goa', 'Jaipur', 'Udaipur', 'Agra',
  'Varanasi', 'Kochi', 'Mysuru', 'Shimla', 'Manali', 'Darjeeling',
  'Rishikesh', 'Amritsar', 'Srinagar', 'Ladakh', 'Coorg', 'Ooty',
  'Bhopal', 'Indore', 'Nagpur', 'Chandigarh', 'Dehradun', 'Jodhpur',
  'Pushkar', 'Hampi', 'Madurai', 'Pondicherry', 'Tirupati', 'Vizag',
  'Patna', 'Ranchi', 'Bhubaneswar', 'Raipur', 'Guwahati', 'Shillong',
];

const FLIGHT_CITIES = [
  // ── India ──
  { code: 'BOM', city: 'Mumbai', airport: 'Chhatrapati Shivaji Maharaj Intl', country: 'India' },
  { code: 'DEL', city: 'Delhi', airport: 'Indira Gandhi International', country: 'India' },
  { code: 'BLR', city: 'Bengaluru', airport: 'Kempegowda International', country: 'India' },
  { code: 'HYD', city: 'Hyderabad', airport: 'Rajiv Gandhi International', country: 'India' },
  { code: 'MAA', city: 'Chennai', airport: 'Chennai International', country: 'India' },
  { code: 'CCU', city: 'Kolkata', airport: 'Netaji Subhas Chandra Bose Intl', country: 'India' },
  { code: 'GOI', city: 'Goa', airport: 'Goa International (Manohar)', country: 'India' },
  { code: 'JAI', city: 'Jaipur', airport: 'Jaipur International', country: 'India' },
  { code: 'COK', city: 'Kochi', airport: 'Cochin International', country: 'India' },
  { code: 'AMD', city: 'Ahmedabad', airport: 'Sardar Vallabhbhai Patel Intl', country: 'India' },
  { code: 'PNQ', city: 'Pune', airport: 'Pune Airport', country: 'India' },
  { code: 'SXR', city: 'Srinagar', airport: 'Sheikh ul Alam International', country: 'India' },
  { code: 'IXB', city: 'Bagdogra', airport: 'Bagdogra Airport (Darjeeling)', country: 'India' },
  { code: 'IXC', city: 'Chandigarh', airport: 'Chandigarh International', country: 'India' },
  { code: 'ATQ', city: 'Amritsar', airport: 'Sri Guru Ram Dass Jee Intl', country: 'India' },
  { code: 'GAU', city: 'Guwahati', airport: 'Lokpriya Gopinath Bordoloi Intl', country: 'India' },
  { code: 'VTZ', city: 'Vizag', airport: 'Visakhapatnam Airport', country: 'India' },
  { code: 'BBI', city: 'Bhubaneswar', airport: 'Biju Patnaik International', country: 'India' },
  { code: 'IDR', city: 'Indore', airport: 'Devi Ahilyabai Holkar Airport', country: 'India' },
  { code: 'NAG', city: 'Nagpur', airport: 'Dr. Babasaheb Ambedkar Intl', country: 'India' },
  // ── Middle East ──
  { code: 'DXB', city: 'Dubai', airport: 'Dubai International', country: 'UAE' },
  { code: 'AUH', city: 'Abu Dhabi', airport: 'Zayed International', country: 'UAE' },
  { code: 'SHJ', city: 'Sharjah', airport: 'Sharjah International', country: 'UAE' },
  { code: 'DOH', city: 'Doha', airport: 'Hamad International', country: 'Qatar' },
  { code: 'RUH', city: 'Riyadh', airport: 'King Khalid International', country: 'Saudi Arabia' },
  { code: 'JED', city: 'Jeddah', airport: 'King Abdulaziz International', country: 'Saudi Arabia' },
  { code: 'MCT', city: 'Muscat', airport: 'Muscat International', country: 'Oman' },
  { code: 'KWI', city: 'Kuwait City', airport: 'Kuwait International', country: 'Kuwait' },
  { code: 'BAH', city: 'Bahrain', airport: 'Bahrain International', country: 'Bahrain' },
  // ── South East Asia ──
  { code: 'SIN', city: 'Singapore', airport: 'Changi Airport', country: 'Singapore' },
  { code: 'BKK', city: 'Bangkok', airport: 'Suvarnabhumi Airport', country: 'Thailand' },
  { code: 'DMK', city: 'Bangkok (Don Mueang)', airport: 'Don Mueang International', country: 'Thailand' },
  { code: 'KUL', city: 'Kuala Lumpur', airport: 'Kuala Lumpur International (KLIA)', country: 'Malaysia' },
  { code: 'CGK', city: 'Jakarta', airport: 'Soekarno-Hatta International', country: 'Indonesia' },
  { code: 'DPS', city: 'Bali', airport: 'Ngurah Rai International', country: 'Indonesia' },
  { code: 'MNL', city: 'Manila', airport: 'Ninoy Aquino International', country: 'Philippines' },
  { code: 'SGN', city: 'Ho Chi Minh City', airport: 'Tan Son Nhat International', country: 'Vietnam' },
  { code: 'HAN', city: 'Hanoi', airport: 'Noi Bai International', country: 'Vietnam' },
  { code: 'RGN', city: 'Yangon', airport: 'Yangon International', country: 'Myanmar' },
  { code: 'PNH', city: 'Phnom Penh', airport: 'Phnom Penh International', country: 'Cambodia' },
  { code: 'REP', city: 'Siem Reap', airport: 'Siem Reap–Angkor International', country: 'Cambodia' },
  { code: 'CMB', city: 'Colombo', airport: 'Bandaranaike International', country: 'Sri Lanka' },
  { code: 'KTM', city: 'Kathmandu', airport: 'Tribhuvan International', country: 'Nepal' },
  { code: 'DAC', city: 'Dhaka', airport: 'Hazrat Shahjalal International', country: 'Bangladesh' },
  // ── Europe ──
  { code: 'LHR', city: 'London', airport: 'Heathrow Airport', country: 'UK' },
  { code: 'LGW', city: 'London', airport: 'Gatwick Airport', country: 'UK' },
  { code: 'CDG', city: 'Paris', airport: 'Charles de Gaulle Airport', country: 'France' },
  { code: 'ORY', city: 'Paris', airport: 'Orly Airport', country: 'France' },
  { code: 'FRA', city: 'Frankfurt', airport: 'Frankfurt Airport', country: 'Germany' },
  { code: 'MUC', city: 'Munich', airport: 'Franz Josef Strauss Airport', country: 'Germany' },
  { code: 'AMS', city: 'Amsterdam', airport: 'Amsterdam Schiphol', country: 'Netherlands' },
  { code: 'MAD', city: 'Madrid', airport: 'Adolfo Suárez Madrid–Barajas', country: 'Spain' },
  { code: 'BCN', city: 'Barcelona', airport: 'El Prat Airport', country: 'Spain' },
  { code: 'FCO', city: 'Rome', airport: 'Leonardo da Vinci–Fiumicino', country: 'Italy' },
  { code: 'MXP', city: 'Milan', airport: 'Malpensa Airport', country: 'Italy' },
  { code: 'ZRH', city: 'Zurich', airport: 'Zurich Airport', country: 'Switzerland' },
  { code: 'VIE', city: 'Vienna', airport: 'Vienna International', country: 'Austria' },
  { code: 'BRU', city: 'Brussels', airport: 'Brussels Airport', country: 'Belgium' },
  { code: 'CPH', city: 'Copenhagen', airport: 'Copenhagen Airport', country: 'Denmark' },
  { code: 'ARN', city: 'Stockholm', airport: 'Stockholm Arlanda', country: 'Sweden' },
  { code: 'OSL', city: 'Oslo', airport: 'Oslo Gardermoen', country: 'Norway' },
  { code: 'HEL', city: 'Helsinki', airport: 'Helsinki-Vantaa Airport', country: 'Finland' },
  { code: 'ATH', city: 'Athens', airport: 'Athens International', country: 'Greece' },
  { code: 'IST', city: 'Istanbul', airport: 'Istanbul Airport', country: 'Turkey' },
  { code: 'SAW', city: 'Istanbul (Sabiha)', airport: 'Sabiha Gökçen International', country: 'Turkey' },
  { code: 'PRG', city: 'Prague', airport: 'Václav Havel Airport', country: 'Czech Republic' },
  { code: 'BUD', city: 'Budapest', airport: 'Budapest Ferenc Liszt Intl', country: 'Hungary' },
  { code: 'WAW', city: 'Warsaw', airport: 'Warsaw Chopin Airport', country: 'Poland' },
  { code: 'DUB', city: 'Dublin', airport: 'Dublin Airport', country: 'Ireland' },
  { code: 'LIS', city: 'Lisbon', airport: 'Humberto Delgado Airport', country: 'Portugal' },
  // ── USA & Canada ──
  { code: 'JFK', city: 'New York', airport: 'John F. Kennedy International', country: 'USA' },
  { code: 'EWR', city: 'New York (Newark)', airport: 'Newark Liberty International', country: 'USA' },
  { code: 'LAX', city: 'Los Angeles', airport: 'Los Angeles International', country: 'USA' },
  { code: 'ORD', city: 'Chicago', airport: "O'Hare International", country: 'USA' },
  { code: 'SFO', city: 'San Francisco', airport: 'San Francisco International', country: 'USA' },
  { code: 'MIA', city: 'Miami', airport: 'Miami International', country: 'USA' },
  { code: 'IAH', city: 'Houston', airport: 'George Bush Intercontinental', country: 'USA' },
  { code: 'DFW', city: 'Dallas', airport: 'Dallas/Fort Worth International', country: 'USA' },
  { code: 'SEA', city: 'Seattle', airport: 'Seattle-Tacoma International', country: 'USA' },
  { code: 'BOS', city: 'Boston', airport: 'Logan International', country: 'USA' },
  { code: 'YYZ', city: 'Toronto', airport: 'Toronto Pearson International', country: 'Canada' },
  { code: 'YVR', city: 'Vancouver', airport: 'Vancouver International', country: 'Canada' },
  // ── Australia & NZ ──
  { code: 'SYD', city: 'Sydney', airport: 'Kingsford Smith Airport', country: 'Australia' },
  { code: 'MEL', city: 'Melbourne', airport: 'Melbourne Airport', country: 'Australia' },
  { code: 'BNE', city: 'Brisbane', airport: 'Brisbane Airport', country: 'Australia' },
  { code: 'PER', city: 'Perth', airport: 'Perth Airport', country: 'Australia' },
  { code: 'AKL', city: 'Auckland', airport: 'Auckland Airport', country: 'New Zealand' },
  // ── East Asia ──
  { code: 'NRT', city: 'Tokyo', airport: 'Narita International', country: 'Japan' },
  { code: 'HND', city: 'Tokyo (Haneda)', airport: 'Haneda Airport', country: 'Japan' },
  { code: 'KIX', city: 'Osaka', airport: 'Kansai International', country: 'Japan' },
  { code: 'ICN', city: 'Seoul', airport: 'Incheon International', country: 'South Korea' },
  { code: 'PEK', city: 'Beijing', airport: 'Capital International', country: 'China' },
  { code: 'PVG', city: 'Shanghai', airport: 'Pudong International', country: 'China' },
  { code: 'HKG', city: 'Hong Kong', airport: 'Hong Kong International', country: 'Hong Kong' },
  { code: 'TPE', city: 'Taipei', airport: 'Taiwan Taoyuan International', country: 'Taiwan' },
  // ── Africa ──
  { code: 'JNB', city: 'Johannesburg', airport: 'O. R. Tambo International', country: 'South Africa' },
  { code: 'CPT', city: 'Cape Town', airport: 'Cape Town International', country: 'South Africa' },
  { code: 'CAI', city: 'Cairo', airport: 'Cairo International', country: 'Egypt' },
  { code: 'NBO', city: 'Nairobi', airport: 'Jomo Kenyatta International', country: 'Kenya' },
  { code: 'TUN', city: 'Tunis', airport: 'Tunis-Carthage International', country: 'Tunisia' },
  { code: 'CMN', city: 'Casablanca', airport: 'Mohammed V International', country: 'Morocco' },
  { code: 'RAK', city: 'Marrakech', airport: 'Menara Airport', country: 'Morocco' },
  { code: 'ALG', city: 'Algiers', airport: 'Houari Boumediene Airport', country: 'Algeria' },
  { code: 'ADD', city: 'Addis Ababa', airport: 'Bole International', country: 'Ethiopia' },
  { code: 'LOS', city: 'Lagos', airport: 'Murtala Muhammed International', country: 'Nigeria' },
  { code: 'ABV', city: 'Abuja', airport: 'Nnamdi Azikiwe International', country: 'Nigeria' },
  { code: 'ACC', city: 'Accra', airport: 'Kotoka International', country: 'Ghana' },
  { code: 'DAR', city: 'Dar es Salaam', airport: 'Julius Nyerere International', country: 'Tanzania' },
  { code: 'EBB', city: 'Kampala', airport: 'Entebbe International', country: 'Uganda' },
];

const POPULAR_DESTINATIONS = [
  { name: 'Dubai', tag: 'Luxury', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=700', from: '₹12,999', code: 'DXB', flightFrom: 'BOM' },
  { name: 'Bangkok', tag: 'Adventure', img: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=700', from: '₹9,499', code: 'BKK', flightFrom: 'DEL' },
  { name: 'Singapore', tag: 'City Break', img: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=700', from: '₹11,299', code: 'SIN', flightFrom: 'BOM' },
  { name: 'Maldives', tag: 'Beach', img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=700', from: '₹18,999', code: 'MLE', flightFrom: 'BLR' },
  { name: 'Bali', tag: 'Tropical', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=700', from: '₹14,499', code: 'DPS', flightFrom: 'DEL' },
  { name: 'Goa', tag: 'Beach', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=700', from: '₹3,299', code: 'GOI', flightFrom: 'DEL' },
  { name: 'Kerala', tag: 'Backwaters', img: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=500', from: '₹6,999' },
  { name: 'Ladakh', tag: 'Adventure', img: 'https://images.unsplash.com/photo-1619454016518-697bc231e7cb?w=500', from: '₹8,999' },
  { name: 'Andaman', tag: 'Islands', img: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=500', from: '₹9,499' },
];

const TOUR_PACKAGES = [
  {
    name: 'Golden Triangle Tour',
    places: 'Delhi • Agra • Jaipur',
    nights: '5N/6D',
    price: '₹18,999',
    originalPrice: '₹26,000',
    img: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600',
    tag: 'Best Seller',
    rating: 4.8,
    reviews: 2341,
  },
  {
    name: 'Kerala Backwaters Bliss',
    places: 'Kochi • Alleppey • Munnar',
    nights: '4N/5D',
    price: '₹14,499',
    originalPrice: '₹20,000',
    img: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=600',
    tag: 'Top Rated',
    rating: 4.9,
    reviews: 1876,
  },
  {
    name: 'Goa Beach Getaway',
    places: 'North Goa • South Goa',
    nights: '3N/4D',
    price: '₹9,999',
    originalPrice: '₹14,000',
    img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600',
    tag: 'Party Favourite',
    rating: 4.7,
    reviews: 3102,
  },
  {
    name: 'Himalayan Adventure',
    places: 'Manali • Rohtang • Solang',
    nights: '5N/6D',
    price: '₹16,799',
    originalPrice: '₹22,500',
    img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600',
    tag: 'Adventure',
    rating: 4.6,
    reviews: 987,
  },
];


const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (dateStr, n) => { const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };
const formatDate = (str) => { if (!str) return ''; const d = new Date(str); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };

function CityDropdown({ value, onChange, placeholder, fallbackCities = [], label, icon: Icon, mode = 'flight' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState('');
  const ref = useRef();
  const debounceRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (query.length < 2) {
      const fallback = fallbackCities.slice(0, 8).map(c =>
        typeof c === 'string'
          ? { code: c, city: c, airport: '', country: '', type: 'CITY' }
          : c
      );
      setResults(fallback);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Photon API by Komoot — free, no key, OpenStreetMap powered, worldwide
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en`;
        const res = await fetch(url);
        const data = await res.json();

        // Always prioritise hardcoded FLIGHT_CITIES first (they have correct IATA codes)
        const q = query.toLowerCase();
        const iataMatches = fallbackCities
          .filter(c => typeof c !== 'string' && (
            c.city.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            (c.airport || '').toLowerCase().includes(q) ||
            (c.country || '').toLowerCase().includes(q)
          ))
          .slice(0, 8)
          .map(c => ({ ...c, type: 'AIRPORT' }));

        if (iataMatches.length > 0) {
          setResults(iataMatches);
        } else {
          // Fall back to Photon results, but try to find IATA match by city name
          const seen = new Set();
          const mapped = (data.features || [])
            .filter(f => {
              const type = f.properties?.type;
              const name = f.properties?.name;
              if (!name) return false;
              const allowed = ['city', 'town', 'village', 'district', 'suburb', 'aerodrome', 'airport', 'municipality', 'county', 'state'];
              if (!allowed.includes(type)) return false;
              const key = `${name}-${f.properties?.country}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .map(f => {
              const p = f.properties;
              const isAirport = p.type === 'aerodrome' || p.type === 'airport';
              // Try to find a matching IATA code from FLIGHT_CITIES
              const iataMatch = fallbackCities.find(c =>
                typeof c !== 'string' &&
                c.city.toLowerCase() === p.name?.toLowerCase()
              );
              return {
                code: iataMatch?.code || '',
                city: p.name,
                airport: isAirport ? p.name : (p.city || p.county || ''),
                country: p.country || '',
                type: isAirport ? 'AIRPORT' : 'CITY',
              };
            })
            .filter(r => r.code) // only show results with known IATA codes
            .slice(0, 8);

          setResults(mapped.length > 0 ? mapped : iataMatches);
        }
      } catch {
        const fallback = fallbackCities
          .filter(c => {
            const name = typeof c === 'string' ? c : `${c.city} ${c.country || ''}`;
            return name.toLowerCase().includes(query.toLowerCase());
          })
          .slice(0, 8)
          .map(c => typeof c === 'string'
            ? { code: c, city: c, airport: '', country: '', type: 'CITY' }
            : c
          );
        setResults(fallback);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, open, fallbackCities]);

  // Sync display label when value is changed externally (e.g. swap button)
  useEffect(() => {
    if (!value) { setSelectedDisplay(''); return; }
    // If already showing something sensible keep it, else clear so placeholder shows
    setSelectedDisplay(prev => {
      if (!prev) return '';
      // If the code no longer matches the display, clear it
      const match = fallbackCities.find(c => typeof c !== 'string' && c.code === value);
      if (match) return `${match.city}, ${match.country || ''}`;
      return '';
    });
  }, [value, fallbackCities]);

  const handleSelect = (item) => {
    onChange(mode === 'flight' ? item.code : item.city);
    setSelectedDisplay(`${item.city}${item.country ? `, ${item.country}` : ''}`);
    setOpen(false);
    setQuery('');
  };

  const handleOpen = () => {
    setOpen(true);
    const fallback = fallbackCities.slice(0, 8).map(c =>
      typeof c === 'string'
        ? { code: c, city: c, airport: '', country: '', type: 'CITY' }
        : c
    );
    setResults(fallback);
  };

  return (
    <div className="city-dropdown-wrap" ref={ref}>
      <label className="sf-label"><Icon size={13} /> {label}</label>
      <div className="sf-value" onClick={handleOpen}>
        {selectedDisplay || value
          ? <span>{selectedDisplay || value}</span>
          : <span className="sf-placeholder">{placeholder}</span>
        }
        {mode === 'flight' && value && !selectedDisplay && (
          <span className="sf-code">{value}</span>
        )}
      </div>
      {open && (
        <div className="city-dropdown">
          <div className="city-search-wrap">
            <Search size={14} className="city-search-icon" />
            <input
              className="city-search-input"
              autoFocus
              placeholder="Type city, airport or country..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {loading && <div className="city-search-spinner" />}
          </div>
          <div className="city-list">
            {results.length === 0 && !loading && (
              <div className="city-no-results">No results found</div>
            )}
            {results.map((item, i) => (
              <div key={item.code + i} className="city-option" onClick={() => handleSelect(item)}>
                <div className={`city-opt-type-icon ${item.type === 'AIRPORT' ? 'type-airport' : 'type-city'}`}>
                  {item.type === 'AIRPORT' ? <Plane size={13} /> : <MapPin size={13} />}
                </div>
                <div className="city-opt-info">
                  <div className="city-opt-name">
                    {item.city}
                    {item.country && <span className="city-opt-country">, {item.country}</span>}
                  </div>
                  {item.airport && item.airport !== item.city && (
                    <div className="city-opt-airport">{item.airport}</div>
                  )}
                </div>
                {item.code && <span className="city-opt-code">{item.code}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PassengerSelector({ adults, children, infants, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const total = adults + children + infants;

  const counter = (label, sub, val, key, min = 0) => (
    <div className="pax-row">
      <div>
        <div className="pax-label">{label}</div>
        <div className="pax-sub">{sub}</div>
      </div>
      <div className="pax-controls">
        <button type="button" className="pax-btn" disabled={val <= min} onClick={() => onChange({ adults, children, infants, [key]: val - 1 })}>
          <Minus size={14} />
        </button>
        <span className="pax-val">{val}</span>
        <button type="button" className="pax-btn" disabled={total >= 9} onClick={() => onChange({ adults, children, infants, [key]: val + 1 })}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="pax-dropdown-wrap" ref={ref}>
      <label className="sf-label"><Users size={13} /> Travellers</label>
      <div className="sf-value" onClick={() => setOpen(o => !o)}>
        {total} Traveller{total !== 1 ? 's' : ''}
        <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--text-dim)' }} />
      </div>
      {open && (
        <div className="pax-dropdown">
          {counter('Adults', '12+ yrs', adults, 'adults', 1)}
          {counter('Children', '2–12 yrs', children, 'children')}
          {counter('Infants', 'Under 2 yrs', infants, 'infants')}
          <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

const TRAVEL_CLASSES = [
  { value: 'Economy', label: 'Economy', desc: 'Best value, standard seating', icon: '💺' },
  { value: 'Premium Economy', label: 'Premium Economy', desc: 'Extra legroom & comfort', icon: '🛋️' },
  { value: 'Business', label: 'Business Class', desc: 'Lie-flat seats & premium meals', icon: '💼' },
  { value: 'First', label: 'First Class', desc: 'Ultimate luxury experience', icon: '👑' },
];

function ClassSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = TRAVEL_CLASSES.find(c => c.value === value) || TRAVEL_CLASSES[0];
  return (
    <div className="class-selector-wrap" ref={ref}>
      <label className="sf-label"><User size={13} /> Class</label>
      <div className="sf-value class-sf-value" onClick={() => setOpen(o => !o)}>
        <span>{selected.icon} {selected.label}</span>
        <ChevronDown size={13} style={{ marginLeft: 'auto', color: 'var(--text-dim)' }} />
      </div>
      {open && (
        <div className="class-dropdown">
          {TRAVEL_CLASSES.map(c => (
            <div
              key={c.value}
              className={`class-option ${value === c.value ? 'class-option-active' : ''}`}
              onClick={() => { onChange(c.value); setOpen(false); }}
            >
              <span className="class-opt-icon">{c.icon}</span>
              <div className="class-opt-info">
                <div className="class-opt-label">{c.label}</div>
                <div className="class-opt-desc">{c.desc}</div>
              </div>
              {value === c.value && <span className="class-opt-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({ label, value, onChange, min }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const today = new Date(); today.setHours(0,0,0,0);
  const minDate = min ? new Date(min + 'T00:00:00') : today;
  const initDate = value ? new Date(value + 'T00:00:00') : (minDate > today ? minDate : today);
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const openCalendar = () => {
    const base = value ? new Date(value + 'T00:00:00') : (minDate > today ? minDate : today);
    setViewYear(base.getFullYear()); setViewMonth(base.getMonth());
    setOpen(true);
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const selectDay = (d) => {
    const picked = new Date(viewYear, viewMonth, d);
    if (picked < minDate) return;
    const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    onChange(iso); setOpen(false);
  };

  const isSelected = (d) => {
    if (!value) return false;
    const v = new Date(value + 'T00:00:00');
    return v.getDate() === d && v.getMonth() === viewMonth && v.getFullYear() === viewYear;
  };
  const isDisabled = (d) => new Date(viewYear, viewMonth, d) < minDate;
  const isToday = (d) => {
    const t = new Date(); return d === t.getDate() && viewMonth === t.getMonth() && viewYear === t.getFullYear();
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="cal-wrap" ref={ref}>
      <label className="sf-label"><Calendar size={13} /> {label}</label>
      <div className="sf-value cal-trigger" onClick={openCalendar}>
        {value ? formatDate(value) : <span className="sf-placeholder">Select date</span>}
        <ChevronDown size={13} style={{ marginLeft: 'auto', color: 'var(--text-dim)' }} />
      </div>
      {open && (
        <div className="cal-dropdown">
          <div className="cal-header">
            <button type="button" className="cal-nav-btn" onClick={prevMonth}>&lsaquo;</button>
            <span className="cal-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="cal-nav-btn" onClick={nextMonth}>&rsaquo;</button>
          </div>
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
            {cells.map((d, i) => (
              <div
                key={i}
                className={`cal-day ${!d ? 'cal-empty' : ''} ${d && isSelected(d) ? 'cal-selected' : ''} ${d && isToday(d) && !isSelected(d) ? 'cal-today' : ''} ${d && isDisabled(d) ? 'cal-disabled' : ''}`}
                onClick={() => d && !isDisabled(d) && selectDay(d)}
              >
                {d || ''}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FlightTab() {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState('roundtrip');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [depart, setDepart] = useState('');
  const [returnDate, setReturnDate] = useState(addDays(todayStr(), 7));
  const [pax, setPax] = useState({ adults: 1, children: 0, infants: 0 });
  const [travelClass, setTravelClass] = useState('Economy');

  const swap = () => { setFrom(to); setTo(from); };

  const [flightError, setFlightError] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!from) { setFlightError('Please enter a departure city or airport.'); return; }
    if (!to)   { setFlightError('Please enter a destination city or airport.'); return; }
    if (!depart) { setFlightError('Please select a departure date.'); return; }
    setFlightError('');
    navigate(`/flights/search?from=${from}&to=${to}&depart=${depart}&return=${returnDate}&adults=${pax.adults}&children=${pax.children}&infants=${pax.infants}&class=${travelClass}&type=${tripType}`);
  };

  return (
    <form className="tab-form" onSubmit={handleSearch}>
      <div className="trip-type-row">
        {['oneway', 'roundtrip', 'multicity'].map(t => (
          <label key={t} className={`trip-type-opt ${tripType === t ? 'active' : ''}`}>
            <input type="radio" name="tripType" value={t} checked={tripType === t} onChange={() => setTripType(t)} />
            {t === 'oneway' ? 'One Way' : t === 'roundtrip' ? 'Round Trip' : 'Multi City'}
          </label>
        ))}
      </div>
      <div className="flight-row-top">
        <div className="search-field-box">
          <CityDropdown value={from} onChange={setFrom} placeholder="From city or airport" fallbackCities={FLIGHT_CITIES} label="From" icon={Plane} mode="flight" />
        </div>
        <button type="button" className="swap-btn" onClick={swap}><ArrowLeftRight size={18} /></button>
        <div className="search-field-box">
          <CityDropdown value={to} onChange={setTo} placeholder="To city or airport" fallbackCities={FLIGHT_CITIES} label="To" icon={MapPin} mode="flight" />
        </div>
        <CalendarPicker label="Departure" value={depart} onChange={setDepart} min={todayStr()} />
        {tripType === 'roundtrip' && (
          <CalendarPicker label="Return" value={returnDate} onChange={setReturnDate} min={depart || todayStr()} />
        )}
      </div>
      <div className="flight-row-bottom">
        <div className="search-field-box pax-box">
          <PassengerSelector {...pax} onChange={setPax} />
        </div>
        <div className="search-field-box class-box">
          <ClassSelector value={travelClass} onChange={setTravelClass} />
        </div>
        <div className="flight-row-spacer" />
        <button type="submit" className="search-submit-btn">
          <Search size={20} /> Search Flights
        </button>
      </div>
      {flightError && (
        <div style={{ color:'#ef4444', fontSize:12, fontWeight:600, marginTop:6, padding:'0 4px' }}>
          ⚠ {flightError}
        </div>
      )}
    </form>
  );
}

function HotelTab() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [rooms, setRooms] = useState(1);
  const [guests, setGuests] = useState(2);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    navigate(`/hotels?city=${encodeURIComponent(city)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&rooms=${rooms}`);
  };

  return (
    <form className="tab-form" onSubmit={handleSearch}>
      <div className="hotel-search-row">
        <div className="search-field-box">
          <CityDropdown value={city} onChange={setCity} placeholder="City, area or hotel" fallbackCities={INDIAN_CITIES} label="City / Hotel / Area" icon={MapPin} mode="hotel" />
        </div>
        <CalendarPicker label="Check-In" value={checkIn} onChange={setCheckIn} min={todayStr()} />
        <CalendarPicker label="Check-Out" value={checkOut} onChange={setCheckOut} min={checkIn || todayStr()} />
        <div className="search-field-box">
          <label className="sf-label"><Users size={13} /> Rooms & Guests</label>
          <div className="rooms-guests-row">
            <div className="rg-item">
              <button type="button" className="pax-btn" disabled={rooms <= 1} onClick={() => setRooms(r => r - 1)}><Minus size={12} /></button>
              <span>{rooms} Room{rooms > 1 ? 's' : ''}</span>
              <button type="button" className="pax-btn" disabled={rooms >= 5} onClick={() => setRooms(r => r + 1)}><Plus size={12} /></button>
            </div>
            <span className="rg-sep">·</span>
            <div className="rg-item">
              <button type="button" className="pax-btn" disabled={guests <= 1} onClick={() => setGuests(g => g - 1)}><Minus size={12} /></button>
              <span>{guests} Guest{guests > 1 ? 's' : ''}</span>
              <button type="button" className="pax-btn" disabled={guests >= 10} onClick={() => setGuests(g => g + 1)}><Plus size={12} /></button>
            </div>
          </div>
        </div>
        <button type="submit" className="search-submit-btn">
          <Search size={20} /> Search Hotels
        </button>
      </div>
    </form>
  );
}

function PackageTab() {
  const navigate = useNavigate();
  const [dest, setDest] = useState('');
  const [depart, setDepart] = useState('');
  const [duration, setDuration] = useState('5');
  const [adults, setAdults] = useState(2);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/packages?dest=${encodeURIComponent(dest)}&depart=${depart}&duration=${duration}&adults=${adults}`);
  };

  return (
    <form className="tab-form" onSubmit={handleSearch}>
      <div className="hotel-search-row">
        <div className="search-field-box">
          <CityDropdown value={dest} onChange={setDest} placeholder="Destination or Theme" fallbackCities={INDIAN_CITIES} label="Going To" icon={Globe} mode="hotel" />
        </div>
        <CalendarPicker label="Departure Date" value={depart} onChange={setDepart} min={todayStr()} />
        <div className="search-field-box">
          <label className="sf-label"><Clock size={13} /> Duration</label>
          <select className="sf-select sf-select-lg" value={duration} onChange={e => setDuration(e.target.value)}>
            {['3', '4', '5', '6', '7', '8', '10', '14'].map(d => (
              <option key={d} value={d}>{d} Nights</option>
            ))}
          </select>
        </div>
        <div className="search-field-box">
          <label className="sf-label"><Users size={13} /> Adults</label>
          <div className="rg-item" style={{ marginTop: 8 }}>
            <button type="button" className="pax-btn" disabled={adults <= 1} onClick={() => setAdults(a => a - 1)}><Minus size={12} /></button>
            <span style={{ minWidth: 60, textAlign: 'center' }}>{adults} Adult{adults > 1 ? 's' : ''}</span>
            <button type="button" className="pax-btn" disabled={adults >= 10} onClick={() => setAdults(a => a + 1)}><Plus size={12} /></button>
          </div>
        </div>
        <button type="submit" className="search-submit-btn">
          <Search size={20} /> Search Packages
        </button>
      </div>
    </form>
  );
}

export default function Home() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('flights');

  // Redirect corporate users away from the public home page
  useEffect(() => {
    if (user?.role === 'corporate_admin' || user?.role === 'corporate_employee') {
      navigate('/corporate', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="home-page">
      {/* ===== NAVBAR ===== */}
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="hero-section" id="search-hero">
        <div className="hero-bg-wrap">
          <img
            src={
              activeTab === 'flights'
                ? 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600'
                : activeTab === 'hotels'
                ? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600'
                : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600'
            }
            alt="hero"
            className="hero-bg-img"
            key={activeTab}
          />
          <div className="hero-gradient" />
        </div>

        <div className="hero-content container">
          <div className="hero-headline">
            <h1>
              {activeTab === 'flights' && <>Book Flights at <span className="hero-highlight">Best Prices</span></>}
              {activeTab === 'hotels' && <>Find Your Perfect <span className="hero-highlight">Stay</span></>}
              {activeTab === 'packages' && <>Dream Holidays, <span className="hero-highlight">Best Value</span></>}
            </h1>
            <p className="hero-sub">Trusted by 10,000+ travellers across India • Best price guaranteed</p>
          </div>

          {/* Search Card */}
          <div className="search-card">
            <div className="search-tabs">
              <button className={`stab ${activeTab === 'flights' ? 'stab-active' : ''}`} onClick={() => setActiveTab('flights')}>
                <Plane size={16} /> Flights
              </button>
              <button className={`stab ${activeTab === 'hotels' ? 'stab-active' : ''}`} onClick={() => setActiveTab('hotels')}>
                <Hotel size={16} /> Hotels
              </button>
              <button className={`stab ${activeTab === 'packages' ? 'stab-active' : ''}`} onClick={() => setActiveTab('packages')}>
                <Package size={16} /> Packages
              </button>
            </div>
            <div className="search-body">
              {activeTab === 'flights' && <FlightTab />}
              {activeTab === 'hotels' && <HotelTab />}
              {activeTab === 'packages' && <PackageTab />}
            </div>
          </div>
        </div>
      </section>


      {/* ===== TOP DESTINATIONS ===== */}
      <section className="home-section">
        <div className="container">
          <div className="sec-header">
            <div>
              <h2 className="sec-title">Popular Destinations</h2>
              <p className="sec-sub">Top destinations with the best flight deals</p>
            </div>
            <button className="view-all-btn" onClick={() => navigate('/flights')}>
              View All <ChevronRight size={15} />
            </button>
          </div>
          <div className="top-dest-grid">
            {POPULAR_DESTINATIONS.slice(0, 6).map(d => (
              <div
                key={d.name}
                className="top-dest-card"
                onClick={() => navigate(`/flights/search?from=${d.flightFrom || 'DEL'}&to=${d.code || d.name}&depart=${todayStr()}&type=oneway&adults=1&children=0&infants=0&class=Economy`)}
              >
                <div className="top-dest-img-wrap">
                  <img src={d.img} alt={d.name} className="top-dest-img" loading="lazy" />
                  <div className="top-dest-gradient" />
                  <span className="top-dest-tag">{d.tag}</span>
                  <div className="top-dest-info">
                    <h3 className="top-dest-name">{d.name}</h3>
                    <p className="top-dest-price">
                      <Plane size={12} /> Flights from <strong>{d.from}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TOUR PACKAGES ===== */}
      <section className="home-section bg-alt-section">
        <div className="container">
          <div className="sec-header">
            <div>
              <h2 className="sec-title">Holiday Packages</h2>
              <p className="sec-sub">Handcrafted itineraries at unbeatable prices</p>
            </div>
            <button className="view-all-btn" onClick={() => navigate('/packages')}>
              View All <ChevronRight size={15} />
            </button>
          </div>
          <div className="pkg-grid">
            {TOUR_PACKAGES.map(p => (
              <div key={p.name} className="pkg-card" onClick={() => navigate('/packages')}>
                <div className="pkg-img-wrap">
                  <img src={p.img} alt={p.name} className="pkg-img" />
                  <span className="pkg-badge">{p.tag}</span>
                </div>
                <div className="pkg-body">
                  <div className="pkg-nights">{p.nights}</div>
                  <h3 className="pkg-name">{p.name}</h3>
                  <p className="pkg-places"><MapPin size={12} /> {p.places}</p>
                  <div className="pkg-rating">
                    <Star size={13} fill="currentColor" />
                    <span>{p.rating}</span>
                    <span className="pkg-reviews">({p.reviews.toLocaleString()} reviews)</span>
                  </div>
                  <div className="pkg-price-row">
                    <div>
                      <span className="pkg-price">{p.price}</span>
                      <span className="pkg-orig">{p.originalPrice}</span>
                    </div>
                    <button className="pkg-book-btn">Book Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NEWSLETTER SIGNUP ===== */}
      <section className="home-section">
        <div className="container">
          <EmailSignup />
        </div>
      </section>

      {/* ===== WHY CHOOSE US ===== */}
      <section className="home-section">
        <div className="container">
          <h2 className="sec-title" style={{ textAlign: 'center', marginBottom: 8 }}>Why Choose HostMyTrip?</h2>
          <p className="sec-sub" style={{ textAlign: 'center', marginBottom: 48 }}>Your trusted travel partner since 2020</p>
          <div className="why-grid">
            {[
              { icon: <Shield size={28} />, color: '#0EA5E9', title: 'Secure Payments', desc: 'All transactions are encrypted and 100% secure. Book with confidence.' },
              { icon: <Award size={28} />, color: '#F59E0B', title: 'Best Price Guarantee', desc: "Find it cheaper anywhere? We'll refund the difference. No questions asked." },
              { icon: <Zap size={28} />, color: '#10B981', title: 'Instant Confirmation', desc: 'Get booking confirmations instantly on WhatsApp, SMS and email.' },
              { icon: <Phone size={28} />, color: '#8B5CF6', title: '24/7 Expert Support', desc: 'Our travel experts are available round the clock to assist you.' },
              { icon: <Star size={28} />, color: '#EF4444', title: 'Verified Reviews', desc: 'Only real travellers can review. Every rating is authentic and trusted.' },
              { icon: <Globe size={28} />, color: '#06B6D4', title: 'Nationwide Network', desc: '500+ destinations, 2000+ hotels, 50+ airlines across India.' },
            ].map(w => (
              <div key={w.title} className="why-card">
                <div className="why-icon" style={{ '--icon-color': w.color }}>{w.icon}</div>
                <h3 className="why-title">{w.title}</h3>
                <p className="why-desc">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS BANNER ===== */}
      <section className="stats-banner">
        <div className="container stats-row">
          {[
            { val: '10,000+', label: 'Happy Travellers' },
            { val: '500+', label: 'Destinations' },
            { val: '2,000+', label: 'Hotels' },
            { val: '₹50Cr+', label: 'Savings Generated' },
          ].map(s => (
            <div key={s.label} className="stat-item">
              <div className="stat-val">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="main-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="footer-brand">
                <div className="brand-logo"><Plane size={18} /></div>
                <span className="brand-name">HostMyTrip</span>
              </div>
              <p className="footer-tagline">Your complete travel partner. Book flights, hotels and holiday packages at the best prices across India.</p>
              <div className="footer-contact">
                <span><Phone size={14} /> +91 98765 43210</span>
                <span><Mail size={14} /> support@hostmytrip.in</span>
              </div>
              <div style={{ marginTop: 20 }}>
                <EmailSignup compact />
              </div>
            </div>
            <div className="footer-links-col">
              <h4>Travel</h4>
              <a href="#">Flights</a>
              <a href="#">Hotels</a>
              <a href="#">Holiday Packages</a>
              <a href="#">Train Tickets</a>
              <a href="#">Bus Tickets</a>
            </div>
            <div className="footer-links-col">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Careers</a>
              <a href="#">Blog</a>
              <a href="#">Press</a>
              <a href="#">Partners</a>
            </div>
            <div className="footer-links-col">
              <h4>Support</h4>
              <a href="#">Help Centre</a>
              <a href="#">Cancellation Policy</a>
              <a href="#">Refund Policy</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 HostMyTrip. All rights reserved. Powered by Antigravity.</p>
            <div className="footer-badges">
              <span className="footer-badge">🔒 SSL Secured</span>
              <span className="footer-badge">✅ IATA Certified</span>
              <span className="footer-badge">🏆 Award Winning</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
