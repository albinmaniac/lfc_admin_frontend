import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Star, ChevronLeft, ChevronRight, Image as ImageIcon, PartyPopper, Sparkles } from 'lucide-react';
import { communicationService } from '../services.js';
import { PageHeader, Badge, Switch, Button, Input, SummaryCard, formatDate } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import api from '../api.js';

const EMPTY_FORM = {
  title: '', description: '', feast_date: '', is_public: true, is_featured: false,
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

// Feast has no backend-computed status field (unlike Event's event_status)
// — this is a purely client-side label derived from feast_date vs today,
// for a quick visual cue only. Not a claim about a backend field.
function getFeastTiming(feastDate) {
  if (!feastDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const feast = new Date(feastDate);
  const diffDays = Math.round((feast - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: 'PAST', diffDays };
  return { status: 'UPCOMING', diffDays };
}

function countdownLabel(diffDays) {
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays} days`;
}

export default function Feasts() {
  const [feasts, setFeasts] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const abortRef = useRef(null);

  const fetchFeasts = useCallback((url = null) => {
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
      : communicationService.getFeasts(params, { signal: controller.signal });

    request
      .then((res) => {
        if (!mountedRef.current) return;
        const data = res.data;
        if (data.results) {
          setFeasts(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setFeasts(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        toast.error('Could not load feasts');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchFeasts(), 300);
    return () => clearTimeout(timeout);
  }, [fetchFeasts]);

  const goToPage = (url) => {
    if (url) fetchFeasts(url);
  };

  const handleToggleActive = async (row, nextValue) => {
    setFeasts((prev) => prev.map((f) => (f.id === row.id ? { ...f, is_active: nextValue } : f)));
    try {
      await communicationService.updateFeast(row.id, { is_active: nextValue });
      fetchFeasts();
    } catch {
      setFeasts((prev) => prev.map((f) => (f.id === row.id ? { ...f, is_active: row.is_active } : f)));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    try {
      await communicationService.deleteFeast(row.id);
      toast.success('Feast deleted');
      fetchFeasts();
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
      description: row.description,
      feast_date: row.feast_date || '',
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
      toast.error('Featured feasts must be public');
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
        await communicationService.updateFeast(editingId, formData);
        toast.success('Feast updated');
      } else {
        await communicationService.createFeast(formData);
        toast.success('Feast created');
      }
      setModalOpen(false);
      fetchFeasts();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const upcomingCountOnPage = feasts.filter((f) => getFeastTiming(f.feast_date)?.status === 'UPCOMING').length;
  const featuredCountOnPage = feasts.filter((f) => f.is_featured).length;
  const hasActiveFilter = Boolean(search || statusFilter);

  return (
    <div>
      <style>{`
        @keyframes feastFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .feast-fade-in { animation: feastFadeIn 0.35s ease-out both; }
        @keyframes starPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .star-pulse { animation: starPulse 1.8s ease-in-out infinite; }
      `}</style>

      <PageHeader
        title="Feasts"
        description="Manage parish feast days and celebrations."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_EVENTS}>
            <Button icon={Plus} onClick={openAddModal}>Create Feast</Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={PartyPopper} title="Total Feasts" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={PartyPopper} title="Upcoming (this page)" value={upcomingCountOnPage} loading={loading} />
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
        <PermissionGate permission={PERMISSIONS.MANAGE_EVENTS}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm">
            <option value="">All feasts</option>
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
      ) : feasts.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <h3 className="text-sm font-semibold text-ink">
            {hasActiveFilter ? 'No matching feasts' : 'No feasts yet'}
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            {hasActiveFilter ? 'Try a different search term or filter.' : 'Create your first feast to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {feasts.map((row, i) => {
            const timing = getFeastTiming(row.feast_date);
            // Only show the countdown chip for feasts happening soon —
            // beyond ~2 weeks out it stops being a useful "heads up" and
            // just becomes clutter next to the date.
            const showCountdown = timing?.status === 'UPCOMING' && timing.diffDays <= 14;

            return (
              <div
                key={row.id}
                className="feast-fade-in group bg-surface border border-border rounded-2xl overflow-hidden hover:border-accent-strong/50 transition-colors flex flex-col"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="relative w-full h-36 bg-surface-2 overflow-hidden">
                  {row.cover_image_url ? (
                    <img
                      src={row.cover_image_url}
                      alt={row.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-muted">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  {timing && (
                    <div className="absolute top-2.5 left-2.5">
                      <Badge variant={timing.status === 'UPCOMING' ? 'primary' : 'gray'}>
                        {timing.status === 'UPCOMING' ? 'Upcoming' : 'Past'}
                      </Badge>
                    </div>
                  )}
                  {row.is_featured && (
                    <div className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-surface/90 flex items-center justify-center shadow-sm">
                      <Star className="star-pulse h-3.5 w-3.5 text-warning-500 fill-warning-500" />
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-ink mb-2 line-clamp-1">{row.title}</h3>

                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs text-ink-muted">{formatDate(row.feast_date)}</p>
                    {showCountdown && (
                      <span className="flex items-center gap-1 rounded-full bg-accent/20 text-accent-ink px-2 py-0.5 text-[11px] font-medium">
                        <Sparkles className="h-3 w-3" />
                        {countdownLabel(timing.diffDays)}
                      </span>
                    )}
                  </div>

                  {row.description && (
                    <p className="text-xs text-ink-muted line-clamp-2 mb-3">{row.description}</p>
                  )}

                  <div className="flex-1" />

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={row.is_public ? 'primary' : 'gray'}>{row.is_public ? 'Public' : 'Internal'}</Badge>
                      <PermissionGate
                        permission={PERMISSIONS.MANAGE_EVENTS}
                        fallback={<Badge variant={row.is_active ? 'success' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>}
                      >
                        <Switch checked={row.is_active} onChange={(next) => handleToggleActive(row, next)} />
                      </PermissionGate>
                    </div>

                    <div className="flex items-center gap-1">
                      <PermissionGate permission={PERMISSIONS.MANAGE_EVENTS}>
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
              </div>
            );
          })}
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
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">{editingId ? 'Edit Feast' : 'Create Feast'}</h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Title</label>
                <Input type="text" name="title" required value={form.title} onChange={handleFormChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
                <textarea
                  name="description"
                  required
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Feast Date</label>
                <Input type="date" name="feast_date" required value={form.feast_date} onChange={handleFormChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Cover Image <span className="text-ink-muted">(optional)</span>
                </label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} className="text-sm text-ink" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_public" checked={form.is_public} onChange={handleFormChange} className="rounded border-border accent-accent-strong" />
                  Public
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleFormChange} className="rounded border-border accent-accent-strong" />
                  Featured
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Save Changes' : 'Create Feast'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}