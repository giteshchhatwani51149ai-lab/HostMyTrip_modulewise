import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid, setMonth as setMonthFn, setYear, getMonth, getYear } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import 'react-day-picker/style.css';
import './DatePickerInput.css';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildYearRange(minDate, maxDate) {
  const now   = new Date();
  const start = minDate ? getYear(minDate) : getYear(now) - 100;
  const end   = maxDate ? getYear(maxDate) : getYear(now) + 10;
  const years = [];
  for (let y = end; y >= start; y--) years.push(y);
  return years;
}

/**
 * DatePickerInput — branded calendar picker.
 * value: "YYYY-MM-DD" string (RHF compatible)
 * onChange: (value: "YYYY-MM-DD" | "") => void
 * min / max: "YYYY-MM-DD" strings
 */
export default function DatePickerInput({ value, onChange, min, max, placeholder = 'DD MMM YYYY', error, label }) {
  const [open, setOpen]         = useState(false);
  const [month, setMonth]       = useState(new Date());
  const [yearOpen, setYearOpen] = useState(false);
  const ref                     = useRef();
  const yearListRef             = useRef();
  const stripRef                = useRef();

  const selected  = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const minDate   = min ? parse(min, 'yyyy-MM-dd', new Date()) : undefined;
  const maxDate   = max ? parse(max, 'yyyy-MM-dd', new Date()) : undefined;
  const derivedMonth = (selected && isValid(selected)) ? selected : month;
  const years     = buildYearRange(minDate, maxDate);
  const curYear   = getYear(derivedMonth);
  const curMonth  = getMonth(derivedMonth);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setYearOpen(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll selected year into view when year panel opens
  useEffect(() => {
    if (yearOpen && yearListRef.current) {
      const el = yearListRef.current.querySelector('.dpi-year-active');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [yearOpen]);

  // Scroll active month pill into view whenever curMonth changes
  useEffect(() => {
    if (stripRef.current) {
      const active = stripRef.current.querySelector('.dpi-month-active');
      if (active) active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [curMonth]);

  const handleSelect = (date) => {
    if (!date) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const pickMonth = useCallback((i) => {
    setMonth(setMonthFn(derivedMonth, i));
  }, [derivedMonth]);

  const pickYear = useCallback((y) => {
    setMonth(setYear(derivedMonth, y));
    setYearOpen(false);
  }, [derivedMonth]);

  const displayVal = selected && isValid(selected) ? format(selected, 'dd MMM yyyy') : '';

  const stepMonth = useCallback((delta) => {
    setMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  }, []);

  const MonthCaption = () => (
    <div className="dpi-caption">
      {/* Row 1: ◀ month pills ▶ */}
      <div className="dpi-caption-row1">
        <button type="button" className="dpi-nav-btn" onClick={() => stepMonth(-1)}>
          <ChevronLeft size={15} />
        </button>
        <div className="dpi-month-strip" ref={stripRef}>
          {MONTHS_SHORT.map((m, i) => (
            <button key={m} type="button"
              className={`dpi-month-pill ${i === curMonth ? 'dpi-month-active' : ''}`}
              onClick={() => pickMonth(i)}>
              {m}
            </button>
          ))}
        </div>
        <button type="button" className="dpi-nav-btn" onClick={() => stepMonth(1)}>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Row 2: year badge (click → year grid overlay) */}
      <button type="button" className="dpi-year-badge" onClick={() => setYearOpen(o => !o)}>
        {curYear}
        <ChevronRight size={11} className={`dpi-year-chevron ${yearOpen ? 'dpi-year-chevron-open' : ''}`} />
      </button>

      {yearOpen && (
        <div className="dpi-year-panel" ref={yearListRef}>
          <div className="dpi-year-grid">
            {years.map(y => (
              <button key={y} type="button"
                className={`dpi-year-item ${y === curYear ? 'dpi-year-active' : ''}`}
                onClick={() => pickYear(y)}>
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="dpi-wrap" ref={ref}>
      {label && <label className="pf-label">{label}</label>}

      <button
        type="button"
        className={`dpi-trigger ${error ? 'dpi-trigger-error' : ''} ${open ? 'dpi-trigger-open' : ''}`}
        onClick={() => { setOpen(o => !o); setYearOpen(false); }}
      >
        <Calendar size={15} className="dpi-icon" />
        <span className={`dpi-value ${!displayVal ? 'dpi-placeholder' : ''}`}>
          {displayVal || placeholder}
        </span>
        {displayVal
          ? <X size={13} className="dpi-clear" onClick={handleClear} />
          : <ChevronRight size={13} className="dpi-chevron" />
        }
      </button>

      {open && (
        <div className="dpi-popover">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            month={derivedMonth}
            onMonthChange={setMonth}
            hideNavigation
            disabled={[
              minDate && { before: minDate },
              maxDate && { after: maxDate },
            ].filter(Boolean)}
            components={{ MonthCaption }}
          />
        </div>
      )}
    </div>
  );
}
