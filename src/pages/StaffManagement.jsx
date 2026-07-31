import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, UserCog, Power, Mail, Phone } from 'lucide-react';
import { administrationService } from '../services.js';
import { PageHeader, Badge, Button, Input, SummaryCard } from '../components.jsx';

const ACCOUNT_STATUS_BADGE = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  CANCELLED: 'gray',
  EXPIRED: 'danger',
  NOT_INVITED: 'gray',
};

const OPTIONAL_FIELDS = ['email', 'phone_number', 'bio', 'start_date', 'end_date', 'status'];

const EMPTY_FORM = {
  name: '', email: '', phone_number: '', designation: '', bio: '',
  start_date: '', end_date: '', status: '', show_email_publicly: false, show_phone_publicly: false,
};

const MAX_PHOTO_SIZE_MB = 5;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPhotoUrl, setEditingPhotoUrl] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await administrationService.getStaff(search ? { search } : undefined);
      const data = res.data;
      if (data.results) {
        setStaff(data.results);
        setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
      } else {
        setStaff(data);
        setPageInfo({ count: data.length, next: null, previous: null });
      }
    } catch {
      toast.error('Could not load staff');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchStaff(), 300);
    return () => clearTimeout(timeout);
  }, [fetchStaff]);

  const handleToggleStatus = async (row) => {
    try {
      if (row.is_active) {
        await administrationService.deactivateStaff(row.id);
        toast.success('Staff member deactivated');
      } else {
        await administrationService.reactivateStaff(row.id);
        toast.success('Staff member reactivated');
      }
      fetchStaff();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update status'));
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await administrationService.deleteStaff(row.id);
      toast.success('Staff member deleted');
      fetchStaff();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete'));
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setEditingPhotoUrl(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setEditingPhotoUrl(row.photo_url || null);
    setForm({
      name: row.name,
      email: row.email || '',
      phone_number: row.phone_number || '',
      designation: row.designation,
      bio: row.bio || '',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      status: row.status || '',
      show_email_publicly: row.show_email_publicly,
      show_phone_publicly: row.show_phone_publicly,
    });
    setPhotoFile(null);
    setModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setPhotoFile(null);
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      toast.error('Photo must be a JPEG, PNG, WEBP, or GIF image');
      e.target.value = '';
      setPhotoFile(null);
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(`Photo must be under ${MAX_PHOTO_SIZE_MB}MB`);
      e.target.value = '';
      setPhotoFile(null);
      return;
    }
    setPhotoFile(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error('End date cannot be earlier than start date');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        const finalValue = key === 'email' ? String(value ?? '').trim() : value;

        if (OPTIONAL_FIELDS.includes(key)) {
          formData.append(key, finalValue ?? '');
          return;
        }
        if (finalValue === '') return;
        formData.append(key, finalValue);
      });
      if (photoFile) formData.append('photo', photoFile);

      if (editingId) {
        await administrationService.updateStaff(editingId, formData);
        toast.success('Staff member updated');
      } else {
        await administrationService.createStaff(formData);
        toast.success('Staff member added');
      }
      setModalOpen(false);
      fetchStaff();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const activeCountOnPage = staff.filter((s) => s.is_active).length;

  return (
    <div>
      <style>{`
        @keyframes staffFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .staff-fade-in { animation: staffFadeIn 0.35s ease-out both; }
      `}</style>

      <PageHeader
        title="Staff Management"
        description="Manage church staff profiles, roles, and portal access."
        actions={<Button icon={Plus} onClick={openAddModal}>Add Staff</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard icon={UserCog} title="Total Staff" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={UserCog} title="Active (this page)" value={activeCountOnPage} loading={loading} />
      </div>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <h3 className="text-sm font-semibold text-ink">No staff members yet</h3>
          <p className="text-sm text-ink-muted mt-1">Add your first staff member to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((row, i) => (
            <div
              key={row.id}
              className="staff-fade-in bg-surface border border-border rounded-2xl p-4 hover:border-accent-strong/50 transition-colors flex flex-col"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {row.photo_url ? (
                    <img src={row.photo_url} alt={row.name} className="h-14 w-14 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-accent text-accent-ink flex items-center justify-center text-lg font-semibold shrink-0">
                      {row.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{row.name}</p>
                    <p className="text-xs text-ink-muted truncate">{row.designation}</p>
                    <Badge variant={row.is_active ? 'success' : 'gray'} className="mt-1">{row.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-1 mb-3 text-xs text-ink-muted">
                {row.email && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 text-ink-muted shrink-0" /> <span className="truncate">{row.email}</span>
                  </p>
                )}
                {row.phone_number && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-ink-muted" /> {row.phone_number}
                  </p>
                )}
              </div>

              <div className="flex-1" />

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Badge variant={ACCOUNT_STATUS_BADGE[row.account_status] || 'gray'}>{row.account_status?.replace(/_/g, ' ')}</Badge>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleStatus(row)}
                    className={`h-7 w-7 flex items-center justify-center rounded-md hover:bg-surface-2 ${row.is_active ? 'text-ink-muted hover:text-danger-600' : 'text-ink-muted hover:text-success-600'}`}
                    aria-label={row.is_active ? 'Deactivate' : 'Reactivate'}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openEditModal(row)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink" aria-label="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(row)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-danger-50 hover:text-danger-600" aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button onClick={() => setModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Name</label>
                <Input type="text" name="name" required value={form.name} onChange={handleFormChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Designation</label>
                <Input type="text" name="designation" required value={form.designation} onChange={handleFormChange} placeholder="e.g. Parish Priest" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                  <Input type="email" name="email" value={form.email} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Phone</label>
                  <Input type="text" name="phone_number" value={form.phone_number} onChange={handleFormChange} />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="show_email_publicly" checked={form.show_email_publicly} onChange={handleFormChange} className="rounded border-border accent-accent-strong" />
                  Show email publicly
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="show_phone_publicly" checked={form.show_phone_publicly} onChange={handleFormChange} className="rounded border-border accent-accent-strong" />
                  Show phone publicly
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Bio</label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Start Date</label>
                  <Input type="date" name="start_date" value={form.start_date} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    End Date <span className="text-ink-muted">(optional)</span>
                  </label>
                  <Input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Status <span className="text-ink-muted">(exact backend choices still unconfirmed — free text for now; will become a dropdown once Staff.status choices are shared)</span>
                </label>
                <Input type="text" name="status" value={form.status} onChange={handleFormChange} placeholder="e.g. ACTIVE" />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Photo <span className="text-ink-muted">(optional, JPEG/PNG/WEBP/GIF, max {MAX_PHOTO_SIZE_MB}MB)</span>
                </label>
                {editingPhotoUrl && !photoFile && (
                  <div className="flex items-center gap-2 mb-2">
                    <img src={editingPhotoUrl} alt="Current" className="h-12 w-12 rounded-full object-cover" />
                    <span className="text-xs text-ink-muted">Current photo — choose a file below to replace it</span>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoChange} className="text-sm text-ink" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingId ? 'Save Changes' : 'Add Staff'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}