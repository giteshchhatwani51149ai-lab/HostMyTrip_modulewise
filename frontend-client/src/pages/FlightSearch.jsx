import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import { flightsAPI, searchAPI } from '../api/index';
import {
  Plane, ArrowLeftRight, Search, Filter, ChevronDown,
  Clock, Wifi, Zap, Coffee, ArrowRight, SlidersHorizontal,
  X, ChevronUp, Luggage, Info
} from 'lucide-react';
import './FlightSearch.css';

/* ─── Zod schema ─── */
const flightSchema = z.object({
  from: z.string().min(2, 'Enter departure city'),
  to:   z.string().min(2, 'Enter destination city'),
  depart: z.string().min(1, 'Select departure date'),
  returnDate: z.string().optional(),
  adults:   z.number().min(1).max(9),
  children: z.number().min(0).max(9),
  infants:  z.number().min(0).max(4),
  travelClass: z.string(),
  tripType: z.enum(['oneway', 'roundtrip']),
}).refine(d => d.from.toLowerCase() !== d.to.toLowerCase(), {
  message: 'Departure and destination cannot be the same',
  path: ['to'],
}).refine(d => d.tripType === 'oneway' || !!d.returnDate, {
  message: 'Select return date for round trip',
  path: ['returnDate'],
});

/* ─── Helpers ─── */
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate  = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';

/* ─── Mock flight generator ─── */
const AIRLINES = [
  { name: 'IndiGo',        code: '6E', logo: '🔵' },
  { name: 'Air India',     code: 'AI', logo: '🔴' },
  { name: 'SpiceJet',      code: 'SG', logo: '🟠' },
  { name: 'Vistara',       code: 'UK', logo: '🟣' },
  { name: 'Go First',      code: 'G8', logo: '🟢' },
  { name: 'AirAsia India', code: 'I5', logo: '🔴' },
];
const AMENITIES = [
  { icon: <Wifi size={13}/>,    label:'Wi-Fi' },
  { icon: <Coffee size={13}/>,  label:'Meal' },
  { icon: <Luggage size={13}/>, label:'15kg' },
  { icon: <Zap size={13}/>,     label:'USB' },
];

function randomBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function addMins(base, mins) {
  const d = new Date(`2025-01-01T${base}:00`);
  d.setMinutes(d.getMinutes() + mins);
  return d.toTimeString().slice(0,5);
}

function generateFlights(from, to, count = 12) {
  return Array.from({ length: count }, (__, i) => {
    const airline = AIRLINES[i % AIRLINES.length];
    const dep = `${String(randomBetween(5,22)).padStart(2,'0')}:${randomBetween(0,5)*10 === 0 ? '00' : String(randomBetween(0,5)*10).padStart(2,'0')}`;
    const dur = randomBetween(60, 360);
    const stops = i % 3 === 0 ? 1 : 0;
    const price = randomBetween(3500, 22000);
    const amenities = AMENITIES.filter(() => Math.random() > 0.4);
    return {
      id: `FL${1000+i}`,
      airline: airline.name,
      code: `${airline.code}${randomBetween(100,999)}`,
      logo: airline.logo,
      dep,
      arr: addMins(dep, dur + stops * 60),
      duration: `${Math.floor((dur + stops*60)/60)}h ${(dur + stops*60)%60}m`,
      stops,
      stopCity: stops ? 'DEL' : null,
      price,
      originalPrice: Math.round(price * 1.18),
      from: from || 'BOM',
      to: to || 'DEL',
      amenities,
      seats: randomBetween(2, 9),
      refundable: Math.random() > 0.5,
    };
  }).sort((a,b) => a.dep.localeCompare(b.dep));
}

