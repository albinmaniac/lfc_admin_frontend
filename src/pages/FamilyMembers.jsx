import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { familiesService } from '../services.js';
import { PageHeader, DataTable, Badge, Switch, Button, Input, SummaryCard } from '../components.jsx';
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

const EMPTY_FORM = {
  family: '', first_name: '', last_name: '', baptism_name: '',
  gender: 'MALE', relationship: 'SON', date_of_birth: '',
  phone_number: '', email: '', occupation: '', is_family_head: false,
  is_active: true, // explicit — multipart requests treat an omitted boolean
  // as False, not the model default, so this must always be sent.
};

// Pulls the first validation message out of a DRF error response, whatever
// field it's on, instead of only checking a couple hardcoded field names.
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

  // Reflects only the current page — pageInfo.count (Total Members card) is
  // the accurate figure regardless of pagination.
  const headCountOnPage = members.filter((m) => m.is_family_head).length;
  const hasActiveFilter = Boolean(search || familyFilter);

  const columns = [
    {
      key: 'first_name',
      header: 'Name',
      render: (row) => (
        <span className="font-medium text-gray-900 flex items-center gap-1.5">
          {row.first_name} {row.last_name}
          {row.is_family_head && <Star className="h-3.5 w-3.5 text-warning-500 fill-warning-500" />}
        </span>
      ),
    },
    { key: 'family_name', header: 'Family' },
    { key: 'relationship_display', header: 'Relationship' },
    { key: 'gender_display', header: 'Gender' },
    { key: 'phone_number', header: 'Phone', render: (row) => row.phone_number || '—' },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <PermissionGate
          permission={PERMISSIONS.MANAGE_FAMILY_MEMBERS}
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
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="">All families</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.house_name}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={members}
        loading={loading}
        emptyTitle={hasActiveFilter ? 'No matching members' : 'No family members yet'}
        emptyDescription={
          hasActiveFilter
            ? 'Try a different search term or filter.'
            : 'Add your first family member to get started.'
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <PermissionGate permission={PERMISSIONS.MANAGE_FAMILY_MEMBERS}>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Edit Family Member' : 'Add Family Member'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Family</label>
                <select name="family" required value={form.family} onChange={handleFormChange} className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm">
                  <option value="">Select a family...</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>{f.house_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  <Input type="text" name="first_name" required value={form.first_name} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  <Input type="text" name="last_name" value={form.last_name} onChange={handleFormChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Baptism Name</label>
                <Input type="text" name="baptism_name" value={form.baptism_name} onChange={handleFormChange} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleFormChange} className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm">
                    {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship</label>
                  <select name="relationship" value={form.relationship} onChange={handleFormChange} className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm">
                    {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                <Input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleFormChange} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                  <Input type="text" name="phone_number" value={form.phone_number} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <Input type="email" name="email" value={form.email} onChange={handleFormChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Occupation</label>
                <Input type="text" name="occupation" value={form.occupation} onChange={handleFormChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo</label>
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} className="text-sm" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_family_head" checked={form.is_family_head} onChange={handleFormChange} className="rounded border-gray-300" />
                  This member is the head of the family
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} className="rounded border-gray-300" />
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