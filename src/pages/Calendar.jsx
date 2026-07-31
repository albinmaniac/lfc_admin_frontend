import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, PageHeader, formatDate } from '../components.jsx';
import { communicationService } from '../services.js';

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function Calendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const loadCalendar = async () => {
      setLoading(true);
      try {
        const month = viewDate.getMonth() + 1;
        const year = viewDate.getFullYear();
        const { data } = await communicationService.getCalendar(month, year);
        setItems(Array.isArray(data) ? data : data?.results || []);
      } catch (error) {
        console.error('Failed to load calendar data', error);
        toast.error('Could not load the calendar for this month.');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
  }, [viewDate]);

  useEffect(() => {
    if (!selectedItem) {
      setDetailData(null);
      return;
    }

    let isMounted = true;

    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailData(null);

      try {
        const response = selectedItem.type === 'event'
          ? await communicationService.getEvent(selectedItem.id)
          : await communicationService.getFeast(selectedItem.id);

        if (isMounted) {
          setDetailData(response?.data ?? response);
        }
      } catch (error) {
        console.error('Failed to load linked record', error);
        if (isMounted) {
          toast.error('Unable to load the linked record details.');
        }
      } finally {
        if (isMounted) {
          setDetailLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedItem]);

  const monthLabel = useMemo(() => viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), [viewDate]);

  const detailEntries = useMemo(() => {
    if (!detailData) return [];
    return Object.entries(detailData).filter(([, value]) => value !== null && value !== undefined && value !== '');
  }, [detailData]);

  const calendarCells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const totalCells = Math.ceil((leadingDays + totalDays) / 7) * 7;

    const grouped = items.reduce((acc, item) => {
      if (!item?.date) return acc;
      const key = getDateKey(parseDateValue(item.date));
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - leadingDays + 1;
      const currentDate = new Date(year, month, dayNumber);
      const key = getDateKey(currentDate);
      const isCurrentMonth = currentDate.getMonth() === month;
      const dayItems = grouped[key] || [];
      const isToday = getDateKey(currentDate) === getDateKey(today);

      return {
        key,
        date: currentDate,
        isCurrentMonth,
        isToday,
        dayItems,
      };
    });
  }, [items, today, viewDate]);

  const changeMonth = (direction) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="View parish events and feasts for the selected month."
      />

      <div className="overflow-hidden rounded-[28px] border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-muted">
              <Sparkles className="h-4 w-4" />
              Monthly highlight view
            </div>
            <h2 className="text-xl font-semibold text-ink">{monthLabel}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={() => changeMonth(-1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}>
              Today
            </Button>
            <Button variant="secondary" size="sm" icon={ChevronRight} onClick={() => changeMonth(1)}>
              Next
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="rounded-2xl bg-surface-2 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {calendarCells.map((cell) => {
            const hasEvents = cell.dayItems.some((item) => item.type === 'event');
            const hasFeasts = cell.dayItems.some((item) => item.type === 'feast');
            const featuredCount = cell.dayItems.filter((item) => item.is_featured).length;

            // Event days = accent (lime, the app's one brand hue). Feast
            // days = warning (amber) — reusing the existing functional
            // token instead of introducing a new color, since warning
            // already reads as "gold/celebratory" via the featured-star
            // icon used elsewhere. Empty current-month days are just flat
            // surface-2, not a third arbitrary color.
            let cellBgClass;
            if (cell.isCurrentMonth) {
              if (hasEvents) {
                cellBgClass = 'border-accent-strong/40 bg-accent/15 hover:border-accent-strong';
              } else if (hasFeasts) {
                cellBgClass = 'border-warning-500/30 bg-warning-50 hover:border-warning-500/60';
              } else {
                cellBgClass = 'border-border bg-surface-2';
              }
            } else {
              cellBgClass = 'border-border bg-surface-2/50 text-ink-muted';
            }

            return (
              <div
                key={cell.key}
                className={`group min-h-28 rounded-[20px] border p-2.5 transition-colors duration-150 ${cellBgClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${cell.isToday ? 'rounded-full bg-accent px-2.5 py-0.5 text-accent-ink' : cell.isCurrentMonth ? 'rounded-full bg-surface px-2.5 py-0.5 text-ink' : 'text-ink-muted'}`}>
                    {cell.date.getDate()}
                  </span>
                  {(hasEvents || hasFeasts) && (
                    <div className="flex items-center gap-1.5">
                      {hasEvents && <span className="h-2.5 w-2.5 rounded-full bg-accent-strong" />}
                      {hasFeasts && <span className="h-2.5 w-2.5 rounded-full bg-warning-500 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]" />}
                    </div>
                  )}
                </div>

                <div className="mt-2 space-y-1.5">
                  {cell.dayItems.slice(0, 3).map((item) => (
                    <button
                      key={`${item.type}-${item.id}-${cell.key}`}
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className={`flex w-full items-center gap-1 rounded-xl border px-2 py-1 text-left text-[11px] transition-colors ${item.type === 'event' ? 'border-accent-strong/30 bg-accent/15 text-accent-ink hover:bg-accent/25' : 'border-warning-500/30 bg-warning-50 text-warning-700 hover:bg-warning-500/15'} ${item.is_featured ? 'font-semibold' : ''}`}
                    >
                      <span className="text-[10px]">●</span>
                      <span className="line-clamp-1 flex-1">{item.title}</span>
                      {item.is_featured && <Star className="h-3 w-3 fill-current" />}
                    </button>
                  ))}
                  {cell.dayItems.length > 3 && <p className="px-2 text-[11px] text-ink-muted">+{cell.dayItems.length - 3} more</p>}
                </div>

                {featuredCount > 0 && (
                  <div className="mt-2 flex items-center gap-1 px-1 text-[11px] font-medium text-warning-600">
                    <Star className="h-3 w-3 fill-current" />
                    {featuredCount} featured
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-2 p-4 text-sm font-medium text-ink-muted">
            Loading calendar entries...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-2 p-4 text-sm text-ink-muted">
            No events or feasts were returned for this month.
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-border bg-surface shadow-lg">
            <div className={`flex items-start justify-between gap-3 px-6 py-5 ${selectedItem.type === 'event' ? 'bg-accent text-accent-ink' : 'bg-warning-500 text-white'}`}>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-75">
                  {selectedItem.type === 'event' ? 'Event' : 'Feast'}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{detailData?.title || selectedItem.title}</h3>
                {detailData?.description && <p className="mt-2 text-sm opacity-90">{detailData.description}</p>}
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} className="rounded-full bg-black/10 p-2 transition hover:bg-black/20">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mt-0 grid gap-3 text-sm text-ink-muted md:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-3">
                  <div className={`flex items-center justify-between rounded-2xl px-3 py-2 ${selectedItem.type === 'event' ? 'bg-accent/15 text-accent-ink' : 'bg-warning-50 text-warning-700'}`}>
                    <span className="font-medium">Date</span>
                    <span>{formatDate(detailData?.date || detailData?.event_date || detailData?.feast_date || selectedItem.date)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2">
                    <span className="font-medium text-ink">Featured</span>
                    <span>{(detailData?.is_featured ?? selectedItem.is_featured) ? 'Yes' : 'No'}</span>
                  </div>
                  {detailData?.cover_image_url && (
                    <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
                      <img
                        src={detailData.cover_image_url}
                        alt={detailData.title || selectedItem.title}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {detailLoading ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-2 p-3 text-sm text-ink-muted">
                    Loading full record details...
                  </div>
                ) : detailData ? (
                  <div className="rounded-2xl border border-border bg-surface-2 p-3">
                    <p className="font-medium text-ink">Record details</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {detailEntries.slice(0, 8).map(([key, value]) => (
                        <div key={key} className="rounded-xl bg-surface px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">{key}</p>
                          <p className="mt-1 break-words text-sm text-ink">
                            {typeof value === 'boolean'
                              ? value ? 'Yes' : 'No'
                              : typeof value === 'object'
                                ? JSON.stringify(value, null, 2)
                                : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-2 p-3 text-sm text-ink-muted">
                    The record details could not be loaded.
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedItem(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}