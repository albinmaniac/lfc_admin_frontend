import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, X, RotateCcw, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { administrationService } from '../services.js';
import { PageHeader, DataTable, Badge, Button, Input, SummaryCard } from '../components.jsx';
import { ROLES } from '../constants.js';
import { Mail } from 'lucide-react';
import api from '../api.js';

const STATUS_BADGE = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  CANCELLED: 'gray',
  EXPIRED: 'danger',
};

// Matches UserRole.values on the backend exactly (InvitationCreateSerializer
// validates against this same set). NOTE: this currently includes
// SUPERADMIN — the backend technically allows inviting someone directly as
// SuperAdmin via email invitation. Worth a deliberate decision on whether
// that should be restricted, since it's a more sensitive grant than the
// other three roles.
const ROLE_OPTIONS = Object.values(ROLES);

function extractErrorMessage(err, fallback = 'Failed to send invitation') {
  const data = err.response?.data;
  if (!data) return fallback;
  if (data.detail) return data.detail;
  if (typeof data === 'string') return data;
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value) && value.length) return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}

export default function Invitations() {
  const [invitations, setInvitations] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ email: '', role: ROLES.STAFF });
  const [saving, setSaving] = useState(false);

  const fetchInvitations = useCallback((url = null) => {
    setLoading(true);
    const request = url ? api.get(url) : administrationService.getInvitations();

    request
      .then((res) => {
        const data = res.data;
        if (data.results) {
          setInvitations(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setInvitations(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch(() => toast.error('Could not load invitations'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const goToPage = (url) => {
    if (url) fetchInvitations(url);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await administrationService.createInvitation({ ...form, email: form.email.trim() });
      toast.success('Invitation sent');
      setForm({ email: '', role: ROLES.STAFF });
      setModalOpen(false);
      fetchInvitations();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async (row) => {
    try {
      await administrationService.resendInvitation(row.id);
      toast.success(`Invitation resent to ${row.email}`);
      fetchInvitations();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to resend invitation'));
    }
  };

  const handleCancel = async (row) => {
    if (!window.confirm(`Cancel the invitation for ${row.email}?`)) return;
    try {
      await administrationService.cancelInvitation(row.id);
      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to cancel invitation'));
    }
  };

  const pendingCountOnPage = invitations.filter((i) => i.status === 'PENDING').length;
  const acceptedCountOnPage = invitations.filter((i) => i.status === 'ACCEPTED').length;

  const columns = [
    { key: 'email', header: 'Email', render: (row) => <span className="font-medium text-gray-900">{row.email}</span> },
    { key: 'role', header: 'Role', render: (row) => row.role.replace(/_/g, ' ') },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge> },
    { key: 'invited_by_name', header: 'Invited By', render: (row) => row.invited_by_name || '—' },
    { key: 'expires_at', header: 'Expires', render: (row) => new Date(row.expires_at).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader
        title="Invitations"
        description="Invite new staff and manage pending portal access."
        actions={<Button icon={Plus} onClick={() => setModalOpen(true)}>Send Invitation</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={Mail} title="Total Invitations" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={Mail} title="Pending (this page)" value={pendingCountOnPage} loading={loading} />
        <SummaryCard icon={Mail} title="Accepted (this page)" value={acceptedCountOnPage} loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={invitations}
        loading={loading}
        emptyTitle="No invitations yet"
        emptyDescription="Send your first invitation to onboard staff."
        rowActions={(row) =>
          row.status === 'PENDING' ? (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => handleResend(row)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-primary-600"
                aria-label="Resend"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleCancel(row)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-danger-50 hover:text-danger-600"
                aria-label="Cancel"
              >
                <Ban className="h-4 w-4" />
              </button>
            </div>
          ) : null
        }
      />

      {(pageInfo.next || pageInfo.previous) && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => goToPage(pageInfo.previous)}
            disabled={!pageInfo.previous || loading}
            className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs text-gray-400">{pageInfo.count} total</span>
          <button
            onClick={() => goToPage(pageInfo.next)}
            disabled={!pageInfo.next || loading}
            className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Send Invitation</h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="staff@lfcchurch.org"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>Send Invitation</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}