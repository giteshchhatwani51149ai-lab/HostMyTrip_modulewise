import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { flightsAPI, bookingsAPI, searchAPI } from '../api';
import {
  Plane, Search, ArrowLeftRight, Clock, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Loader2, IndianRupee, ArrowRightLeft,
  MapPin, Calendar, X
} from 'lucide-react';

const todayStr = () => new Date().toISOString().split('T')[0];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const POPULAR_CITIES = [
  // India
  { code:'BOM', city:'Mumbai', airport:'Chhatrapati Shivaji Maharaj International', country:'India' },
  { code:'DEL', city:'New Delhi', airport:'Indira Gandhi International', country:'India' },
  { code:'BLR', city:'Bengaluru', airport:'Kempegowda International', country:'India' },
  { code:'HYD', city:'Hyderabad', airport:'Rajiv Gandhi International', country:'India' },
  { code:'MAA', city:'Chennai', airport:'Chennai International', country:'India' },
  { code:'CCU', city:'Kolkata', airport:'Netaji Subhas Chandra Bose International', country:'India' },
  { code:'GOI', city:'Goa', airport:'Dabolim International', country:'India' },
  { code:'JAI', city:'Jaipur', airport:'Jaipur International', country:'India' },
  { code:'AMD', city:'Ahmedabad', airport:'Sardar Vallabhbhai Patel International', country:'India' },
  { code:'PNQ', city:'Pune', airport:'Pune Airport', country:'India' },
  { code:'COK', city:'Kochi', airport:'Cochin International', country:'India' },
  { code:'TRV', city:'Thiruvananthapuram', airport:'Trivandrum International', country:'India' },
  { code:'TRZ', city:'Tiruchirappalli', airport:'Tiruchirappalli International', country:'India' },
  { code:'IXC', city:'Chandigarh', airport:'Chandigarh Airport', country:'India' },
  { code:'ATQ', city:'Amritsar', airport:'Sri Guru Ram Dass Jee International', country:'India' },
  { code:'LKO', city:'Lucknow', airport:'Chaudhary Charan Singh International', country:'India' },
  // UAE & Middle East
  { code:'DXB', city:'Dubai', airport:'Dubai International', country:'UAE' },
  { code:'AUH', city:'Abu Dhabi', airport:'Zayed International', country:'UAE' },
  { code:'SHJ', city:'Sharjah', airport:'Sharjah International', country:'UAE' },
  { code:'DOH', city:'Doha', airport:'Hamad International', country:'Qatar' },
  { code:'BAH', city:'Bahrain', airport:'Bahrain International', country:'Bahrain' },
  { code:'JED', city:'Jeddah', airport:'King Abdulaziz International', country:'Saudi Arabia' },
  { code:'RUH', city:'Riyadh', airport:'King Khalid International', country:'Saudi Arabia' },
  { code:'MCT', city:'Muscat', airport:'Muscat International', country:'Oman' },
  { code:'KWI', city:'Kuwait City', airport:'Kuwait International', country:'Kuwait' },
  // Southeast Asia
  { code:'SIN', city:'Singapore', airport:'Singapore Changi', country:'Singapore' },
  { code:'BKK', city:'Bangkok', airport:'Suvarnabhumi Airport', country:'Thailand' },
  { code:'DMK', city:'Bangkok', airport:'Don Mueang International', country:'Thailand' },
  { code:'KUL', city:'Kuala Lumpur', airport:'Kuala Lumpur International', country:'Malaysia' },
  { code:'CGK', city:'Jakarta', airport:'Soekarno-Hatta International', country:'Indonesia' },
  { code:'HKG', city:'Hong Kong', airport:'Hong Kong International', country:'Hong Kong' },
  { code:'MNL', city:'Manila', airport:'Ninoy Aquino International', country:'Philippines' },
  // Europe
  { code:'LHR', city:'London', airport:'Heathrow Airport', country:'UK' },
  { code:'LGW', city:'London', airport:'Gatwick Airport', country:'UK' },
  { code:'CDG', city:'Paris', airport:'Charles de Gaulle Airport', country:'France' },
  { code:'ORY', city:'Paris', airport:'Orly Airport', country:'France' },
  { code:'FRA', city:'Frankfurt', airport:'Frankfurt Airport', country:'Germany' },
  { code:'MUC', city:'Munich', airport:'Munich Airport', country:'Germany' },
  { code:'AMS', city:'Amsterdam', airport:'Schiphol Airport', country:'Netherlands' },
  { code:'FCO', city:'Rome', airport:'Leonardo da Vinci International', country:'Italy' },
  { code:'MXP', city:'Milan', airport:'Milan Malpensa Airport', country:'Italy' },
  { code:'MAD', city:'Madrid', airport:'Adolfo Suárez Madrid-Barajas', country:'Spain' },
  { code:'BCN', city:'Barcelona', airport:'Barcelona-El Prat', country:'Spain' },
  { code:'ZUR', city:'Zurich', airport:'Zurich Airport', country:'Switzerland' },
  { code:'IST', city:'Istanbul', airport:'Istanbul Airport', country:'Turkey' },
  { code:'SAW', city:'Istanbul', airport:'Sabiha Gökçen International', country:'Turkey' },
  { code:'ATH', city:'Athens', airport:'Athens International', country:'Greece' },
  { code:'VIE', city:'Vienna', airport:'Vienna International', country:'Austria' },
  { code:'PRG', city:'Prague', airport:'Václav Havel Airport', country:'Czech Republic' },
  { code:'WAW', city:'Warsaw', airport:'Warsaw Chopin Airport', country:'Poland' },
  { code:'ARN', city:'Stockholm', airport:'Stockholm Arlanda', country:'Sweden' },
  { code:'CPH', city:'Copenhagen', airport:'Copenhagen Airport', country:'Denmark' },
  { code:'OSL', city:'Oslo', airport:'Oslo Airport', country:'Norway' },
  { code:'HEL', city:'Helsinki', airport:'Helsinki-Vantaa Airport', country:'Finland' },
  { code:'DUB', city:'Dublin', airport:'Dublin Airport', country:'Ireland' },
  { code:'LIS', city:'Lisbon', airport:'Lisbon Airport', country:'Portugal' },
  { code:'BRU', city:'Brussels', airport:'Brussels Airport', country:'Belgium' },
  // North America
  { code:'JFK', city:'New York', airport:'John F. Kennedy International', country:'USA' },
  { code:'EWR', city:'New York', airport:'Newark Liberty International', country:'USA' },
  { code:'LGA', city:'New York', airport:'LaGuardia Airport', country:'USA' },
  { code:'LAX', city:'Los Angeles', airport:'Los Angeles International', country:'USA' },
  { code:'ORD', city:'Chicago', airport:'O\'Hare International', country:'USA' },
  { code:'SFO', city:'San Francisco', airport:'San Francisco International', country:'USA' },
  { code:'MIA', city:'Miami', airport:'Miami International', country:'USA' },
  { code:'BOS', city:'Boston', airport:'Logan International', country:'USA' },
  { code:'SEA', city:'Seattle', airport:'Seattle-Tacoma International', country:'USA' },
  { code:'LAS', city:'Las Vegas', airport:'Harry Reid International', country:'USA' },
  { code:'DFW', city:'Dallas', airport:'Dallas/Fort Worth International', country:'USA' },
  { code:'DEN', city:'Denver', airport:'Denver International', country:'USA' },
  { code:'ATL', city:'Atlanta', airport:'Hartsfield-Jackson Atlanta', country:'USA' },
  { code:'IAD', city:'Washington DC', airport:'Dulles International', country:'USA' },
  { code:'DCA', city:'Washington DC', airport:'Ronald Reagan Washington National', country:'USA' },
  { code:'PHL', city:'Philadelphia', airport:'Philadelphia International', country:'USA' },
  { code:'PHX', city:'Phoenix', airport:'Phoenix Sky Harbor', country:'USA' },
  { code:'SAN', city:'San Diego', airport:'San Diego International', country:'USA' },
  { code:'IAH', city:'Houston', airport:'George Bush Intercontinental', country:'USA' },
  { code:'YYZ', city:'Toronto', airport:'Toronto Pearson International', country:'Canada' },
  { code:'YVR', city:'Vancouver', airport:'Vancouver International', country:'Canada' },
  { code:'YUL', city:'Montreal', airport:'Montréal-Pierre Elliott Trudeau', country:'Canada' },
  { code:'MEX', city:'Mexico City', airport:'Benito Juárez International', country:'Mexico' },
  // Asia Pacific
  { code:'HND', city:'Tokyo', airport:'Haneda Airport', country:'Japan' },
  { code:'NRT', city:'Tokyo', airport:'Narita International', country:'Japan' },
  { code:'ICN', city:'Seoul', airport:'Incheon International', country:'South Korea' },
  { code:'PEK', city:'Beijing', airport:'Beijing Capital International', country:'China' },
  { code:'PKX', city:'Beijing', airport:'Beijing Daxing International', country:'China' },
  { code:'PVG', city:'Shanghai', airport:'Shanghai Pudong International', country:'China' },
  { code:'CAN', city:'Guangzhou', airport:'Guangzhou Baiyun International', country:'China' },
  { code:'TPE', city:'Taipei', airport:'Taiwan Taoyuan International', country:'Taiwan' },
  { code:'SYD', city:'Sydney', airport:'Sydney Kingsford Smith', country:'Australia' },
  { code:'MEL', city:'Melbourne', airport:'Melbourne Airport', country:'Australia' },
  { code:'BNE', city:'Brisbane', airport:'Brisbane Airport', country:'Australia' },
  { code:'AKL', city:'Auckland', airport:'Auckland Airport', country:'New Zealand' },
  // Africa
  { code:'JNB', city:'Johannesburg', airport:'O.R. Tambo International', country:'South Africa' },
  { code:'CPT', city:'Cape Town', airport:'Cape Town International', country:'South Africa' },
  { code:'CAI', city:'Cairo', airport:'Cairo International', country:'Egypt' },
  { code:'NBO', city:'Nairobi', airport:'Jomo Kenyatta International', country:'Kenya' },
  { code:'ADD', city:'Addis Ababa', airport:'Bole International', country:'Ethiopia' },
  // South America
  { code:'GRU', city:'São Paulo', airport:'Guarulhos International', country:'Brazil' },
  { code:'GIG', city:'Rio de Janeiro', airport:'Galeão International', country:'Brazil' },
  { code:'EZE', city:'Buenos Aires', airport:'Ministro Pistarini International', country:'Argentina' },
  { code:'SCL', city:'Santiago', airport:'Arturo Merino Benítez International', country:'Chile' },
  { code:'BOG', city:'Bogotá', airport:'El Dorado International', country:'Colombia' },
  { code:'LIM', city:'Lima', airport:'Jorge Chávez International', country:'Peru' },
];

