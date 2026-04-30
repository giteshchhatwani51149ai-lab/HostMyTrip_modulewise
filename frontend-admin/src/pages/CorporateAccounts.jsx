import React, { useEffect, useState } from 'react';
import { corporatesAPI } from '../api';
import { ChevronDown, ChevronUp, Shield, UserCheck, Plane, Hotel, Edit2, Plus, Loader2, FileText, IndianRupee, CheckCircle2 } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const StatusPill = ({ status }) => {
  const map = { confirmed: ['#10b981','rgba(16,185,129,.12)'], pending: ['#f59e0b','rgba(245,158,11,.12)'], cancelled: ['#ef4444','rgba(239,68,68,.12)'], failed: ['#ef4444','rgba(239,68,68,.12)'], completed: ['#3b82f6','rgba(59,130,246,.12)'] };
  const [c, bg] = map[status] || ['#94a3b8','rgba(148,163,184,.12)'];
  return <span style={{ fontSize:10, fontWeight:700, color:c, background:bg, border:`1px solid ${c}33`, padding:'2px 7px', borderRadius:999, textTransform:'uppercase' }}>{status}</span>;
};

const initialForm = {
  name: '',
  taxId: '',
  creditLimit: '',
  adminEmail: '',
  adminPassword: '',
  canBookHotels: true,
  canBookFlights: false,
};

