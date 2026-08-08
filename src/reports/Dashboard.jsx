import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { reportsService } from '../services';
import { Button } from '../components';
import {
  RotateCcw,
  Home,
  Users,
  Church,
  HeartHandshake,
  UserCheck,
  MailPlus,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Complementary chart palette. Active/engaged states use the brand accent
// (--accent-strong, full-strength chartreuse); structural categories use a
// muted trio that holds contrast on both light and dark surfaces.
// NOTE: these are the app's real token names, NOT shadcn's --accent/--border,
// which are separate near-white/gray tokens living in the same :root block.
const CHART_COLORS = {
  accent: 'var(--accent-strong)',
  gold: '#C99A3D',
  teal: '#2F7566',
  plum: '#8B3F63',
};

const STRUCTURE_CONFIG = [
  { key: 'total_families', label: 'Families', color: CHART_COLORS.gold },
  { key: 'total_family_units', label: 'Family Units', color: CHART_COLORS.teal },
  { key: 'total_parish_groups', label: 'Parish Groups', color: CHART_COLORS.plum },
];

const ERROR_MESSAGES = {
  auth: 'Your session has expired. Please sign in again.',
  forbidden: "You don't have permission to view this report.",
  server: 'Something went wrong loading the dashboard report. Please try again.',
  network: 'Network error — check your connection and try again.',
};

// Local keyframes for the staggered card entrance.
function DashboardStyles() {
  return (
    <style>{`
      @keyframes dashCardIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .dash-card {
        animation: dashCardIn 0.4s ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        .dash-card { animation: none; }
      }
    `}</style>
  );
}

function StatChip({ icon: Icon, label, value, loading, accent, delay }) {
  return (
    <div
      className="dash-card rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface/90"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="h-6 w-14 animate-pulse rounded bg-border" />
        ) : (
          <p className="text-xl font-semibold tabular-nums tracking-tight text-ink">
            {value.toLocaleString()}
          </p>
        )}
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </p>
      </div>
    </div>
  );
}

