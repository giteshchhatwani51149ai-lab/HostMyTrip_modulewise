import React, { useEffect, useState } from 'react';
import { adminAPI } from '../api';
import { useTheme } from '../hooks/useTheme';
import { TrendingUp, Download, DollarSign, Calendar } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AdminRevenue() {
  const { colors } = useTheme();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.stats()
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    if (!stats?.revenueDaily) return;
    const rows = [['Date', 'Revenue (INR)', 'Bookings']];
    stats.revenueDaily.forEach(d => rows.push([d.date, d.revenue, d.bookings]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `revenue-${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
  };

  if (loading || !stats) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  const total30 = stats.revenueDaily.reduce((s, d) => s + d.revenue, 0);
  const avgDay  = total30 / Math.max(1, stats.revenueDaily.length);
  const peak    = stats.revenueDaily.reduce((m, d) => d.revenue > m.revenue ? d : m, stats.revenueDaily[0] || { date: '—', revenue: 0 });

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Revenue</h1>
          <p style={{ color: 'var(--text-muted)' }}>Last 30 days · daily breakdown</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
          <Download size={14}/> Export CSV
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: '30-day Revenue', value: fmt(total30),  icon: <DollarSign size={20}/>, color: 'var(--success)' },
          { label: 'Daily Average',  value: fmt(avgDay),   icon: <TrendingUp size={20}/>, color: 'var(--primary)' },
          { label: 'Peak Day',       value: `${fmt(peak.revenue)} · ${peak.date}`, icon: <Calendar size={20}/>, color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}22`, display: 'grid', placeItems: 'center', color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass" style={{ padding: 20, borderRadius: 'var(--radius-lg)' }}>
        <div style={{ marginBottom: 14, fontSize: 14, fontWeight: 600 }}>Daily revenue (last 30 days)</div>
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer>
            <AreaChart data={stats.revenueDaily}>
              <defs>
                <linearGradient id="revGradLg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor={colors.primary} stopOpacity={0.5}/>
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke}/>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.textMuted }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: colors.textMuted }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: colors.text }}
                formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke={colors.primary} strokeWidth={2} fill="url(#revGradLg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
