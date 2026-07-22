import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Users, RotateCcw } from 'lucide-react';
import { parishService, familiesService } from '../services.js';
import { PageHeader, DataTable, Badge, Switch, Button, Input, SummaryCard } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import { UsersRound } from 'lucide-react';
import api from '../api.js';

const EMPTY_FORM = { name: '', description: '', patron_saint: '', leader: '', phone_number: '' };

function extractErrorMessage(err, fallback = 'Failed to save') {
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

export default function ParishGroups() {
  const [groups, setGroups] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Family members list for the leader picker — previously failed silently
  // (empty .catch), leaving the dropdown permanently empty with no
  // indication anything went wrong. Now surfaces a visible error + retry.
  const loadMembers = useCallback(() => {
    setMembersLoading(true);
    setMembersError(false);
    familiesService
      .getFamilyMembers()
      .then((res) => {
        if (!mountedRef.current) return;
        setMembers(res.data.results ?? res.data);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setMembersError(true);
        toast.error('Could not load the members list for the leader picker');
      })
      .finally(() => {
        if (mountedRef.current) setMembersLoading(false);
      });
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const abortRef = useRef(null);

  const fetchGroups = useCallback((url = null) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = {};
    if (!url && search) params.search = search;

    const request = url
      ? api.get(url, { signal: controller.signal })
      : parishService.getParishGroups(params, { signal: controller.signal });

    request
      .then((res) => {
        if (!mountedRef.current) return;
        const data = res.data;
        if (data.results) {
          setGroups(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setGroups(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        toast.error('Could not load parish groups');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchGroups(), 300);
    return () => clearTimeout(timeout);
  }, [fetchGroups]);

  const goToPage = (url) => {
    if (url) fetchGroups(url);
  };

  const handleToggleActive = async (row, nextValue) => {
    setGroups((prev) => prev.map((g) => (g.id === row.id ? { ...g, is_active: nextValue } : g)));
    try {
      await parishService.updateParishGroup(row.id, { is_active: nextValue });
      fetchGroups();
    } catch {
      setGroups((prev) => prev.map((g) => (g.id === row.id ? { ...g, is_active: row.is_active } : g)));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await parishService.deleteParishGroup(row.id);
      toast.success('Parish group deleted');
      fetchGroups();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete'));
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description || '',
      patron_saint: row.patron_saint || '',
      leader: row.leader || '',
      phone_number: row.phone_number || '',
    });
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, leader: form.leader || null };
      if (editingId) {
        await parishService.updateParishGroup(editingId, payload);
        toast.success('Parish group updated');
      } else {
        await parishService.createParishGroup(payload);
        toast.success('Parish group created');
      }
      setModalOpen(false);
      fetchGroups();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const activeCountOnPage = groups.filter((g) => g.is_active).length;
  const totalMembersOnPage = groups.reduce((sum, g) => sum + (g.member_count || 0), 0);
  const hasActiveFilter = Boolean(search);

  const columns = [
    { key: 'name', header: 'Group Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    { key: 'patron_saint', header: 'Patron Saint', render: (row) => row.patron_saint || '—' },
    { key: 'leader_name', header: 'Leader', render: (row) => row.leader_name || '—' },
    { key: 'member_count', header: 'Members', render: (row) => row.member_count ?? 0 },
    { key: 'phone_number', header: 'Phone', render: (row) => row.phone_number || '—' },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <PermissionGate
          permission={PERMISSIONS.MANAGE_GROUPS}
          fallback={<Badge variant={row.is_active ? 'success' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>}
        >
          <Switch checked={row.is_active} onChange={(next) => handleToggleActive(row, next)} />
        </PermissionGate>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Parish Groups"
        description="Manage ministries, social groups, and liturgical organizations."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_GROUPS}>
            <Button icon={Plus} onClick={openAddModal}>Create Parish Group</Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={UsersRound} title="Total Groups" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={UsersRound} title="Active (this page)" value={activeCountOnPage} loading={loading} />
        <SummaryCard icon={Users} title="Total Memberships (this page)" value={totalMembersOnPage} loading={loading} />
      </div>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by group name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={columns}
        data={groups}
        loading={loading}
        emptyTitle={hasActiveFilter ? 'No matching parish groups' : 'No parish groups yet'}
        emptyDescription={
          hasActiveFilter
            ? 'Try a different search term.'
            : 'Create your first parish group to get started.'
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <PermissionGate permission={PERMISSIONS.MANAGE_GROUPS}>
              <button
                onClick={() => toast('Member roster management coming next')}
                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Manage members"
              >
                <Users className="h-4 w-4" />
              </button>
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.MANAGE_GROUPS}>
              <button onClick={() => openEditModal(row)} className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </button>
            </PermissionGate>
            <PermissionGate role={ROLES.SUPERADMIN}>
              <button onClick={() => handleDelete(row)} className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-danger-50 hover:text-danger-600" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </PermissionGate>
          </div>
        )}
      />

      {(pageInfo.next || pageInfo.previous) && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => goToPage(pageInfo.previous)}
            disabled={!pageInfo.previous || loading}
            className="text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-400">{pageInfo.count} total</span>
          <button
            onClick={() => goToPage(pageInfo.next)}
            disabled={!pageInfo.next || loading}
            className="text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
          >
            Next →
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Edit Parish Group' : 'Create Parish Group'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Group Name</label>
                <Input type="text" name="name" required value={form.name} onChange={handleFormChange} placeholder="e.g. St. Cecilia Choir" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                  placeholder="What this group does..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Patron Saint <span className="text-gray-400">(optional)</span>
                </label>
                <Input type="text" name="patron_saint" value={form.patron_saint} onChange={handleFormChange} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Leader <span className="text-gray-400">(optional)</span>
                  </label>
                  {membersError && (
                    <button
                      type="button"
                      onClick={loadMembers}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <RotateCcw className="h-3 w-3" /> Retry
                    </button>
                  )}
                </div>
                {membersError ? (
                  <p className="text-xs text-danger-600 bg-danger-50 rounded-lg px-3 py-2">
                    Couldn't load members. Leader can't be set right now — click retry above.
                  </p>
                ) : (
                  <select
                    name="leader"
                    value={form.leader}
                    onChange={handleFormChange}
                    disabled={membersLoading}
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-50"
                  >
                    <option value="">{membersLoading ? 'Loading members...' : 'No leader assigned'}</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number <span className="text-gray-400">(optional)</span>
                </label>
                <Input type="text" name="phone_number" value={form.phone_number} onChange={handleFormChange} placeholder="10-15 digits" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Save Changes' : 'Create Group'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}