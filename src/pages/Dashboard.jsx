import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../auth';
import { useNavigate } from 'react-router-dom';
import { dashboardService, communicationService, galleryService } from '../services';
import { SummaryCard, Button, formatDate } from '../components';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Clock3,
  Home,
  Image,
  Megaphone,
  RotateCcw,
  Sparkles,
  Star,
  UserCog,
  Users,
} from 'lucide-react';

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

function getItemTitle(item, fallback) {
  return item?.title || item?.name || item?.subject || item?.heading || fallback;
}

function getItemDescription(item, fallback) {
  return item?.description || item?.details || item?.body || item?.summary || item?.message || fallback;
}

// Recharts receives actual CSS custom-property values so chart colors stay
// synchronized with the application's light/dark theme.
const CHART_ACTIVE = 'var(--accent-strong)';
const CHART_TOTAL = 'var(--border)';
const PIE_COLORS = [
  'var(--accent-strong)',
  'var(--accent)',
  'var(--ink-muted)',
  'var(--border)',
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.full_name?.trim() || user?.email || 'User';

  const [summary, setSummary] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [activeNotices, setActiveNotices] = useState([]);
  const [featuredAlbums, setFeaturedAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // null | 'auth' | 'forbidden' | 'server' | 'network'

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchDashboardData = useCallback(() => {
    setLoading(true);
    setErrorType(null);

    Promise.allSettled([
      dashboardService.getSummary(),
      communicationService.getUpcomingEvents(),
      communicationService.getActiveNotices(),
      galleryService.getFeaturedAlbums(),
    ])
      .then(([summaryResult, eventsResult, noticesResult, albumsResult]) => {
        if (!mountedRef.current) return;

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value.data);
        } else {
          const err = summaryResult.reason;
          if (!err.response) {
            setErrorType('network');
          } else if (err.response.status === 401) {
            setErrorType('auth');
          } else if (err.response.status === 403) {
            setErrorType('forbidden');
          } else {
            setErrorType('server');
          }
        }

        setUpcomingEvents(eventsResult.status === 'fulfilled' ? normalizeList(eventsResult.value.data) : []);
        setActiveNotices(noticesResult.status === 'fulfilled' ? normalizeList(noticesResult.value.data) : []);
        setFeaturedAlbums(albumsResult.status === 'fulfilled' ? normalizeList(albumsResult.value.data) : []);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setErrorType('server');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const cards = [
    { key: 'families', label: 'Total Families', icon: Users, value: summary?.families?.total ?? 0, description: 'Registered household records' },
    { key: 'family_units', label: 'Active Family Units', icon: Home, value: summary?.family_units?.active ?? 0, description: 'Live units in the parish' },
    { key: 'events', label: 'Upcoming Events', icon: CalendarDays, value: summary?.events?.upcoming ?? 0, description: 'Planned activities coming up' },
    { key: 'notices', label: 'Active Notices', icon: Megaphone, value: summary?.notices?.active ?? 0, description: 'Current parish communications' },
    { key: 'staffs', label: 'Active Staff', icon: UserCog, value: summary?.staffs?.active ?? 0, description: 'Serving ministry personnel' },
    { key: 'gallery', label: 'Published Photos', icon: Image, value: summary?.gallery?.photos ?? 0, description: 'Visible gallery media' },
  ];

  // (summary?.events?.featured ?? 0) + (summary?.notices?.featured ?? 0) —
  // kept as explicit parenthesized additions; the previous unparenthesized
  // version silently dropped the notices count due to ?? short-circuiting
  // before + ever ran.
  const featuredTotal = (summary?.events?.featured ?? 0) + (summary?.notices?.featured ?? 0);

  const coverageData = [
    { name: 'Families', total: summary?.families?.total ?? 0, active: summary?.families?.active ?? 0 },
    { name: 'Family Units', total: summary?.family_units?.total ?? 0, active: summary?.family_units?.active ?? 0 },
    { name: 'Staff', total: summary?.staffs?.total ?? 0, active: summary?.staffs?.active ?? 0 },
  ];

  const contentMixRaw = [
    { name: 'Notices', value: summary?.notices?.active ?? 0 },
    { name: 'Upcoming Events', value: summary?.events?.upcoming ?? 0 },
    { name: 'Gallery Albums', value: summary?.gallery?.albums ?? 0 },
    { name: 'Mass Timings', value: summary?.parish?.mass_timings ?? 0 },
  ];
  const contentMixData = contentMixRaw.filter((d) => d.value > 0);
  const contentMixTotal = contentMixData.reduce((sum, d) => sum + d.value, 0);

  const ERROR_MESSAGES = {
    auth: 'Your session has expired. Please sign in again.',
    forbidden: "You don't have permission to view the dashboard summary.",
    server: 'Something went wrong loading your dashboard. Please try again.',
    network: 'Network error — check your connection and try again.',
  };

  return (
    <div className="space-y-6">
      {/* Hero — flat surface, solid lime pill accent, matches the reference
          instead of a soft gradient wash. */}
      <section className="overflow-hidden rounded-[28px] border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">
              <Sparkles className="h-4 w-4" />
              Parish overview
            </div>
            <h1 className="mt-4 text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Welcome back{displayName ? `, ${displayName}` : ''}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              {summary?.parish?.name
                ? `${summary.parish.name} • ${summary.parish.diocese || 'Parish dashboard'}`
                : "Here's a live view of your parish activity and communications."}
            </p>
          </div>

        </div>
      </section>

      {errorType ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-sm text-ink">{ERROR_MESSAGES[errorType]}</p>
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={fetchDashboardData}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ key, label, icon, value, description }) => (
              <SummaryCard key={key} icon={icon} title={label} value={value} description={description} loading={loading} />
            ))}
          </div>

          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[24px] border border-border bg-surface p-4 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Coverage: Total vs Active</h2>
                  <p className="mt-1 text-sm text-ink-muted">Registered records versus records currently active.</p>
                </div>
                <div className="self-start rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-ink">
                  Updated live
                </div>
              </div>

              <div className="mt-6 h-64">
                {loading ? (
                  <div className="h-full w-full animate-pulse rounded-xl bg-surface-2" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={coverageData} barGap={6}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--ink-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'var(--surface-2)' }}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          fontSize: 13,
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                        }}
                        itemStyle={{ color: 'var(--ink)' }}
                        labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
                      />
                      <Bar dataKey="total" name="Total" fill={CHART_TOTAL} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="active" name="Active" fill={CHART_ACTIVE} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-border bg-surface p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Content mix</h2>
                  <p className="mt-1 text-sm text-ink-muted">What's currently published, at a glance.</p>
                </div>
              </div>

              <div className="mt-4 h-56">
                {loading ? (
                  <div className="h-full w-full animate-pulse rounded-xl bg-surface-2" />
                ) : contentMixData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contentMixData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {contentMixData.map((entry, index) => (
                          <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          fontSize: 13,
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                        }}
                        itemStyle={{ color: 'var(--ink)' }}
                        labelStyle={{ color: 'var(--ink)', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center  justify-center text-sm text-ink-muted">
                    No published content yet.
                  </div>
                )}
              </div>

              <div className="mt-2 space-y-2">
                {contentMixData.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex min-w-0 items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-ink">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      {entry.name}
                    </span>
                    <span className="shrink-0 font-medium text-ink">
                      {entry.value}
                      <span className="ml-1 text-xs font-normal text-ink-muted">
                        ({contentMixTotal ? Math.round((entry.value / contentMixTotal) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Second stat row — now real SummaryCards instead of hand-rolled
              markup, so they stay in sync with any future SummaryCard change. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={CalendarDays} title="Upcoming events" value={summary?.events?.upcoming ?? 0} loading={loading} />
            <SummaryCard icon={BellRing} title="Active notices" value={summary?.notices?.active ?? 0} loading={loading} />
            <SummaryCard icon={Image} title="Gallery media" value={summary?.gallery?.photos ?? 0} loading={loading} />
            <SummaryCard icon={Star} title="Featured content" value={featuredTotal} loading={loading} />
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <section className="rounded-[24px] border border-border bg-surface p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-ink-muted" />
                <h2 className="text-lg font-semibold text-ink">Upcoming events</h2>
              </div>
              <div className="mt-5 space-y-3">
                {upcomingEvents.length ? (
                  upcomingEvents.slice(0, 4).map((event) => (
                    <button
                      key={event.id || event.title}
                      type="button"
                      onClick={() => navigate('/events')}
                      className="w-full text-left rounded-2xl border border-border bg-surface-2 p-4 hover:border-accent-strong/50 transition-colors"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div>
                          <p className="font-medium text-ink">{getItemTitle(event, 'Upcoming event')}</p>
                          <p className="mt-1 text-sm text-ink-muted">{getItemDescription(event, 'No details provided yet.')}</p>
                        </div>
                        <div className="flex items-center gap-1 self-start rounded-full bg-surface px-2.5 py-1 text-xs text-ink-muted border border-border shrink-0">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(event.start_datetime || event.date || event.created_at)}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-ink-muted">
                    No upcoming events are available right now.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-border bg-surface p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-ink-muted" />
                <h2 className="text-lg font-semibold text-ink">Active notices</h2>
              </div>
              <div className="mt-5 space-y-3">
                {activeNotices.length ? (
                  activeNotices.slice(0, 4).map((notice) => (
                    <button
                      key={notice.id || notice.title}
                      type="button"
                      onClick={() => navigate('/notices')}
                      className="w-full text-left rounded-2xl border border-border bg-surface-2 p-4 hover:border-accent-strong/50 transition-colors"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div>
                          <p className="font-medium text-ink">{getItemTitle(notice, 'Notice')}</p>
                          <p className="mt-1 text-sm text-ink-muted">{getItemDescription(notice, 'No summary has been added yet.')}</p>
                        </div>
                        <div className="flex items-center gap-1 self-start rounded-full bg-surface px-2.5 py-1 text-xs text-ink-muted border border-border shrink-0">
                          <Megaphone className="h-3.5 w-3.5" />
                          Active
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-ink-muted">
                    No active notices are available right now.
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}