function HeroMetric({ loading, members, families }) {
  const avgPerFamily = families > 0 ? (members / families).toFixed(1) : null;
  return (
    <div className="dash-card rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <Sparkles className="h-3 w-3 text-accent-strong" />
            Community overview
          </div>
          {loading ? (
            <div className="mt-2 h-9 w-28 animate-pulse rounded bg-border" />
          ) : (
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">
              {members.toLocaleString()}
            </p>
          )}
          <p className="mt-1 text-sm text-ink-muted">Total family members</p>
        </div>
        {!loading && avgPerFamily && (
          <div className="flex items-center gap-2 self-start rounded-full border border-border bg-accent-strong/10 px-3 py-1 text-xs font-medium text-ink-muted sm:self-auto">
            <ArrowUpRight className="h-3 w-3 text-accent-strong" />
            <span className="tabular-nums text-ink">{avgPerFamily}</span>
            <span>avg. per family</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StructureDonut({ loading, data, total }) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value, color: d.color }));
  return (
    <div className="dash-card rounded-2xl border border-border bg-surface p-4 flex flex-col" style={{ animationDelay: '150ms' }}>
      <h3 className="text-sm font-semibold text-ink">Community structure</h3>
      <p className="mt-0.5 text-xs text-ink-muted">Distribution of families, units &amp; groups</p>
      <div className="relative mt-2 h-[140px] w-full sm:h-[180px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-24 w-24 animate-pulse rounded-full bg-border" />
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="90%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value.toLocaleString(), name]}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--ui-border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold tabular-nums text-ink">
                {total.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-ink-muted">total</span>
            </div>
          </>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.key} className="flex items-center gap-3 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="flex-1 text-ink-muted">{d.label}</span>
              {loading ? (
                <div className="h-3 w-8 animate-pulse rounded bg-border" />
              ) : (
                <span className="tabular-nums font-medium text-ink">
                  {d.value.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-ink-muted">({pct}%)</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EngagementPanel({ loading, activeUsers, pendingInvitations }) {
  const total = activeUsers + pendingInvitations;
  const activePct = total > 0 ? Math.round((activeUsers / total) * 100) : 0;
  return (
    <div className="dash-card rounded-2xl border border-border bg-surface p-4 flex flex-col" style={{ animationDelay: '220ms' }}>
      <h3 className="text-sm font-semibold text-ink">User engagement</h3>
      <p className="mt-0.5 text-xs text-ink-muted">Active vs. pending accounts</p>
      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <UserCheck className="h-3 w-3 text-accent-strong" />
              Active users
            </span>
            {loading ? (
              <div className="h-3 w-8 animate-pulse rounded bg-border" />
            ) : (
              <span className="tabular-nums font-semibold text-ink">
                {activeUsers.toLocaleString()}
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent-strong transition-all duration-700 ease-out motion-reduce:transition-none"
              style={{ width: loading ? '0%' : `${activePct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <MailPlus className="h-3 w-3" style={{ color: CHART_COLORS.gold }} />
              Pending invitations
            </span>
            {loading ? (
              <div className="h-3 w-8 animate-pulse rounded bg-border" />
            ) : (
              <span className="tabular-nums font-semibold text-ink">
                {pendingInvitations.toLocaleString()}
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out motion-reduce:transition-none"
              style={{
                width: loading ? '0%' : `${100 - activePct}%`,
                backgroundColor: CHART_COLORS.gold,
              }}
            />
          </div>
        </div>
      </div>
      {!loading && total > 0 && (
        <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-xs text-ink-muted border border-border">
          <span className="font-semibold text-ink">{activePct}%</span> of invited accounts are active.
        </p>
      )}
    </div>
  );
}

function ActivityBars({ loading, events, notices }) {
  const data = [
    { name: 'Events', value: events, color: CHART_COLORS.teal },
    { name: 'Notices', value: notices, color: CHART_COLORS.plum },
  ];
  return (
    <div className="dash-card rounded-2xl border border-border bg-surface p-4 flex flex-col" style={{ animationDelay: '290ms' }}>
      <h3 className="text-sm font-semibold text-ink">Content activity</h3>
      <p className="mt-0.5 text-xs text-ink-muted">Events published vs. notices posted</p>
      <div className="mt-3 h-[100px] w-full sm:h-[130px]">
        {loading ? (
          <div className="flex h-full items-end gap-3 px-1">
            <div className="h-2/3 w-1/3 animate-pulse rounded-t bg-border" />
            <div className="h-2/5 w-1/3 animate-pulse rounded-t bg-border" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="35%">
              <CartesianGrid vertical={false} stroke="var(--ui-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'var(--ink-muted)' }}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--ui-border)',
                        borderRadius: 12,
                        padding: '8px 12px',
                        fontSize: 12,
                        color: 'var(--ink)',
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: 'var(--ink-muted)' }}>Count: {item.value}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function DashboardReport() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchReport = useCallback(() => {
    setLoading(true);
    setErrorType(null);

    reportsService
      .getDashboard()
      .then((res) => {
        if (!mountedRef.current) return;
        setSummary(res.data);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        if (!err.response) setErrorType('network');
        else if (err.response.status === 401) setErrorType('auth');
        else if (err.response.status === 403) setErrorType('forbidden');
        else setErrorType('server');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const get = (key) => summary?.[key] ?? 0;

  const structureData = useMemo(
    () => STRUCTURE_CONFIG.map((s) => ({ ...s, value: get(s.key) })),
    [summary] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const structureTotal = structureData.reduce((sum, d) => sum + d.value, 0);

  if (errorType) {
    return (
      <div className="dash-card rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <DashboardStyles />
        <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">{ERROR_MESSAGES[errorType]}</p>
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={fetchReport}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardStyles />
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Parish analytics</h2>
          <p className="text-sm text-ink-muted">A snapshot of your community, right now</p>
        </div>
        <button
          onClick={fetchReport}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-ink-muted transition-colors hover:bg-surface/80 hover:text-ink"
          aria-label="Refresh dashboard"
        >
          <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin text-accent-strong' : ''}`} />
        </button>
      </div>

      <HeroMetric loading={loading} members={get('total_family_members')} families={get('total_families')} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatChip icon={Home} label="Families" value={get('total_families')} loading={loading} accent={CHART_COLORS.gold} delay={40} />
        <StatChip icon={Church} label="Family Units" value={get('total_family_units')} loading={loading} accent={CHART_COLORS.teal} delay={80} />
        <StatChip icon={HeartHandshake} label="Parish Groups" value={get('total_parish_groups')} loading={loading} accent={CHART_COLORS.plum} delay={120} />
        <StatChip icon={Users} label="Active Users" value={get('active_users')} loading={loading} accent="var(--accent-strong)" delay={160} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <StructureDonut loading={loading} data={structureData} total={structureTotal} />
        <EngagementPanel
          loading={loading}
          activeUsers={get('active_users')}
          pendingInvitations={get('pending_invitations')}
        />
        <ActivityBars loading={loading} events={get('total_events')} notices={get('total_notices')} />
      </div>
    </div>
  );
}