import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { corporatesAPI, bookingsAPI } from '../api';
import Navbar from '../components/Navbar';
import {
  Building2, Users, CreditCard, Clock, CheckCircle, XCircle,
  Plus, Plane, Hotel, ChevronRight, RefreshCw, AlertTriangle,
  TrendingUp, Shield, UserPlus, Eye, X, Trash2, Calendar, Mail,
  ArrowRight, Loader2,
} from 'lucide-react';
import './CorporateDashboard.css';

const fmt  = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtD = (s) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ── Add User Modal ───────────────────────────────────────────── */
function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'corporate_employee', canBookHotels: true, canBookFlights: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await corporatesAPI.createMyUser(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally { setSaving(false); }
  };

  return (
    <div className="corp-modal-overlay" onClick={onClose}>
      <div className="corp-modal" onClick={e => e.stopPropagation()}>
        <div className="corp-modal-header">
          <h3><UserPlus size={16}/> Add Team Member</h3>
          <button className="corp-modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={submit} className="corp-modal-form">
          <div className="corp-field">
            <label>Full Name</label>
            <input type="text" placeholder="John Doe" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="corp-field">
            <label>Email</label>
            <input type="email" placeholder="john@company.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="corp-field">
            <label>Password</label>
            <input type="password" placeholder="Minimum 6 characters" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          </div>
          <div className="corp-field">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="corporate_employee">Employee (can request bookings)</option>
              <option value="corporate_admin">Admin (can approve bookings)</option>
            </select>
          </div>
          <div className="corp-field-row">
            <label className="corp-toggle">
              <input type="checkbox" checked={form.canBookHotels}
                onChange={e => setForm(f => ({ ...f, canBookHotels: e.target.checked }))} />
              <span>Can book Hotels</span>
            </label>
            <label className="corp-toggle">
              <input type="checkbox" checked={form.canBookFlights}
                onChange={e => setForm(f => ({ ...f, canBookFlights: e.target.checked }))} />
              <span>Can book Flights</span>
            </label>
          </div>
          {error && <div className="corp-error">{error}</div>}
          <div className="corp-modal-actions">
            <button type="button" className="corp-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="corp-btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
/* ── Member Detail Drawer ─────────────────────────────────────── */
function MemberDetailDrawer({ memberId, onClose, onDeleted }) {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr]         = useState('');

  useEffect(() => {
    setLoading(true); setErr('');
    bookingsAPI.getMemberBookings(memberId)
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.message || 'Failed to load member data'))
      .finally(() => setLoading(false));
  }, [memberId]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${data?.member?.email}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await bookingsAPI.deleteMember(memberId);
      onDeleted();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to delete member');
    } finally { setDeleting(false); }
  };

  const member   = data?.member;
  const bookings = data?.bookings || [];
  const upcoming = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'failed' && new Date(b.checkIn || b.departureTime || b.createdAt) >= new Date());
  const past     = bookings.filter(b => !upcoming.includes(b));

  const statusColor = (s) => ({
    confirmed: '#10b981', paid: '#10b981', pending: '#f59e0b',
    cancelled: '#ef4444', failed: '#ef4444',
  })[s] || '#94a3b8';

  return (
    <div className="corp-drawer-backdrop" onClick={onClose}>
      <div className="corp-drawer" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="corp-drawer-header">
          <div className="corp-drawer-avatar">{(member?.name || member?.email || '?')[0].toUpperCase()}</div>
          <div className="corp-drawer-title">
            <h2>{member?.name || member?.email || 'Loading…'}</h2>
            {member?.name && <p>{member.email}</p>}
          </div>
          <button className="corp-drawer-close" onClick={onClose}><X size={18}/></button>
        </div>

        {loading && <div className="corp-drawer-loading"><Loader2 size={20} className="corp-spin"/> Loading…</div>}
        {err    && <div className="corp-drawer-err"><AlertTriangle size={14}/> {err}</div>}

        {!loading && member && (
          <div className="corp-drawer-body">

            {/* Meta */}
            <div className="corp-drawer-meta">
              <div className="corp-dm-item"><Mail size={13}/> {member.email}</div>
              <div className="corp-dm-item"><Calendar size={13}/> Joined {fmtD(member.createdAt)}</div>
              <div className="corp-dm-item">
                <span className={`corp-role-badge role-${member.role}`}>{member.role === 'corporate_admin' ? 'Admin' : 'Employee'}</span>
                {member.canBookFlights && <span className="corp-perm-badge"><Plane size={10}/> Flights</span>}
                {member.canBookHotels  && <span className="corp-perm-badge"><Hotel size={10}/> Hotels</span>}
              </div>
            </div>

            {/* Stats */}
            <div className="corp-drawer-stats">
              <div className="corp-ds-card">
                <div className="corp-ds-val">{bookings.length}</div>
                <div className="corp-ds-label">Total Bookings</div>
              </div>
              <div className="corp-ds-card">
                <div className="corp-ds-val">{upcoming.length}</div>
                <div className="corp-ds-label">Upcoming</div>
              </div>
              <div className="corp-ds-card">
                <div className="corp-ds-val">₹{fmt(bookings.filter(b => b.status !== 'cancelled' && b.status !== 'failed').reduce((s, b) => s + Number(b.totalAmount || 0), 0))}</div>
                <div className="corp-ds-label">Total Spent</div>
              </div>
            </div>

            {/* Booking sections */}
            {[{ label: 'Upcoming Trips', list: upcoming }, { label: 'Past & All Transactions', list: past }].map(({ label, list }) => (
              list.length > 0 && (
                <div key={label} className="corp-drawer-section">
                  <h4>{label}</h4>
                  {list.map(b => (
                    <div key={b.id} className="corp-drawer-booking">
                      <div className="corp-db-icon">
                        {b.bookingType === 'flight' ? <Plane size={14}/> : <Hotel size={14}/>}
                      </div>
                      <div className="corp-db-info">
                        <div className="corp-db-title">
                          {b.bookingType === 'flight'
                            ? `${b.origin} → ${b.destination}`
                            : (b.displayHotelName || 'Hotel booking')}
                        </div>
                        <div className="corp-db-meta">
                          <span>#{b.bookingReference || b.id}</span>
                          <span>₹{fmt(b.totalAmount)}</span>
                          <span style={{ color: statusColor(b.status) }}>● {b.status}</span>
                          {b.approvalStatus && b.approvalStatus !== 'not_required' && (
                            <span className="corp-db-approval">{b.approvalStatus}</span>
                          )}
                        </div>
                      </div>
                      <button className="corp-view-btn" onClick={() => { navigate(`/bookings/${b.id}`, { state: { from: 'corporate' } }); onClose(); }}>
                        <ArrowRight size={13}/>
                      </button>
                    </div>
                  ))}
                </div>
              )
            ))}
            {bookings.length === 0 && <div className="corp-drawer-empty">No bookings found for this member.</div>}

          </div>
        )}

        {/* Footer — delete */}
        {!loading && member && member.role !== 'corporate_admin' && (
          <div className="corp-drawer-footer">
            <button className="corp-delete-btn" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete Account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CorporateDashboard() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const isAdmin   = user?.role === 'corporate_admin';

  const [dash, setDash]             = useState(null);
  const [members, setMembers]       = useState([]);
  const [approvals, setApprovals]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [appLoading, setAppLoading] = useState({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [error, setError]           = useState('');
  const [activeTab, setActiveTab]   = useState('overview'); // overview | approvals | team

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const dashRes = await corporatesAPI.myDashboard();
      setDash(dashRes.data);

      if (isAdmin) {
        const [membersRes, appRes] = await Promise.all([
          corporatesAPI.myUsers(),
          bookingsAPI.pendingApprovals(),
        ]);
        setMembers(membersRes.data || []);
        setApprovals(appRes.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load corporate data');
    } finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    setAppLoading(p => ({ ...p, [id]: 'approving' }));
    try {
      await bookingsAPI.approveCorporate(id, 'Approved by corporate admin');
      setApprovals(prev => prev.filter(a => a.id !== id));
      setDash(prev => prev ? { ...prev, pendingApprovals: (prev.pendingApprovals || 1) - 1 } : prev);
    } catch { /* keep in list */ }
    finally { setAppLoading(p => ({ ...p, [id]: null })); }
  };

  const handleReject = async (id) => {
    setAppLoading(p => ({ ...p, [id]: 'rejecting' }));
    try {
      await bookingsAPI.rejectCorporate(id, 'Rejected by corporate admin');
      setApprovals(prev => prev.filter(a => a.id !== id));
      setDash(prev => prev ? { ...prev, pendingApprovals: (prev.pendingApprovals || 1) - 1 } : prev);
    } catch { /* keep in list */ }
    finally { setAppLoading(p => ({ ...p, [id]: null })); }
  };

  const corp        = dash?.corporate;
  const creditLimit = Number(corp?.creditLimit || 0);
  const creditUsed  = Number(corp?.creditUsed  || 0);
  const remaining   = dash?.remainingCredit ?? (creditLimit - creditUsed);
  const usedPct     = creditLimit > 0 ? Math.min(100, (creditUsed / creditLimit) * 100) : 0;

  if (loading) return (
    <div className="corp-page">
      <Navbar />
      <div className="corp-loading"><RefreshCw size={24} className="corp-spin"/> Loading corporate dashboard…</div>
    </div>
  );

  if (error) return (
    <div className="corp-page">
      <Navbar />
      <div className="corp-error-full"><AlertTriangle size={20}/> {error}</div>
    </div>
  );

  return (
    <div className="corp-page">
      <Navbar />

      {showAddUser && (
        <AddUserModal onClose={() => setShowAddUser(false)} onCreated={load} />
      )}
      {selectedMember && (
        <MemberDetailDrawer memberId={selectedMember} onClose={() => setSelectedMember(null)} onDeleted={load} />
      )}

      <div className="container corp-wrap">

        {/* ── Header ── */}
        <div className="corp-header">
          <div className="corp-header-left">
            <div className="corp-company-icon"><Building2 size={22}/></div>
            <div>
              <h1 className="corp-company-name">{corp?.name || 'Corporate Account'}</h1>
              <p className="corp-company-sub">
                {isAdmin ? 'Admin Dashboard' : 'Employee Portal'}
                {corp?.status === 'active'
                  ? <span className="corp-status-active">● Active</span>
                  : <span className="corp-status-disabled">● Disabled</span>}
              </p>
            </div>
          </div>
          <div className="corp-header-actions">
            <button className="corp-btn-ghost" onClick={load}><RefreshCw size={14}/> Refresh</button>
            {isAdmin && (
              <button className="corp-btn-primary" onClick={() => setShowAddUser(true)}>
                <Plus size={14}/> Add Member
              </button>
            )}
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="corp-stats-grid">
          <div className="corp-stat-card">
            <div className="corp-stat-icon credit"><CreditCard size={20}/></div>
            <div className="corp-stat-body">
              <div className="corp-stat-label">Credit Limit</div>
              <div className="corp-stat-value">₹{fmt(creditLimit)}</div>
            </div>
          </div>
          <div className="corp-stat-card">
            <div className="corp-stat-icon used"><TrendingUp size={20}/></div>
            <div className="corp-stat-body">
              <div className="corp-stat-label">Credit Used</div>
              <div className="corp-stat-value">₹{fmt(creditUsed)}</div>
            </div>
          </div>
          <div className={`corp-stat-card ${remaining < creditLimit * 0.1 ? 'corp-stat-warn' : ''}`}>
            <div className="corp-stat-icon remaining"><Shield size={20}/></div>
            <div className="corp-stat-body">
              <div className="corp-stat-label">Remaining Credit</div>
              <div className="corp-stat-value">₹{fmt(remaining)}</div>
            </div>
          </div>
          <div className="corp-stat-card">
            <div className="corp-stat-icon members"><Users size={20}/></div>
            <div className="corp-stat-body">
              <div className="corp-stat-label">Team Members</div>
              <div className="corp-stat-value">{members.length}</div>
            </div>
          </div>
          {isAdmin && (
            <div className={`corp-stat-card ${(dash?.pendingApprovals || 0) > 0 ? 'corp-stat-pending' : ''}`}>
              <div className="corp-stat-icon pending"><Clock size={20}/></div>
              <div className="corp-stat-body">
                <div className="corp-stat-label">Pending Approvals</div>
                <div className="corp-stat-value">{dash?.pendingApprovals || 0}</div>
              </div>
            </div>
          )}
          <div className="corp-stat-card">
            <div className="corp-stat-icon bookings"><CheckCircle size={20}/></div>
            <div className="corp-stat-body">
              <div className="corp-stat-label">Total Bookings</div>
              <div className="corp-stat-value">{dash?.bookings || 0}</div>
            </div>
          </div>
        </div>

        {/* ── Credit Usage Bar ── */}
        <div className="corp-credit-bar-card">
          <div className="corp-credit-bar-header">
            <span>Credit Utilisation</span>
            <span className="corp-credit-pct">{usedPct.toFixed(1)}% used</span>
          </div>
          <div className="corp-credit-bar-track">
            <div className="corp-credit-bar-fill" style={{ width: `${usedPct}%`,
              background: usedPct > 90 ? '#ef4444' : usedPct > 70 ? '#f59e0b' : '#10b981' }} />
          </div>
          <div className="corp-credit-bar-labels">
            <span>₹0</span>
            <span>₹{fmt(creditLimit)}</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="corp-tabs">
          {['overview', ...(isAdmin ? ['approvals'] : []), 'team'].map(tab => (
            <button key={tab} className={`corp-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'overview'   && <><Eye size={14}/> Overview</>}
              {tab === 'approvals'  && <><Clock size={14}/> Approvals {approvals.length > 0 && <span className="corp-tab-badge">{approvals.length}</span>}</>}
              {tab === 'team'       && <><Users size={14}/> Team</>}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="corp-tab-content">
            <div className="corp-quick-actions">
              <h3>Quick Actions</h3>
              <div className="corp-action-grid">
                {user?.canBookFlights && (
                  <button className="corp-action-btn" onClick={() => navigate('/flights')}>
                    <Plane size={20}/> Search Flights
                  </button>
                )}
                {user?.canBookHotels && (
                  <button className="corp-action-btn" onClick={() => navigate('/hotels')}>
                    <Hotel size={20}/> Search Hotels
                  </button>
                )}
                <button className="corp-action-btn" onClick={() => navigate('/my-bookings')}>
                  <CheckCircle size={20}/> My Bookings
                </button>
                {isAdmin && (
                  <button className="corp-action-btn corp-action-approval" onClick={() => setActiveTab('approvals')}>
                    <Clock size={20}/> Pending Approvals
                    {approvals.length > 0 && <span className="corp-action-badge">{approvals.length}</span>}
                  </button>
                )}
              </div>
            </div>

            {!user?.canBookFlights && !user?.canBookHotels && (
              <div className="corp-no-perms">
                <AlertTriangle size={18}/>
                Your account has no booking permissions. Contact your corporate admin.
              </div>
            )}
          </div>
        )}

        {/* ── Approvals Tab (admin only) ── */}
        {activeTab === 'approvals' && isAdmin && (
          <div className="corp-tab-content">
            {approvals.length === 0 ? (
              <div className="corp-empty">
                <CheckCircle size={32} color="#10b981"/>
                <p>No pending approvals</p>
              </div>
            ) : (
              <div className="corp-approvals-list">
                {approvals.map(b => (
                  <div key={b.id} className="corp-approval-card">
                    <div className="corp-approval-icon">
                      {b.airline || b.origin ? <Plane size={16}/> : <Hotel size={16}/>}
                    </div>
                    <div className="corp-approval-info">
                      <div className="corp-approval-title">
                        {b.airline
                          ? `${b.origin} → ${b.destination}`
                          : (b.displayHotelName || 'Hotel booking')}
                      </div>
                      <div className="corp-approval-meta">
                        <span>By: {b.user?.email || b.guestEmail || '—'}</span>
                        <span>Amount: ₹{fmt(b.totalAmount)}</span>
                        <span>Requested: {fmtD(b.createdAt)}</span>
                      </div>
                    </div>
                    <div className="corp-approval-actions">
                      <button
                        className="corp-approve-btn"
                        disabled={!!appLoading[b.id]}
                        onClick={() => handleApprove(b.id)}>
                        {appLoading[b.id] === 'approving' ? '…' : <><CheckCircle size={13}/> Approve</>}
                      </button>
                      <button
                        className="corp-reject-btn"
                        disabled={!!appLoading[b.id]}
                        onClick={() => handleReject(b.id)}>
                        {appLoading[b.id] === 'rejecting' ? '…' : <><XCircle size={13}/> Reject</>}
                      </button>
                      <button className="corp-view-btn" onClick={() => navigate(`/bookings/${b.id}`)}>
                        <Eye size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Team Tab ── */}
        {activeTab === 'team' && (
          <div className="corp-tab-content">
            {isAdmin && (
              <div className="corp-team-header">
                <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                <button className="corp-btn-primary" onClick={() => setShowAddUser(true)}>
                  <Plus size={13}/> Add Member
                </button>
              </div>
            )}
            <div className="corp-team-list">
              {members.map(m => (
                <div key={m.id} className="corp-member-row">
                  <div className="corp-member-avatar">
                    {(m.name || m.email)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="corp-member-info">
                    <div className="corp-member-name">{m.name || m.email}</div>
                    <div className="corp-member-email">{m.name ? m.email : ''}</div>
                  </div>
                  <div className="corp-member-badges">
                    <span className={`corp-role-badge role-${m.role}`}>
                      {m.role === 'corporate_admin' ? 'Admin' : 'Employee'}
                    </span>
                    {m.canBookFlights && <span className="corp-perm-badge"><Plane size={10}/> Flights</span>}
                    {m.canBookHotels  && <span className="corp-perm-badge"><Hotel size={10}/> Hotels</span>}
                  </div>
                  <button className="corp-view-btn" onClick={() => setSelectedMember(m.id)}>
                    <ChevronRight size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
