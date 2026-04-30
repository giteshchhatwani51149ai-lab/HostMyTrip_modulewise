import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { adminAPI, bookingsAPI } from '../api';
import {
  Search, Filter, RefreshCcw, MoreHorizontal, Eye, CheckCircle2,
  XCircle, Mail, FileDown, Download, ChevronLeft, ChevronRight, Inbox,
  Building2, ChevronDown, ChevronUp, User,
} from 'lucide-react';

/* ── Constants ─────────────────────────────────────────────────────── */
const STATUS_BADGE = {
  confirmed: 'badge-success', cancelled: 'badge-danger',
  completed: 'badge-primary', pending: 'badge-warning', failed: 'badge-danger',
};
const TYPE_COLORS = {
  hotel:   { bg: 'rgba(255,107,0,0.15)',  fg: '#FF6B00' },
  flight:  { bg: 'rgba(255,140,58,0.15)', fg: '#FF8C3A' },
  package: { bg: 'rgba(22,163,74,0.15)',  fg: '#16A34A' },
};
const PAGE_SIZE = 25;

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate  = (s) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ── Skeleton row ──────────────────────────────────────────────────── */
const SkelRow = () => (
  <tr style={{ borderTop: '1px solid var(--border)' }}>
    {[40, 200, 80, 100, 80, 90, 60].map((w, i) => (
      <td key={i} style={{ padding: '14px 16px' }}>
        <div style={{
          width: w, height: 12, borderRadius: 4,
          background: 'linear-gradient(90deg, var(--bg-2), var(--bg), var(--bg-2))',
          backgroundSize: '200% 100%', animation: 'skel 1.4s infinite',
        }}/>
      </td>
    ))}
  </tr>
);