/* ─── Inline date & city input ─── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

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
    <div className="fs-cal-pop">
      <div className="fs-cal-header">
        <button type="button" className="fs-cal-nav" onClick={prevMonth}>‹</button>
        <span>{FULL_MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" className="fs-cal-nav" onClick={nextMonth}>›</button>
      </div>
      <div className="fs-cal-grid">
        {DAYS_SHORT.map(d=><div key={d} className="fs-cal-dlabel">{d}</div>)}
        {cells.map((d,i)=>(
          <div key={i} onClick={()=>pick(d)}
            className={`fs-cal-day ${!d?'fs-cal-empty':''} ${isSelected(d)?'fs-cal-sel':''} ${isToday(d)&&!isSelected(d)?'fs-cal-today':''} ${isDisabled(d)?'fs-cal-dis':''}`}>
            {d||''}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Popular cities fallback ─── */
const POPULAR_CITIES = [
  { code:'BOM', city:'Mumbai',       airport:'Chhatrapati Shivaji International',     country:'India' },
  { code:'DEL', city:'Delhi',        airport:'Indira Gandhi International',            country:'India' },
  { code:'BLR', city:'Bengaluru',    airport:'Kempegowda International',               country:'India' },
  { code:'HYD', city:'Hyderabad',    airport:'Rajiv Gandhi International',             country:'India' },
  { code:'MAA', city:'Chennai',      airport:'Chennai International',                  country:'India' },
  { code:'CCU', city:'Kolkata',      airport:'Netaji Subhas Chandra Bose International',country:'India' },
  { code:'GOI', city:'Goa',          airport:'Goa International',                      country:'India' },
  { code:'JAI', city:'Jaipur',       airport:'Jaipur International',                   country:'India' },
  { code:'AMD', city:'Ahmedabad',    airport:'Sardar Vallabhbhai Patel International', country:'India' },
  { code:'PNQ', city:'Pune',         airport:'Pune Airport',                           country:'India' },
  { code:'COK', city:'Kochi',        airport:'Cochin International',                   country:'India' },
  { code:'DXB', city:'Dubai',        airport:'Dubai International',                    country:'UAE' },
  { code:'SIN', city:'Singapore',    airport:'Singapore Changi',                       country:'Singapore' },
  { code:'BKK', city:'Bangkok',      airport:'Suvarnabhumi Airport',                   country:'Thailand' },
  { code:'LHR', city:'London',       airport:'Heathrow Airport',                       country:'UK' },
  { code:'CDG', city:'Paris',        airport:'Charles de Gaulle',                      country:'France' },
  { code:'JFK', city:'New York',     airport:'John F. Kennedy International',          country:'USA' },
  { code:'TYO', city:'Tokyo',        airport:'Narita International',                   country:'Japan' },
  { code:'SYD', city:'Sydney',       airport:'Kingsford Smith International',          country:'Australia' },
  { code:'TUN', city:'Tunis',        airport:'Tunis-Carthage International',            country:'Tunisia' },
  { code:'CAI', city:'Cairo',        airport:'Cairo International',                    country:'Egypt' },
  { code:'NBO', city:'Nairobi',      airport:'Jomo Kenyatta International',            country:'Kenya' },
  { code:'JNB', city:'Johannesburg', airport:'OR Tambo International',                 country:'South Africa' },
  { code:'LAX', city:'Los Angeles',  airport:'Los Angeles International',              country:'USA' },
  { code:'ORD', city:'Chicago',      airport:"O'Hare International",                  country:'USA' },
  { code:'FRA', city:'Frankfurt',    airport:'Frankfurt Airport',                      country:'Germany' },
  { code:'AMS', city:'Amsterdam',    airport:'Amsterdam Schiphol',                     country:'Netherlands' },
  { code:'IST', city:'Istanbul',     airport:'Istanbul Airport',                       country:'Turkey' },
  { code:'DOH', city:'Doha',         airport:'Hamad International',                    country:'Qatar' },
  { code:'AUH', city:'Abu Dhabi',    airport:'Zayed International',                    country:'UAE' },
  { code:'KUL', city:'Kuala Lumpur', airport:'Kuala Lumpur International',             country:'Malaysia' },
];

