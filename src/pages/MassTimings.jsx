import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, X, Clock, Globe2, MessageSquare,
} from 'lucide-react';
import { parishService } from '../services.js';
import { PageHeader, Badge, Switch, Button, Input, SummaryCard } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const DAY_LABELS = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday',
  FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};

const DAY_SHORT = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
};

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

// Renders "14:30" / "14:30:00" as "2:30 PM" — the backend stores 24h time,
// but a calendar card reads much faster in 12h format.
function formatTime12h(value) {
  if (!value) return '—';
  const [h, m] = value.split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${period}`;
}


function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink text-right">{value}</span>
    </div>
  );
}


export default function MassTimings() {
  const [timings, setTimings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [selectedTiming, setSelectedTiming] = useState(null);

  // A calendar view needs every timing across all 7 days at once — a
  // single paginated page (default 20/page) could silently drop days for
  // a larger parish. Requesting a generous page_size to fetch everything
  // in one call; assumes StandardPagination honors the page_size query
  // param (standard DRF PageNumberPagination behavior).
  const fetchTimings = useCallback(() => {
    setLoading(true);
    parishService
      .getMassTimings({ page_size: 100 })
      .then((res) => {
        const data = res.data;
        setTimings(data.results ?? data);
      })
      .catch(() => toast.error('Could not load mass timings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTimings();
  }, [fetchTimings]);


  const handleToggleActive = async (row, nextValue) => {
    setTimings((prev) => prev.map((t) => (t.id === row.id ? { ...t, is_active: nextValue } : t)));
    setSelectedTiming((prev) => (prev && prev.id === row.id ? { ...prev, is_active: nextValue } : prev));
    try {
      await parishService.updateMassTiming(row.id, { is_active: nextValue });
      fetchTimings();
    } catch {
      setTimings((prev) => prev.map((t) => (t.id === row.id ? { ...t, is_active: row.is_active } : t)));
      setSelectedTiming((prev) => (prev && prev.id === row.id ? { ...prev, is_active: row.is_active } : prev));
      toast.error('Failed to update — reverted');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete the ${DAY_LABELS[row.day]} ${formatTime12h(row.mass_time)} mass timing?`)) return;
    try {
      await parishService.deleteMassTiming(row.id);
      toast.success('Mass timing deleted');
      setSelectedTiming(null);
      fetchTimings();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete'));
    }
  };

  const openAddModal = (presetDay) => {
    setEditingId(null);
    setForm(presetDay ? { ...EMPTY_FORM, day: presetDay } : EMPTY_FORM);
    setFormModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setForm({
      day: row.day,
      language: row.language,
      mass_time: row.mass_time,
      description: row.description || '',
    });
    setFormModalOpen(true);
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
      setFormModalOpen(false);
      setSelectedTiming(null);
      fetchTimings();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = timings
      .filter((t) => t.day === day)
      .sort((a, b) => a.mass_time.localeCompare(b.mass_time));
    return acc;
  }, {});

  const activeCount = timings.filter((t) => t.is_active).length;

  return (
    <div>
      <PageHeader
        title="Mass Timings"
        description="Manage the parish's recurring mass schedule."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_PARISH}>
            <Button icon={Plus} onClick={() => openAddModal()}>
              Add Mass Timing
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard icon={Clock} title="Total Mass Timings" value={timings.length} loading={loading} />
        <SummaryCard icon={Clock} title="Published" value={activeCount} loading={loading} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-56 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {DAYS.map((day) => {
            const dayTimings = groupedByDay[day];
            return (
              <div key={day} className="bg-surface border border-border rounded-2xl p-4 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-ink">
                    <span className="hidden xl:inline">{DAY_LABELS[day]}</span>
                    <span className="xl:hidden">{DAY_SHORT[day]}</span>
                  </h3>
                  <Badge variant={dayTimings.length ? 'primary' : 'gray'}>{dayTimings.length}</Badge>
                </div>

                <div className="flex-1 space-y-2">
                  {dayTimings.length === 0 ? (
                    <p className="text-xs text-ink-muted text-center py-8">No mass scheduled</p>
                  ) : (
                    dayTimings.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTiming(t)}
                        className={`w-full text-left rounded-xl border px-3 py-2 text-sm transition-colors ${
                          t.is_active
                            ? 'border-border bg-accent/15 hover:bg-accent/25'
                            : 'border-border bg-surface-2 text-ink-muted hover:bg-surface-2/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-ink">{formatTime12h(t.mass_time)}</span>
                          {!t.is_active && <span className="text-[10px] uppercase tracking-wide">Hidden</span>}
                        </div>
                        <p className="text-xs text-ink-muted truncate">{t.language}</p>
                      </button>
                    ))
                  )}
                </div>

                <PermissionGate permission={PERMISSIONS.MANAGE_PARISH}>
                  <button
                    onClick={() => openAddModal(day)}
                    className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-ink-muted hover:border-accent-strong hover:text-ink transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </PermissionGate>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal — click any mass time chip to see the full detail
          and take action, instead of scanning a flat table. */}
      {selectedTiming && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-sm my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                <Clock className="h-4 w-4 text-ink-muted" />
                {DAY_LABELS[selectedTiming.day]} Mass
              </h3>
              <button
                onClick={() => setSelectedTiming(null)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <DetailRow label="Time" value={formatTime12h(selectedTiming.mass_time)} />
              <DetailRow
                label={<span className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> Language</span>}
                value={selectedTiming.language}
              />
              <DetailRow
                label={<span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Description</span>}
                value={selectedTiming.description || '—'}
              />

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-ink-muted">Published</span>
                <PermissionGate
                  permission={PERMISSIONS.MANAGE_PARISH}
                  fallback={<Badge variant={selectedTiming.is_active ? 'success' : 'gray'}>{selectedTiming.is_active ? 'Active' : 'Inactive'}</Badge>}
                >
                  <Switch
                    checked={selectedTiming.is_active}
                    onChange={(next) => handleToggleActive(selectedTiming, next)}
                  />
                </PermissionGate>
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-0">
              <PermissionGate permission={PERMISSIONS.MANAGE_PARISH}>
                <Button
                  variant="secondary"
                  className="flex-1"
                  icon={Pencil}
                  onClick={() => {
                    openEditModal(selectedTiming);
                    setSelectedTiming(null);
                  }}
                >
                  Edit
                </Button>
              </PermissionGate>
              <PermissionGate role={ROLES.SUPERADMIN}>
                <Button variant="danger" className="flex-1" icon={Trash2} onClick={() => handleDelete(selectedTiming)}>
                  Delete
                </Button>
              </PermissionGate>
            </div>
          </div>
        </div>
      )}

      {formModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">
                {editingId ? 'Edit Mass Timing' : 'Add Mass Timing'}
              </h3>
              <button
                onClick={() => setFormModalOpen(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Day</label>
                <select
                  name="day"
                  value={form.day}
                  onChange={handleFormChange}
                  className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm"
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {DAY_LABELS[day]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Time</label>
                <Input
                  type="time"
                  name="mass_time"
                  required
                  value={form.mass_time}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Language</label>
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
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Description <span className="text-ink-muted">(optional)</span>
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
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setFormModalOpen(false)}>
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

      <section className="mt-8 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-ink">
            Syro-Malabar HolyMass Music
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Listen to the Syro-Malabar HolyMass music collection while viewing the weekly Mass schedule.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <iframe
            data-testid="embed-iframe"
            className="block h-[352px] w-full border-0"
            src="https://open.spotify.com/embed/album/3BYqjOhLJ9DwgHGP2YfQHi?utm_source=generator&si=bff330d597a7484b"
            title="Syro-Malabar HolyMass Music"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      </section>
    </div>
  );
}