import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, User, Copy, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import DatePickerInput from './DatePickerInput';
import './PassengerForm.css';

/* ─── Constants ─────────────────────────────────────────────── */
const TITLES = ['Mr', 'Ms', 'Mrs', 'Dr', 'Prof'];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia',
  'Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia',
  'Croatia','Cuba','Czech Republic','Denmark','Egypt','Ethiopia','Finland','France',
  'Germany','Ghana','Greece','Hungary','India','Indonesia','Iran','Iraq','Ireland',
  'Israel','Italy','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Lebanon','Libya',
  'Malaysia','Mexico','Morocco','Myanmar','Nepal','Netherlands','New Zealand','Nigeria',
  'Norway','Oman','Pakistan','Palestine','Peru','Philippines','Poland','Portugal',
  'Qatar','Romania','Russia','Saudi Arabia','Serbia','Singapore','South Africa',
  'South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria','Taiwan',
  'Tanzania','Thailand','Tunisia','Turkey','Uganda','Ukraine','UAE','UK','USA',
  'Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe',
];

const STORAGE_KEY = 'pf_draft';

/* ─── Zod schemas per type ──────────────────────────────────── */
const makeSchema = (type, isInternational) =>
  z.object({
    title:           z.string().min(1, 'Required'),
    firstName:       z.string().min(2, 'Min 2 chars').regex(/^[A-Za-z ]+$/, 'Letters only'),
    lastName:        z.string().min(2, 'Min 2 chars').regex(/^[A-Za-z ]+$/, 'Letters only'),
    dob:             z.string().min(1, 'Required'),
    passportNumber:  (type !== 'infant' && isInternational)
                       ? z.string().min(5, 'Required').regex(/^[A-Z0-9]+$/i, 'Alphanumeric only')
                       : z.string().optional(),
    passportExpiry:  (type !== 'infant' && isInternational)
                       ? z.string().min(1, 'Required')
                       : z.string().optional(),
    nationality:     z.string().min(1, 'Required'),
  }).superRefine((data, ctx) => {
    if (!data.dob) return;
    const today = new Date();
    const dob   = new Date(data.dob);
    const ageYrs = (today - dob) / (1000 * 60 * 60 * 24 * 365.25);
    if (type === 'adult'  && ageYrs <= 12)
      ctx.addIssue({ path: ['dob'], code: 'custom', message: 'Adult must be older than 12 years' });
    if (type === 'child'  && (ageYrs < 2 || ageYrs > 12))
      ctx.addIssue({ path: ['dob'], code: 'custom', message: 'Child must be 2–12 years old' });
    if (type === 'infant' && ageYrs >= 2)
      ctx.addIssue({ path: ['dob'], code: 'custom', message: 'Infant must be under 2 years old' });
    if (data.passportExpiry && new Date(data.passportExpiry) <= today)
      ctx.addIssue({ path: ['passportExpiry'], code: 'custom', message: 'Passport must not be expired' });
  });