function MiniCalendar({ value, onChange, min, onClose }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const minDate = min ? new Date(min + 'T00:00:00') : today;
  const base = value ? new Date(value + 'T00:00:00') : (minDate > today ? minDate : today);
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1); } else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1); } else setViewMonth(m=>m+1); };
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const cells = [];
  for (let i=0;i<firstDay;i++) cells.push(null);
  for (let d=1;d<=daysInMonth;d++) cells.push(d);

  const isSelected = (d) => {
    if (!value || !d) return false;
    const v = new Date(value+'T00:00:00');
    return v.getDate()===d && v.getMonth()===viewMonth && v.getFullYear()===viewYear;
  };
  const isDisabled = (d) => d && new Date(viewYear,viewMonth,d) < minDate;
  const isToday = (d) => { const t=new Date(); return d===t.getDate()&&viewMonth===t.getMonth()&&viewYear===t.getFullYear(); };

  const pick = (d) => {
    if (!d || isDisabled(d)) return;
    const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    onChange(iso); onClose();
  };

  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 280, background: '#ffffff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', zIndex: 9999, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, fontSize: 14, fontWeight: 700 }}>
        <button type="button" onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer' }}>‹</button>
        <span>{FULL_MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {DAYS_SHORT.map(d=><div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>)}
        {cells.map((d,i)=>{
          const disabled = isDisabled(d);
          const selected = isSelected(d);
          const isT = isToday(d);
          return (
            <div key={i} onClick={()=>pick(d)}
              style={{
                textAlign: 'center', padding: '8px 0', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
                background: selected ? 'var(--primary)' : isT ? 'rgba(14,165,233,0.1)' : 'transparent',
                color: selected ? 'white' : disabled ? 'var(--text-muted)' : 'var(--text)',
                opacity: disabled ? 0.4 : 1,
              }}>
              {d||''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CityAutocomplete({ label, value, onChange, icon: Icon }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (value && value !== query) {
      const match = POPULAR_CITIES.find(c => c.code === value);
      if (match) setQuery(`${match.city} (${match.code})`);
    }
  }, [value, query]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length < 2) { setSuggestions([]); setOpen(false); return; }
    
    setLoading(true);
    // Debounce API call
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(async () => {
      try {
        const res = await searchAPI.locations(val);
        const airports = res.data || [];
        if (airports.length > 0) {
          setSuggestions(airports.map(a => ({
            code: a.code || a.iata || a.id,
            city: a.city || a.name,
            airport: a.airport || a.name,
            country: a.country
          })));
          setOpen(true);
        } else {
          // Fallback to local search
          const q = val.toLowerCase();
          const filtered = POPULAR_CITIES.filter(c =>
            c.city.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
            c.airport.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
          ).slice(0, 8);
          setSuggestions(filtered);
          setOpen(true);
        }
      } catch {
        // Fallback to local search on error
        const q = val.toLowerCase();
        const filtered = POPULAR_CITIES.filter(c =>
          c.city.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
          c.airport.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
        ).slice(0, 8);
        setSuggestions(filtered);
        setOpen(true);
      }
      setLoading(false);
    }, 300);
  };

  const select = (s) => {
    setQuery(`${s.city} (${s.code})`);
    onChange(s.code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
        {Icon && <Icon size={16} color="var(--text-dim)" />}
        <input
          style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, fontWeight: 600, width: '100%' }}
          placeholder={label === 'From' ? 'BOM' : 'DEL'}
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>...</span>}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: '#ffffff', border: '1px solid var(--border)', borderRadius: 10, marginTop: 6, maxHeight: 280, overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => select(s)}
              style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{s.code} — {s.city}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.airport}, {s.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DateField({ label, value, onChange, min, show = true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  
  if (!show) return null;
  
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>{label}</label>
      <div onClick={()=>setOpen(o=>!o)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
        <Calendar size={16} color="var(--text-dim)" />
        {value ? (
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{new Date(value+'T00:00:00').getDate()}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{MONTHS[new Date(value+'T00:00:00').getMonth()]} {new Date(value+'T00:00:00').getFullYear()}</span>
          </span>
        ) : <span style={{ color: 'var(--text-dim)' }}>Select date</span>}
        <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
      </div>
      {open && <MiniCalendar value={value} onChange={v=>{onChange(v);setOpen(false);}} min={min} onClose={()=>setOpen(false)} />}
    </div>
  );
}

export default function AdminFlightSearch() {
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    departDate: todayStr(),
    returnDate: '',
    adults: 1,
    children: 0,
    infants: 0,
    tripType: 'oneway',
  });

  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const swapLocations = () => {
    setSearchParams(p => ({ ...p, origin: p.destination, destination: p.origin }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchParams.origin || !searchParams.destination) {
      setError('Please enter origin and destination');
      return;
    }
    if (searchParams.tripType === 'roundtrip' && !searchParams.returnDate) {
      setError('Please select return date for round trip');
      return;
    }

    setLoading(true);
    setError('');
    setFlights([]);

    try {
      const res = await flightsAPI.search({
        origin: searchParams.origin.toUpperCase(),
        destination: searchParams.destination.toUpperCase(),
        departDate: searchParams.departDate,
        returnDate: searchParams.tripType === 'roundtrip' ? searchParams.returnDate : undefined,
        adults: searchParams.adults,
        children: searchParams.children,
        infants: searchParams.infants,
      });
      setFlights(res.data.flights || []);
      if ((res.data.flights || []).length === 0) {
        setError('No flights found for this route. Try different dates or cities.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search flights');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedFlight) return;
    setBookingLoading(true);
    setError('');

    try {
      // Format date for SQL Server compatibility
      const formatDateForDB = (dateStr) => {
        if (!dateStr) return new Date().toISOString();
        // If it's already a full ISO string, use it; otherwise combine with departDate
        if (dateStr.includes('T')) return dateStr;
        return `${searchParams.departDate}T${dateStr}:00`;
      };

      const bookingData = {
        type: 'flight',
        flightId: selectedFlight.id,
        airline: selectedFlight.airline,
        flightNumber: selectedFlight.flightNumber,
        origin: selectedFlight.origin,
        destination: selectedFlight.destination,
        departureTime: formatDateForDB(selectedFlight.departureTime),
        arrivalTime: formatDateForDB(selectedFlight.arrivalTime),
        price: selectedFlight.price,
        adults: searchParams.adults,
        children: searchParams.children,
        infants: searchParams.infants,
        guestName, guestEmail, guestPhone,
        isAdminBooking: true,
      };
      const res = await bookingsAPI.adminCreate(bookingData);
      setBookingSuccess(res.data.booking);
      setTimeout(() => {
        setShowBookingModal(false);
        setBookingSuccess(null);
        setSelectedFlight(null);
        setGuestName(''); setGuestEmail(''); setGuestPhone('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="animate-in">
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Flight Search & Booking</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Search live flights and book on behalf of customers.
      </p>

      {/* Search Form */}
      <div className="glass" style={{ padding: 24, borderRadius: 16, marginBottom: 24 }}>
        <form onSubmit={handleSearch}>
          {/* Trip Type */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              <input type="radio" checked={searchParams.tripType === 'oneway'} onChange={() => setSearchParams(p => ({ ...p, tripType: 'oneway', returnDate: '' }))} />
              <span style={{ color: searchParams.tripType === 'oneway' ? 'var(--primary)' : 'var(--text-muted)' }}>One Way</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              <input type="radio" checked={searchParams.tripType === 'roundtrip'} onChange={() => setSearchParams(p => ({ ...p, tripType: 'roundtrip' }))} />
              <span style={{ color: searchParams.tripType === 'roundtrip' ? 'var(--primary)' : 'var(--text-muted)' }}>Round Trip</span>
            </label>
          </div>

          {/* Fields Grid - 2x2 layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Row 1: From and To with swap */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <CityAutocomplete 
                  label="From" 
                  value={searchParams.origin} 
                  onChange={v => setSearchParams(p => ({ ...p, origin: v }))}
                  icon={MapPin}
                />
              </div>
              <button 
                type="button"
                onClick={swapLocations}
                style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: '50%', 
                  border: '1.5px solid rgba(255,107,0,0.3)', 
                  background: 'rgba(255,107,0,0.08)', 
                  color: 'var(--primary)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  marginBottom: 2,
                }}
                title="Swap locations"
              >
                <ArrowRightLeft size={14} />
              </button>
              <div style={{ flex: 1 }}>
                <CityAutocomplete 
                  label="To" 
                  value={searchParams.destination} 
                  onChange={v => setSearchParams(p => ({ ...p, destination: v }))}
                  icon={MapPin}
                />
              </div>
            </div>

            {/* Row 2: Dates */}
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <DateField 
                  label="Departure" 
                  value={searchParams.departDate} 
                  onChange={v => setSearchParams(p => ({ ...p, departDate: v }))}
                  min={todayStr()}
                />
              </div>
              <div style={{ flex: 1 }}>
                <DateField 
                  label="Return" 
                  value={searchParams.returnDate} 
                  onChange={v => setSearchParams(p => ({ ...p, returnDate: v }))}
                  min={searchParams.departDate}
                  show={searchParams.tripType === 'roundtrip'}
                />
              </div>
            </div>
          </div>

          {/* Passengers & Search */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Adults</label>
                <input className="form-input" type="number" min={1} max={9} value={searchParams.adults} onChange={e => setSearchParams(p => ({ ...p, adults: parseInt(e.target.value) || 1 }))} style={{ width: 80 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06, color: 'var(--text-dim)', marginBottom: 4, display: 'block' }}>Children</label>
                <input className="form-input" type="number" min={0} max={9} value={searchParams.children} onChange={e => setSearchParams(p => ({ ...p, children: parseInt(e.target.value) || 0 }))} style={{ width: 80 }} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 32px', fontSize: 15 }}>
              {loading ? <><Loader2 size={16} className="spinner" /> Searching...</> : <><Search size={16} /> Search Flights</>}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><AlertCircle size={16} /> {error}</div>}

      {/* Results */}
      {flights.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Available Flights ({flights.length})</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {flights.map((flight) => (
              <div key={flight.id} className="glass" style={{ padding: 20, borderRadius: 12, border: selectedFlight?.id === flight.id ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                  {/* Airline Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 140 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {flight.airline?.charAt(0) || '✈️'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{flight.airline}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{flight.flightNumber}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 2, justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{formatTime(flight.departureTime)}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{flight.origin}</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1, maxWidth: 140 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {formatDuration(flight.duration)}
                      </div>
                      <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg)', padding: '0 6px' }}>
                          <Plane size={14} color="var(--primary)" />
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, background: flight.stops === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>
                        {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{formatTime(flight.arrivalTime)}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{flight.destination}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: 140 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                      <IndianRupee size={20} style={{ display: 'inline' }} />
                      {flight.price?.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>per person</div>
                    <button className="btn btn-primary" onClick={() => { setSelectedFlight(flight); setShowBookingModal(true); }} style={{ width: '100%' }}>
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal - rendered via Portal to escape transform contexts */}
      {showBookingModal && selectedFlight && createPortal(
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.5)', 
          backdropFilter: 'blur(4px)', 
          zIndex: 9999, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: 20 
        }} onClick={() => setShowBookingModal(false)}>
          <div style={{ width: 520, maxWidth: '100%', background: '#ffffff', color: '#1a1a1a', borderRadius: 20, padding: 0, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>Book Flight</h3>
              <button onClick={() => setShowBookingModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><X size={20} /></button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px 28px', overflowY: 'auto' }}>
              {bookingSuccess ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle2 size={40} color="#10b981" />
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Booking Confirmed!</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Reference: <strong>#{bookingSuccess.id}</strong></p>
                  <p style={{ fontSize: 16, marginBottom: 24 }}>{bookingSuccess.guestName}</p>
                  <button className="btn btn-primary" onClick={() => setShowBookingModal(false)} style={{ padding: '12px 32px' }}>Done</button>
                </div>
              ) : (
                <>
                  {/* Flight Summary Card */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 32 }}>{selectedFlight.airlineCode || '✈️'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedFlight.airline}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedFlight.flightNumber}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                          <IndianRupee size={20} style={{ display: 'inline' }} />
                          {((selectedFlight.price * searchParams.adults) + (selectedFlight.price * 0.5 * searchParams.children))?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total for {searchParams.adults} adult{searchParams.adults > 1 ? 's' : ''}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{formatTime(selectedFlight.departureTime)}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>{selectedFlight.origin}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{searchParams.departDate}</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '0 20px' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDuration(selectedFlight.duration)}</div>
                        <div style={{ height: 2, background: 'var(--border)', margin: '8px 0' }} />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedFlight.stops === 0 ? 'Non-stop' : `${selectedFlight.stops} stop`}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{formatTime(selectedFlight.arrivalTime)}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>{selectedFlight.destination}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{searchParams.departDate}</div>
                      </div>
                    </div>
                  </div>

                  {/* Guest Form */}
                  <form onSubmit={handleBook}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Guest Details</h4>
                    <div style={{ display: 'grid', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Full Name *</label>
                        <input className="form-input" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Enter guest full name" required style={{ padding: '12px 14px' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Email *</label>
                          <input className="form-input" type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="guest@example.com" required style={{ padding: '12px 14px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>Phone</label>
                          <input className="form-input" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+91 98765 43210" style={{ padding: '12px 14px' }} />
                        </div>
                      </div>
                    </div>

                    {error && <div className="alert alert-error" style={{ marginTop: 16 }}><AlertCircle size={14} /> {error}</div>}

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowBookingModal(false)} style={{ flex: 1, padding: '14px' }}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={bookingLoading} style={{ flex: 2, padding: '14px', fontSize: 15 }}>
                        {bookingLoading ? <><Loader2 size={16} className="spinner" /> Processing...</> : <>Confirm Booking • <IndianRupee size={14} style={{display:'inline'}} />{((selectedFlight.price * searchParams.adults) + (selectedFlight.price * 0.5 * searchParams.children))?.toLocaleString('en-IN')}</>}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
