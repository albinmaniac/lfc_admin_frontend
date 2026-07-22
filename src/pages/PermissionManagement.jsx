import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Lock, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { accountsService, parishService } from '../services.js';
import { PageHeader, Button, SummaryCard, Input } from '../components.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import api from '../api.js';

const PERMISSION_LABELS = {
  VIEW_DASHBOARD: 'View Dashboard',
  MANAGE_PARISH: 'Manage Parish (Mass Timings)',
  MANAGE_SETTINGS: 'Manage Church Settings',
  MANAGE_FAMILY_UNITS: 'Manage Family Units',
  MANAGE_FAMILIES: 'Manage Families',
  MANAGE_FAMILY_MEMBERS: 'Manage Family Members',
  MANAGE_GROUPS: 'Manage Parish Groups',
  MANAGE_EVENTS: 'Manage Events',
  MANAGE_NOTICES: 'Manage Notices',
  MANAGE_GALLERY: 'Manage Gallery',
  MANAGE_SECURITY: 'Manage Security',
  MANAGE_PERMISSIONS: 'Manage Permissions',
  VIEW_REPORTS: 'View Reports',
};

// Verified against UserPermission.PermissionChoices — all 13 real values,
// nothing extra, nothing missing.
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// Shown but locked (grey + lock icon), not hidden — this is deliberate:
// hiding them would make the "13 Permission Types" summary count
// mysteriously not match what's shown in the checklist, and give no
// indication of *why* a permission is unavailable to assign.
const SUPERADMIN_ONLY_PERMISSIONS = [
  PERMISSIONS.MANAGE_PERMISSIONS,
  PERMISSIONS.MANAGE_SETTINGS,
  PERMISSIONS.MANAGE_SECURITY,
];

function extractErrorMessage(err, fallback = 'Failed to update permissions') {
  const data = err.response?.data;
  if (!data) return fallback;
  if (data.message) return data.message;
  if (data.errors) {
    for (const key of Object.keys(data.errors)) {
      const value = data.errors[key];
      if (Array.isArray(value) && value.length) return value[0];
      if (typeof value === 'string') return value;
    }
  }
  if (data.detail) return data.detail;
  if (typeof data === 'string') return data;
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value) && value.length) return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}

export default function PermissionManagement() {
  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [checkedPermissions, setCheckedPermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback((url = null) => {
    setLoadingUsers(true);
    const request = url ? api.get(url) : accountsService.listPasswordResetUsers();

    request
      .then((res) => {
        const data = res.data;
        if (data.results) {
          setUsers(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setUsers(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch(() => toast.error('Could not load users'))
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const goToUsersPage = (url) => {
    if (url) fetchUsers(url);
  };

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));
  const isSuperAdmin = selectedUser?.role === ROLES.SUPERADMIN;

  const loadUserPermissions = useCallback(() => {
    if (!selectedUserId) {
      setCheckedPermissions([]);
      setOriginalPermissions([]);
      return;
    }
    if (isSuperAdmin) {
      setCheckedPermissions(ALL_PERMISSIONS);
      setOriginalPermissions(ALL_PERMISSIONS);
      return;
    }
    setLoadingPermissions(true);
    parishService
      .getUserPermissions(selectedUserId)
      .then((res) => {
        const list = (res.data.results ?? res.data).map((p) => p.permission);
        setCheckedPermissions(list);
        setOriginalPermissions(list);
      })
      .catch(() => toast.error("Could not load this user's permissions"))
      .finally(() => setLoadingPermissions(false));
  }, [selectedUserId, isSuperAdmin]);

  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  const isLocked = (permission) => isSuperAdmin || SUPERADMIN_ONLY_PERMISSIONS.includes(permission);

  const togglePermission = (permission) => {
    if (isLocked(permission)) return;
    setCheckedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  // True if the current checklist state differs from what was loaded —
  // used to disable Save until something has actually changed.
  const hasChanges =
    checkedPermissions.length !== originalPermissions.length ||
    checkedPermissions.some((p) => !originalPermissions.includes(p));

  const handleSave = async () => {
    if (isSuperAdmin || !hasChanges) return;
    setSaving(true);
    try {
      const payload = checkedPermissions.filter((p) => !SUPERADMIN_ONLY_PERMISSIONS.includes(p));
      await parishService.bulkUpdatePermissions({
        user_id: Number(selectedUserId),
        permissions: payload,
      });
      toast.success('Permissions updated');
      // Reload from the backend rather than trusting the just-submitted
      // local state — confirms the save actually took and resets the
      // hasChanges baseline correctly.
      loadUserPermissions();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Permission Management"
        description="Assign module-level permissions to staff, group leaders, and family unit presidents."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard icon={KeyRound} title="Total Users" value={pageInfo.count} loading={loadingUsers} />
        <SummaryCard icon={KeyRound} title="Permission Types" value={ALL_PERMISSIONS.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="mb-3">
            <Input
              icon={Search}
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden max-h-[560px] overflow-y-auto">
            {loadingUsers ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No users found.</p>
            ) : (
              filteredUsers.map((u) => {
                const active = String(u.id) === String(selectedUserId);
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors ${
                      active ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                      {u.first_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? 'text-primary-700' : 'text-gray-900'}`}>
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{u.role.replace(/_/g, ' ')}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {(pageInfo.next || pageInfo.previous) && (
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => goToUsersPage(pageInfo.previous)}
                disabled={!pageInfo.previous || loadingUsers}
                className="flex items-center gap-1 text-xs text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-xs text-gray-400">{pageInfo.count} total</span>
              <button
                onClick={() => goToUsersPage(pageInfo.next)}
                disabled={!pageInfo.next || loadingUsers}
                className="flex items-center gap-1 text-xs text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            {!selectedUserId ? (
              <p className="text-sm text-gray-500 py-16 text-center">Select a user from the list to view and manage their permissions.</p>
            ) : loadingPermissions ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
                  <div className="h-11 w-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                    {selectedUser.first_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                    <p className="text-xs text-gray-500">{selectedUser.email} — {selectedUser.role.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="bg-primary-50 border border-primary-100 rounded-lg px-3 py-2.5 text-sm text-primary-700 mb-4">
                    SuperAdmin has full access to every module by default. Permissions can't be individually assigned or revoked.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  {ALL_PERMISSIONS.map((permission) => {
                    const locked = isLocked(permission);
                    return (
                      <label
                        key={permission}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                          locked
                            ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checkedPermissions.includes(permission)}
                          onChange={() => togglePermission(permission)}
                          disabled={locked}
                          className="rounded border-gray-300"
                        />
                        <span className="flex-1">{PERMISSION_LABELS[permission]}</span>
                        {locked && <Lock className="h-3.5 w-3.5 text-gray-300" />}
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    {isSuperAdmin
                      ? 'SuperAdmin permissions are fixed'
                      : hasChanges
                      ? 'You have unsaved changes'
                      : 'No changes to save'}
                  </p>
                  <Button onClick={handleSave} loading={saving} disabled={isSuperAdmin || !hasChanges}>
                    Save Permissions
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}