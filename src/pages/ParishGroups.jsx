import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Users, RotateCcw, Phone, Crown } from 'lucide-react';
import { parishService, familiesService } from '../services.js';
import { PageHeader, Badge, Switch, Button, Input, SummaryCard } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import { UsersRound } from 'lucide-react';
import api from '../api.js';

const EMPTY_FORM = { name: '', description: '', patron_saint: '', leader: '', phone_number: '', photo: null };

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
  const [leaderMembers, setLeaderMembers] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [membersError, setMembersError] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [familyUnits, setFamilyUnits] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [loadingFamilyMembers, setLoadingFamilyMembers] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedFamily, setSelectedFamily] = useState("");
  const [selectedLeaderUnit, setSelectedLeaderUnit] = useState("");
  const [selectedLeaderFamily, setSelectedLeaderFamily] = useState("");

  const [leaderFamilies, setLeaderFamilies] = useState([]);
  const [leaderFamilyMembers, setLeaderFamilyMembers] = useState([]);

  const [loadingLeaderFamilies, setLoadingLeaderFamilies] = useState(false);
  const [loadingLeaderMembers, setLoadingLeaderMembers] = useState(false);

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

  const loadMembers = useCallback(() => {
    setMembersLoading(true);
    setMembersError(false);

    familiesService
      .getFamilyMembers()
      .then((res) => {
        if (!mountedRef.current) return;

        setLeaderMembers(res.data.results ?? res.data);
      })
      .catch(() => {
        if (!mountedRef.current) return;

        setMembersError(true);
        toast.error("Could not load the members list for the leader picker");
      })
      .finally(() => {
        if (mountedRef.current) setMembersLoading(false);
      });
  }, []);

  const loadFamilyUnits = async () => {
    try {
      const res = await familiesService.getFamilyUnits();
      setFamilyUnits(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load family units');
      setFamilyUnits([]);
    }
  };

  const loadFamilies = async (unitId) => {
    if (!unitId) {
      setFamilies([]);
      return;
    }

    setLoadingFamilies(true);

    try {
      const res = await familiesService.getFamilies({ family_unit: unitId });
      setFamilies(res.data.results ?? res.data);
    } catch {
      toast.error("Failed to load families");
      setFamilies([]);
    } finally {
      setLoadingFamilies(false);
    }
  };

  const loadFamilyMembers = async (familyId) => {
    if (!familyId) {
      setFamilyMembers([]);
      return;
    }

    setLoadingFamilyMembers(true);

    try {
      const res = await familiesService.getFamilyMembers({
        family: familyId,
      });

      setFamilyMembers(res.data.results ?? res.data);
    } catch {
      toast.error("Failed to load family members");
      setFamilyMembers([]);
    } finally {
      setLoadingFamilyMembers(false);
    }
  };

  const loadLeaderFamilies = async (unitId) => {
    if (!unitId) {
      setLeaderFamilies([]);
      return;
    }

    setLoadingLeaderFamilies(true);

    try {
      const res = await familiesService.getFamilies({
        family_unit: unitId,
      });

      setLeaderFamilies(res.data.results ?? res.data);
    } catch {
      toast.error("Failed to load families");
      setLeaderFamilies([]);
    } finally {
      setLoadingLeaderFamilies(false);
    }
  };

  const loadLeaderFamilyMembers = async (familyId) => {
    if (!familyId) {
      setLeaderFamilyMembers([]);
      return;
    }

    setLoadingLeaderMembers(true);

    try {
      const res = await familiesService.getFamilyMembers({
        family: familyId,
      });

      setLeaderFamilyMembers(res.data.results ?? res.data);
    } catch {
      toast.error("Failed to load members");
      setLeaderFamilyMembers([]);
    } finally {
      setLoadingLeaderMembers(false);
    }
  };

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
    setSelectedLeaderUnit("");
    setSelectedLeaderFamily("");
    setLeaderFamilies([]);
    setLeaderFamilyMembers([]);
    loadFamilyUnits();
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
      photo: null,
    });
    setModalOpen(true);
    setSelectedLeaderUnit("");
    setSelectedLeaderFamily("");
    setLeaderFamilies([]);
    setLeaderFamilyMembers([]);
    loadFamilyUnits();
  };

  const handleFormChange = (e) => {
    if (e.target.type === 'file') {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description || '');
      formData.append('patron_saint', form.patron_saint || '');
      formData.append('leader', form.leader || '');
      formData.append('phone_number', form.phone_number || '');
      if (form.photo instanceof File) {
        formData.append('photo', form.photo);
      }
      if (editingId) {
        await parishService.updateParishGroup(editingId, formData);
        toast.success('Parish group updated');
      } else {
        await parishService.createParishGroup(formData);
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

  // --- Group Members Modal State and Logic ---
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [memberSaving, setMemberSaving] = useState(false);

  const openMembersModal = async (group) => {
    setSelectedGroup(group);
    setMembersModalOpen(true);

    // Reset cascading selection
    setSelectedUnit("");
    setSelectedFamily("");
    setSelectedMember("");

    setFamilies([]);
    setFamilyMembers([]);

    // Load Family Units
    await loadFamilyUnits();

    setGroupMembersLoading(true);

    try {
      const res = await parishService.getParishGroupMembers({
        group: group.id,
      });

      setGroupMembers(res.data.results ?? res.data);
    } catch (err) {
      setGroupMembers([]);
      toast.error("Failed to load group members");
    } finally {
      setGroupMembersLoading(false);
    }
  };

  const closeMembersModal = () => {
    setMembersModalOpen(false);
    setSelectedGroup(null);
    setGroupMembers([]);
    setGroupMembersLoading(false);

    setMemberSearch("");
    setSelectedMember("");
    setSelectedRole("MEMBER");
    setFamilyUnits([]);
    setFamilies([]);
    setFamilyMembers([]);
    setMemberSaving(false);
  };

  const loadGroupMembers = async (groupId) => {
    try {
      const res = await parishService.getParishGroupMembers({
        group: groupId,
      });

      setGroupMembers(res.data.results ?? res.data);
    } catch {
      setGroupMembers([]);
    }
  };

const handleAddMember = async () => {
    if (!selectedMember) {
      toast.error("Please select a member");
      return;
    }

    const alreadyExists = groupMembers.some(
      (m) => Number(m.member) === Number(selectedMember)
    );

    if (alreadyExists) {
      toast.error("This member is already in the group");
      return;
    }

    setMemberSaving(true);

    try {
      await parishService.createParishGroupMember({
        group: selectedGroup.id,
        member: selectedMember,
        role: selectedRole,
        joined_date: new Date().toISOString().split("T")[0],
        is_active: true,
      });

      toast.success("Member added");

      // Reset cascading selection
      setSelectedUnit("");
      setSelectedFamily("");
      setSelectedMember("");
      setSelectedRole("MEMBER");

      setFamilies([]);
      setFamilyMembers([]);

      await loadGroupMembers(selectedGroup.id);
      fetchGroups();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to add member"));
    } finally {
      setMemberSaving(false);
    }
  };

  const filteredMembers = groupMembers.filter((m) =>
    (m.member_name || "")
      .toLowerCase()
      .includes(memberSearch.toLowerCase())
  );


  return (
    <div>
      <style>{`
        @keyframes groupFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .group-fade-in { animation: groupFadeIn 0.35s ease-out both; }
      `}</style>

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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <h3 className="text-sm font-semibold text-ink">
            {hasActiveFilter ? 'No matching parish groups' : 'No parish groups yet'}
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            {hasActiveFilter ? 'Try a different search term.' : 'Create your first parish group to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((row, i) => (
            <div
              key={row.id}
              className="group-fade-in bg-surface border border-border rounded-2xl p-4 hover:border-accent-strong/50 transition-colors flex flex-col"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {row.photo ? (
                    <img
                      src={row.photo}
                      alt="Group"
                      className="h-10 w-10 rounded-xl object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-accent text-accent-ink flex items-center justify-center shrink-0">
                      <UsersRound className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{row.name}</p>
                    <p className="text-xs text-ink-muted truncate">{row.patron_saint || 'No patron saint set'}</p>
                  </div>
                </div>
                <Badge variant={row.is_active ? 'success' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>

              {row.description && (
                <p className="text-xs text-ink-muted line-clamp-2 mb-3">{row.description}</p>
              )}

              <div className="space-y-1.5 mb-3 flex-1 text-xs text-ink-muted">
                <p className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-warning-500" />
                  {row.leader_name || "No president assigned"}
                </p>
                <div className="flex items-center gap-3">
                  {/* bg-accent/25 is a translucent tint, not solid accent — paired
                      with accent-strong (not accent-ink) so the text stays
                      legible in dark mode too. accent-ink is reserved for text
                      sitting on top of FULL-STRENGTH bg-accent only. */}
                  <span className="flex items-center gap-1.5 rounded-lg bg-accent/25 px-2 py-1 text-accent-strong font-medium">
                    <Users className="h-3.5 w-3.5" />
                    {row.member_count ?? 0} {row.member_count === 1 ? 'member' : 'members'}
                  </span>
                  {row.phone_number && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {row.phone_number}
                    </span>
                  )}
                </div>
                <div>
                  <PermissionGate permission={PERMISSIONS.MANAGE_GROUPS}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Users}
                      className="mt-2"
                      onClick={() => openMembersModal(row)}
                    >
                      View Members
                    </Button>
                  </PermissionGate>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <PermissionGate
                  permission={PERMISSIONS.MANAGE_GROUPS}
                  fallback={<span className="text-xs text-ink-muted">—</span>}
                >
                  <Switch checked={row.is_active} onChange={(next) => handleToggleActive(row, next)} label="Active" />
                </PermissionGate>

                <div className="flex items-center gap-1">
                  <PermissionGate permission={PERMISSIONS.MANAGE_GROUPS}>
                    <button
                      onClick={() => openMembersModal(row)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
                      aria-label="Manage members"
                    >
                      <Users className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.MANAGE_GROUPS}>
                    <button onClick={() => openEditModal(row)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGate>
                  <PermissionGate role={ROLES.SUPERADMIN}>
                    <button onClick={() => handleDelete(row)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-danger-50 hover:text-danger-600" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(pageInfo.next || pageInfo.previous) && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => goToPage(pageInfo.previous)}
            disabled={!pageInfo.previous || loading}
            className="text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
          >
            ← Previous
          </button>
          <span className="text-xs text-ink-muted">{pageInfo.count} total</span>
          <button
            onClick={() => goToPage(pageInfo.next)}
            disabled={!pageInfo.next || loading}
            className="text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
          >
            Next →
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">
                {editingId ? 'Edit Parish Group' : 'Create Parish Group'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Group Name</label>
                <Input type="text" name="name" required value={form.name} onChange={handleFormChange} placeholder="e.g. St. Cecilia Choir" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong"
                  placeholder="What this group does..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Patron Saint <span className="text-ink-muted">(optional)</span>
                </label>
                <Input type="text" name="patron_saint" value={form.patron_saint} onChange={handleFormChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Group Photo <span className="text-ink-muted">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  name="photo"
                  className="block w-full text-sm text-ink bg-surface border border-border rounded-xl py-2 px-3 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-accent file:text-accent-ink"
                  onChange={handleFormChange}
                />
              </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-ink">
                    President <span className="text-ink-muted">(optional)</span>
                  </label>

                  {/* Family Unit */}
                  <select
                    className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm"
                    value={selectedLeaderUnit}
                    style={{ color: selectedLeaderUnit ? 'inherit' : undefined }}
                    onChange={async (e) => {
                      const value = e.target.value;

                      setSelectedLeaderUnit(value);
                      setSelectedLeaderFamily("");

                      setLeaderFamilies([]);
                      setLeaderFamilyMembers([]);

                      setForm((prev) => ({
                        ...prev,
                        leader: "",
                      }));

                      await loadLeaderFamilies(value);
                    }}
                  >
                    <option value="" className="text-ink bg-surface">Select Family Unit</option>
                      {familyUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.family_unit_name}
                        </option>
                      ))}
                  </select>

                  {/* Family */}
                  <select
                    className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3"
                    value={selectedLeaderFamily}
                    disabled={!selectedLeaderUnit || loadingLeaderFamilies}
                    onChange={async (e) => {
                      const value = e.target.value;

                      setSelectedLeaderFamily(value);

                      setLeaderFamilyMembers([]);

                      setForm((prev) => ({
                        ...prev,
                        leader: "",
                      }));

                      await loadLeaderFamilyMembers(value);
                    }}
                  >
                    <option value="">
                      {loadingLeaderFamilies
                        ? "Loading families..."
                        : leaderFamilies.length
                        ? "Select Family"
                        : "No families found"}
                    </option>

                    {leaderFamilies.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.house_name}
                      </option>
                    ))}
                  </select>

                  {/* Member */}
                  <select
                    className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3"
                    value={form.leader}
                    disabled={!selectedLeaderFamily || loadingLeaderMembers}
                    onChange={(e) => {
                      const memberId = e.target.value;

                      const selectedMember = leaderFamilyMembers.find(
                        (m) => String(m.id) === String(memberId)
                      );

                      setForm((prev) => ({
                        ...prev,
                        leader: memberId,
                        phone_number:
                          selectedMember?.phone_number ??
                          selectedMember?.phone ??
                          selectedMember?.mobile_number ??
                          selectedMember?.mobile ??
                          prev.phone_number,
                      }));
                    }}
                  >
                    <option value="">
                      {loadingLeaderMembers
                        ? "Loading members..."
                        : leaderFamilyMembers.length
                        ? "Select President"
                        : "No members found"}
                    </option>

                    {leaderFamilyMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Phone Number <span className="text-ink-muted">(optional)</span>
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

      {/* Group Members Modal */}
      {membersModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">
                Group Members{selectedGroup ? ` — ${selectedGroup.name}` : ''}
              </h3>
              <button onClick={closeMembersModal} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 max-h-[75vh] overflow-y-auto">
              <div className="space-y-3 mb-5">
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />

              <select
                className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3"
                value={selectedUnit}
                disabled={memberSaving}
                onChange={async (e) => {
                  const value = e.target.value;

                  setSelectedUnit(value);
                  setSelectedFamily("");
                  setSelectedMember("");

                  setFamilies([]);
                  setFamilyMembers([]);

                  await loadFamilies(value);
                }}
              >
                <option value="">Select Family Unit</option>

                {familyUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3"
                value={selectedFamily}
                disabled={!selectedUnit || loadingFamilies}
                onChange={async (e) => {
                  const value = e.target.value;

                  setSelectedFamily(value);
                  setSelectedMember("");

                  setFamilyMembers([]);

                  await loadFamilyMembers(value);
                }}
              >
                <option value="">
                  {loadingFamilies
                    ? "Loading families..."
                    : families.length
                      ? "Select Family"
                      : "No families found"}
                </option>

                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.house_name}
                  </option>
                ))}
              </select>

              <select
                className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3"
                value={selectedMember}
                disabled={!selectedFamily || memberSaving || loadingFamilyMembers}
                onChange={(e) => setSelectedMember(e.target.value)}
              >
                <option value="">
                  {loadingFamilyMembers
                    ? "Loading members..."
                    : familyMembers.length
                      ? "Select Member"
                      : "No members found"}
                </option>

                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>

              <select
                className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3"
                value={selectedRole}
                disabled={memberSaving}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="MEMBER">Member</option>
                <option value="COORDINATOR">Coordinator</option>
                <option value="SECRETARY">Secretary</option>
                <option value="TREASURER">Treasurer</option>
                <option value="LEADER">Leader</option>
                <option value="PRESIDENT">President</option>
              </select>

              <Button
                onClick={handleAddMember}
                loading={memberSaving}
                disabled={memberSaving || !selectedMember}
                icon={Plus}
              >
                Add Member
              </Button>

            </div>
              {groupMembersLoading ? (
                <div className="py-12 text-center text-ink-muted">Loading members…</div>
              ) : filteredMembers.length === 0 ? (
                  <div className="py-12 text-center text-ink-muted">
                    {memberSearch
                      ? "No matching members found."
                      : "No members in this parish group. Add the first member above."}
                  </div>
                ) : (
                <ul className="divide-y divide-border">
                  {filteredMembers.map((member) => (
                      <li key={member.id} className="flex items-center gap-3 py-3">
                        {member.member_photo ? (
                          <img
                            src={member.member_photo}
                            alt=""
                            className="h-10 w-10 rounded-xl object-cover border border-border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-accent text-accent-ink flex items-center justify-center">
                            <UsersRound className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-ink truncate">
                            {member.member_name || member.member_full_name || 'Unnamed Member'}
                          </div>
                          <div className="text-xs text-ink-muted flex items-center gap-2">
                            {/* Role select */}
                            <select
                              className="rounded-lg border border-border bg-surface text-ink px-2 py-0.5 text-xs"
                              value={member.role || 'MEMBER'}
                              onChange={async (e) => {
                                try {
                                  await parishService.updateParishGroupMember(member.id, { role: e.target.value });
                                  await loadGroupMembers(selectedGroup.id);
                                  fetchGroups();
                                } catch {
                                  toast.error('Failed to update role');
                                }
                              }}
                            >
                              <option value="MEMBER">Member</option>
                              <option value="LEADER">Leader</option>
                              <option value="PRESIDENT">President</option>
                              <option value="SECRETARY">Secretary</option>
                              <option value="TREASURER">Treasurer</option>
                              <option value="COORDINATOR">Coordinator</option>
                            </select>
                            {member.joined_date && (
                              <>
                                <span>·</span>
                                <span>
                                  Joined{' '}
                                  {new Date(member.joined_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Switch for is_active */}
                        <Switch
                          checked={member.is_active}
                          onChange={async (next) => {
                            try {
                              await parishService.updateParishGroupMember(member.id, {
                                is_active: next,
                              });

                              await loadGroupMembers(selectedGroup.id);
                              fetchGroups();
                            } catch {
                              toast.error('Failed to update member status');
                            }
                          }}
                          label=""
                          className="ml-2"
                        />
                        {/* Delete icon button */}
                        <button
                          className="ml-2 h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-danger-50 hover:text-danger-600"
                          aria-label="Remove member"
                          onClick={async () => {
                            if (!window.confirm('Remove this member from the group?')) return;
                            try {
                              await parishService.deleteParishGroupMember(member.id);
                              await loadGroupMembers(selectedGroup.id);
                              fetchGroups();
                              toast.success('Member removed');
                            } catch (err) {
                              toast.error(extractErrorMessage(err, 'Failed to remove member'));
                            }
                          }}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              <div className="flex justify-end pt-4">
                <Button variant="secondary" onClick={closeMembersModal}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}