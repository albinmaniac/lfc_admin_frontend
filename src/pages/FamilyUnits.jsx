import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Home, Users, Crown, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { familiesService } from '../services.js';
import { PageHeader, Badge, Switch, Button, Input, SummaryCard } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import api from '../api.js';

const EMPTY_FORM = { family_unit_name: '', saint: '', phone_number: '', is_active: true };

export default function FamilyUnits() {
  const [units, setUnits] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [leadershipUnit, setLeadershipUnit] = useState(null);
  const [leadershipRole, setLeadershipRole] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitFamilies, setUnitFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [leadershipLoading, setLeadershipLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const abortRef = useRef(null);

  const fetchUnits = useCallback((url = null) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = {};
    if (!url) {
      if (search) params.search = search;
      if (statusFilter) params.active = statusFilter;
    }

    const request = url
      ? api.get(url, { signal: controller.signal })
      : familiesService.getFamilyUnits(params, { signal: controller.signal });

    request
      .then((res) => {
        if (!mountedRef.current) return;
        const data = res.data;
        if (data.results) {
          setUnits(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setUnits(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        toast.error('Could not load family units');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchUnits(), 300);
    return () => clearTimeout(timeout);
  }, [fetchUnits]);

  const goToPage = (url) => {
    if (url) fetchUnits(url);
  };

  const handleToggleActive = async (row, nextValue) => {
    setUnits((prev) => prev.map((u) => (u.id === row.id ? { ...u, is_active: nextValue } : u)));
    try {
      await familiesService.updateFamilyUnit(row.id, { is_active: nextValue });
      fetchUnits();
    } catch {
      setUnits((prev) => prev.map((u) => (u.id === row.id ? { ...u, is_active: row.is_active } : u)));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.family_unit_name}"? This cannot be undone.`)) return;
    try {
      await familiesService.deleteFamilyUnit(row.id);
      toast.success('Family unit deleted');
      fetchUnits();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete — it may still have families assigned');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setEditingUnit(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setEditingUnit(row);
    setForm({
      family_unit_name: row.family_unit_name,
      saint: row.saint,
      phone_number: row.phone_number || '',
      is_active: row.is_active,
    });
    setPhotoFile(null);
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (photoFile) formData.append('saint_photo', photoFile);

      if (editingId) {
        await familiesService.updateFamilyUnit(editingId, formData);
        toast.success('Family unit updated');
      } else {
        await familiesService.createFamilyUnit(formData);
        toast.success('Family unit created');
      }
      setModalOpen(false);
      fetchUnits();
    } catch (err) {
      const data = err.response?.data;
      toast.error(data?.family_unit_name?.[0] || data?.saint?.[0] || data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openLeadershipPicker = async (unit, role) => {
    setLeadershipUnit(unit);
    setLeadershipRole(role);
    setSelectedFamily(null);
    setFamilyMembers([]);
    setLeadershipLoading(true);
    try {
      const res = await familiesService.getFamilies({ family_unit: unit.id });
      if (!mountedRef.current) return;
      setUnitFamilies(res.data.results ?? res.data);
    } catch {
      toast.error('Could not load families for this unit');
    } finally {
      if (mountedRef.current) setLeadershipLoading(false);
    }
  };

  const selectFamily = async (family) => {
    setSelectedFamily(family);
    setLeadershipLoading(true);
    try {
      const res = await familiesService.getFamilyMembers({ family: family.id });
      if (!mountedRef.current) return;
      setFamilyMembers(res.data.results ?? res.data);
    } catch {
      toast.error('Could not load members for this family');
    } finally {
      if (mountedRef.current) setLeadershipLoading(false);
    }
  };

  const assignLeader = async (member) => {
    setAssigning(true);
    try {
      const field = leadershipRole === 'president' ? 'president' : 'secretary';
      const res = await familiesService.updateFamilyUnit(leadershipUnit.id, { [field]: member.id });
      setEditingUnit(res.data);
      toast.success(`${leadershipRole === 'president' ? 'President' : 'Secretary'} assigned`);
      closeLeadershipPicker();
      fetchUnits();
    } catch {
      toast.error('Failed to assign');
    } finally {
      setAssigning(false);
    }
  };

  const closeLeadershipPicker = () => {
    setLeadershipUnit(null);
    setLeadershipRole(null);
    setUnitFamilies([]);
    setSelectedFamily(null);
    setFamilyMembers([]);
  };

  const activeCountOnPage = units.filter((u) => u.is_active).length;
  const totalFamiliesOnPage = units.reduce((sum, u) => sum + (u.family_count || 0), 0);

  const hasActiveFilter = Boolean(search || statusFilter);

  return (
    <div>
      <style>{`
        @keyframes unitFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .unit-fade-in { animation: unitFadeIn 0.35s ease-out both; }
      `}</style>

      <PageHeader
        title="Family Units"
        description="Manage geographical parish groupings and their leadership."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_FAMILY_UNITS}>
            <Button icon={Plus} onClick={openAddModal}>Create Family Unit</Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={Home} title="Total Units" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={Home} title="Active Units (this page)" value={activeCountOnPage} loading={loading} />
        <SummaryCard icon={Users} title="Total Families (this page)" value={totalFamiliesOnPage} loading={loading} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="Search by unit name or saint..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <PermissionGate permission={PERMISSIONS.MANAGE_FAMILY_UNITS}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm"
          >
            <option value="">All units</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </PermissionGate>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : units.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <h3 className="text-sm font-semibold text-ink">
            {hasActiveFilter ? 'No matching family units' : 'No family units yet'}
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            {hasActiveFilter ? 'Try a different search term or filter.' : 'Create your first family unit to start organizing families.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {units.map((row, i) => (
            <div
              key={row.id}
              className="unit-fade-in bg-surface border border-border rounded-2xl p-4 hover:border-accent-strong/50 transition-colors flex flex-col"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {row.saint_photo_url ? (
                    <img src={row.saint_photo_url} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-accent text-accent-ink flex items-center justify-center shrink-0">
                      <Home className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{row.family_unit_name}</p>
                    <p className="text-xs text-ink-muted truncate">{row.saint}</p>
                  </div>
                </div>
                <Badge variant={row.is_active ? 'success' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 rounded-xl bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent-ink">
                  <Users className="h-3.5 w-3.5" />
                  {row.family_count ?? 0} {row.family_count === 1 ? 'family' : 'families'}
                </div>
              </div>

              <div className="space-y-1.5 mb-3 flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <Crown className="h-3.5 w-3.5 text-warning-500" /> President
                  </span>
                  <PermissionGate permission={PERMISSIONS.MANAGE_FAMILY_UNITS} fallback={<span className="text-ink font-medium">{row.president_name || '—'}</span>}>
                    <button onClick={() => openLeadershipPicker(row, 'president')} className="font-medium text-accent-strong hover:underline">
                      {row.president_name || 'Assign...'}
                    </button>
                  </PermissionGate>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <Crown className="h-3.5 w-3.5 text-ink-muted" /> Secretary
                  </span>
                  <PermissionGate permission={PERMISSIONS.MANAGE_FAMILY_UNITS} fallback={<span className="text-ink font-medium">{row.secretary_name || '—'}</span>}>
                    <button onClick={() => openLeadershipPicker(row, 'secretary')} className="font-medium text-accent-strong hover:underline">
                      {row.secretary_name || 'Assign...'}
                    </button>
                  </PermissionGate>
                </div>
                {row.phone_number && (
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Phone className="h-3.5 w-3.5" /> {row.phone_number}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <PermissionGate
                  permission={PERMISSIONS.MANAGE_FAMILY_UNITS}
                  fallback={<span className="text-xs text-ink-muted">—</span>}
                >
                  <Switch checked={row.is_active} onChange={(next) => handleToggleActive(row, next)} label="Active" />
                </PermissionGate>

                <div className="flex items-center gap-1">
                  <PermissionGate permission={PERMISSIONS.MANAGE_FAMILY_UNITS}>
                    <button onClick={() => openEditModal(row)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-accent/20 hover:text-accent-ink" aria-label="Edit">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">{editingId ? 'Edit Family Unit' : 'Create Family Unit'}</h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Unit Name</label>
                <Input type="text" name="family_unit_name" required value={form.family_unit_name} onChange={handleFormChange} placeholder="e.g. St. Jude's East" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Patron Saint</label>
                <Input type="text" name="saint" required value={form.saint} onChange={handleFormChange} placeholder="e.g. St. Jude" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Phone Number <span className="text-ink-muted">(optional)</span>
                </label>
                <Input type="text" name="phone_number" value={form.phone_number} onChange={handleFormChange} placeholder="+91 98200 12345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Saint Photo <span className="text-ink-muted">(optional)</span>
                </label>
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} className="text-sm text-ink" />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} className="rounded border-border accent-accent-strong" />
                Active
              </label>

              {editingId ? (
                <div className="space-y-2 border border-border rounded-xl p-3 bg-accent/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-ink-muted">President</p>
                      <p className="text-sm font-medium text-ink">{editingUnit?.president_name || 'Not assigned'}</p>
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => openLeadershipPicker(editingUnit, 'president')}>
                      {editingUnit?.president_name ? 'Change' : 'Assign'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div>
                      <p className="text-xs text-ink-muted">Secretary</p>
                      <p className="text-sm font-medium text-ink">{editingUnit?.secretary_name || 'Not assigned'}</p>
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => openLeadershipPicker(editingUnit, 'secretary')}>
                      {editingUnit?.secretary_name ? 'Change' : 'Assign'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-muted bg-surface-2 rounded-xl px-3 py-2">
                  President and Secretary can be assigned after this unit is created — save it first, then reopen it for editing.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Save Changes' : 'Create Unit'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {leadershipUnit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                {selectedFamily && (
                  <button onClick={() => { setSelectedFamily(null); setFamilyMembers([]); }} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <h3 className="text-base font-semibold text-ink flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-warning-500" />
                  Assign {leadershipRole === 'president' ? 'President' : 'Secretary'}
                </h3>
              </div>
              <button onClick={closeLeadershipPicker} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {!selectedFamily ? (
                <>
                  <p className="text-xs text-ink-muted mb-3">Step 1 — choose a family in {leadershipUnit.family_unit_name}</p>
                  {leadershipLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 bg-surface-2 rounded-xl animate-pulse" />)}
                    </div>
                  ) : unitFamilies.length === 0 ? (
                    <p className="text-sm text-ink-muted text-center py-8">This unit has no families yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {unitFamilies.map((f) => (
                        <button key={f.id} onClick={() => selectFamily(f)} className="w-full text-left px-3 py-2.5 rounded-xl border border-border hover:bg-accent/15 hover:border-accent-strong/40 transition-colors text-sm">
                          <p className="font-medium text-ink">{f.house_name}</p>
                          <p className="text-xs text-ink-muted">Ward {f.ward_number}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-ink-muted mb-3">Step 2 — choose a member from {selectedFamily.house_name}</p>
                  {leadershipLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-11 bg-surface-2 rounded-xl animate-pulse" />)}
                    </div>
                  ) : familyMembers.length === 0 ? (
                    <p className="text-sm text-ink-muted text-center py-8">This family has no members yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {familyMembers.map((m) => (
                        <button key={m.id} onClick={() => assignLeader(m)} disabled={assigning} className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl border border-border hover:bg-accent/15 hover:border-accent-strong/40 transition-colors text-sm disabled:opacity-50">
                          <div className="h-8 w-8 rounded-full bg-accent text-accent-ink flex items-center justify-center text-xs font-semibold shrink-0">
                            {m.first_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-ink">{m.first_name} {m.last_name}</p>
                            <p className="text-xs text-ink-muted">{m.relationship_display}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}