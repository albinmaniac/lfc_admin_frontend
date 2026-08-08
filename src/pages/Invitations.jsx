import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, X, RotateCcw, Ban, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { administrationService } from '../services.js';
import { PageHeader, DataTable, Badge, Button, Input, SummaryCard } from '../components.jsx';
import { ROLES, PERMISSION_LABELS, PERMISSION_PRESETS, INVITABLE_PERMISSIONS } from '../constants.js';
import api from '../api.js';

const STATUS_BADGE = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  CANCELLED: 'gray',
  EXPIRED: 'danger',
};

// SUPERADMIN intentionally excluded — granting the top-level role via a
// self-service email invitation is too sensitive to offer from this form.
// SuperAdmins should be created directly (e.g. via a protected admin action
// or Django Admin), not through the same flow used for Staff/Group Leaders.
const ROLE_OPTIONS = Object.values(ROLES);

const EMPTY_FORM = {
  full_name: '',
  email: '',
  role: ROLES.STAFF,
  preset: '',
  permission_snapshot: [],
  customizing: false,
};

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
  const [form, setForm] = useState(EMPTY_FORM);
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

  const handlePresetChange = (presetKey) => {
    const preset = PERMISSION_PRESETS[presetKey];

    setForm((prev) => {
      // Confirm whenever there's a non-empty, differing selection to lose —
      // covers both "customized off a preset" AND "hand-picked from the raw
      // checklist without ever touching a preset" (customizing was never
      // set true on that second path, so it can't gate this check alone).
      const hasUnsavedSelection = prev.permission_snapshot.length > 0 && presetKey !== prev.preset;

      if (hasUnsavedSelection) {
        const confirmed = window.confirm(
          'Changing the preset will replace your current permission selection. Continue?'
        );
        if (!confirmed) {
          return prev;
        }
      }

      return {
        ...prev,
        preset: presetKey,
        permission_snapshot: preset ? [...new Set(preset.permissions)] : [],
        customizing: false,
      };
    });
  };

  const togglePermission = (perm) => {
    setForm((prev) => {
      const has = prev.permission_snapshot.includes(perm);
      return {
        ...prev,
        permission_snapshot: has
          ? prev.permission_snapshot.filter((p) => p !== perm)
          : [...prev.permission_snapshot, perm],
      };
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (form.permission_snapshot.length === 0) {
      toast.error('Select a permission preset, or customize, before sending');
      return;
    }
    setSaving(true);
    try {
      await administrationService.createInvitation({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
        permission_snapshot: [...new Set(form.permission_snapshot)],
      });
      toast.success('Invitation sent');
      setForm(EMPTY_FORM);
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
    { key: 'full_name', header: 'Name', render: (row) => row.full_name || '—' },
    { key: 'email', header: 'Email', render: (row) => <span className="font-medium text-ink">{row.email}</span> },
    { key: 'role', header: 'Role', render: (row) => row.role.replace(/_/g, ' ') },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge> },
    { key: 'invited_by_name', header: 'Invited By', render: (row) => row.invited_by_name || '—' },
    { key: 'expires_at', header: 'Expires', render: (row) => new Date(row.expires_at).toLocaleDateString() },
  ];

  const closeModal = () => {
    setModalOpen(false);
    setForm(EMPTY_FORM);
  };

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
                className="h-8 w-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-accent-ink"
                aria-label="Resend"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleCancel(row)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-danger-50 hover:text-danger-600"
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
            className="flex items-center gap-1 text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs text-ink-muted">{pageInfo.count} total</span>
          <button
            onClick={() => goToPage(pageInfo.next)}
            disabled={!pageInfo.next || loading}
            className="flex items-center gap-1 text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">Send Invitation</h3>
              <button onClick={closeModal} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Full Name</label>
                <Input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Joseph Mathew"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
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
                <label className="block text-sm font-medium text-ink mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Permission Preset</label>
                <select
                  value={form.preset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm"
                >
                  <option value="">Select a preset…</option>
                  {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.label}</option>
                  ))}
                </select>
              </div>

              {form.preset && !form.customizing && (
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <p className="text-xs font-medium text-ink-muted mb-2">Permissions included</p>
                  <ul className="space-y-1 mb-2">
                    {form.permission_snapshot.map((perm) => (
                      <li key={perm} className="text-sm text-ink flex items-center gap-1.5">
                        <span className="text-success-600">✓</span> {PERMISSION_LABELS[perm] || perm}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, customizing: true }))}
                    className="text-xs font-medium text-accent-ink hover:underline"
                  >
                    Customize
                  </button>
                </div>
              )}

              {(form.customizing || !form.preset) && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    {form.preset ? 'Customize permissions' : 'Permissions'}
                  </label>
                  <div className="max-h-40 overflow-auto border border-border rounded-lg p-2 bg-surface">
                    {INVITABLE_PERMISSIONS.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 mb-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.permission_snapshot.includes(perm)}
                          onChange={() => togglePermission(perm)}
                        />
                        <span className="text-sm">{PERMISSION_LABELS[perm] || perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancel</Button>
                <Button
                  type="submit"
                  className="flex-1"
                  loading={saving}
                  disabled={
                    saving ||
                    !form.full_name.trim() ||
                    !form.email.trim() ||
                    form.permission_snapshot.length === 0
                  }
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}