/* ── Member row inside an expanded corporate ── */
function MemberRow({ member }) {
  const [open, setOpen] = useState(false);
  const isAdmin = member.role === 'corporate_admin';
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, background: 'var(--bg)' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer' }}
      >
        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: isAdmin ? 'linear-gradient(135deg,#f97316,#fb923c)' : 'linear-gradient(135deg,#3b82f6,#60a5fa)',
          display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 13,
        }}>
          {(member.name || member.email)[0].toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isAdmin
              ? <Shield size={12} color="#f59e0b" />
              : <UserCheck size={12} color="#3b82f6" />}
            <span style={{ fontSize: 13, fontWeight: 600 }}>{member.name || member.email}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{member.email}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {member.canBookFlights && (
              <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(59,130,246,.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,.2)', padding: '1px 6px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Plane size={9} /> Flights
              </span>
            )}
            {member.canBookHotels && (
              <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(245,158,11,.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.2)', padding: '1px 6px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Hotel size={9} /> Hotels
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', marginRight: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{member.bookings.length} bookings</div>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>₹{fmt(member.totalSpent)} spent</div>
        </div>
        {open ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px' }}>
          {member.bookings.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No bookings yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Ref', 'Status', 'Amount', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {member.bookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>{b.bookingReference || `#${b.id}`}</td>
                    <td style={{ padding: '6px 8px' }}><StatusPill status={b.status} /></td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>₹{fmt(b.totalAmount)}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{fmtDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Expanded members panel inside a corporate card ── */
function MembersPanel({ corpId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    corporatesAPI.getMembers(corpId)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [corpId]);

  if (loading) return <div style={{ padding: 16 }}><Loader2 size={20} className="spinner" /></div>;
  if (!data)   return <p style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>Failed to load members.</p>;

  return (
    <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-sidebar)' }}>
      {['corporate_admin', 'corporate_employee'].map(role => {
        const members = data.members.filter(m => m.role === role);
        if (!members.length) return null;
        return (
          <div key={role} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              {role === 'corporate_admin'
                ? <><Shield size={12} color="#f59e0b" /> Corporate Admins</>
                : <><UserCheck size={12} color="#3b82f6" /> Employees</>}
              <span style={{ background: 'var(--border)', color: 'var(--text-muted)', fontSize: 10, padding: '1px 6px', borderRadius: 999 }}>{members.length}</span>
            </div>
            {members.map(m => <MemberRow key={m.id} member={m} />)}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ── */
export default function CorporateAccounts() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [form, setForm]           = useState(initialForm);
  const [saving, setSaving]       = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editCorp, setEditCorp]   = useState(null);
  const [editData, setEditData]   = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [payModal, setPayModal]     = useState(null); // corp object
  const [payAmount, setPayAmount]   = useState('');
  const [payNote, setPayNote]       = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [paying, setPaying]         = useState(false);
  const [payError, setPayError]     = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { const r = await corporatesAPI.list(); setItems(r.data || []); }
    catch (err) { setError(err.response?.data?.message || 'Failed to load corporates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createCorporate = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await corporatesAPI.create({ ...form, creditLimit: Number(form.creditLimit || 0) });
      setForm(initialForm); setShowCreate(false); await load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create corporate'); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try { await corporatesAPI.update(editCorp.id, editData); setEditCorp(null); await load(); }
    catch { /* */ } finally { setSaving(false); }
  };

  const openInvoice = (corp) => {
    const token = localStorage.getItem('admin_token');
    fetch(corporatesAPI.invoiceUrl(corp.id), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.text())
      .then(html => { const w = window.open('', '_blank'); w.document.write(html); w.document.close(); })
      .catch(() => alert('Failed to generate invoice'));
  };

  const submitPayment = async () => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { setPayError('Enter a valid amount'); return; }
    setPaying(true); setPayError('');
    try {
      const r = await corporatesAPI.recordPayment(payModal.id, { amount: amt, note: payNote });
      setPaySuccess(`₹${amt.toLocaleString('en-IN')} recorded. New outstanding: ₹${Number(r.data.corporate.creditUsed).toLocaleString('en-IN')}`);
      setPayAmount(''); setPayNote('');
      await load();
    } catch (err) {
      setPayError(err.response?.data?.message || 'Failed to record payment');
    } finally { setPaying(false); }
  };

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Corporate Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Manage corporate clients, credit wallets, and view member bookings.</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Corporate
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Corporate cards */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : items.length === 0 ? (
        <div className="glass" style={{ padding: 32, textAlign: 'center', borderRadius: 12, color: 'var(--text-muted)' }}>No corporate accounts yet.</div>
      ) : (
        items.map(corp => {
          const used     = Number(corp.creditUsed || 0);
          const limit    = Number(corp.creditLimit || 1);
          const utilPct  = Math.min(100, Math.round((used / limit) * 100));
          const utilColor = utilPct > 80 ? '#ef4444' : utilPct > 60 ? '#f59e0b' : '#10b981';
          const isExpanded = expandedId === corp.id;

          return (
            <div key={corp.id} className="glass" style={{ borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
              {/* Summary row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : corp.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', cursor: 'pointer' }}
              >
                {/* Avatar */}
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(249,115,22,.1)', display: 'grid', placeItems: 'center', color: 'var(--primary)', flexShrink: 0, fontSize: 18, fontWeight: 800 }}>
                  {corp.name[0].toUpperCase()}
                </div>

                {/* Name + tax */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{corp.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TAX: {corp.taxId}</div>
                </div>

                {/* Credit stats */}
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  {[
                    ['Credit Limit', `₹${fmt(corp.creditLimit)}`, null],
                    ['Used / Outstanding', `₹${fmt(corp.creditUsed)}`, used > 0 ? '#ef4444' : null],
                    ['Remaining',    `₹${fmt(corp.remainingCredit ?? (limit - used))}`, null],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ textAlign: 'center', minWidth: 70 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: color || 'inherit' }}>{val}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                    </div>
                  ))}
                  {/* Util bar */}
                  <div style={{ width: 80 }}>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${utilPct}%`, background: utilColor, borderRadius: 3, transition: 'width .3s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: 'right' }}>{utilPct}%</div>
                  </div>
                </div>

                {/* Status + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'capitalize',
                    background: corp.status === 'active' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
                    color: corp.status === 'active' ? '#10b981' : '#ef4444',
                  }}>{corp.status}</span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={e => { e.stopPropagation(); openInvoice(corp); }}
                    title="Generate Invoice"
                  >
                    <FileText size={12} /> Invoice
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', borderColor: 'rgba(16,185,129,.3)' }}
                    onClick={e => { e.stopPropagation(); setPayModal(corp); setPayAmount(''); setPayNote(''); setPaySuccess(''); setPayError(''); }}
                    title="Record Offline Payment"
                  >
                    <IndianRupee size={12} /> Collect
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={e => {
                      e.stopPropagation();
                      setEditCorp(corp);
                      setEditData({
                        creditLimit: corp.creditLimit,
                        status: corp.status,
                        flightMarginPercent: corp.flightMarginPercent || '',
                        flightMarginAmount: corp.flightMarginAmount || '',
                        hotelMarginPercent: corp.hotelMarginPercent || '',
                        hotelMarginAmount: corp.hotelMarginAmount || '',
                      });
                    }}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Expanded members */}
              {isExpanded && <MembersPanel corpId={corp.id} />}
            </div>
          );
        })
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreate(false)}>
          <div className="glass" style={{ width: 440, maxWidth: '95vw', borderRadius: 16, padding: 28 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>New Corporate Account</h2>
            <form onSubmit={createCorporate} style={{ display: 'grid', gap: 10 }}>
              <input className="form-input" placeholder="Company name (e.g. TCS)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <input className="form-input" placeholder="Tax ID / GST / PAN" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} required />
              <input className="form-input" type="number" placeholder="Credit Limit (INR)" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} required />
              <input className="form-input" type="email" placeholder="Corporate Admin Email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} required />
              <input className="form-input" type="password" placeholder="Corporate Admin Password" value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} required />
              <div style={{ display: 'flex', gap: 18 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.canBookHotels} onChange={e => setForm(f => ({ ...f, canBookHotels: e.target.checked }))} /> Hotels
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.canBookFlights} onChange={e => setForm(f => ({ ...f, canBookFlights: e.target.checked }))} /> Flights
                </label>
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Collect Payment Modal ── */}
      {payModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setPayModal(null)}>
          <div className="glass" style={{ width: 420, maxWidth: '95vw', borderRadius: 16, padding: 28 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Record Payment</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{payModal.name}</p>

            {/* Outstanding summary */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Credit Limit', val: `₹${fmt(payModal.creditLimit)}`, color: 'var(--text)' },
                { label: 'Outstanding', val: `₹${fmt(payModal.creditUsed)}`, color: '#ef4444' },
                { label: 'Remaining', val: `₹${fmt(payModal.remainingCredit ?? (Number(payModal.creditLimit) - Number(payModal.creditUsed)))}`, color: '#10b981' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {paySuccess ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
                <CheckCircle2 size={40} color="#10b981" />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#10b981', textAlign: 'center' }}>{paySuccess}</p>
                <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setPayModal(null)}>Done</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Payment Amount Received (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder={`Max ₹${fmt(payModal.creditUsed)}`}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    min={1}
                    max={payModal.creditUsed}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Note (optional)</label>
                  <input className="form-input" placeholder="e.g. NEFT, cheque no. 12345…" value={payNote} onChange={e => setPayNote(e.target.value)} />
                </div>
                {payError && <div className="alert alert-error">{payError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                  <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={submitPayment} disabled={paying}>
                    {paying ? <><Loader2 size={14} className="spinner" /> Recording…</> : <><IndianRupee size={14} /> Record Payment</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editCorp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setEditCorp(null)}>
          <div className="glass" style={{ width: 480, maxWidth: '95vw', borderRadius: 16, padding: 28, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Edit — {editCorp.name}</h2>

            {/* Credit & Status */}
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Credit Limit (₹)</label>
            <input className="form-input" type="number" style={{ marginBottom: 12 }} value={editData.creditLimit} onChange={e => setEditData(p => ({ ...p, creditLimit: e.target.value }))} />

            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
            <select className="form-input" style={{ marginBottom: 20 }} value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Flight Margins */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16, background: 'rgba(59,130,246,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, fontWeight: 700 }}>
                <Plane size={14} color="#3b82f6" /> Flight Margins
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Percentage (%)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 10"
                    value={editData.flightMarginPercent || ''}
                    onChange={e => setEditData(p => ({ ...p, flightMarginPercent: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Fixed Amount (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 50"
                    value={editData.flightMarginAmount || ''}
                    onChange={e => setEditData(p => ({ ...p, flightMarginAmount: e.target.value }))}
                  />
                </div>
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Amount takes priority if both are set. Leave empty to use platform default.</p>
            </div>

            {/* Hotel Margins */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 20, background: 'rgba(245,158,11,.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, fontWeight: 700 }}>
                <Hotel size={14} color="#f59e0b" /> Hotel Margins
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Percentage (%)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 15"
                    value={editData.hotelMarginPercent || ''}
                    onChange={e => setEditData(p => ({ ...p, hotelMarginPercent: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Fixed Amount (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 500"
                    value={editData.hotelMarginAmount || ''}
                    onChange={e => setEditData(p => ({ ...p, hotelMarginAmount: e.target.value }))}
                  />
                </div>
              </div>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Amount takes priority if both are set. Leave empty to use platform default.</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setEditCorp(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
