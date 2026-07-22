import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, LogOut, Monitor, Smartphone, Tablet, LogOutIcon } from 'lucide-react';
import { securityService } from '../services.js';
import { PageHeader, DataTable, Badge, Button, SummaryCard } from '../components.jsx';
import { useAuth } from '../auth.jsx';
import { ROLES } from '../constants.js';
import { ShieldCheck } from 'lucide-react';

const TABS = [
  { key: 'history', label: 'Login History' },
  { key: 'sessions', label: 'Active Sessions' },
];

const DEVICE_ICON = { Desktop: Monitor, Mobile: Smartphone, Tablet: Tablet };

export default function Security() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPERADMIN;

  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Fetch BOTH on mount, not just the active tab — fixes the summary card
  // showing 0 until you manually switch tabs (issue #3).
  useEffect(() => {
    setLoading(true);
    Promise.all([
      securityService.getLoginHistory().then((res) => {
        setHistory(res.data.results ?? res.data);
        setHistoryLoaded(true);
      }),
      securityService.getActiveSessions().then((res) => {
        setSessions(res.data.results ?? res.data);
        setSessionsLoaded(true);
      }),
    ])
      .catch(() => toast.error('Could not load security data'))
      .finally(() => setLoading(false));
  }, []);

  const handleForceLogout = async (session) => {
    if (!window.confirm(`Force logout ${session.user_name || session.user_email}'s session?`)) return;
    try {
      await securityService.forceLogout(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      toast.success('Session logged out');
    } catch {
      toast.error('Failed to force logout');
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!window.confirm('Log out all devices for your account? You will need to sign in again.')) return;
    setLoggingOutAll(true);
    try {
      await securityService.logoutAllDevices();
      toast.success('Logged out of all devices');
      window.location.href = '/login';
    } catch {
      toast.error('Failed to log out all devices');
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
    { key: 'login_time', header: 'Login Time', render: (row) => new Date(row.login_time).toLocaleString() },
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
    { key: 'last_activity', header: 'Last Active', render: (row) => new Date(row.last_activity).toLocaleString() },
  ];

  const failedCount = history.filter((h) => !h.is_successful).length;

  return (
    <div>
      <PageHeader
        title="Security"
        description="Monitor login activity and manage active sessions."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard icon={ShieldCheck} title="Active Sessions" value={sessions.length} loading={loading} />
        <SummaryCard icon={ShieldAlert} title="Failed Logins" value={failedCount} loading={loading} />
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
        <DataTable columns={historyColumns} data={history} loading={loading && !historyLoaded} emptyTitle="No login history yet" />
      ) : (
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
      )}
    </div>
  );
}