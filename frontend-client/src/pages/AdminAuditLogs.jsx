import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Search, Download, X, ChevronLeft, ChevronRight,
  Activity, User, Clock, Globe, Monitor, AlertTriangle,
  CheckCircle2, XCircle, FileText, Filter, RefreshCw,
} from 'lucide-react';
import { adminAPI } from '../api';
import Navbar from '../components/Navbar';
import './AdminAuditLogs.css';

/* ── helpers ──────────────────────────────────────────────────────── */
const fmtDate = (s) =>
  s ? new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '—';

const fmtDateShort = (s) =>
  s ? new Date(s).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }) : '—';

/** Classify an action string into a visual category */
const actionCategory = (action) => {
  if (!action) return 'other';
  if (action.startsWith('auth.'))      return 'auth';
  if (action.startsWith('booking.'))   return 'booking';
  if (action.startsWith('payment.'))   return 'payment';
  if (action.startsWith('admin.'))     return 'admin';
  if (action.startsWith('corporate.')) return 'corp';
  if (action.startsWith('webhook.'))   return 'webhook';
  if (action.startsWith('user.'))      return 'user';
  return 'other';
};

/* ── Detail Drawer ────────────────────────────────────────────────── */
const AuditDrawer = ({ log, onClose }) => {
  if (!log) return null;

  const renderJson = (data) => {
    if (!data) return <span style={{ color: 'var(--text-dim)' }}>—</span>;
    try {
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      return <pre className="drawer-json">{JSON.stringify(obj, null, 2)}</pre>;
    } catch {
      return <pre className="drawer-json">{String(data)}</pre>;
    }
  };

  return (
    <>
      <div className="audit-drawer-overlay" onClick={onClose} />
      <div className="audit-drawer">
        <div className="drawer-header">
          <h2>
            <FileText size={18} color="var(--primary)" />
            Audit Log #{log.id}
          </h2>
          <button className="drawer-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="drawer-body">

          {/* Overview */}
          <div className="drawer-section">
            <h3><Activity size={13} /> Event Details</h3>
            <div className="drawer-field">
              <span className="field-label">Action</span>
              <span className={`action-badge ${actionCategory(log.action)}`}>{log.action}</span>
            </div>
            <div className="drawer-field">
              <span className="field-label">Timestamp</span>
              <span className="field-value">{fmtDate(log.createdAt)}</span>
            </div>
            <div className="drawer-field">
              <span className="field-label">Result</span>
              <span className="field-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {log.success
                  ? <><CheckCircle2 size={14} color="var(--success)" /> Success</>
                  : <><XCircle size={14} color="var(--error)" /> Failed</>
                }
              </span>
            </div>
            {log.errorMessage && (
              <div className="drawer-field">
                <span className="field-label">Error</span>
                <span className="field-value" style={{ color: 'var(--error)' }}>{log.errorMessage}</span>
              </div>
            )}
          </div>

          {/* Actor */}
          <div className="drawer-section">
            <h3><User size={13} /> Actor</h3>
            <div className="drawer-field">
              <span className="field-label">User ID</span>
              <span className="field-value">{log.actorUserId ?? '—'}</span>
            </div>
            <div className="drawer-field">
              <span className="field-label">Email</span>
              <span className="field-value">{log.actorEmail || '—'}</span>
            </div>
            <div className="drawer-field">
              <span className="field-label">Role</span>
              <span className="field-value" style={{ textTransform: 'capitalize' }}>{log.actorRole || '—'}</span>
            </div>
          </div>

          {/* Entity */}
          {(log.entityType || log.entityId) && (
            <div className="drawer-section">
              <h3><FileText size={13} /> Entity</h3>
              <div className="drawer-field">
                <span className="field-label">Type</span>
                <span className="field-value">{log.entityType || '—'}</span>
              </div>
              <div className="drawer-field">
                <span className="field-label">ID</span>
                <span className="field-value">{log.entityId ?? '—'}</span>
              </div>
            </div>
          )}

          {/* Network */}
          <div className="drawer-section">
            <h3><Globe size={13} /> Network Context</h3>
            <div className="drawer-field">
              <span className="field-label">IP Address</span>
              <span className="field-value mono">{log.ip || '—'}</span>
            </div>
            <div className="drawer-field">
              <span className="field-label">User Agent</span>
              <span className="field-value mono" style={{ fontSize: 11, maxWidth: 300 }}>
                {log.userAgent || '—'}
              </span>
            </div>
          </div>

          {/* Metadata */}
          {log.metadata && (
            <div className="drawer-section">
              <h3><Monitor size={13} /> Metadata</h3>
              {renderJson(log.metadata)}
            </div>
          )}

          {/* Before / After diffs */}
          {log.before && (
            <div className="drawer-section">
              <h3><AlertTriangle size={13} /> Before</h3>
              {renderJson(log.before)}
            </div>
          )}
          {log.after && (
            <div className="drawer-section">
              <h3><CheckCircle2 size={13} /> After</h3>
              {renderJson(log.after)}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

/* ── Main Page ────────────────────────────────────────────────────── */
export default function AdminAuditLogs() {
  const navigate = useNavigate();

  // Data
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [actions, setActions]     = useState([]);

  // Filters
  const [page, setPage]           = useState(1);
  const [pageSize]                = useState(50);
  const [filters, setFilters]     = useState({
    q: '', action: '', success: '', dateFrom: '', dateTo: '',
  });

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, pageSize };
      if (filters.q)        params.q        = filters.q;
      if (filters.action)   params.action   = filters.action;
      if (filters.success)  params.success  = filters.success;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo)   params.dateTo   = filters.dateTo;

      const res = await adminAPI.getAuditLogs(params);
      setLogs(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('[AuditLogs] fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Fetch available action types for dropdown
  useEffect(() => {
    adminAPI.getAuditActions()
      .then(r => setActions(r.data || []))
      .catch(() => {});
  }, []);

  // Open detail drawer
  const openDrawer = async (log) => {
    setDrawerLoading(true);
    try {
      const res = await adminAPI.getAuditLog(log.id);
      setSelectedLog(res.data);
    } catch {
      setSelectedLog(log); // fallback to list data
    } finally {
      setDrawerLoading(false);
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      const params = {};
      if (filters.q)        params.q        = filters.q;
      if (filters.action)   params.action   = filters.action;
      if (filters.success)  params.success  = filters.success;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo)   params.dateTo   = filters.dateTo;

      const res = await adminAPI.exportAuditCSV(params);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[AuditLogs] export error:', err);
    }
  };

  // Filter change handler
  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ q: '', action: '', success: '', dateFrom: '', dateTo: '' });
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(v => v !== '');

  // Counts
  const successCount = logs.filter(l => l.success).length;
  const failCount    = logs.filter(l => !l.success).length;

  return (
    <div className="audit-page">
      <Navbar />
      <div className="container audit-content">

        {/* Header */}
        <div className="audit-header">
          <div>
            <h1>
              <Shield size={24} color="var(--primary)" />
              Audit Trail
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              PCI-DSS compliant immutable log of all sensitive operations
            </p>
          </div>
          <div className="audit-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => { setPage(1); fetchLogs(); }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExport}>
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats pills */}
        <div className="audit-stats-row">
          <div className="audit-stat-pill">
            <div className="stat-dot" style={{ background: 'var(--primary)' }} />
            <span className="stat-val">{total.toLocaleString()}</span>
            <span className="stat-lbl">Total Events</span>
          </div>
          <div className="audit-stat-pill">
            <div className="stat-dot" style={{ background: 'var(--success)' }} />
            <span className="stat-val">{successCount}</span>
            <span className="stat-lbl">Success (page)</span>
          </div>
          <div className="audit-stat-pill">
            <div className="stat-dot" style={{ background: 'var(--error)' }} />
            <span className="stat-val">{failCount}</span>
            <span className="stat-lbl">Failed (page)</span>
          </div>
        </div>

        {/* Filters */}
        <div className="audit-filters">
          <div className="audit-filter-group" style={{ flex: 2 }}>
            <label><Search size={10} /> Search</label>
            <input
              type="text"
              placeholder="Search action, email, IP..."
              value={filters.q}
              onChange={e => updateFilter('q', e.target.value)}
            />
          </div>
          <div className="audit-filter-group">
            <label>Action</label>
            <select value={filters.action} onChange={e => updateFilter('action', e.target.value)}>
              <option value="">All actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="audit-filter-group">
            <label>Result</label>
            <select value={filters.success} onChange={e => updateFilter('success', e.target.value)}>
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
          <div className="audit-filter-group">
            <label>From</label>
            <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} />
          </div>
          <div className="audit-filter-group">
            <label>To</label>
            <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} />
          </div>
          {hasFilters && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={13} /> Clear
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.1)', border: '1px solid var(--error)',
            color: 'var(--error)', padding: '12px 16px', borderRadius: 10,
            marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{error}</span>
            <button className="btn btn-sm" onClick={fetchLogs}
              style={{ background: 'var(--error)', color: '#fff', border: 'none' }}>
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="audit-table-wrap">
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading audit logs…</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="audit-table-wrap">
            <div className="audit-empty">
              <div className="audit-empty-icon"><Shield size={28} /></div>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>No audit logs found</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {hasFilters ? 'Try adjusting your filters.' : 'Audit events will appear here as users perform actions.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>ID</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>IP</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} onClick={() => openDrawer(log)}>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#{log.id}</td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {fmtDateShort(log.createdAt)}
                      </span>
                    </td>
                    <td>
                      <span className={`action-badge ${actionCategory(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{log.actorEmail || '—'}</div>
                      {log.actorRole && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>
                          {log.actorRole}
                        </div>
                      )}
                    </td>
                    <td>
                      {log.entityType ? (
                        <span style={{ fontSize: 12 }}>
                          {log.entityType}
                          {log.entityId != null && <span style={{ color: 'var(--primary)', fontWeight: 600 }}> #{log.entityId}</span>}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td><span className="mono">{log.ip || '—'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`result-dot ${log.success ? 'ok' : 'fail'}`}
                        title={log.success ? 'Success' : (log.errorMessage || 'Failed')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="audit-pagination">
              <span className="page-info">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}
              </span>
              <div className="page-btns">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} /> Prev
                </button>
                {/* Show up to 5 page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }
                  return (
                    <button key={p} className={`page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => setPage(p)}>
                      {p}
                    </button>
                  );
                })}
                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedLog && (
        <AuditDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
