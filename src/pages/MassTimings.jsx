 import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { parishService } from '../services.js';
import { PageHeader, DataTable, Badge, Switch, Button, Input } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import api from '../api.js';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const EMPTY_FORM = { day: 'SUNDAY', language: 'Malayalam', mass_time: '', description: '' };

function extractErrorMessage(err, fallback = 'Failed to save mass timing') {
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

export default function MassTimings() {
  const [timings, setTimings] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchTimings = useCallback((url = null) => {
    setLoading(true);
    const request = url
      ? api.get(url)
      : parishService.getMassTimings(dayFilter ? { day: dayFilter } : undefined);

    request
      .then((res) => {
        const data = res.data;
        if (data.results) {
          setTimings(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setTimings(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch(() => toast.error('Could not load mass timings'))
      .finally(() => setLoading(false));
  }, [dayFilter]);

  useEffect(() => {
    fetchTimings();
  }, [fetchTimings]);

  const goToPage = (url) => {
    if (url) fetchTimings(url);
  };

  const handleToggleActive = async (row, nextValue) => {
    // Optimistic update for instant feedback, kept exactly as before...
    setTimings((prev) => prev.map((t) => (t.id === row.id ? { ...t, is_active: nextValue } : t)));
    try {
      await parishService.updateMassTiming(row.id, { is_active: nextValue });
      // ...then refetch to confirm the change is real and pick up any
      // server-side derived fields, rather than trusting the optimistic
      // patch as final.
      fetchTimings();
    } catch {
      setTimings((prev) => prev.map((t) => (t.id === row.id ? { ...t, is_active: row.is_active } : t)));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete the ${row.day_display} ${row.mass_time} mass timing?`)) return;
    try {
      await parishService.deleteMassTiming(row.id);
      toast.success('Mass timing deleted');
      fetchTimings();
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
      day: row.day,
      language: row.language,
      mass_time: row.mass_time,
      description: row.description || '',
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
      if (editingId) {
        await parishService.updateMassTiming(editingId, form);
        toast.success('Mass timing updated');
      } else {
        await parishService.createMassTiming(form);
        toast.success('Mass timing added');
      }
      setModalOpen(false);
      fetchTimings();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'day_display', header: 'Day', render: (row) => <Badge variant="primary">{row.day_display}</Badge> },
    { key: 'mass_time', header: 'Time' },
    { key: 'language', header: 'Language' },
    { key: 'description', header: 'Description', render: (row) => row.description || '—' },
    {
      key: 'is_active',
      header: 'Published',
      render: (row) => (
        <PermissionGate
          permission={PERMISSIONS.MANAGE_PARISH}
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
        title="Mass Timings"
        description="Manage the parish's recurring mass schedule."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_PARISH}>
            <Button icon={Plus} onClick={openAddModal}>
              Add Mass Timing
            </Button>
          </PermissionGate>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <select
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="">All days</option>
          {DAYS.map((day) => (
            <option key={day} value={day}>
              {day.charAt(0) + day.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={timings}
        loading={loading}
        emptyTitle="No mass timings yet"
        emptyDescription="Add your first recurring mass schedule to get started."
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <PermissionGate permission={PERMISSIONS.MANAGE_PARISH}>
              <button
                onClick={() => openEditModal(row)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </PermissionGate>
            <PermissionGate role={ROLES.SUPERADMIN}>
              <button
                onClick={() => handleDelete(row)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-danger-50 hover:text-danger-600"
                aria-label="Delete"
              >
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
                {editingId ? 'Edit Mass Timing' : 'Add Mass Timing'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Day</label>
                <select
                  name="day"
                  value={form.day}
                  onChange={handleFormChange}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm"
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                <Input
                  type="time"
                  name="mass_time"
                  required
                  value={form.mass_time}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                <Input
                  type="text"
                  name="language"
                  required
                  value={form.language}
                  onChange={handleFormChange}
                  placeholder="Malayalam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <Input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="e.g. Novena Mass"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={saving}>
                  {editingId ? 'Save Changes' : 'Add Timing'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}