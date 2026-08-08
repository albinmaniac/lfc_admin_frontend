import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { reportsService } from '../services';
import { ReportTable, ReportFilter, Badge, Button, formatDate } from '../components';
import { RotateCcw, Users, Crown, TrendingUp, Layers, Download, ChevronDown } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useReportData, ERROR_MESSAGES } from './hooks';

// Scoped keyframes for the staggered entrance — matches other report pages.
function ReportStyles() {
  return (
    <style>{`
      @keyframes reportCardIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .report-card {
        animation: reportCardIn 0.35s ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        .report-card { animation: none; }
      }
    `}</style>
  );
}

function StatusBadge({ active }) {
  return <Badge variant={active ? 'success' : 'gray'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

function ErrorState({ errorType, onRetry }) {
  return (
    <div className="report-card rounded-2xl border border-warning-500/30 bg-warning-50 p-5">
      <p className="mb-3 text-sm text-warning-700">{ERROR_MESSAGES[errorType]}</p>
      <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

// Helper to extract filename from Content-Disposition header
function filenameFromDisposition(disposition) {
  if (!disposition) return null;
  const match = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^;'"]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function ExportDropdown({ report, filters }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;

    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target) && buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function onOpen() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    setOpen(true);
  }

  async function onExport(format) {
    setLoading(true);
    try {
      const response = await reportsService.exportReport({
        report,
        format,
        filters,
      });
      const disposition = response.headers['content-disposition'];
      const filename = filenameFromDisposition(disposition) || `${report}.${format}`;
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      // Could add error handling here
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        ref={buttonRef}
        variant="secondary"
        size="sm"
        icon={Download}
        iconPosition="right"
        onClick={onOpen}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1"
      >
        Export <ChevronDown className="h-3 w-3" />
      </Button>
      {open &&
        createPortal(
          <div
            ref={ref}
            role="menu"
            aria-label="Export options"
            className="z-50 rounded-md border border-border bg-surface py-2 shadow-md"
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left -40,
              minWidth: 120,
            }}
          >
            <button
              type="button"
              role="menuitem"
              disabled={loading}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent-weak disabled:opacity-50"
              onClick={() => onExport('xlsx')}
            >
            Export as Excel (.xlsx)
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={loading}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent-weak disabled:opacity-50"
              onClick={() => onExport('csv')}
            >
             Export as CSV (.csv)
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={loading}
              className="block w-full px-3 py-1 text-left text-sm hover:bg-accent-weak disabled:opacity-50"
              onClick={() => onExport('pdf')}
            >
              Export as PDF (.pdf)
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------
const directoryColumns = [
  { key: 'name', header: 'Group Name' },
  { key: 'description', header: 'Description', render: (r) => r.description || '—' },
  { key: 'leader_name', header: 'Leader', render: (r) => r.leader_name || '—' },
  { key: 'total_members', header: 'Members' },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
  { key: 'updated_at', header: 'Updated', render: (r) => formatDate(r.updated_at) },
];
const directorySearch = (row, q) => [row.name, row.description, row.leader_name].some((v) => v?.toLowerCase().includes(q));

function DirectoryTab() {
  const { data, loading, errorType, refetch } = useReportData(reportsService.getGroupDirectory);
  const [search, setSearch] = useState('');
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  const filtered = search ? data.filter((r) => directorySearch(r, search.toLowerCase())) : data;
  return (
    <div className="report-card rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <ReportFilter type="search" label="Search groups..." value={search} onChange={setSearch} />
        <ExportDropdown report="group-directory" filters={{ search }} />
      </div>
      <ReportTable
        columns={directoryColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No parish groups found"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
const memberColumns = [
  { key: 'group_name', header: 'Group' },
  { key: 'member_name', header: 'Member' },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
];
const memberSearch = (row, q) => [row.group_name, row.member_name].some((v) => v?.toLowerCase().includes(q));

function MembersTab() {
  const { data, loading, errorType, refetch } = useReportData(reportsService.getGroupMembersReport);
  const [search, setSearch] = useState('');
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  const filtered = search ? data.filter((r) => memberSearch(r, search.toLowerCase())) : data;
  return (
    <div className="report-card rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <ReportFilter type="search" label="Search members..." value={search} onChange={setSearch} />
        <ExportDropdown report="group-members" filters={{ search }} />
      </div>
      <ReportTable
        columns={memberColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No group memberships found"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leaders
// ---------------------------------------------------------------------------
const leaderColumns = [
  { key: 'name', header: 'Group Name' },
  { key: 'leader_name', header: 'Leader', render: (r) => r.leader_name || '—' },
  { key: 'phone_number', header: 'Phone', render: (r) => r.phone_number || '—' },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
];
const leaderSearch = (row, q) => [row.name, row.leader_name].some((v) => v?.toLowerCase().includes(q));

function LeadersTab() {
  const { data, loading, errorType, refetch } = useReportData(reportsService.getGroupLeadersReport);
  const [search, setSearch] = useState('');
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  const filtered = search ? data.filter((r) => leaderSearch(r, search.toLowerCase())) : data;
  return (
    <div className="report-card rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <ReportFilter type="search" label="Search leaders..." value={search} onChange={setSearch} />
        <ExportDropdown report="group-leaders" filters={{ search }} />
      </div>
      <ReportTable
        columns={leaderColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No group leaders found"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Statistics — redesigned as chart + summary chips
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, loading, delay }) {
  return (
    <div
      className="report-card rounded-2xl border border-border bg-surface p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        <Icon className="h-3.5 w-3.5 text-accent-strong" />
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-6 w-14 animate-pulse rounded bg-border" />
      ) : (
        <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      )}
    </div>
  );
}

// Builds one jagged "spike" layer across an arbitrary list of {name, value}
// rows: sharp rise to each row's value, sharp fall toward a shallow valley
// before the next rise. Different `scale` (height), `shift` (horizontal
// offset of the peak) and `valleyRatio` (how far each dip drops) per layer
// produces the layered, echoing mountain-range look.
function buildSpikeLayer(rows, scale, shift, valleyRatio) {
  const pts = [{ x: -0.35, y: 0 }];
  rows.forEach((r, i) => {
    const peakX = i + shift;
    const isFirst = i === 0;
    const isLast = i === rows.length - 1;
    pts.push({ x: peakX - 0.28, y: isFirst ? 0 : r.value * scale * valleyRatio });
    pts.push({ x: peakX, y: r.value * scale });
    pts.push({ x: peakX + 0.28, y: isLast ? r.value * scale * 0.55 : r.value * scale * valleyRatio });
  });
  return pts;
}

function niceTicks(maxValue) {
  const top = Math.max(5, Math.ceil((maxValue * 1.15) / 5) * 5);
  return [0, top * 0.25, top * 0.5, top * 0.75, top].map((v) => Math.round(v));
}

function MembershipChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div
      style={{
        background: 'rgba(24, 38, 66, 0.92)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '12px 16px',
        boxShadow: '0 16px 36px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{name}</div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
        {value} {value === 1 ? 'member' : 'members'}
      </div>
    </div>
  );
}

function MembershipGlowDot({ cx, cy }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill="#4f8ff0" opacity={0.25} />
      <circle cx={cx} cy={cy} r={5} fill="#4f8ff0" stroke="#fff" strokeWidth={2} />
    </g>
  );
}

function MembershipChart({ loading, rows }) {
  const cursorData = useMemo(() => rows.map((r, i) => ({ x: i, name: r.name, value: r.value })), [rows]);
  const layers = useMemo(
    () => [
      { id: 'front', data: buildSpikeLayer(rows, 1, 0, 0.02), stops: [0.95, 0.55] },
      { id: 'mid', data: buildSpikeLayer(rows, 0.72, 0.14, 0.14), stops: [0.55, 0.22] },
      { id: 'back', data: buildSpikeLayer(rows, 0.48, -0.12, 0.22), stops: [0.32, 0.08] },
    ],
    [rows]
  );
  const maxValue = rows.length ? Math.max(...rows.map((r) => r.value)) : 0;
  const yTicks = niceTicks(maxValue || 1);

  return (
    <div className="report-card rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: '80ms' }}>
      <h3 className="text-sm font-semibold text-ink">Membership by group</h3>
      <p className="mt-0.5 text-xs text-ink-muted">Active parish groups ranked by member count</p>

      <div className="mt-3">
        {loading ? (
          <div className="flex flex-col gap-2 py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-6 w-full animate-pulse rounded bg-border" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No group statistics found</p>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div
              style={{
                background: '#0a1120',
                borderRadius: 20,
                padding: '20px 16px 6px',
                width: Math.max(560, rows.length * 90),
                minWidth: '100%',
              }}
            >
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cursorData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <defs>
                      {layers.map((l) => (
                        <linearGradient key={l.id} id={`groupSpikeGradient-${l.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f8ff0" stopOpacity={l.stops[0]} />
                          <stop offset="100%" stopColor="#1a3a6b" stopOpacity={l.stops[1]} />
                        </linearGradient>
                      ))}
                    </defs>

                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 6" />

                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={[-0.35, rows.length - 1 + 0.35]}
                      ticks={rows.map((_, i) => i)}
                      tickFormatter={(v) => rows[v]?.name ?? ''}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={54}
                      tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      domain={[0, yTicks[yTicks.length - 1]]}
                      ticks={yTicks}
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                      tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }}
                    />

                    <Tooltip
                      cursor={{ stroke: '#4f8ff0', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      content={<MembershipChartTooltip />}
                    />

                    {/* Visual layers — purely decorative, not tied to the tooltip */}
                    {layers.map((l) => (
                      <Area
                        key={l.id}
                        data={l.data}
                        dataKey="y"
                        type="linear"
                        stroke="none"
                        fill={`url(#groupSpikeGradient-${l.id})`}
                        isAnimationActive={false}
                        dot={false}
                        activeDot={false}
                      />
                    ))}

                    {/* Invisible cursor series — real per-group values, drives
                        the dashed guide line, tooltip, and glowing active dot */}
                    <Area
                      data={cursorData}
                      dataKey="value"
                      type="linear"
                      stroke="none"
                      fill="none"
                      isAnimationActive={false}
                      dot={false}
                      activeDot={<MembershipGlowDot />}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const statsColumns = [
  { key: 'name', header: 'Group Name' },
  { key: 'leader_name', header: 'Leader', render: (r) => r.leader_name || '—' },
  { key: 'total_members', header: 'Members' },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
];

function StatisticsTab() {
  const { data, loading, errorType, refetch } = useReportData(reportsService.getGroupStatisticsReport);
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;

  const breakdownRows = useMemo(
    () =>
      data
        .map((g) => ({ key: g.id, name: g.name, value: g.total_members }))
        .sort((a, b) => b.value - a.value),
    [data]
  );

  const totalGroups = data.length;
  const totalMembers = breakdownRows.reduce((sum, r) => sum + r.value, 0);
  const avgPerGroup = totalGroups > 0 ? (totalMembers / totalGroups).toFixed(1) : '0';
  const largest = breakdownRows[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Layers} label="Total Groups" value={loading ? '' : totalGroups} loading={loading} delay={0} />
        <StatCard icon={Users} label="Total Members" value={loading ? '' : totalMembers} loading={loading} delay={30} />
        <StatCard icon={TrendingUp} label="Avg / Group" value={loading ? '' : avgPerGroup} loading={loading} delay={60} />
        <StatCard
          icon={Crown}
          label="Largest Group"
          value={loading ? '' : largest ? `${largest.name} (${largest.value})` : '—'}
          loading={loading}
          delay={90}
        />
      </div>

      <MembershipChart loading={loading} rows={breakdownRows} />

      <div className="report-card rounded-2xl border border-border bg-surface overflow-hidden" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center justify-end p-4">
          <ExportDropdown report="group-statistics" filters={{}} />
        </div>
        <ReportTable columns={statsColumns} data={data} loading={loading} emptyTitle="No group statistics found" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
const SUB_TABS = [
  { id: 'directory', label: 'Directory' },
  { id: 'members', label: 'Members' },
  { id: 'leaders', label: 'Leaders' },
  { id: 'statistics', label: 'Statistics' },
];

export default function GroupsReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'directory';

  const setView = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'directory') next.delete('view');
    else next.set('view', id);
    setSearchParams(next);
  };

  const renderView = () => {
    switch (view) {
      case 'members':
        return <MembersTab />;
      case 'leaders':
        return <LeadersTab />;
      case 'statistics':
        return <StatisticsTab />;
      case 'directory':
      default:
        return <DirectoryTab />;
    }
  };

  return (
    <div className="space-y-4">
      <ReportStyles />

      <div className="report-card flex gap-2 overflow-x-auto pb-1">
        {SUB_TABS.map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                active
                  ? 'bg-accent-strong text-accent-ink border-accent-strong'
                  : 'bg-surface text-ink-muted border-border hover:bg-surface-2'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {renderView()}
    </div>
  );
}