import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { familiesService } from '../services.js';
import { PageHeader, DataTable, Badge, Switch, Button, Input, SummaryCard } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import { Users, Home } from 'lucide-react';
import api from '../api.js';

const EMPTY_FORM = { family_unit: '', house_name: '', address: '', ward_number: '' };

// Pulls the first validation message out of a DRF error response, whatever
// field it's on — not just the couple of fields this form happened to
// hardcode before. Falls back to a generic message if the shape is
// unexpected.
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

export default function Families() {
  const [families, setFamilies] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');

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

  useEffect(() => {
    familiesService
      .getFamilyUnits()
      .then((res) => {
        if (mountedRef.current) setUnits(res.data.results ?? res.data);
      })
      .catch(() => {});
  }, []);

  const abortRef = useRef(null);

  const fetchFamilies = useCallback((url = null) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = {};
    if (!url) {
      if (search) params.search = search;
      if (unitFilter) params.family_unit = unitFilter;
    }

    const request = url
      ? api.get(url, { signal: controller.signal })
      : familiesService.getFamilies(params, { signal: controller.signal });

    request
      .then((res) => {
        if (!mountedRef.current) return;
        const data = res.data;
        if (data.results) {
          setFamilies(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setFamilies(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        toast.error('Could not load families');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, unitFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchFamilies(), 300);
    return () => clearTimeout(timeout);
  }, [fetchFamilies]);

  const goToPage = (url) => {
    if (url) fetchFamilies(url);
  };

  const handleToggleActive = async (row, nextValue) => {
    setFamilies((prev) => prev.map((f) => (f.id === row.id ? { ...f, is_active: nextValue } : f)));
    try {
      await familiesService.updateFamily(row.id, { is_active: nextValue });
      fetchFamilies();
    } catch {
      setFamilies((prev) => prev.map((f) => (f.id === row.id ? { ...f, is_active: row.is_active } : f)));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.house_name}"? This cannot be undone.`)) return;
    try {
      await familiesService.deleteFamily(row.id);
      toast.success('Family deleted');
      fetchFamilies();
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
      family_unit: row.family_unit,
      house_name: row.house_name,
      address: row.address,
      ward_number: row.ward_number,
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
      const payload = { ...form, ward_number: Number(form.ward_number), family_unit: Number(form.family_unit) };
      if (editingId) {
        await familiesService.updateFamily(editingId, payload);
        toast.success('Family updated');
      } else {
        await familiesService.createFamily(payload);
        toast.success('Family added');
      }
      setModalOpen(false);
      fetchFamilies();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // NOTE: reflects only the current page, not the whole dataset — an
  // honest limitation without a dedicated stats endpoint. `pageInfo.count`
  // (Total Families card) is the one number here accurate regardless of
  // pagination.
  const activeCountOnPage = families.filter((f) => f.is_active).length;
  const hasActiveFilter = Boolean(search || unitFilter);

  const columns = [
    { key: 'house_name', header: 'House Name', render: (row) => <span className="font-medium text-gray-900">{row.house_name}</span> },
    { key: 'family_unit_name', header: 'Family Unit' },
    { key: 'family_head_name', header: 'Head of Family', render: (row) => row.family_head_name || '—' },
    { key: 'family_phone_number', header: 'Phone', render: (row) => row.family_phone_number || '—' },
    { key: 'ward_number', header: 'Ward' },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <PermissionGate
          permission={PERMISSIONS.MANAGE_FAMILIES}
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
        title="Families"
        description="Manage family households and their addresses."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_FAMILIES}>
            <Button icon={Plus} onClick={openAddModal}>
              Add Family
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard icon={Home} title="Total Families" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={Users} title="Active Families (this page)" value={activeCountOnPage} loading={loading} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="Search by house name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="">All family units</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.family_unit_name}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={families}
        loading={loading}
        emptyTitle={hasActiveFilter ? 'No matching families' : 'No families yet'}
        emptyDescription={
          hasActiveFilter
            ? 'Try a different search term or filter.'
            : 'Add your first family to get started.'
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <PermissionGate permission={PERMISSIONS.MANAGE_FAMILIES}>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Edit Family' : 'Add Family'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Family Unit</label>
                <select
                  name="family_unit"
                  required
                  value={form.family_unit}
                  onChange={handleFormChange}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm"
                >
                  <option value="">Select a unit...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.family_unit_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">House Name</label>
                <Input type="text" name="house_name" required value={form.house_name} onChange={handleFormChange} placeholder="e.g. Anderson House" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <textarea
                  name="address"
                  required
                  value={form.address}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                  placeholder="Full address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ward Number</label>
                <Input type="number" name="ward_number" required min={1} value={form.ward_number} onChange={handleFormChange} placeholder="e.g. 4" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Save Changes' : 'Add Family'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}