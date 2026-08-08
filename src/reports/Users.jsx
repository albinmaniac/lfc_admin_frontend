import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { reportsService } from '../services';
import { useReportData, ERROR_MESSAGES } from './hooks';
import { ReportTable, ReportFilter, Badge, Button, formatDate, formatDateTime, formatEnumLabel } from '../components';
import { RotateCcw, LogIn, MailPlus, UserPlus, UserX, Monitor, ShieldCheck, Download, ChevronDown } from 'lucide-react';

function filenameFromDisposition(header, fallback) {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
}

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

function ExportDropdown({ report, filters }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function onEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  function onOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
      });
      setOpen(true);
    }
  }

  async function onExport(format) {
    setExporting(true);
    try {
      const response = await reportsService.exportReport({
        report,
        format,
        filters,
      });
      const blob = new Blob([response.data]);
      const disposition = response.headers['content-disposition'];
      const filename = filenameFromDisposition(disposition, `${report}.${format}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setOpen(false);
    } catch (error) {
      // Could add error handling here
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
  <div className="relative ml-auto flex justify-end">
  <Button
    variant="secondary"
    icon={Download}
    onClick={onOpen}
    ref={buttonRef}
    disabled={exporting}
    aria-haspopup="menu"
    aria-expanded={open}
    className="flex items-center gap-1"
  >
    Export
    <ChevronDown className="ml-2 h-3.5 w-3.5" />
  </Button>
</div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="z-50 rounded-md border border-border bg-surface shadow-md w-36 py-1 text-sm text-ink"
            style={{ position: 'absolute', top: menuPos.top, left: menuPos.left }}
            role="menu"
            aria-label="Export options"
          >
            <button
              className="block w-full px-3 py-2 text-left hover:bg-surface-2 disabled:text-ink-muted"
              onClick={() => onExport('csv')}
              disabled={exporting}
              role="menuitem"
              type="button"
            >
             Export as CSV
            </button>
            <button
              className="block w-full px-3 py-2 text-left hover:bg-surface-2 disabled:text-ink-muted"
              onClick={() => onExport('xlsx')}
              disabled={exporting}
              role="menuitem"
              type="button"
            >
             Export as Excel
            </button>
            <button
              className="block w-full px-3 py-2 text-left hover:bg-surface-2 disabled:text-ink-muted"
              onClick={() => onExport('pdf')}
              disabled={exporting}
              role="menuitem"
              type="button"
            >
              Export as PDF
            </button>
          </div>,
          document.body
        )}
    </>
  );
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

function ReportCard({ children, delay = 0 }) {
  return (
    <div
      className="report-card rounded-2xl border border-border bg-surface overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function useSearchedReport(fetchFn, searchFn) {
  const { data, loading, errorType, refetch } = useReportData(fetchFn);
  const [search, setSearch] = useState('');
  const filtered = search ? data.filter((row) => searchFn(row, search.toLowerCase())) : data;
  return { filtered, loading, errorType, refetch, search, setSearch };
}

// ---------------------------------------------------------------------------
// Login History
// ---------------------------------------------------------------------------
const loginColumns = [
  { key: 'user_name', header: 'User' },
  { key: 'ip_address', header: 'IP Address' },
  { key: 'user_agent', header: 'User Agent', render: (r) => <span title={r.user_agent}>{(r.user_agent || '—').slice(0, 40)}{r.user_agent?.length > 40 ? '…' : ''}</span> },
  { key: 'login_time', header: 'Login Time', render: (r) => formatDateTime(r.login_time) },
  { key: 'logout_time', header: 'Logout Time', render: (r) => (r.logout_time ? formatDateTime(r.logout_time) : '—') },
  { key: 'is_successful', header: 'Result', render: (r) => <Badge variant={r.is_successful ? 'success' : 'danger'}>{r.is_successful ? 'Success' : 'Failed'}</Badge> },
];
const loginSearch = (row, q) => [row.user_name, row.ip_address].some((v) => v?.toLowerCase().includes(q));

function LoginHistoryTab() {
  const { filtered, loading, errorType, refetch, search, setSearch } = useSearchedReport(
    reportsService.getLoginHistoryReport,
    loginSearch
  );
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  return (
    <ReportCard>
      <div className="flex items-center gap-2 mb-4">
        <ReportFilter type="search" label="Search by user or IP..." value={search} onChange={setSearch} />
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={refetch} />
        <ExportDropdown report="login-history" filters={{ search }} />
      </div>
      <ReportTable
        columns={loginColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No login history found"
      />
    </ReportCard>
  );
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
const INVITATION_STATUS_VARIANT = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  CANCELLED: 'gray',
  EXPIRED: 'danger',
};

const invitationColumns = [
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', render: (r) => formatEnumLabel(r.role) },
  { key: 'status', header: 'Status', render: (r) => <Badge variant={INVITATION_STATUS_VARIANT[r.status] || 'gray'}>{formatEnumLabel(r.status)}</Badge> },
  { key: 'invited_by', header: 'Invited By' },
  { key: 'expires_at', header: 'Expires', render: (r) => formatDateTime(r.expires_at) },
  { key: 'created_at', header: 'Sent', render: (r) => formatDate(r.created_at) },
];
const invitationSearch = (row, q) => [row.email, row.invited_by].some((v) => v?.toLowerCase().includes(q));

function InvitationsTab() {
  const { filtered, loading, errorType, refetch, search, setSearch } = useSearchedReport(
    reportsService.getInvitationHistoryReport,
    invitationSearch
  );
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  return (
    <ReportCard>
      <div className="flex items-center gap-2 mb-4">
        <ReportFilter type="search" label="Search by email..." value={search} onChange={setSearch} />
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={refetch} />
        <ExportDropdown report="invitations" filters={{ search }} />
      </div>
      <ReportTable
        columns={invitationColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No invitations found"
      />
    </ReportCard>
  );
}

// ---------------------------------------------------------------------------
// Recent Users / Disabled Accounts (shared columns, different endpoints)
// ---------------------------------------------------------------------------
const userColumns = [
  { key: 'name', header: 'Name', render: (r) => `${r.first_name} ${r.last_name}`.trim() },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', render: (r) => formatEnumLabel(r.role) },
  { key: 'phone_number', header: 'Phone', render: (r) => r.phone_number || '—' },
  { key: 'is_email_verified', header: 'Email Verified', render: (r) => <Badge variant={r.is_email_verified ? 'success' : 'gray'}>{r.is_email_verified ? 'Verified' : 'Unverified'}</Badge> },
  { key: 'is_active', header: 'Status', render: (r) => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Active' : 'Disabled'}</Badge> },
  { key: 'date_joined', header: 'Joined', render: (r) => formatDate(r.date_joined) },
];
const userSearch = (row, q) => [row.first_name, row.last_name, row.email].some((v) => v?.toLowerCase().includes(q));

function RecentUsersTab() {
  const { filtered, loading, errorType, refetch, search, setSearch } = useSearchedReport(
    reportsService.getRecentUsersReport,
    userSearch
  );
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  return (
    <ReportCard>
      <div className="flex items-center gap-2 mb-4">
        <ReportFilter type="search" label="Search by name or email..." value={search} onChange={setSearch} />
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={refetch} />
        <ExportDropdown report="recent-users" filters={{ search }} />
      </div>
      <ReportTable
        columns={userColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No recent users found"
      />
    </ReportCard>
  );
}

function DisabledAccountsTab() {
  const { filtered, loading, errorType, refetch, search, setSearch } = useSearchedReport(
    reportsService.getDisabledAccountsReport,
    userSearch
  );
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  return (
    <ReportCard>
      <div className="flex items-center gap-2 mb-4">
        <ReportFilter type="search" label="Search by name or email..." value={search} onChange={setSearch} />
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={refetch} />
        <ExportDropdown report="disabled-users" filters={{ search }} />
      </div>
      <ReportTable
        columns={userColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No disabled accounts"
      />
    </ReportCard>
  );
}

// ---------------------------------------------------------------------------
// Active Sessions
// ---------------------------------------------------------------------------
const sessionColumns = [
  { key: 'user_name', header: 'User' },
  { key: 'ip_address', header: 'IP Address' },
  { key: 'user_agent', header: 'User Agent', render: (r) => <span title={r.user_agent}>{(r.user_agent || '—').slice(0, 40)}{r.user_agent?.length > 40 ? '…' : ''}</span> },
  { key: 'last_activity', header: 'Last Activity', render: (r) => formatDateTime(r.last_activity) },
  { key: 'created_at', header: 'Started', render: (r) => formatDateTime(r.created_at) },
  { key: 'is_active', header: 'Status', render: (r) => <Badge variant={r.is_active ? 'success' : 'gray'}>{r.is_active ? 'Active' : 'Ended'}</Badge> },
];
const sessionSearch = (row, q) => [row.user_name, row.ip_address].some((v) => v?.toLowerCase().includes(q));

function ActiveSessionsTab() {
  const { filtered, loading, errorType, refetch, search, setSearch } = useSearchedReport(
    reportsService.getActiveSessionsReport,
    sessionSearch
  );
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  return (
    <ReportCard>
      <div className="flex items-center gap-2 mb-4">
        <ReportFilter type="search" label="Search by user or IP..." value={search} onChange={setSearch} />
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={refetch} />
        <ExportDropdown report="sessions" filters={{ search }} />
      </div>
      <ReportTable
        columns={sessionColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No active sessions"
      />
    </ReportCard>
  );
}

// ---------------------------------------------------------------------------
// Permission Audit
// ---------------------------------------------------------------------------
const permissionColumns = [
  { key: 'user_name', header: 'User' },
  { key: 'permission_display', header: 'Permission' },
  { key: 'created_at', header: 'Granted', render: (r) => formatDate(r.created_at) },
];
const permissionSearch = (row, q) => [row.user_name, row.permission_display].some((v) => v?.toLowerCase().includes(q));

function PermissionAuditTab() {
  const { filtered, loading, errorType, refetch, search, setSearch } = useSearchedReport(
    reportsService.getPermissionAuditReport,
    permissionSearch
  );
  if (errorType) return <ErrorState errorType={errorType} onRetry={refetch} />;
  return (
    <ReportCard>
      <div className="flex items-center gap-2 mb-4">
        <ReportFilter type="search" label="Search by user or permission..." value={search} onChange={setSearch} />
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={refetch} />
        <ExportDropdown report="permission-audit" filters={{ search }} />
      </div>
      <ReportTable
        columns={permissionColumns}
        data={filtered}
        loading={loading}
        emptyTitle="No permission records found"
      />
    </ReportCard>
  );
}

// ---------------------------------------------------------------------------
const SUB_TABS = [
  { id: 'login-history', label: 'Login History', icon: LogIn },
  { id: 'invitations', label: 'Invitations', icon: MailPlus },
  { id: 'recent', label: 'Recent Users', icon: UserPlus },
  { id: 'disabled', label: 'Disabled Accounts', icon: UserX },
  { id: 'sessions', label: 'Active Sessions', icon: Monitor },
  { id: 'permission-audit', label: 'Permission Audit', icon: ShieldCheck },
];

export default function UsersReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'login-history';

  const setView = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'login-history') next.delete('view');
    else next.set('view', id);
    setSearchParams(next);
  };

  const renderView = () => {
    switch (view) {
      case 'invitations':
        return <InvitationsTab />;
      case 'recent':
        return <RecentUsersTab />;
      case 'disabled':
        return <DisabledAccountsTab />;
      case 'sessions':
        return <ActiveSessionsTab />;
      case 'permission-audit':
        return <PermissionAuditTab />;
      case 'login-history':
      default:
        return <LoginHistoryTab />;
    }
  };

  return (
    <div className="space-y-4">
      <ReportStyles />

      <div>
        <h2 className="text-lg font-semibold text-ink">Users &amp; Security</h2>
        <p className="text-sm text-ink-muted">Audit logins, invitations, sessions, and account status</p>
      </div>

      <div className="report-card flex gap-2 overflow-x-auto pb-1">
        {SUB_TABS.map((t) => {
          const active = view === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors ${
                active
                  ? 'bg-accent-strong text-accent-ink border-accent-strong'
                  : 'bg-surface text-ink-muted border-border hover:bg-surface-2'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {renderView()}
    </div>
  );
}