/* ─── Single passenger card ─────────────────────────────────── */
function PassengerCard({ index, type, label, isInternational, defaultData, onValidChange, onCopyFromProfile, profileData }) {
  const [collapsed, setCollapsed] = useState(index > 0);
  const [copied, setCopied] = useState(false);

  const schema = useMemo(() => makeSchema(type, isInternational), [type, isInternational]);
  const { register, watch, getValues, setValue: setFieldValue, formState: { errors, isValid }, trigger } = useForm({
    resolver:     zodResolver(schema),
    defaultValues: defaultData || { title: 'Mr', firstName: '', lastName: '', dob: '', nationality: 'India', passportNumber: '', passportExpiry: '' },
    mode:         'onChange',
  });

  // When parent pushes profile data, populate each field explicitly
  useEffect(() => {
    if (!profileData) return;
    setCollapsed(false);
    const { _ts: _ignored, ...data } = profileData;
    // setValue per-field guarantees DOM update for register()-based inputs
    Object.entries({ title: 'Mr', nationality: 'India', firstName: '', lastName: '', dob: '', passportNumber: '', passportExpiry: '', ...data })
      .forEach(([k, v]) => setFieldValue(k, v, { shouldValidate: false, shouldDirty: true }));
    setTimeout(() => trigger(), 0);
  }, [profileData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent on every valid change
  useEffect(() => {
    const subscription = watch(() => {
      if (isValid) {
        onValidChange(index, { ...getValues(), type });
      } else {
        onValidChange(index, null);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, isValid, index, type, onValidChange, getValues]);

  const handleCopy = () => {
    onCopyFromProfile(index);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const needsPassport = type !== 'infant' && isInternational;

  return (
    <div className={`pf-card ${collapsed ? 'pf-collapsed' : ''}`}>
      <div className="pf-card-header" onClick={() => setCollapsed(c => !c)}>
        <div className="pf-card-title">
          <span className={`pf-type-badge pf-type-${type}`}>{type}</span>
          <span className="pf-card-label">{label}</span>
          {isValid && <span className="pf-valid-tick"><Check size={13}/></span>}
        </div>
        <div className="pf-card-actions" onClick={e => e.stopPropagation()}>
          {onCopyFromProfile && index === 0 && (
            <button type="button" className="pf-copy-btn" onClick={handleCopy}>
              {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy from profile</>}
            </button>
          )}
          <button type="button" className="pf-collapse-btn">
            {collapsed ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="pf-card-body">
          <div className="pf-row">
            {/* Title */}
            <div className="pf-field pf-field-sm">
              <label className="pf-label">Title</label>
              <select className={`pf-input ${errors.title?'pf-error':''}`} {...register('title')}>
                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.title && <span className="pf-err">{errors.title.message}</span>}
            </div>
            {/* First Name */}
            <div className="pf-field">
              <label className="pf-label">First Name <span className="pf-req">*</span></label>
              <input className={`pf-input ${errors.firstName?'pf-error':''}`}
                placeholder="As on passport/ID" {...register('firstName')} />
              {errors.firstName && <span className="pf-err">{errors.firstName.message}</span>}
            </div>
            {/* Last Name */}
            <div className="pf-field">
              <label className="pf-label">Last Name <span className="pf-req">*</span></label>
              <input className={`pf-input ${errors.lastName?'pf-error':''}`}
                placeholder="As on passport/ID" {...register('lastName')} />
              {errors.lastName && <span className="pf-err">{errors.lastName.message}</span>}
            </div>
          </div>

          <div className="pf-row">
            {/* DOB */}
            <div className="pf-field">
              <label className="pf-label">Date of Birth <span className="pf-req">*</span></label>
              <DatePickerInput
                value={watch('dob') || ''}
                onChange={(v) => { setFieldValue('dob', v); trigger('dob'); }}
                max={new Date().toISOString().split('T')[0]}
                placeholder="Select date of birth"
                error={!!errors.dob}
              />
              {errors.dob && <span className="pf-err">{errors.dob.message}</span>}
            </div>
            {/* Nationality */}
            <div className="pf-field">
              <label className="pf-label">Nationality <span className="pf-req">*</span></label>
              <select className={`pf-input ${errors.nationality?'pf-error':''}`} {...register('nationality')}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.nationality && <span className="pf-err">{errors.nationality.message}</span>}
            </div>
          </div>

          {needsPassport && (
            <div className="pf-row">
              <div className="pf-field">
                <label className="pf-label">Passport Number <span className="pf-req">*</span></label>
                <input className={`pf-input ${errors.passportNumber?'pf-error':''}`}
                  placeholder="e.g. A1234567" {...register('passportNumber')}
                  style={{textTransform:'uppercase'}} />
                {errors.passportNumber && <span className="pf-err">{errors.passportNumber.message}</span>}
              </div>
              <div className="pf-field">
                <label className="pf-label">Passport Expiry <span className="pf-req">*</span></label>
                <DatePickerInput
                  value={watch('passportExpiry') || ''}
                  onChange={(v) => { setFieldValue('passportExpiry', v); trigger('passportExpiry'); }}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Select expiry date"
                  error={!!errors.passportExpiry}
                />
                {errors.passportExpiry && <span className="pf-err">{errors.passportExpiry.message}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Progress bar ──────────────────────────────────────────── */
function StepProgress({ current = 1, labels = ['Passengers', 'Seats', 'Payment'] }) {
  return (
    <div className="pf-steps">
      {labels.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={step}>
            <div className={`pf-step ${done?'pf-step-done':''} ${active?'pf-step-active':''}`}>
              <div className="pf-step-circle">{done ? <Check size={13}/> : step}</div>
              <div className="pf-step-label">{label}</div>
            </div>
            {i < labels.length - 1 && <div className={`pf-step-line ${done?'pf-step-line-done':''}`}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Main PassengerForm ─────────────────────────────────────── */
export default function PassengerForm({ passengerCount, isInternational = false, onSubmit, step = 1 }) {
  const { adults = 1, children = 0, infants = 0 } = passengerCount || {};
  const { user } = useAuthStore();

  // Build passenger list: adults first, then children, then infants
  const passengers = [
    ...Array(adults).fill('adult'),
    ...Array(children).fill('child'),
    ...Array(infants).fill('infant'),
  ].map((type, i) => ({ type, index: i }));

  const [validData, setValidData] = useState({});
  const [profileData, setProfileData] = useState({});

  // Auto-save draft
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(validData)); } catch { /* ignore storage errors */ }
  }, [validData]);

  const handleValidChange = useCallback((index, data) => {
    setValidData(prev => {
      const next = { ...prev };
      if (data) next[index] = data;
      else delete next[index];
      return next;
    });
  }, []);

  const handleCopyFromProfile = useCallback((index) => {
    if (!user) return;
    const parts = (user.name || '').trim().split(/\s+/);
    const first = parts[0] || '';
    const last  = parts.length > 1 ? parts.slice(1).join(' ') : first;
    // _ts forces useEffect to fire even if same name clicked twice
    setProfileData(prev => ({ ...prev, [index]: { firstName: first, lastName: last, nationality: 'India', _ts: Date.now() } }));
  }, [user]);

  const allValid = passengers.every((_, i) => !!validData[i]);
  const typeCounters = { adult: 0, child: 0, infant: 0 };

  const handleContinue = () => {
    if (!allValid) return;
    const result = passengers.map((_, i) => validData[i]);
    onSubmit?.(result);
  };

  return (
    <div className="pf-wrap">
      <StepProgress current={step} />

      <div className="pf-header">
        <User size={20}/>
        <h2 className="pf-title">Passenger Details</h2>
        <span className="pf-subtitle">{passengers.length} passenger{passengers.length > 1 ? 's' : ''}</span>
      </div>

      <div className="pf-list">
        {passengers.map(({ type }, globalIndex) => {
          typeCounters[type]++;
          const label = `${type.charAt(0).toUpperCase() + type.slice(1)} ${typeCounters[type]}`;
          return (
            <PassengerCard
              key={globalIndex}
              index={globalIndex}
              type={type}
              label={label}
              isInternational={isInternational}
              defaultData={validData[globalIndex] || null}
              onValidChange={handleValidChange}
              onCopyFromProfile={user ? handleCopyFromProfile : null}
              profileData={profileData[globalIndex] || null}
            />
          );
        })}
      </div>

      <div className="pf-footer">
        <div className="pf-progress-text">
          {Object.keys(validData).length} of {passengers.length} completed
        </div>
        <button
          type="button"
          className={`pf-continue-btn ${allValid ? 'pf-continue-active' : ''}`}
          disabled={!allValid}
          onClick={handleContinue}
        >
          Continue to Seats →
        </button>
      </div>
    </div>
  );
}
