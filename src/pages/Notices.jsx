import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Star, ChevronLeft, ChevronRight, Paperclip, CalendarDays, AlertTriangle } from 'lucide-react';
import { communicationService } from '../services.js';
import { PageHeader, Badge, Switch, Button, Input, SummaryCard, formatDate } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import { Megaphone } from 'lucide-react';
import api from '../api.js';

const NOTICE_TYPES = [
  'GENERAL', 'PARISH_NOTICE', 'MARRIAGE_NOTICE', 'FUNERAL_NOTICE',
  'PRAYER_REQUEST', 'CATECHISM_NOTICE', 'YOUTH_NOTICE', 'EVENT_NOTICE', 'OTHER',
];

const OPTIONAL_FIELDS = ['expiry_date'];

const EMPTY_FORM = {
  title: '', notice_type: 'GENERAL', content: '',
  publish_date: '', expiry_date: '', is_public: true, is_featured: false,
};

const toLocalInput = (isoString) => (isoString ? isoString.slice(0, 16) : '');

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null;
  const diffDays = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 3) return 'soon';
  return null;
}

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

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const abortRef = useRef(null);

  const fetchNotices = useCallback((url = null) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = {};
    if (!url) {
      if (search) params.search = search;
      if (typeFilter) params.notice_type = typeFilter;
      if (statusFilter) params.active = statusFilter;
    }

    const request = url
      ? api.get(url, { signal: controller.signal })
      : communicationService.getNotices(params, { signal: controller.signal });

    request
      .then((res) => {
        if (!mountedRef.current) return;
        const data = res.data;
        if (data.results) {
          setNotices(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setNotices(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        toast.error('Could not load notices');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchNotices(), 300);
    return () => clearTimeout(timeout);
  }, [fetchNotices]);

  const goToPage = (url) => {
    if (url) fetchNotices(url);
  };

  const handleToggleActive = async (row, nextValue) => {
    setNotices((prev) => prev.map((n) => (n.id === row.id ? { ...n, is_active: nextValue } : n)));
    try {
      await communicationService.updateNotice(row.id, { is_active: nextValue });
      fetchNotices();
    } catch {
      setNotices((prev) => prev.map((n) => (n.id === row.id ? { ...n, is_active: row.is_active } : n)));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    try {
      await communicationService.deleteNotice(row.id);
      toast.success('Notice deleted');
      fetchNotices();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete'));
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setAttachmentFile(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      notice_type: row.notice_type,
      content: row.content,
      publish_date: toLocalInput(row.publish_date),
      expiry_date: toLocalInput(row.expiry_date),
      is_public: row.is_public,
      is_featured: row.is_featured,
    });
    setAttachmentFile(null);
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (form.is_featured && !form.is_public) {
      toast.error('Featured notices must be public');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (OPTIONAL_FIELDS.includes(key)) {
          formData.append(key, value ?? '');
          return;
        }
        if (value !== '') formData.append(key, value);
      });
      if (attachmentFile) formData.append('attachment', attachmentFile);

      if (editingId) {
        await communicationService.updateNotice(editingId, formData);
        toast.success('Notice updated');
      } else {
        await communicationService.createNotice(formData);
        toast.success('Notice created');
      }
      setModalOpen(false);
      fetchNotices();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const activeCountOnPage = notices.filter((n) => n.is_active).length;
  const featuredCountOnPage = notices.filter((n) => n.is_featured).length;
  const hasActiveFilter = Boolean(search || typeFilter || statusFilter);

  return (
    <div>
      <style>{`
        @keyframes noticeFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .notice-fade-in { animation: noticeFadeIn 0.35s ease-out both; }
      `}</style>

      <PageHeader
        title="Notices"
        description="Manage church notices, announcements, and bulletins."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_NOTICES}>
            <Button icon={Plus} onClick={openAddModal}>Create Notice</Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={Megaphone} title="Total Notices" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={Megaphone} title="Active (this page)" value={activeCountOnPage} loading={loading} />
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
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm">
          <option value="">All types</option>
          {NOTICE_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <PermissionGate permission={PERMISSIONS.MANAGE_NOTICES}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm">
            <option value="">All notices</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </PermissionGate>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <h3 className="text-sm font-semibold text-ink">
            {hasActiveFilter ? 'No matching notices' : 'No notices yet'}
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            {hasActiveFilter ? 'Try a different search term or filter.' : 'Create your first notice to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {notices.map((row, i) => {
            const expiryStatus = getExpiryStatus(row.expiry_date);
            return (
              <div
                key={row.id}
                className="notice-fade-in bg-surface border border-border rounded-2xl p-4 hover:shadow-md transition-shadow flex flex-col"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="gray">{row.notice_type_display}</Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    {row.is_featured && <Star className="h-4 w-4 text-warning-500 fill-warning-500" />}
                    {row.attachment && <Paperclip className="h-3.5 w-3.5 text-ink-muted" />}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-ink mb-1.5 line-clamp-1">{row.title}</h3>
                <p className="text-xs text-ink-muted line-clamp-2 flex-1">{row.content}</p>

                <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-3">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{formatDate(row.publish_date)}</span>
                  {row.expiry_date && (
                    <>
                      <span className="text-ink-muted/60">→</span>
                      <span className={expiryStatus ? 'text-danger-600 font-medium' : ''}>{formatDate(row.expiry_date)}</span>
                    </>
                  )}
                </div>

                {expiryStatus && (
                  <div className={`flex items-center gap-1.5 mt-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    expiryStatus === 'expired' ? 'bg-danger-50 text-danger-600' : 'bg-warning-50 text-warning-700'
                  }`}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {expiryStatus === 'expired' ? 'Expired — still marked active' : 'Expiring within 3 days'}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={row.is_public ? 'primary' : 'gray'}>{row.is_public ? 'Public' : 'Internal'}</Badge>
                    <PermissionGate
                      permission={PERMISSIONS.MANAGE_NOTICES}
                      fallback={<Badge variant={row.is_active ? 'success' : 'gray'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>}
                    >
                      <Switch checked={row.is_active} onChange={(next) => handleToggleActive(row, next)} />
                    </PermissionGate>
                  </div>

                  <div className="flex items-center gap-1">
                    <PermissionGate permission={PERMISSIONS.MANAGE_NOTICES}>
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
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">{editingId ? 'Edit Notice' : 'Create Notice'}</h3>
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
                <label className="block text-sm font-medium text-ink mb-1.5">Notice Type</label>
                <select name="notice_type" value={form.notice_type} onChange={handleFormChange} className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm">
                  {NOTICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Content</label>
                <textarea
                  name="content"
                  required
                  value={form.content}
                  onChange={handleFormChange}
                  rows={4}
                  className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Publish Date</label>
                  <Input type="datetime-local" name="publish_date" required value={form.publish_date} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Expiry Date <span className="text-ink-muted">(optional)</span>
                  </label>
                  <Input type="datetime-local" name="expiry_date" value={form.expiry_date} onChange={handleFormChange} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Attachment <span className="text-ink-muted">(optional)</span>
                </label>
                <input type="file" onChange={(e) => setAttachmentFile(e.target.files[0])} className="text-sm text-ink" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_public" checked={form.is_public} onChange={handleFormChange} className="rounded border-border" />
                  Public
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleFormChange} className="rounded border-border" />
                  Featured
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Save Changes' : 'Create Notice'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}