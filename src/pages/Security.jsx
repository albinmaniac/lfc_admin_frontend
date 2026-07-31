import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, LogOut, Monitor, Smartphone, Tablet, LogOutIcon, ChevronLeft, ChevronRight, MapPin, Clock3 } from 'lucide-react';
import { securityService } from '../services.js';
import { PageHeader, DataTable, Badge, Button, SummaryCard, formatDateTime } from '../components.jsx';
import { useAuth } from '../auth.jsx';
import { ROLES } from '../constants.js';
import { ShieldCheck } from 'lucide-react';
import api from '../api.js';

const TABS = [
  { key: 'history', label: 'Login History' },
  { key: 'sessions', label: 'Active Sessions' },
];

const DEVICE_ICON = { Desktop: Monitor, Mobile: Smartphone, Tablet: Tablet };

// Only one brand hue (lime/accent) exists in this palette, so three device
// types can't each get a distinct "nice" color without reusing a
// functional token or falling back to neutral. Desktop = accent (most
// common device, gets the brand color), Mobile = warning (reuses the
// existing gold token), Tablet = plain neutral rather than forcing in a
// third arbitrary hue.
const DEVICE_WELL_COLOR = {
  Desktop: 'bg-accent/20 text-accent-ink',
  Mobile: 'bg-warning-50 text-warning-700',
  Tablet: 'bg-surface-2 text-ink-muted',
};

function extractErrorMessage(err, fallback = 'Something went wrong') {
  const data = err.response?.data;
  if (!data) return fallback;
  if (data.message) return data.message;
  if (data.detail) return data.detail;
  if (typeof data === 'string') return data;
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value) && value.length) return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}

