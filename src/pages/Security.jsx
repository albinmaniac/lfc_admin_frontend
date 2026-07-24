import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, LogOut, Monitor, Smartphone, Tablet, LogOutIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Fetch BOTH on mount, not just the active tab — keeps the summary cards
  // accurate from the first render regardless of which tab is showing.
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
    try {
      await securityService.forceLogout(session.id);
      toast.success('Session logged out');
      loadSessions();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to force logout'));
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
        <Icon className="h-3.5 w-3.5 text-gray-400" />
        {device}
      </span>
    );
  };

  const historyColumns = [
    { key: 'user_name', header: 'User', render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.user_name}</p>
        <p className="text-xs text-gray-400">{row.user_email}</p>
      </div>
    )},
    { key: 'ip_address', header: 'IP Address', render: (row) => row.ip_address || '—' },
    { key: 'browser', header: 'Browser', render: (row) => `${row.browser} / ${row.operating_system}` },
    { key: 'device', header: 'Device', render: (row) => <DeviceCell device={row.device} /> },
    { key: 'login_time', header: 'Login Time', render: (row) => formatDateTime(row.login_time) },
    { key: 'is_successful', header: 'Status', render: (row) => <Badge variant={row.is_successful ? 'success' : 'danger'}>{row.is_successful ? 'Success' : 'Failed'}</Badge> },
  ];

  const sessionColumns = [
    { key: 'user_name', header: 'User', render: (row) => (
      <div>
        <p className="font-medium text-gray-900">{row.user_name}</p>
        <p className="text-xs text-gray-400">{row.role}</p>
      </div>
    )},
    { key: 'device', header: 'Device', render: (row) => <DeviceCell device={row.device} /> },
    { key: 'browser', header: 'Browser', render: (row) => `${row.browser} / ${row.operating_system}` },
    { key: 'ip_address', header: 'IP Address', render: (row) => row.ip_address || '—' },
    { key: 'last_activity', header: 'Last Active', render: (row) => formatDateTime(row.last_activity) },
  ];

  const failedCount = history.filter((h) => !h.is_successful).length;

  return (
    <div>
      <PageHeader
        title="Security"
        description="Monitor login activity and manage active sessions."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard icon={ShieldCheck} title="Active Sessions" value={sessionsPageInfo.count} loading={loading} />
        <SummaryCard icon={ShieldAlert} title="Failed Logins (this page)" value={failedCount} loading={loading} />
      </div>

      <div className="flex items-center justify-between mb-4 border-b border-gray-200">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
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

      {activeTab === 'history' ? (
        <>
          <DataTable columns={historyColumns} data={history} loading={loading && !historyLoaded} emptyTitle="No login history yet" />
          {(historyPageInfo.next || historyPageInfo.previous) && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => goToHistoryPage(historyPageInfo.previous)}
                disabled={!historyPageInfo.previous || loading}
                className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-xs text-gray-400">{historyPageInfo.count} total</span>
              <button
                onClick={() => goToHistoryPage(historyPageInfo.next)}
                disabled={!historyPageInfo.next || loading}
                className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <DataTable
            columns={sessionColumns}
            data={sessions}
            loading={loading && !sessionsLoaded}
            emptyTitle="No active sessions"
            rowActions={
              isSuperAdmin
                ? (row) => (
                    <button
                      onClick={() => handleForceLogout(row)}
                      className="h-8 px-2.5 flex items-center gap-1.5 rounded-md text-xs font-medium text-danger-600 hover:bg-danger-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Force Logout
                    </button>
                  )
                : undefined
            }
          />
          {(sessionsPageInfo.next || sessionsPageInfo.previous) && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => goToSessionsPage(sessionsPageInfo.previous)}
                disabled={!sessionsPageInfo.previous || loading}
                className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-xs text-gray-400">{sessionsPageInfo.count} total</span>
              <button
                onClick={() => goToSessionsPage(sessionsPageInfo.next)}
                disabled={!sessionsPageInfo.next || loading}
                className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}