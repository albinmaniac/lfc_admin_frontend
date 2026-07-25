import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../auth';
import { dashboardService, communicationService, galleryService } from '../services';
import { SummaryCard, Button, formatDate } from '../components';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarDays,
  Clock3,
  Home,
  Image,
  Megaphone,
  RotateCcw,
  Sparkles,
  UserCog,
  Users,
} from 'lucide-react';

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

function getItemTitle(item, fallback) {
  return item?.title || item?.name || item?.subject || item?.heading || item?.heading || fallback;
}

function getItemDescription(item, fallback) {
  return item?.description || item?.details || item?.body || item?.summary || item?.message || fallback;
}

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email || 'User'
    : '';

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

  const analytics = [
    {
      label: 'Family coverage',
      value: `${summary?.families?.active ?? 0}/${summary?.families?.total ?? 0}`,
      percent: summary?.families?.total ? Math.round(((summary.families.active || 0) / summary.families.total) * 100) : 0,
      tone: 'from-primary-600 to-primary-500',
    },
    {
      label: 'Active ministry presence',
      value: `${summary?.staffs?.active ?? 0}/${summary?.staffs?.total ?? 0}`,
      percent: summary?.staffs?.total ? Math.round(((summary.staffs.active || 0) / summary.staffs.total) * 100) : 0,
      tone: 'from-slate-700 to-slate-600',
    },
    {
      label: 'Communication reach',
      value: `${summary?.notices?.featured ?? 0}/${summary?.notices?.active ?? 0}`,
      percent: summary?.notices?.active ? Math.round(((summary.notices.featured || 0) / summary.notices.active) * 100) : 0,
      tone: 'from-amber-500 to-orange-500',
    },
  ];

  const ERROR_MESSAGES = {
    auth: 'Your session has expired. Please sign in again.',
    forbidden: "You don't have permission to view the dashboard summary.",
    server: 'Something went wrong loading your dashboard. Please try again.',
    network: 'Network error — check your connection and try again.',
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-gradient-to-br from-[#f9f3e7] via-white to-[#f3e4c9] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm font-medium text-primary-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Parish overview
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
              Welcome back{displayName ? `, ${displayName}` : ''}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {summary?.parish?.name
                ? `${summary.parish.name} • ${summary.parish.diocese || 'Parish dashboard'}`
                : "Here's a live view of your parish activity and communications."}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/70">Today</p>
            <p className="mt-1 text-lg font-semibold">{summary?.parish?.mass_timings ?? 0} active Mass timings</p>
          </div>
        </div>
      </section>

      {errorType ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-sm text-danger-600">{ERROR_MESSAGES[errorType]}</p>
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

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Parish analytics</h2>
                  <p className="mt-1 text-sm text-gray-500">Live insights from the current parish records.</p>
                </div>
                <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                  Updated live
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {analytics.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className="text-gray-500">{item.value}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full bg-gradient-to-r ${item.tone}`} style={{ width: `${Math.min(item.percent, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-gray-100 bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-white/80">
                <BadgeCheck className="h-4 w-4" />
                Parish pulse
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm text-white/70">Upcoming events</p>
                  <p className="mt-2 text-3xl font-semibold">{summary?.events?.upcoming ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm text-white/70">Active notices</p>
                  <p className="mt-2 text-3xl font-semibold">{summary?.notices?.active ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm text-white/70">Gallery media</p>
                  <p className="mt-2 text-3xl font-semibold">{summary?.gallery?.photos ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm text-white/70">Featured content</p>
                  <p className="mt-2 text-3xl font-semibold">{summary?.events?.featured ?? 0 + summary?.notices?.featured ?? 0}</p>
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Upcoming events</h2>
              </div>
              <div className="mt-5 space-y-3">
                {upcomingEvents.length ? (
                  upcomingEvents.slice(0, 4).map((event) => (
                    <div key={event.id || event.title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{getItemTitle(event, 'Upcoming event')}</p>
                          <p className="mt-1 text-sm text-gray-500">{getItemDescription(event, 'No details provided yet.')}</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-gray-500 shadow-sm">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(event.start_datetime || event.date || event.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500">
                    No upcoming events are available right now.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-gray-900">Active notices</h2>
              </div>
              <div className="mt-5 space-y-3">
                {activeNotices.length ? (
                  activeNotices.slice(0, 4).map((notice) => (
                    <div key={notice.id || notice.title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{getItemTitle(notice, 'Notice')}</p>
                          <p className="mt-1 text-sm text-gray-500">{getItemDescription(notice, 'No summary has been added yet.')}</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-gray-500 shadow-sm">
                          <Megaphone className="h-3.5 w-3.5" />
                          Active
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500">
                    No active notices are available right now.
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Featured gallery albums</h2>
                <p className="mt-1 text-sm text-gray-500">The latest featured parish highlights from the gallery.</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary-700">
                <Image className="h-4 w-4" />
                {featuredAlbums.length} featured
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredAlbums.length ? (
                featuredAlbums.slice(0, 3).map((album) => (
                  <div key={album.id || album.title} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                    <p className="font-medium text-gray-900">{getItemTitle(album, 'Featured album')}</p>
                    <p className="mt-2 text-sm text-gray-500">{getItemDescription(album, 'A parish memory collection.')}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700">
                      View collection
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 md:col-span-2 xl:col-span-3">
                  No featured gallery albums are available right now.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}