export default function Security() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPERADMIN;

  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState([]);
  const [historyPageInfo, setHistoryPageInfo] = useState({ count: 0, next: null, previous: null });
  const [sessions, setSessions] = useState([]);
  const [sessionsPageInfo, setSessionsPageInfo] = useState({ count: 0, next: null, previous: null });
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [forceLoggingOutId, setForceLoggingOutId] = useState(null);

  const loadHistory = useCallback((url = null) => {
    const request = url ? api.get(url) : securityService.getLoginHistory();
    return request.then((res) => {
      const data = res.data;
      if (data.results) {
        setHistory(data.results);
        setHistoryPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
      } else {
        setHistory(data);
        setHistoryPageInfo({ count: data.length, next: null, previous: null });
      }
      setHistoryLoaded(true);
    });
  }, []);

  const loadSessions = useCallback((url = null) => {
    const request = url ? api.get(url) : securityService.getActiveSessions();
    return request.then((res) => {
      const data = res.data;
      if (data.results) {
        setSessions(data.results);
        setSessionsPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
      } else {
        setSessions(data);
        setSessionsPageInfo({ count: data.length, next: null, previous: null });
      }
      setSessionsLoaded(true);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadHistory(), loadSessions()])
      .catch(() => toast.error('Could not load security data'))
      .finally(() => setLoading(false));
  }, [loadHistory, loadSessions]);

  const goToHistoryPage = (url) => {
    if (url) loadHistory(url);
  };

  const goToSessionsPage = (url) => {
    if (url) loadSessions(url);
  };

  const handleForceLogout = async (session) => {
    if (!window.confirm(`Force logout ${session.user_name || session.user_email}'s session?`)) return;
    setForceLoggingOutId(session.id);
    try {
      await securityService.forceLogout(session.id);
      toast.success('Session logged out');
      loadSessions();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to force logout'));
    } finally {
      setForceLoggingOutId(null);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!window.confirm('Log out all devices for your account? You will need to sign in again.')) return;
    setLoggingOutAll(true);
    try {
      await securityService.logoutAllDevices();
      toast.success('Logged out of all devices');
      window.location.href = '/login';
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to log out all devices'));
      setLoggingOutAll(false);
    }
  };

  const DeviceCell = ({ device }) => {
    const Icon = DEVICE_ICON[device] || Monitor;
    return (
      <span className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-ink-muted" />
        {device}
      </span>
    );
  };

  const historyColumns = [
    { key: 'user_name', header: 'User', render: (row) => (
      <div>
        <p className="font-medium text-ink">{row.user_name}</p>
        <p className="text-xs text-ink-muted">{row.user_email}</p>
      </div>
    )},
    { key: 'ip_address', header: 'IP Address', render: (row) => row.ip_address || '—' },
    { key: 'browser', header: 'Browser', render: (row) => `${row.browser} / ${row.operating_system}` },
    { key: 'device', header: 'Device', render: (row) => <DeviceCell device={row.device} /> },
    { key: 'login_time', header: 'Login Time', render: (row) => formatDateTime(row.login_time) },
    { key: 'is_successful', header: 'Status', render: (row) => (
      <Badge variant={row.is_successful ? 'success' : 'danger'} className={row.is_successful ? '' : 'animate-pulse'}>
        {row.is_successful ? 'Success' : 'Failed'}
      </Badge>
    )},
  ];

  const failedCount = history.filter((h) => !h.is_successful).length;
  const activeTabIndex = TABS.findIndex((t) => t.key === activeTab);

  return (
    <div>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .security-fade-in {
          animation: fadeSlideIn 0.35s ease-out both;
        }
      `}</style>

      <PageHeader
        title="Security"
        description="Monitor login activity and manage active sessions."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <SummaryCard icon={ShieldCheck} title="Active Sessions" value={sessionsPageInfo.count} loading={loading} />
          {!loading && (
            <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-strong opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-strong" />
            </span>
          )}
        </div>
        <SummaryCard icon={ShieldAlert} title="Failed Logins (this page)" value={failedCount} loading={loading} />
      </div>

      <div className="mb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="relative grid grid-cols-2 w-full max-w-xs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors z-10 ${
                  activeTab === tab.key ? 'text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {/* Sliding underline indicator — smoothly transitions between
                tabs instead of an instant border swap. */}
            <span
              className="absolute bottom-0 left-0 h-0.5 w-1/2 bg-accent-strong transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${activeTabIndex * 100}%)` }}
            />
          </div>

          {activeTab === 'sessions' && (
            <Button
              variant="secondary"
              size="sm"
              icon={LogOutIcon}
              onClick={handleLogoutAllDevices}
              loading={loggingOutAll}
              className="mb-2"
            >
              Logout All Devices
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'history' ? (
        <div key="history" className="security-fade-in">
          <DataTable columns={historyColumns} data={history} loading={loading && !historyLoaded} emptyTitle="No login history yet" />
          {(historyPageInfo.next || historyPageInfo.previous) && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => goToHistoryPage(historyPageInfo.previous)}
                disabled={!historyPageInfo.previous || loading}
                className="flex items-center gap-1 text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-xs text-ink-muted">{historyPageInfo.count} total</span>
              <button
                onClick={() => goToHistoryPage(historyPageInfo.next)}
                disabled={!historyPageInfo.next || loading}
                className="flex items-center gap-1 text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div key="sessions" className="security-fade-in">
          {loading && !sessionsLoaded ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 bg-surface-2 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl py-16 text-center">
              <h3 className="text-sm font-semibold text-ink">No active sessions</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {sessions.map((row, i) => {
                const Icon = DEVICE_ICON[row.device] || Monitor;
                const wellColor = DEVICE_WELL_COLOR[row.device] || 'bg-surface-2 text-ink-muted';
                return (
                  <div
                    key={row.id}
                    className="security-fade-in bg-surface border border-border rounded-2xl p-4 hover:border-accent-strong/50 transition-colors"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${wellColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">{row.user_name}</p>
                          <p className="text-xs text-ink-muted truncate">{row.role}</p>
                        </div>
                      </div>
                      <span className="flex h-2 w-2 shrink-0 mt-1.5">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-accent-strong opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-strong" />
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-ink-muted mb-4">
                      <p>{row.browser} / {row.operating_system}</p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-ink-muted" />
                        {row.ip_address || '—'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock3 className="h-3 w-3 text-ink-muted" />
                        {formatDateTime(row.last_activity)}
                      </p>
                    </div>

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleForceLogout(row)}
                        disabled={forceLoggingOutId === row.id}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-danger-50 py-2 text-xs font-medium text-danger-600 hover:bg-danger-50 transition-colors disabled:opacity-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        {forceLoggingOutId === row.id ? 'Logging out…' : 'Force Logout'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(sessionsPageInfo.next || sessionsPageInfo.previous) && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => goToSessionsPage(sessionsPageInfo.previous)}
                disabled={!sessionsPageInfo.previous || loading}
                className="flex items-center gap-1 text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-xs text-ink-muted">{sessionsPageInfo.count} total</span>
              <button
                onClick={() => goToSessionsPage(sessionsPageInfo.next)}
                disabled={!sessionsPageInfo.next || loading}
                className="flex items-center gap-1 text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}