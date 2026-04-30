import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api';
import { useTheme } from '../hooks/useTheme';
import {
  Plane, DollarSign, Clock, Users,
  ArrowUpRight, ArrowDownRight, Download, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';

const STATUS_BADGE = { confirmed: 'badge-success', cancelled: 'badge-danger', completed: 'badge-primary', pending: 'badge-warning', failed: 'badge-danger' };
const TYPE_COLORS  = { Flights: '#FF6B00', Hotels: '#FF8C3A', Packages: '#16A34A' };

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate  = (s) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

/* ── Skeleton primitives ─────────────────────────────────────── */
const Skel = ({ w = '100%', h = 16, r = 6, mb = 0 }) => (
  <div style={{
    width: w, height: h, borderRadius: r, marginBottom: mb,
    background: 'linear-gradient(90deg, var(--bg-2), var(--bg), var(--bg-2))',
    backgroundSize: '200% 100%',
    animation: 'skel 1.4s ease infinite',
  }}/>
);

const KpiSkeleton = () => (
  <div className="glass" style={{ padding: '20px 24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
      <Skel w={48} h={48} r={12}/>
      <Skel w={120} h={12}/>
    </div>
    <Skel w="60%" h={24} mb={8}/>
    <Skel w="40%" h={12}/>
  </div>
);

const ChartSkeleton = ({ h = 280 }) => (
  <div className="glass" style={{ padding: 20 }}>
    <Skel w={180} h={14} mb={14}/>
    <Skel w="100%" h={h} r={10}/>
  </div>
);

/* ─────────────────────────────────────────────────────────────────
   Main Dashboard
   ───────────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    adminAPI.stats()
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load stats');
        setLoading(false);
      });
  }, []);

  /* ── Export revenue CSV ── */
  const exportRevenueCSV = () => {
    if (!stats?.revenueDaily) return;
    const rows = [['Date', 'Revenue (INR)', 'Bookings']];
    stats.revenueDaily.forEach(d => rows.push([d.date, d.revenue, d.bookings]));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `revenue-${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
  };

  /* ── Skeletons during load ── */
  if (loading) return (
    <div className="animate-in">
      <Skel w={260} h={28} mb={8}/>
      <Skel w={360} h={14} mb={28}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[0, 1, 2, 3].map(i => <KpiSkeleton key={i}/>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartSkeleton h={280}/>
        <ChartSkeleton h={280}/>
      </div>
      <ChartSkeleton h={260}/>
      <style>{`@keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );

  if (error || !stats) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>{error || 'Could not load dashboard.'}</p>
    </div>
  );

  const { today, pendingConfirmations, activeUsers, revenueDaily, bookingsByType, topDestinations, recentBookings } = stats;

  /* ── KPI definitions ── */
  const kpis = [
    {
      label: "Today's Bookings",
      value: today.bookings,
      trend: today.bookingsTrend,
      trendLabel: 'vs yesterday',
      icon: <Plane size={22}/>,
      color: 'var(--primary)',
    },
    {
      label: "Today's Revenue",
      value: fmtMoney(today.revenue),
      trend: today.revenueTrend,
      trendLabel: 'vs yesterday',
      icon: <DollarSign size={22}/>,
      color: 'var(--success)',
    },
    {
      label: 'Pending Confirmations',
      value: pendingConfirmations,
      icon: <Clock size={22}/>,
      color: 'var(--accent)',
      onClick: () => navigate('/bookings'),
    },
    {
      label: 'Active Users',
      value: activeUsers.count,
      trend: activeUsers.monthlyGrowth,
      trendLabel: 'monthly growth',
      icon: <Users size={22}/>,
      color: '#A855F7',
    },
  ];

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {kpis.map(k => (
          <button
            key={k.label}
            onClick={k.onClick}
            disabled={!k.onClick}
            className="glass"
            style={{
              padding: '20px 22px', textAlign: 'left',
              border: '1px solid var(--border)', cursor: k.onClick ? 'pointer' : 'default',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => k.onClick && (e.currentTarget.style.borderColor = 'var(--border-hover)')}
            onMouseLeave={e => k.onClick && (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${k.color}22`, display: 'grid', placeItems: 'center', color: k.color, flexShrink: 0 }}>
                {k.icon}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{k.label}</p>
            </div>
            <p style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{k.value}</p>
            {k.trend !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                {k.trend >= 0 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--success)', fontWeight: 600 }}>
                    <ArrowUpRight size={13}/> +{k.trend}%
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--error)', fontWeight: 600 }}>
                    <ArrowDownRight size={13}/> {k.trend}%
                  </span>
                )}
                <span style={{ color: 'var(--text-dim)' }}>{k.trendLabel}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* ── Charts row 1: Revenue (line) + Bookings by Type (pie) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }} className="d-charts-row">
        {/* Revenue chart */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Revenue · Last 30 days</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total: {fmtMoney(revenueDaily.reduce((s, d) => s + d.revenue, 0))}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={exportRevenueCSV}>
              <Download size={13}/> CSV
            </button>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={revenueDaily}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="revenue" stroke={colors.primary} strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings by type pie */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ marginBottom: 14, fontSize: 14, fontWeight: 600 }}>Bookings by Type</div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={bookingsByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%" cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  label={({ pct }) => `${pct}%`}
                  labelLine={false}
                >
                  {bookingsByType.map(d => (
                    <Cell key={d.type} fill={TYPE_COLORS[d.type] || colors.textMuted} stroke={colors.tooltipBg} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: colors.text }}
                  formatter={(v, n, p) => [`${v} (${p.payload.pct}%)`, p.payload.type]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: colors.textMuted }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Top Destinations bar ── */}
      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Top Destinations</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <TrendingUp size={11} style={{ verticalAlign: 'middle', marginRight: 3 }}/>
            Last 30 days · Top {Math.min(10, topDestinations.length)}
          </div>
        </div>
        {topDestinations.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No destination data yet.</div>
        ) : (
          <div style={{ width: '100%', height: 32 + topDestinations.length * 36 }}>
            <ResponsiveContainer>
              <BarChart data={topDestinations} layout="vertical" margin={{ left: 12, right: 30, top: 6, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} horizontal={false}/>
                <XAxis type="number" tick={{ fontSize: 11, fill: colors.textMuted }} allowDecimals={false}/>
                <YAxis type="category" dataKey="destination" tick={{ fontSize: 12, fill: colors.text }} width={140}/>
                <Tooltip
                  contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: colors.text }}
                  formatter={(v) => [`${v} bookings`, 'Count']}
                  cursor={{ fill: 'rgba(255,107,0,0.08)' }}
                />
                <Bar dataKey="count" fill={colors.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Recent Bookings ── */}
      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Recent Bookings</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/bookings')}>View all</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {['Booking Ref', 'Customer', 'Type', 'Amount', 'Status', 'Date'].map(h => (

                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id}
                    onClick={() => navigate('/bookings')}
                    style={{ borderTop: '1px solid var(--border)', cursor: 'pointer', transition: 'var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 600 }}>{b.bookingReference || `#${b.id}`}</td>
                  <td style={{ padding: '13px 18px', fontSize: 13 }}>
                    <div>{b.customer}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{b.customerEmail}</div>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 12 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 10px', borderRadius: 999,
                      background: `${TYPE_COLORS[b.type === 'flight' ? 'Flights' : b.type === 'hotel' ? 'Hotels' : 'Packages']}22`,
                      color:      TYPE_COLORS[b.type === 'flight' ? 'Flights' : b.type === 'hotel' ? 'Hotels' : 'Packages'],
                      fontWeight: 600, fontSize: 11, textTransform: 'capitalize',
                    }}>{b.type}</span>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{fmtMoney(b.amount)}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span className={`badge ${STATUS_BADGE[b.status] || 'badge-primary'}`}>{b.status}</span>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(b.date)}</td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No recent bookings.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes skel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (max-width: 900px) {
          .d-charts-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