/* ── Empty state SVG ───────────────────────────────────────────────── */
const EmptyState = () => (
  <div style={{ padding: '60px 20px', textAlign: 'center' }}>
    <div style={{
      width: 80, height: 80, margin: '0 auto 16px', borderRadius: '50%',
      background: 'rgba(255,107,0,0.10)',
      display: 'grid', placeItems: 'center',
    }}>
      <Inbox size={36} color="var(--primary)"/>
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No bookings found</h3>
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Try adjusting your filters or check back later.</p>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────
   AllBookings (admin)
   ───────────────────────────────────────────────────────────────────── */
export default function AllBookings() {
  const [sp, setSp] = useSearchParams();
  const navigate    = useNavigate();

  /* ── URL-synced filter state ────────────────────────────────────── */
  const [draft, setDraft] = useState({
    q:        sp.get('q')        || '',
    status:   sp.get('status')   || 'all',
    type:     sp.get('type')     || 'all',
    dateFrom: sp.get('dateFrom') || '',
    dateTo:   sp.get('dateTo')   || '',
  });
  const [applied, setApplied] = useState(draft);
  const [page, setPage] = useState(parseInt(sp.get('page') || '1', 10));

  /* ── Source filter ─────────────────────────────────────────────── */
  const [source, setSource] = useState('all'); // 'all' | 'direct' | 'corporate'
  const [corpOpen, setCorpOpen] = useState({}); // { [corpId]: bool }

  /* ── Data state ─────────────────────────────────────────────────── */
  const [data, setData]       = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  /* ── Selection ─────────────────────────────────────────────────── */
  const [selected, setSelected] = useState(new Set());

  /* ── Action menu state ─────────────────────────────────────────── */
  const [menuFor, setMenuFor] = useState(null); // booking id
  const [actionMsg, setActionMsg] = useState('');

  /* ── Debounced search → applied ────────────────────────────────── */
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setApplied(prev => ({ ...prev, q: draft.q }));
      setPage(1);
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [draft.q]);

  /* ── Fetch on applied filter / page change ─────────────────────── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError('');
    const params = { page, pageSize: PAGE_SIZE };
    if (applied.q)         params.q         = applied.q;
    if (applied.status !== 'all') params.status = applied.status;
    if (applied.type   !== 'all') params.type   = applied.type;
    if (applied.dateFrom)  params.dateFrom  = applied.dateFrom;
    if (applied.dateTo)    params.dateTo    = applied.dateTo;

    adminAPI.bookings(params)
      .then(r => { setData(r.data); setLoading(false); setSelected(new Set()); })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load bookings');
        setLoading(false);
      });
  }, [applied, page]);

  /* ── Sync applied to URL ───────────────────────────────────────── */
  useEffect(() => {
    const next = {};
    if (applied.q)         next.q         = applied.q;
    if (applied.status !== 'all') next.status = applied.status;
    if (applied.type   !== 'all') next.type   = applied.type;
    if (applied.dateFrom)  next.dateFrom  = applied.dateFrom;
    if (applied.dateTo)    next.dateTo    = applied.dateTo;
    if (page > 1)          next.page      = String(page);
    setSp(next, { replace: true });
  }, [applied, page]); // eslint-disable-line

  /* ── Apply / Reset ─────────────────────────────────────────────── */
  const applyFilters = () => { setApplied(draft); setPage(1); };
  const resetFilters = () => {
    const empty = { q: '', status: 'all', type: 'all', dateFrom: '', dateTo: '' };
    setDraft(empty); setApplied(empty); setPage(1);
  };

  /* ── Selection helpers ─────────────────────────────────────────── */
  const allOnPageSelected = useMemo(
    () => data.items.length > 0 && data.items.every(b => selected.has(b.id)),
    [data.items, selected]
  );
  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) data.items.forEach(b => next.delete(b.id));
      else                   data.items.forEach(b => next.add(b.id));
      return next;
    });
  };
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Per-row actions ───────────────────────────────────────────── */
  const handleConfirm = async (id) => {
    setMenuFor(null);
    if (!window.confirm('Mark this booking as confirmed?')) return;
    try {
      await adminAPI.confirmBooking(id);
      setData(d => ({ ...d, items: d.items.map(b => b.id === id ? { ...b, status: 'confirmed' } : b) }));
      flash('Booking confirmed.');
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };
  const handleCancel = async (id) => {
    setMenuFor(null);
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id);
      setData(d => ({ ...d, items: d.items.map(b => b.id === id ? { ...b, status: 'cancelled' } : b) }));
      flash('Booking cancelled.');
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };
  const handleResend = async (id) => {
    setMenuFor(null);
    try {
      const r = await adminAPI.resendEmail(id);
      flash(r.data.message);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };
  const handleInvoice = (id) => {
    setMenuFor(null);
    const token = localStorage.getItem('admin_token');
    // open invoice in new tab; backend requires Bearer header so build a tiny redirect helper
    fetch(adminAPI.invoiceUrl(id), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.text()).then(html => {
        const w = window.open('', '_blank');
        w.document.write(html); w.document.close();
      }).catch(() => alert('Failed to load invoice'));
  };
  const handleViewDetails = (id) => {
    setMenuFor(null);
    navigate(`/bookings/${id}`);
  };

  /* ── CSV export ───────────────────────────────────────────────── */
  const exportCSV = (items) => {
    if (!items.length) { flash('Nothing to export.'); return; }
    const rows = [
      ['Booking Ref', 'Customer', 'Email', 'Phone', 'Type', 'Hotel/Route', 'Date', 'Amount', 'Status'],
      ...items.map(b => [
        b.bookingReference || `#${b.id}`,
        b.guestName || '',
        b.guestEmail || '',
        b.guestPhone || '',
        b.bookingType,
        b.displayHotelName || '',
        b.createdAt,
        b.totalAmount,
        b.status,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `bookings-${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
  };
  const exportSelected = () => exportCSV(data.items.filter(b => selected.has(b.id)));
  const exportAll = async () => {
    /* fetch ALL pages with current filters */
    setActionMsg('Exporting all…');
    try {
      const params = { page: 1, pageSize: 10000 };
      if (applied.q)         params.q         = applied.q;
      if (applied.status !== 'all') params.status = applied.status;
      if (applied.type   !== 'all') params.type   = applied.type;
      if (applied.dateFrom)  params.dateFrom  = applied.dateFrom;
      if (applied.dateTo)    params.dateTo    = applied.dateTo;
      const r = await adminAPI.bookings(params);
      exportCSV(r.data.items);
      setActionMsg('');
    } catch { alert('Failed to export'); setActionMsg(''); }
  };
  const sendBulkEmail = () => {
    const emails = data.items
      .filter(b => selected.has(b.id) && b.guestEmail)
      .map(b => b.guestEmail);
    if (!emails.length) { flash('No customers selected.'); return; }
    window.open(`mailto:${emails.join(',')}?subject=Important update from HostMyTrip`, '_blank');
  };

  /* ── flash msg ────────────────────────────────────────────────── */
  const flash = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 2500);
  };

  /* ── Source-filtered items + corp groups ─────────────────────── */
  const sourceItems = useMemo(() => {
    if (source === 'direct')    return data.items.filter(b => !b.corporateId);
    if (source === 'corporate') return data.items.filter(b => !!b.corporateId);
    return data.items;
  }, [data.items, source]);

  const corpGroups = useMemo(() => {
    if (source !== 'corporate') return [];
    const map = {};
    sourceItems.forEach(b => {
      const cid   = b.corporateId || 'unknown';
      const cname = b.corporate?.name || `Corporate #${cid}`;
      if (!map[cid]) map[cid] = { id: cid, name: cname, bookings: [] };
      const uid = b.bookedByUser?.id || b.guestEmail || 'unknown';
      let member = map[cid].bookings.find(m => m.uid === uid);
      if (!member) {
        member = { uid, name: b.guestName || b.guestEmail || '—', email: b.guestEmail, role: b.bookedByUser?.role, items: [] };
        map[cid].bookings.push(member);
      }
      member.items.push(b);
    });
    return Object.values(map);
  }, [sourceItems, source]);

  const activeAmt = (bookings) =>
    bookings.filter(b => b.status !== 'cancelled' && b.status !== 'failed')
            .reduce((s, b) => s + Number(b.totalAmount || 0), 0);

  /* ── Pagination summary ───────────────────────────────────────── */
  const startIdx = data.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx   = Math.min(data.total, page * PAGE_SIZE);

  /* ── Active filter count (for badge) ──────────────────────────── */
  const activeCount = [
    applied.q, applied.dateFrom, applied.dateTo,
    applied.status !== 'all' ? 1 : 0,
    applied.type   !== 'all' ? 1 : 0,
  ].filter(Boolean).length;

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="animate-in" onClick={() => setMenuFor(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Bookings</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${data.total} total · showing ${startIdx}–${endIdx}`}
            {activeCount > 0 && <span style={{ marginLeft: 8, padding: '2px 8px', background: 'var(--primary)', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{activeCount} filters</span>}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportAll} disabled={loading}>
          <Download size={14}/> Export All
        </button>
      </div>

      {/* ── FILTER BAR ───────────────────────────────────────────── */}
      <div className="glass ab-filters" style={{ padding: 16, marginBottom: 14, display: 'grid', gridTemplateColumns: 'minmax(220px,1.5fr) 130px 130px 140px 140px auto auto', gap: 10, alignItems: 'end' }} onClick={e => e.stopPropagation()}>
        {/* Search */}
        <div>
          <label style={lblStyle}>Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}/>
            <input
              value={draft.q}
              onChange={e => setDraft(d => ({ ...d, q: e.target.value }))}
              placeholder="Booking ref, email, phone…"
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label style={lblStyle}>Type</label>
          <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))} style={inputStyle}>
            <option value="all">All Types</option>
            <option value="flight">Flights</option>
            <option value="hotel">Hotels</option>
            <option value="package">Packages</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={lblStyle}>Status</label>
          <select value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))} style={inputStyle}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Date from */}
        <div>
          <label style={lblStyle}>From</label>
          <input type="date" value={draft.dateFrom} onChange={e => setDraft(d => ({ ...d, dateFrom: e.target.value }))} style={inputStyle}/>
        </div>

        {/* Date to */}
        <div>
          <label style={lblStyle}>To</label>
          <input type="date" value={draft.dateTo} onChange={e => setDraft(d => ({ ...d, dateTo: e.target.value }))} style={inputStyle}/>
        </div>

        {/* Apply / Reset */}
        <button className="btn btn-primary btn-sm" onClick={applyFilters} style={{ height: 36 }}>
          <Filter size={13}/> Apply
        </button>
        <button className="btn btn-secondary btn-sm" onClick={resetFilters} style={{ height: 36 }}>
          <RefreshCcw size={13}/> Reset
        </button>
      </div>

      {/* ── BULK BAR ─────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="glass" style={{ padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
          <button className="btn btn-secondary btn-sm" onClick={exportSelected}><FileDown size={13}/> Export CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={sendBulkEmail}><Mail size={13}/> Send email</button>
          <button className="btn btn-sm" style={{ background: 'none', color: 'var(--text-muted)' }} onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {actionMsg && (
        <div className="alert alert-success" style={{ marginBottom: 12 }}>{actionMsg}</div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>
      )}

      {/* ── SOURCE TOGGLE ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { key: 'all',       label: 'All Bookings' },
          { key: 'direct',    label: 'Direct Customers' },
          { key: 'corporate', label: 'Corporate' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => { setSource(s.key); setCorpOpen({}); }}
            style={{
              padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: source === s.key ? 'var(--primary)' : 'var(--bg-2)',
              color: source === s.key ? '#fff' : 'var(--text-muted)',
              transition: 'var(--transition)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {s.key === 'corporate' && <Building2 size={13}/>}
            {s.key === 'direct'    && <User size={13}/>}
            {s.label}
            {s.key !== 'all' && !loading && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                background: source === s.key ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                color: source === s.key ? '#fff' : 'var(--text-muted)',
              }}>
                {s.key === 'direct'    ? data.items.filter(b => !b.corporateId).length : ''}
                {s.key === 'corporate' ? data.items.filter(b => !!b.corporateId).length : ''}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CORPORATE GROUPED VIEW ────────────────────────────────── */}
      {source === 'corporate' && !loading && (
        <div style={{ marginBottom: 16 }}>
          {corpGroups.length === 0
            ? <div className="glass" style={{ padding: 32, textAlign: 'center', borderRadius: 12, color: 'var(--text-muted)' }}>No corporate bookings found.</div>
            : corpGroups.map(corp => {
              const isOpen = !!corpOpen[corp.id];
              const totalAmt = corp.bookings.reduce((s, m) => s + activeAmt(m.items), 0);
              const totalBk  = corp.bookings.reduce((s, m) => s + m.items.length, 0);
              return (
                <div key={corp.id} className="glass" style={{ borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
                  {/* Corporate header row */}
                  <div
                    onClick={() => setCorpOpen(p => ({ ...p, [corp.id]: !p[corp.id] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer', borderBottom: isOpen ? '1px solid var(--border)' : 'none' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(255,107,0,0.12)', display: 'grid', placeItems: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {corp.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={13} color="var(--primary)"/>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{corp.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {corp.bookings.length} member{corp.bookings.length !== 1 ? 's' : ''} · {totalBk} booking{totalBk !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{fmtMoney(totalAmt)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>total spent</div>
                    </div>
                    {isOpen ? <ChevronUp size={16} color="var(--text-muted)"/> : <ChevronDown size={16} color="var(--text-muted)"/>}
                  </div>

                  {/* Members inside this corporate */}
                  {isOpen && corp.bookings.map(member => {
                    const mKey = `${corp.id}-${member.uid}`;
                    const mOpen = !!corpOpen[mKey];
                    const mAmt  = activeAmt(member.items);
                    const isCorpAdmin = member.role === 'corporate_admin';
                    return (
                      <div key={member.uid} style={{ borderBottom: '1px solid var(--border)' }}>
                        {/* Member header */}
                        <div
                          onClick={() => setCorpOpen(p => ({ ...p, [mKey]: !p[mKey] }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px 11px 32px', cursor: 'pointer', background: 'var(--bg)' }}
                        >
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: isCorpAdmin ? 'linear-gradient(135deg,#f97316,#fb923c)' : 'linear-gradient(135deg,#3b82f6,#60a5fa)',
                            display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 12,
                          }}>
                            {(member.name || member.email || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{member.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{member.email}</div>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                            background: isCorpAdmin ? 'rgba(249,115,22,.12)' : 'rgba(59,130,246,.12)',
                            color: isCorpAdmin ? '#f97316' : '#3b82f6',
                            marginRight: 8,
                          }}>{isCorpAdmin ? 'Corp Admin' : 'Employee'}</span>
                          <div style={{ textAlign: 'right', marginRight: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{member.items.length} booking{member.items.length !== 1 ? 's' : ''}</div>
                            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{fmtMoney(mAmt)}</div>
                          </div>
                          {mOpen ? <ChevronUp size={14} color="var(--text-muted)"/> : <ChevronDown size={14} color="var(--text-muted)"/>}
                        </div>

                        {/* Member bookings table */}
                        {mOpen && (
                          <div style={{ overflowX: 'auto', background: 'var(--bg-2)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                              <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                  <th style={thStyle}>Booking Ref</th>
                                  <th style={thStyle}>Type</th>
                                  <th style={thStyle}>Date</th>
                                  <th style={thStyle}>Amount</th>
                                  <th style={thStyle}>Status</th>
                                  <th style={{ ...thStyle, textAlign: 'right', paddingRight: 16 }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {member.items.map(b => {
                                  const tc = TYPE_COLORS[b.bookingType] || TYPE_COLORS.package;
                                  return (
                                    <tr key={b.id} style={{ borderTop: '1px solid var(--border)', opacity: b.status === 'cancelled' ? 0.6 : 1 }}>
                                      <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <button onClick={() => handleViewDetails(b.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}>
                                            {b.bookingReference || `#${b.id}`}
                                          </button>
                                          {b.bookingSource === 'admin' && (
                                            <span title="Booked by admin" style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,107,0,0.15)', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Admin</span>
                                          )}
                                          {b.bookingSource === 'admin' && b.paymentStatus === 'pending' && (
                                            <span title="Cash collection pending" style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.4 }}>Pending Collection</span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{b.displayHotelName}</div>
                                      </td>
                                      <td style={tdStyle}>
                                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.fg, textTransform: 'capitalize' }}>{b.bookingType}</span>
                                      </td>
                                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(b.createdAt)}</td>
                                      <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{fmtMoney(b.totalAmount)}</td>
                                      <td style={tdStyle}><span className={`badge ${STATUS_BADGE[b.status] || 'badge-primary'}`}>{b.status}</span></td>
                                      <td style={{ ...tdStyle, textAlign: 'right', position: 'relative', paddingRight: 16 }}>
                                        <button
                                          onClick={e => { e.stopPropagation(); setMenuFor(menuFor === b.id ? null : b.id); }}
                                          style={{ background: 'none', border: '1px solid var(--border)', padding: 6, borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' }}
                                        ><MoreHorizontal size={15}/></button>
                                        {menuFor === b.id && (
                                          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 16, marginTop: 4, width: 200, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 50, overflow: 'hidden' }}>
                                            <button style={menuItem} onClick={() => handleViewDetails(b.id)}><Eye size={14}/> View Details</button>
                                            {b.status === 'pending' && <button style={menuItem} onClick={() => handleConfirm(b.id)}><CheckCircle2 size={14} color="var(--success)"/> Mark Confirmed</button>}
                                            {b.status !== 'cancelled' && b.status !== 'failed' && <button style={{ ...menuItem, color: 'var(--error)' }} onClick={() => handleCancel(b.id)}><XCircle size={14}/> Cancel</button>}
                                            <button style={menuItem} onClick={() => handleResend(b.id)}><Mail size={14}/> Resend Email</button>
                                            <button style={menuItem} onClick={() => handleInvoice(b.id)}><FileDown size={14}/> Invoice</button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      )}

      {/* ── TABLE (All / Direct view) ─────────────────────────────── */}
      {source !== 'corporate' && (
      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ ...thStyle, width: 36, padding: '12px 8px 12px 16px' }}>
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll}/>
                </th>
                <th style={thStyle}>Booking Ref</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, width: 60, textAlign: 'right', paddingRight: 16 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkelRow key={i}/>)
                : sourceItems.length === 0
                  ? <tr><td colSpan={8}><EmptyState/></td></tr>
                  : sourceItems.map(b => {
                    const tc = TYPE_COLORS[b.bookingType] || TYPE_COLORS.package;
                    const sel = selected.has(b.id);
                    return (
                      <tr key={b.id}
                          style={{
                            borderTop: '1px solid var(--border)',
                            background: sel ? 'rgba(255,107,0,0.07)' : 'none',
                            opacity: b.status === 'cancelled' || b.status === 'failed' ? 0.65 : 1,
                            transition: 'var(--transition)',
                          }}
                      >
                        <td style={{ padding: '13px 8px 13px 16px' }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleOne(b.id)} onClick={e => e.stopPropagation()}/>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => handleViewDetails(b.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}
                            >{b.bookingReference || `#${b.id}`}</button>
                            {b.bookingSource === 'admin' && (
                              <span title="Booked by admin" style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,107,0,0.15)', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Admin</span>
                            )}
                            {b.bookingSource === 'admin' && b.paymentStatus === 'pending' && (
                              <span title="Cash collection pending" style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.4 }}>Pending Collection</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{b.displayHotelName}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: 13 }}>{b.guestName || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{b.guestEmail}</div>
                          {b.guestPhone && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{b.guestPhone}</div>}
                          {b.corporate?.name && (
                            <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(59,130,246,.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,.2)', padding: '1px 6px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                              <Building2 size={9}/> {b.corporate.name}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                            background: tc.bg, color: tc.fg, textTransform: 'capitalize',
                          }}>{b.bookingType}</span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(b.createdAt)}</td>
                        <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{fmtMoney(b.totalAmount)}</td>
                        <td style={tdStyle}>
                          <span className={`badge ${STATUS_BADGE[b.status] || 'badge-primary'}`}>{b.status}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', position: 'relative', paddingRight: 16 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === b.id ? null : b.id); }}
                            style={{
                              background: 'none', border: '1px solid var(--border)',
                              padding: 6, borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer',
                              transition: 'var(--transition)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          ><MoreHorizontal size={15}/></button>

                          {menuFor === b.id && (
                            <div onClick={e => e.stopPropagation()} style={{
                              position: 'absolute', top: '100%', right: 16, marginTop: 4, width: 200,
                              background: 'var(--bg-2)', border: '1px solid var(--border)',
                              borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                              zIndex: 50, overflow: 'hidden',
                            }}>
                              <button style={menuItem}    onClick={() => handleViewDetails(b.id)}><Eye size={14}/> View Details</button>
                              {b.status === 'pending' && (
                                <button style={menuItem}  onClick={() => handleConfirm(b.id)}><CheckCircle2 size={14} color="var(--success)"/> Mark as Confirmed</button>
                              )}
                              {b.status !== 'cancelled' && b.status !== 'failed' && (
                                <button style={{ ...menuItem, color: 'var(--error)' }} onClick={() => handleCancel(b.id)}><XCircle size={14}/> Cancel Booking</button>
                              )}
                              <button style={menuItem}    onClick={() => handleResend(b.id)}><Mail size={14}/> Resend Email</button>
                              <button style={menuItem}    onClick={() => handleInvoice(b.id)}><FileDown size={14}/> Download Invoice</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ───────────────────────────────────────── */}
        {!loading && data.total > 0 && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text)' }}>{startIdx}–{endIdx}</strong> of <strong style={{ color: 'var(--text)' }}>{data.total}</strong>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14}/> Prev
              </button>
              {Array.from({ length: Math.min(5, data.totalPages) }).map((_, i) => {
                const p = Math.max(1, Math.min(data.totalPages - 4, page - 2)) + i;
                if (p > data.totalPages) return null;
                return (
                  <button key={p}
                    onClick={() => setPage(p)}
                    className={p === page ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                    style={{ minWidth: 34 }}
                  >{p}</button>
                );
              })}
              <button className="btn btn-secondary btn-sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      <style>{`
        @keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (max-width: 900px) {
          .ab-filters { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Inline style atoms ────────────────────────────────────────────── */
const lblStyle = { display: 'block', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 };
const inputStyle = {
  width: '100%', height: 36,
  padding: '0 10px', background: 'var(--bg-2)',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
};
const thStyle = {
  padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)',
  fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
};
const tdStyle = { padding: '13px 16px', fontSize: 13, verticalAlign: 'top' };
const menuItem = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 14px', textAlign: 'left',
  background: 'none', border: 'none',
  color: 'var(--text)', fontSize: 13, cursor: 'pointer',
  transition: 'var(--transition)',
};
