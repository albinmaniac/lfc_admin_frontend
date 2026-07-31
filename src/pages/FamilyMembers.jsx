import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { familiesService } from '../services.js';
import { PageHeader, Badge, Switch, Button, Input, SummaryCard } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import { UserCircle, Star } from 'lucide-react';
import api from '../api.js';

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const RELATIONSHIPS = [
  'FATHER', 'MOTHER', 'HUSBAND', 'WIFE', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER',
  'GRANDFATHER', 'GRANDMOTHER', 'GRANDSON', 'GRANDDAUGHTER', 'SON_IN_LAW',
  'DAUGHTER_IN_LAW', 'NEPHEW', 'NIECE', 'OTHER',
];

const OPTIONAL_FIELDS = ['last_name', 'baptism_name', 'date_of_birth', 'phone_number', 'email', 'occupation'];

const EMPTY_FORM = {
  family: '', first_name: '', last_name: '', baptism_name: '',
  gender: 'MALE', relationship: 'SON', date_of_birth: '',
  phone_number: '', email: '', occupation: '', is_family_head: false,
  is_active: true,
};

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

export default function FamilyMembers() {
  const [members, setMembers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    familiesService
      .getFamilies()
      .then((res) => {
        if (mountedRef.current) setFamilies(res.data.results ?? res.data);
      })
      .catch(() => {});
  }, []);

  const abortRef = useRef(null);

  const fetchMembers = useCallback((url = null) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = {};
    if (!url) {
      if (search) params.search = search;
      if (familyFilter) params.family = familyFilter;
    }

    const request = url
      ? api.get(url, { signal: controller.signal })
      : familiesService.getFamilyMembers(params, { signal: controller.signal });

    request
      .then((res) => {
        if (!mountedRef.current) return;
        const data = res.data;
        if (data.results) {
          setMembers(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setMembers(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        toast.error('Could not load family members');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, familyFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchMembers(), 300);
    return () => clearTimeout(timeout);
  }, [fetchMembers]);

  const goToPage = (url) => {
    if (url) fetchMembers(url);
  };

  const handleToggleActive = async (row, nextValue) => {
    setMembers((prev) => prev.map((m) => (m.id === row.id ? { ...m, is_active: nextValue } : m)));
    try {
      await familiesService.updateFamilyMember(row.id, { is_active: nextValue });
      fetchMembers();
    } catch {
      setMembers((prev) => prev.map((m) => (m.id === row.id ? { ...m, is_active: row.is_active } : m)));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.first_name} ${row.last_name}?`)) return;
    try {
      await familiesService.deleteFamilyMember(row.id);
      toast.success('Family member deleted');
      fetchMembers();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete'));
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      family: row.family,
      first_name: row.first_name,
      last_name: row.last_name || '',
      baptism_name: row.baptism_name || '',
      gender: row.gender,
      relationship: row.relationship,
      date_of_birth: row.date_of_birth || '',
      phone_number: row.phone_number || '',
      email: row.email || '',
      occupation: row.occupation || '',
      is_family_head: row.is_family_head,
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
      Object.entries(form).forEach(([key, value]) => {
        if (OPTIONAL_FIELDS.includes(key)) {
          formData.append(key, value ?? '');
          return;
        }
        if (value !== '' && value !== null) formData.append(key, value);
      });
      if (photoFile) formData.append('photo', photoFile);

      if (editingId) {
        await familiesService.updateFamilyMember(editingId, formData);
        toast.success('Family member updated');
      } else {
        await familiesService.createFamilyMember(formData);
        toast.success('Family member added');
      }
      setModalOpen(false);
      fetchMembers();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const headCountOnPage = members.filter((m) => m.is_family_head).length;
  const hasActiveFilter = Boolean(search || familyFilter);

  return (
    <div>
      <style>{`
        @keyframes memberFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .member-fade-in { animation: memberFadeIn 0.35s ease-out both; }
      `}</style>

      <PageHeader
        title="Family Members"
        description="Manage individual members within each family."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_FAMILY_MEMBERS}>
            <Button icon={Plus} onClick={openAddModal}>Add Member</Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard icon={UserCircle} title="Total Members" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={Star} title="Family Heads (this page)" value={headCountOnPage} loading={loading} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong"
        >
          <option value="">All families</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.house_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <h3 className="text-sm font-semibold text-ink">
            {hasActiveFilter ? 'No matching members' : 'No family members yet'}
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            {hasActiveFilter ? 'Try a different search term or filter.' : 'Add your first family member to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((row, i) => (
            <div
              key={row.id}
              className="member-fade-in bg-surface border border-border rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col"
              style={{ animationDelay: `${i * 35}ms` }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {row.photo_url ? (
                    <img src={row.photo_url} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-accent text-accent-ink flex items-center justify-center text-sm font-semibold shrink-0">
                      {row.first_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate flex items-center gap-1.5">
                      {row.first_name} {row.last_name}
                      {row.is_family_head && <Star className="h-3.5 w-3.5 text-warning-500 fill-warning-500 shrink-0" />}
                    </p>
                    <p className="text-xs text-ink-muted truncate">{row.family_name}</p>
                  </div>
                </div>
                <Badge variant={row.is_active ? 'success' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>

              <div className="flex items-center gap-1.5 mb-3">
                <Badge variant="gray">{row.relationship_display}</Badge>
                <Badge variant="gray">{row.gender_display}</Badge>
              </div>

              <div className="space-y-1 mb-3 flex-1 text-xs text-ink-muted">
                {row.phone_number && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-ink-muted" /> {row.phone_number}
                  </p>
                )}
                {row.email && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 text-ink-muted shrink-0" /> <span className="truncate">{row.email}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <PermissionGate
                  permission={PERMISSIONS.MANAGE_FAMILY_MEMBERS}
                  fallback={<span className="text-xs text-ink-muted">—</span>}
                >
                  <Switch checked={row.is_active} onChange={(next) => handleToggleActive(row, next)} label="Active" />
                </PermissionGate>

                <div className="flex items-center gap-1">
                  <PermissionGate permission={PERMISSIONS.MANAGE_FAMILY_MEMBERS}>
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
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">
                {editingId ? 'Edit Family Member' : 'Add Family Member'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Family</label>
                <select name="family" required value={form.family} onChange={handleFormChange} className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm">
                  <option value="">Select a family...</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{f.house_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">First Name</label>
                  <Input type="text" name="first_name" required value={form.first_name} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Last Name</label>
                  <Input type="text" name="last_name" value={form.last_name} onChange={handleFormChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Baptism Name</label>
                <Input type="text" name="baptism_name" value={form.baptism_name} onChange={handleFormChange} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleFormChange} className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm">
                    {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Relationship</label>
                  <select name="relationship" value={form.relationship} onChange={handleFormChange} className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm">
                    {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Date of Birth</label>
                <Input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleFormChange} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Phone</label>
                  <Input type="text" name="phone_number" value={form.phone_number} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                  <Input type="email" name="email" value={form.email} onChange={handleFormChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Occupation</label>
                <Input type="text" name="occupation" value={form.occupation} onChange={handleFormChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} className="text-sm text-ink" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_family_head" checked={form.is_family_head} onChange={handleFormChange} className="rounded border-border" />
                  This member is the head of the family
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} className="rounded border-border" />
                  Active
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Save Changes' : 'Add Member'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}