/* ─── City autocomplete ─── */
function CityAutocomplete({ label, value, onChange, error, icon }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();
  const debounceRef = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (value && value !== query) {
      const match = POPULAR_CITIES.find(c => c.code === value);
      setQuery(match ? `${match.city} (${match.code})` : value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAPI.locations(val);
        const live = res.data || [];
        if (live.length > 0) {
          setSuggestions(live);
        } else {
          const q = val.toLowerCase();
          setSuggestions(POPULAR_CITIES.filter(c =>
            c.city.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
            c.airport.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
          ).slice(0, 8));
        }
        setOpen(true);
      } catch {
        const q = val.toLowerCase();
        setSuggestions(POPULAR_CITIES.filter(c =>
          c.city.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
          c.airport.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
        ).slice(0, 8));
        setOpen(true);
      }
      finally { setLoading(false); }
    }, 300);
  };

  const select = (s) => {
    setQuery(`${s.city} (${s.code})`);
    onChange(s.code);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="fs-field-wrap" ref={ref} style={{ position:'relative' }}>
      <label className="fs-field-label">{label}</label>
      <div className={`fs-field-val ${error?'fs-field-err':''}`}>
        {icon}
        <input className="fs-text-input" placeholder="City or airport" value={query}
          onChange={handleInput} onFocus={()=>suggestions.length>0&&setOpen(true)} autoComplete="off" />
        {loading && <span style={{fontSize:10,color:'var(--text-muted)'}}>…</span>}
      </div>
      {error && <span className="fs-err-msg">{error}</span>}
      {open && suggestions.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:999, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, marginTop:4, maxHeight:220, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.15)' }}>
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => select(s)}
              style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:2 }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-2)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{ fontWeight:700, fontSize:13 }}>{s.code} — {s.city}</span>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{s.airport}{s.country ? `, ${s.country}` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DateField({ label, value, onChange, min, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="fs-field-wrap" ref={ref}>
      <label className="fs-field-label">{label}</label>
      <div className={`fs-field-val ${error?'fs-field-err':''}`} onClick={()=>setOpen(o=>!o)}>
        {value ? (
          <span className="fs-date-display">
            <span className="fs-date-day">{new Date(value+'T00:00:00').getDate()}</span>
            <span className="fs-date-rest"> {MONTHS[new Date(value+'T00:00:00').getMonth()]} {new Date(value+'T00:00:00').getFullYear()}</span>
          </span>
        ) : <span className="fs-placeholder">Select date</span>}
        <ChevronDown size={14} />
      </div>
      {error && <span className="fs-err-msg">{error}</span>}
      {open && <MiniCalendar value={value} onChange={v=>{onChange(v);setOpen(false);}} min={min} onClose={()=>setOpen(false)} />}
    </div>
  );
}

/* ─── Flight Details Modal ─── */
function FlightModal({ flight, onClose, onBook }) {
  if (!flight) return null;
  return (
    <div className="fc-modal-overlay" onClick={onClose}>
      <div className="fc-modal" onClick={e=>e.stopPropagation()}>
        <div className="fc-modal-header">
          <div className="fc-modal-airline">
            <img src={`https://pics.avs.io/60/30/${flight.airlineCode || flight.code?.slice(0,2)}.png`}
              alt={flight.airline} className="fc-modal-logo"
              onError={e=>{e.target.style.display='none';}}/>
            <div>
              <div className="fc-modal-airline-name">{flight.airline}</div>
              <div className="fc-modal-flight-no">{flight.code}</div>
            </div>
          </div>
          <button className="fc-modal-close" onClick={onClose}><X size={20}/></button>
        </div>
        <div className="fc-modal-route">
          <div className="fc-modal-city">
            <div className="fc-modal-time">{flight.dep}</div>
            <div className="fc-modal-iata">{flight.from}</div>
            <div className="fc-modal-label">Departure</div>
          </div>
          <div className="fc-modal-mid">
            <div className="fc-modal-dur">{flight.duration}</div>
            <div className="fc-modal-line"><Plane size={16}/></div>
            <div className="fc-modal-stops">{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops>1?'s':''}`}</div>
          </div>
          <div className="fc-modal-city">
            <div className="fc-modal-time">{flight.arr}</div>
            <div className="fc-modal-iata">{flight.to}</div>
            <div className="fc-modal-label">Arrival</div>
          </div>
        </div>
        <div className="fc-modal-info">
          <div className="fc-modal-info-row"><span>Cabin baggage</span><span>7 kg</span></div>
          <div className="fc-modal-info-row"><span>Check-in baggage</span><span>{flight.amenities?.find(a=>a.label?.includes('kg'))?.label || '15 kg'}</span></div>
          <div className="fc-modal-info-row"><span>Refundable</span><span>{flight.refundable ? 'Yes' : 'No'}</span></div>
          <div className="fc-modal-info-row"><span>Seats available</span><span>{flight.seats ? `${flight.seats} left` : 'Check airline'}</span></div>
          <div className="fc-modal-info-row"><span>Class</span><span>Economy</span></div>
        </div>
        <div className="fc-modal-footer">
          <div className="fc-modal-price">₹{flight.price?.toLocaleString('en-IN')}</div>
          <button type="button" className="fc-modal-book" onClick={() => { onClose(); onBook(flight); }}>
            Book Now <Plane size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading Skeleton ─── */
function FlightSkeleton() {
  return (
    <div className="fc-skeleton">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="fc-skel-card">
          <div className="fc-skel-airline"><div className="skel"/></div>
          <div className="fc-skel-time"><div className="skel"/><div className="skel skel-sm"/></div>
          <div className="fc-skel-route"><div className="skel skel-line"/></div>
          <div className="fc-skel-time"><div className="skel"/><div className="skel skel-sm"/></div>
          <div className="fc-skel-price"><div className="skel skel-price"/><div className="skel skel-btn"/></div>
        </div>
      ))}
    </div>
  );
}

/* ─── Flight card ─── */
function FlightCard({ flight, onViewDetails, onBook }) {
  const airlineCode = flight.airlineCode || flight.code?.slice(0,2) || 'XX';
  return (
    <div className="fc-card">
      <div className="fc-main">
        <div className="fc-airline">
          <img src={`https://pics.avs.io/50/25/${airlineCode}.png`}
            alt={flight.airline} className="fc-logo-img"
            onError={e=>{e.target.replaceWith(Object.assign(document.createElement('span'),{className:'fc-logo',textContent:flight.logo||'✈️'}));}}/>
          <div>
            <div className="fc-airline-name">{flight.airline}</div>
            <div className="fc-code">{flight.code}</div>
          </div>
        </div>
        <div className="fc-timing">
          <span className="fc-time">{flight.dep}</span>
          <span className="fc-city-code">{flight.from}</span>
        </div>
        <div className="fc-route">
          <div className="fc-duration">{flight.duration}</div>
          <div className="fc-line">
            <div className="fc-dot" />
            <div className="fc-dashes" />
            <Plane size={14} className="fc-plane-icon" />
            <div className="fc-dashes" />
            <div className="fc-dot" />
          </div>
          <div className="fc-stops">
            {flight.stops === 0 ? <span className="fc-nonstop">Non-stop</span> : <span className="fc-stop-label">{flight.stops} Stop{flight.stops>1?'s':''}{flight.stopCity?` · ${flight.stopCity}`:''}</span>}
          </div>
        </div>
        <div className="fc-timing">
          <span className="fc-time">{flight.arr}</span>
          <span className="fc-city-code">{flight.to}</span>
        </div>
        <div className="fc-amenities">
          {(flight.amenities||[]).map((a,i)=>(
            <span key={i} className="fc-amenity">{a.icon}{a.label}</span>
          ))}
        </div>
        <div className="fc-price-block">
          {flight.refundable && <span className="fc-refund">Refundable</span>}
          <div className="fc-price">₹{flight.price?.toLocaleString('en-IN')}</div>
          {flight.originalPrice && flight.originalPrice > flight.price && (
            <div className="fc-orig">₹{flight.originalPrice.toLocaleString('en-IN')}</div>
          )}
          <div style={{display:'flex',gap:6,marginTop:4}}>
            <button type="button" className="fc-details-btn" onClick={e=>{e.stopPropagation();onViewDetails(flight);}}>
              <Info size={13}/> Details
            </button>
            <button type="button" className="fc-book-btn" onClick={e=>{e.stopPropagation();onBook(flight);}}>
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter sidebar ─── */
function FilterSidebar({ flights, onFilter, onClose }) {
  const allAirlines = [...new Set(flights.map(f => f.airline))].filter(Boolean).sort();
  const maxPossible = Math.max(25000, ...flights.map(f => f.price || 0));

  const [maxPrice, setMaxPrice] = useState(maxPossible);
  const [stops, setStops]       = useState('any');
  const [depTime, setDepTime]   = useState('any');
  const [airlines, setAirlines] = useState([]);

  // Reset maxPrice when flights change
  useEffect(() => { setMaxPrice(maxPossible); }, [maxPossible]);

  useEffect(() => {
    let result = [...flights];
    if (stops === '0') result = result.filter(f => f.stops === 0);
    else if (stops === '1') result = result.filter(f => f.stops === 1);
    else if (stops === '2+') result = result.filter(f => f.stops >= 2);
    if (maxPrice < maxPossible) result = result.filter(f => f.price <= maxPrice);
    if (depTime === 'morning')   result = result.filter(f => f.dep >= '06:00' && f.dep < '12:00');
    if (depTime === 'afternoon') result = result.filter(f => f.dep >= '12:00' && f.dep < '18:00');
    if (depTime === 'evening')   result = result.filter(f => f.dep >= '18:00' && f.dep < '24:00');
    if (depTime === 'night')     result = result.filter(f => f.dep < '06:00');
    if (airlines.length > 0) result = result.filter(f => airlines.includes(f.airline));
    onFilter(result);
  }, [maxPrice, stops, depTime, airlines, flights, onFilter, maxPossible]);

  const toggleAirline = (name) => setAirlines(prev =>
    prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
  );

  return (
    <aside className="fs-filters">
      <div className="fs-filter-head">
        <span><SlidersHorizontal size={16}/> Filters</span>
        {onClose && <button className="fs-filter-close" onClick={onClose}><X size={16}/></button>}
      </div>
      <div className="fs-filter-section">
        <div className="fs-filter-title">Stops</div>
        {[['any','Any'],['0','Non-stop'],['1','1 Stop'],['2+','2+ Stops']].map(([val,label])=>(
          <label key={val} className={`fs-radio-opt ${stops===val?'active':''}`}>
            <input type="radio" name="stops" value={val} checked={stops===val} onChange={()=>setStops(val)} />
            {label}
          </label>
        ))}
      </div>
      <div className="fs-filter-section">
        <div className="fs-filter-title">Max Price: ₹{maxPrice.toLocaleString('en-IN')}</div>
        <input type="range" min={0} max={maxPossible} step={500} value={maxPrice}
          onChange={e=>setMaxPrice(Number(e.target.value))} className="fs-range" />
        <div className="fs-range-labels"><span>₹0</span><span>₹{(maxPossible/1000).toFixed(0)}K</span></div>
      </div>
      <div className="fs-filter-section">
        <div className="fs-filter-title">Departure Time</div>
        {[['any','All Day'],['morning','Morning (6–12)'],['afternoon','Afternoon (12–6)'],['evening','Evening (6–12)'],['night','Night (12–6)']].map(([val,label])=>(
          <label key={val} className={`fs-radio-opt ${depTime===val?'active':''}`}>
            <input type="radio" name="depTime" value={val} checked={depTime===val} onChange={()=>setDepTime(val)} />
            {label}
          </label>
        ))}
      </div>
      {allAirlines.length > 1 && (
        <div className="fs-filter-section">
          <div className="fs-filter-title">Airlines</div>
          {allAirlines.map(name=>(
            <label key={name} className={`fs-check-opt ${airlines.includes(name)?'active':''}`}>
              <input type="checkbox" checked={airlines.includes(name)} onChange={()=>toggleAirline(name)} />
              <img src={`https://pics.avs.io/30/15/${name}.png`} alt={name}
                style={{height:14,marginRight:4,verticalAlign:'middle'}}
                onError={e=>{e.target.style.display='none';}}/>
              {name}
            </label>
          ))}
          {airlines.length > 0 && (
            <button className="fs-clear-airlines" onClick={()=>setAirlines([])}>Clear</button>
          )}
        </div>
      )}
    </aside>
  );
}

/* ─── Main page ─── */
export default function FlightSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const defaultValues = {
    from:        searchParams.get('from') || '',
    to:          searchParams.get('to')   || '',
    depart:      searchParams.get('depart') || '',
    returnDate:  searchParams.get('return') || '',
    adults:      Number(searchParams.get('adults'))   || 1,
    children:    Number(searchParams.get('children')) || 0,
    infants:     Number(searchParams.get('infants'))  || 0,
    travelClass: searchParams.get('class') || 'Economy',
    tripType:    (searchParams.get('type') === 'roundtrip' ? 'roundtrip' : 'oneway'),
  };

  const { register, handleSubmit, control, watch, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(flightSchema),
    defaultValues,
  });

  const tripType  = watch('tripType');
  const fromVal   = watch('from');
  const toVal     = watch('to');
  const departVal = watch('depart');

  const [allFlights, setAllFlights]         = useState([]);
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [sortBy, setSortBy]                 = useState('price');
  const [showFilters, setShowFilters]       = useState(false);
  const [searched, setSearched]             = useState(false);
  const [apiSource, setApiSource]           = useState(null);
  const [modalFlight, setModalFlight]       = useState(null);

  const handleBook = (flight) => {
    const sp = {
      from:     searchParams.get('from')     || fromVal  || flight.from  || '',
      to:       searchParams.get('to')       || toVal    || flight.to    || '',
      depart:   searchParams.get('depart')   || departVal || '',
      adults:   searchParams.get('adults')   || String(watch('adults')   || 1),
      children: searchParams.get('children') || String(watch('children') || 0),
      infants:  searchParams.get('infants')  || String(watch('infants')  || 0),
    };
    // Strip non-serializable fields (React elements, symbols) before pushState
    const serializableFlight = {
      id:           flight.id,
      airline:      flight.airline,
      airlineCode:  flight.airlineCode,
      code:         flight.code,
      dep:          flight.dep,
      arr:          flight.arr,
      duration:     flight.duration,
      stops:        flight.stops,
      stopCity:     flight.stopCity,
      price:        flight.price,
      originalPrice: flight.originalPrice,
      from:         flight.from,
      to:           flight.to,
      seats:        flight.seats,
      refundable:   flight.refundable,
      bookingUrl:   flight.bookingUrl || '',
      amenities:    (flight.amenities || []).map(a => ({ label: a.label || '' })),
    };
    navigate('/flights/book', { state: { flight: serializableFlight, searchParams: sp } });
  };

  const normalizeLiveFlights = (flights) => flights.map(f => {
    const dep = f.departureTime ? new Date(f.departureTime).toTimeString().slice(0,5) : '06:00';
    const arr = f.arrivalTime   ? new Date(f.arrivalTime).toTimeString().slice(0,5)   : '08:00';
    const dur = f.duration || 120;
    const airline = AIRLINES.find(a => a.name.toLowerCase().includes(f.airline?.toLowerCase() || '')) || AIRLINES[0];
    return {
      id: f.id,
      airline: f.airline || airline.name,
      airlineCode: f.airlineCode || airline.code,
      code: f.flightNumber || `${airline.code}000`,
      logo: airline.logo,
      dep, arr,
      duration: `${Math.floor(dur/60)}h ${dur%60}m`,
      stops: f.stops || 0,
      stopCity: f.stops ? 'DEL' : null,
      price: f.price,
      originalPrice: Math.round(f.price * 1.18),
      from: f.origin,
      to: f.destination,
      amenities: AMENITIES.filter(() => Math.random() > 0.5),
      seats: f.seatsAvailable || null,
      refundable: f.refundable || false,
      bookingUrl: f.bookingUrl || null,
    };
  });

  const doSearch = async (data) => {
    setLoading(true);
    setSearched(true);
    navigate(`/flights/search?from=${data.from}&to=${data.to}&depart=${data.depart}&return=${data.returnDate||''}&adults=${data.adults}&children=${data.children}&infants=${data.infants}&class=${data.travelClass}&type=${data.tripType}`, { replace: true });
    try {
      const res = await flightsAPI.search({
        origin:      data.from.toUpperCase(),
        destination: data.to.toUpperCase(),
        departDate:  data.depart,
        returnDate:  data.returnDate || undefined,
        adults:      data.adults,
        children:    data.children,
        infants:     data.infants,
        currency:    'INR',
      });
      const results = normalizeLiveFlights(res.data.flights || []);
      const src = res.data.source || 'live';
      setAllFlights(results);
      setFilteredFlights(results);
      setApiSource(results.length > 0 ? src : `${src}-empty`);
    } catch {
      // Always fall back to mock data so the page is never empty
      const results = generateFlights(data.from, data.to, 14);
      setAllFlights(results);
      setFilteredFlights(results);
      setApiSource('mock');
    } finally {
      setLoading(false);
    }
  };

  const initFrom   = defaultValues.from;
  const initTo     = defaultValues.to;
  const initDepart = defaultValues.depart;
  useEffect(() => {
    // Only auto-search if both origin and destination are provided in URL params
    if (!initFrom || !initTo) return;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const fallbackDate = tomorrow.toISOString().split('T')[0];
    doSearch({
      from:        initFrom,
      to:          initTo,
      depart:      initDepart || fallbackDate,
      returnDate:  defaultValues.returnDate,
      adults:      defaultValues.adults   || 1,
      children:    defaultValues.children || 0,
      infants:     defaultValues.infants  || 0,
      travelClass: defaultValues.travelClass || 'Economy',
      tripType:    defaultValues.tripType    || 'oneway',
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...filteredFlights].sort((a,b) => {
    if (sortBy === 'price')     return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'duration')  return a.duration.localeCompare(b.duration);
    if (sortBy === 'dep')       return a.dep.localeCompare(b.dep);
    return 0;
  });

  const totalPax = (watch('adults')||1) + (watch('children')||0);

  return (
    <div className="fs-page">
      <SEO
        title="Search Flights – Best Airfare Deals"
        description="Search and book cheap flights to destinations across India and worldwide. Real-time prices, instant confirmation."
      />
      <Navbar />

      {/* ── Search bar ── */}
      <div className="fs-search-bar">
        <div className="container">
          <form className="fs-form" onSubmit={handleSubmit(doSearch)}>
            {/* Trip type */}
            <div className="fs-trip-row">
              {['oneway','roundtrip'].map(t=>(
                <label key={t} className={`fs-trip-opt ${tripType===t?'active':''}`}>
                  <input type="radio" value={t} {...register('tripType')} />
                  {t==='oneway'?'One Way':'Round Trip'}
                </label>
              ))}
            </div>

            <div className="fs-fields-row">
              {/* From */}
              <Controller name="from" control={control} render={({field})=>(
                <CityAutocomplete label="From" value={field.value} onChange={field.onChange}
                  error={errors.from?.message} icon={<Plane size={14} className="fs-field-icon"/>} />
              )}/>

              {/* Swap */}
              <button type="button" className="fs-swap-btn"
                onClick={()=>{ const tmp=fromVal; setValue('from',toVal); setValue('to',tmp); }}>
                <ArrowLeftRight size={16}/>
              </button>

              {/* To */}
              <Controller name="to" control={control} render={({field})=>(
                <CityAutocomplete label="To" value={field.value} onChange={field.onChange}
                  error={errors.to?.message} icon={<Plane size={14} className="fs-field-icon" style={{transform:'rotate(90deg)'}}/>} />
              )}/>

              {/* Depart */}
              <Controller name="depart" control={control} render={({field})=>(
                <DateField label="Departure" value={field.value} onChange={field.onChange} min={todayStr()} error={errors.depart?.message} />
              )}/>

              {/* Return */}
              {tripType==='roundtrip' && (
                <Controller name="returnDate" control={control} render={({field})=>(
                  <DateField label="Return" value={field.value} onChange={field.onChange} min={departVal||todayStr()} error={errors.returnDate?.message} />
                )}/>
              )}

              {/* Travellers */}
              <div className="fs-field-wrap">
                <label className="fs-field-label">Travellers & Class</label>
                <div className="fs-field-val">
                  <span>{totalPax} Traveller{totalPax>1?'s':''}</span>
                  <span className="fs-class-badge">{watch('travelClass')}</span>
                </div>
              </div>

              <button type="submit" className="fs-search-btn">
                <Search size={18}/> Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="container fs-results-wrap">
        {searched && !loading && (
          <div className="fs-results-head">
            <div className="fs-results-meta">
              <span className="fs-route-label">{searchParams.get('from')||fromVal} <ArrowRight size={14}/> {searchParams.get('to')||toVal}</span>
              <span className="fs-count">{sorted.length} flights found</span>
              {apiSource === 'mock' && <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg-2)', border:'1px solid var(--border)', padding:'2px 8px', borderRadius:20 }}>Demo data</span>}
              {apiSource === 'travelpayouts' && <span style={{ fontSize:11, color:'#f59e0b', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', padding:'2px 8px', borderRadius:20 }}>✓ Cached prices</span>}
              {(apiSource === 'kiwi' || apiSource === 'live') && <span style={{ fontSize:11, color:'#10b981', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', padding:'2px 8px', borderRadius:20 }}>✓ Live flights</span>}
              <span className="fs-date-badge">{fmtDate(searchParams.get('depart')||departVal)}</span>
            </div>
            <div className="fs-sort-row">
              <span className="fs-sort-label"><Filter size={13}/> Sort by:</span>
              {[['price','Cheapest'],['price-desc','Highest'],['duration','Fastest'],['dep','Earliest']].map(([val,label])=>(
                <button key={val} type="button"
                  className={`fs-sort-btn ${sortBy===val?'active':''}`}
                  onClick={()=>setSortBy(val)}>{label}</button>
              ))}
              <button type="button" className="fs-filter-toggle" onClick={()=>setShowFilters(f=>!f)}>
                <SlidersHorizontal size={14}/> Filters {showFilters?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
              </button>
            </div>
          </div>
        )}

        <div className="fs-body">
          {showFilters && allFlights.length > 0 && (
            <FilterSidebar flights={allFlights} onFilter={setFilteredFlights} onClose={()=>setShowFilters(false)} />
          )}

          <div className="fs-list">
            {loading && <FlightSkeleton />}

            {!loading && searched && sorted.length === 0 && (
              <div className="fs-empty">
                <Plane size={48} style={{color:'var(--text-dim)'}}/>
                <h3>No flights found</h3>
                <p>{apiSource === 'error' ? 'Could not fetch flights. Please try again.' : 'Try using IATA codes (e.g. BOM, DEL, BLR) or adjust your dates.'}</p>
              </div>
            )}

            {!loading && sorted.map(f => <FlightCard key={f.id} flight={f} onViewDetails={setModalFlight} onBook={handleBook}/>)}

            {!searched && !loading && (
              <div className="fs-empty">
                <Plane size={52} style={{color:'var(--primary)',opacity:0.5}}/>
                <h3>Search for flights above</h3>
                <p>Enter origin, destination and date to find flights</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <FlightModal flight={modalFlight} onClose={()=>setModalFlight(null)} onBook={handleBook} />
    </div>
  );
}
