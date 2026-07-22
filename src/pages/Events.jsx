import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { communicationService, familiesService } from '../services.js';
import { PageHeader, DataTable, Badge, Switch, Button, Input, SummaryCard } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import { CalendarDays } from 'lucide-react';
import api from '../api.js';

const EVENT_TYPES = [
  'PARISH_FEAST', 'SAINT_DAY_CELEBRATION', 'HOLY_MASS', 'RETREAT', 'CONVENTION',
  'PRAYER_MEETING', 'FAMILY_UNIT_MEETING', 'YOUTH_MEETING', 'CATECHISM_PROGRAM',
  'NOVENA', 'PILGRIMAGE', 'CHARITY_PROGRAM', 'OTHER',
];

const STATUS_BADGE = {
  UPCOMING: 'primary',
  ONGOING: 'success',
  COMPLETED: 'gray',
};

const EMPTY_FORM = {
  title: '', event_type: 'PARISH_FEAST', family_unit: '', description: '',
  venue: '', start_datetime: '', end_datetime: '', is_public: true, is_featured: false,
};

const toLocalInput = (isoString) => (isoString ? isoString.slice(0, 16) : '');

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

export default function Events() {
  const [events, setEvents] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'true', 'false' — requires backend admin-view patch above

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState(null);
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

  const fetchEvents = useCallback((url = null) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = {};
    if (!url) {
      if (search) params.search = search;
      if (typeFilter) params.event_type = typeFilter;
      if (statusFilter) params.active = statusFilter;
    }

    const request = url
      ? api.get(url, { signal: controller.signal })
      : communicationService.getEvents(params, { signal: controller.signal });

    request
      .then((res) => {
        if (!mountedRef.current) return;
        const data = res.data;
        if (data.results) {
          setEvents(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setEvents(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        toast.error('Could not load events');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchEvents(), 300);
    return () => clearTimeout(timeout);
  }, [fetchEvents]);

  const goToPage = (url) => {
    if (url) fetchEvents(url);
  };

  const handleToggleActive = async (row, nextValue) => {
    setEvents((prev) => prev.map((e) => (e.id === row.id ? { ...e, is_active: nextValue } : e)));
    try {
      await communicationService.updateEvent(row.id, { is_active: nextValue });
      fetchEvents();
    } catch {
      setEvents((prev) => prev.map((e) => (e.id === row.id ? { ...e, is_active: row.is_active } : e)));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    try {
      await communicationService.deleteEvent(row.id);
      toast.success('Event deleted');
      fetchEvents();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete'));
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      event_type: row.event_type,
      family_unit: row.family_unit || '',
      description: row.description,
      venue: row.venue,
      start_datetime: toLocalInput(row.start_datetime),
      end_datetime: toLocalInput(row.end_datetime),
      is_public: row.is_public,
      is_featured: row.is_featured,
    });
    setCoverFile(null);
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (form.is_featured && !form.is_public) {
      toast.error('Featured events must be public');
      return;
    }
    if (form.start_datetime && form.end_datetime && form.end_datetime <= form.start_datetime) {
      toast.error('End datetime must be after start datetime');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '') formData.append(key, value);
      });
      if (coverFile) formData.append('cover_image', coverFile);

      if (editingId) {
        await communicationService.updateEvent(editingId, formData);
        toast.success('Event updated');
      } else {
        await communicationService.createEvent(formData);
        toast.success('Event created');
      }
      setModalOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Reflect only the current page — pageInfo.count (Total Events card) is
  // the accurate figure regardless of pagination.
  const upcomingCountOnPage = events.filter((e) => e.event_status === 'UPCOMING').length;
  const featuredCountOnPage = events.filter((e) => e.is_featured).length;
  const hasActiveFilter = Boolean(search || typeFilter || statusFilter);

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <span className="font-medium text-gray-900 flex items-center gap-1.5">
          {row.title}
          {row.is_featured && <Star className="h-3.5 w-3.5 text-warning-500 fill-warning-500" />}
        </span>
      ),
    },
    { key: 'event_type_display', header: 'Type' },
    { key: 'venue', header: 'Venue' },
    { key: 'start_datetime', header: 'Starts', render: (row) => new Date(row.start_datetime).toLocaleString() },
    {
      key: 'event_status',
      header: 'Status',
      render: (row) => <Badge variant={STATUS_BADGE[row.event_status]}>{row.event_status}</Badge>,
    },
    {
      key: 'is_active',
      header: 'Active',
      render: (row) => (
        <PermissionGate
          permission={PERMISSIONS.MANAGE_EVENTS}
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
        title="Events"
        description="Manage parish events, feasts, and gatherings."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_EVENTS}>
            <Button icon={Plus} onClick={openAddModal}>Create Event</Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={CalendarDays} title="Total Events" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={CalendarDays} title="Upcoming (this page)" value={upcomingCountOnPage} loading={loading} />
        <SummaryCard icon={Star} title="Featured (this page)" value={featuredCountOnPage} loading={loading} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm">
          <option value="">All types</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <PermissionGate permission={PERMISSIONS.MANAGE_EVENTS}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm">
            <option value="">All events</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </PermissionGate>
      </div>

      <DataTable
        columns={columns}
        data={events}
        loading={loading}
        emptyTitle={hasActiveFilter ? 'No matching events' : 'No events yet'}
        emptyDescription={
          hasActiveFilter
            ? 'Try a different search term or filter.'
            : 'Create your first event to get started.'
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <PermissionGate permission={PERMISSIONS.MANAGE_EVENTS}>
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
              <h3 className="text-base font-semibold text-gray-900">{editingId ? 'Edit Event' : 'Create Event'}</h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <Input type="text" name="title" required value={form.title} onChange={handleFormChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Type</label>
                <select name="event_type" value={form.event_type} onChange={handleFormChange} className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm">
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Family Unit <span className="text-gray-400">(optional)</span>
                </label>
                <select name="family_unit" value={form.family_unit} onChange={handleFormChange} className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm">
                  <option value="">Parish-wide (no specific unit)</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.family_unit_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  name="description"
                  required
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Venue</label>
                <Input type="text" name="venue" required value={form.venue} onChange={handleFormChange} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Starts</label>
                  <Input type="datetime-local" name="start_datetime" required value={form.start_datetime} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ends</label>
                  <Input type="datetime-local" name="end_datetime" required value={form.end_datetime} onChange={handleFormChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cover Image <span className="text-gray-400">(optional)</span>
                </label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} className="text-sm" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_public" checked={form.is_public} onChange={handleFormChange} className="rounded border-gray-300" />
                  Public
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleFormChange} className="rounded border-gray-300" />
                  Featured
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Save Changes' : 'Create Event'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}