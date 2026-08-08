import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { reportsService } from '../services';
import { ReportTable, ReportFilter, Badge, Button, formatDateTime, formatEnumLabel } from '../components';
import { RotateCcw, CalendarClock, CalendarCheck2, CalendarDays, Star, Download, ChevronDown } from 'lucide-react';
import { useReportData, ERROR_MESSAGES } from './hooks';

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
  { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = CURRENT_YEAR - 4 + i;
  return { value: String(y), label: String(y) };
});

const STATUS_META = {
  UPCOMING: { label: 'Upcoming', icon: CalendarClock, badge: 'primary' },
  ONGOING: { label: 'Ongoing', icon: CalendarDays, badge: 'success' },
  COMPLETED: { label: 'Completed', icon: CalendarCheck2, badge: 'gray' },
};

const columns = [
  { key: 'title', header: 'Title' },
  { key: 'event_type', header: 'Type', render: (r) => formatEnumLabel(r.event_type) },
  {
    key: 'event_status',
    header: 'Status',
    render: (r) => {
      const meta = STATUS_META[r.event_status];
      return meta ? <Badge variant={meta.badge}>{meta.label}</Badge> : (r.event_status || '—');
    },
  },
  { key: 'family_unit', header: 'Family Unit', render: (r) => r.family_unit || '—' },
  { key: 'venue', header: 'Venue' },
  { key: 'start_datetime', header: 'Starts', render: (r) => formatDateTime(r.start_datetime) },
  { key: 'end_datetime', header: 'Ends', render: (r) => formatDateTime(r.end_datetime) },
  { key: 'is_public', header: 'Public', render: (r) => <Badge variant={r.is_public ? 'primary' : 'gray'}>{r.is_public ? 'Public' : 'Private'}</Badge> },
  { key: 'is_featured', header: 'Featured', render: (r) => (r.is_featured ? <Badge variant="success">Featured</Badge> : '—') },
];

const searchFn = (row, q) =>
  [row.title, row.venue, row.family_unit].some((v) => v?.toLowerCase().includes(q));

// Scoped keyframes for the staggered entrance — matches other report pages.
function ReportStyles() {
  return (
    <style>{`
      @keyframes reportCardIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .report-card {
        animation: reportCardIn 0.35s ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        .report-card { animation: none; }
      }
    `}</style>
  );
}

function StatChip({ icon: Icon, label, value, loading, delay }) {
  return (
    <div
      className="report-card rounded-2xl border border-border bg-surface p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        <Icon className="h-3.5 w-3.5 text-accent-strong" />
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-6 w-10 animate-pulse rounded bg-border" />
      ) : (
        <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      )}
    </div>
  );
}

// Helper to extract filename from Content-Disposition header
function filenameFromDisposition(header, fallback) {
  if (!header) return fallback;
  // content-disposition: attachment; filename="something.csv"
  const match = header.match(/filename="?([^"]+)"?/i);
  return match ? match[1] : fallback;
}

export default function EventsReport() {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportButtonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function updatePosition() {
      if (exportButtonRef.current) {
        const rect = exportButtonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        });
      }
    }

    if (exportOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [exportOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        exportOpen &&
        exportButtonRef.current &&
        menuRef.current &&
        !exportButtonRef.current.contains(event.target) &&
        !menuRef.current.contains(event.target)
      ) {
        setExportOpen(false);
      }
    }
    function handleEscape(event) {
      if (exportOpen && event.key === 'Escape') {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [exportOpen]);

  const params = useMemo(() => {
    const p = {};
    if (year) p.year = year;
    if (month) p.month = month;
    if (date) p.date = date;
    return p;
  }, [year, month, date]);

  // NOTE: Reports should include both active and inactive events.
  // If inactive events are missing, update the backend report service/queryset
  // to stop filtering with is_active=True.
  const fetchReport = useCallback(
    () => reportsService.getEventReport(params),
    [params]
  );

  const { data, loading, errorType, reload } = useReportData(
    fetchReport,
    [fetchReport]
  );

  const filtered = search ? data.filter((row) => searchFn(row, search.toLowerCase())) : data;

  const counts = useMemo(() => {
    const c = { UPCOMING: 0, ONGOING: 0, COMPLETED: 0, featured: 0 };
    data.forEach((r) => {
      if (c[r.event_status] !== undefined) c[r.event_status] += 1;
      if (r.is_featured) c.featured += 1;
    });
    return c;
  }, [data]);

  // Export handler
  async function handleExport(format) {
    setExporting(true);
    try {
      const res = await reportsService.exportReport({
        report: 'events',
        format,
        filters: {
          year,
          month,
          date,
          search,
        },
      });
      if (!res?.data) {
        throw new Error('Empty export response');
      }
      const blob = new Blob([res.data]);
      // Try to get filename from content-disposition
      const header = res.headers && res.headers['content-disposition'];
      let ext = '.' + format;
      if (format === 'xlsx') ext = '.xlsx';
      if (format === 'csv') ext = '.csv';
      if (format === 'pdf') ext = '.pdf';
      const fallback = `events${ext}`;
      const filename = filenameFromDisposition(header, fallback);
      // Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch (e) {
      // Optional: show error
      // eslint-disable-next-line no-console
      console.error('Export failed', e);
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }

  if (errorType) {
    return (
      <div className="report-card rounded-2xl border border-warning-500/30 bg-warning-50 p-5">
        <ReportStyles />
        <p className="mb-3 text-sm text-warning-700">{ERROR_MESSAGES[errorType]}</p>
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={reload}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReportStyles />

      <div>
        <h2 className="text-lg font-semibold text-ink">Events</h2>
        <p className="text-sm text-ink-muted">Browse and filter your parish events</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatChip icon={CalendarClock} label="Upcoming" value={loading ? '' : counts.UPCOMING} loading={loading} delay={0} />
        <StatChip icon={CalendarDays} label="Ongoing" value={loading ? '' : counts.ONGOING} loading={loading} delay={30} />
        <StatChip icon={CalendarCheck2} label="Completed" value={loading ? '' : counts.COMPLETED} loading={loading} delay={60} />
        <StatChip icon={Star} label="Featured" value={loading ? '' : counts.featured} loading={loading} delay={90} />
      </div>

      <div className="report-card relative rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: '110ms' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ReportFilter type="search" label="Search events..." value={search} onChange={setSearch} />
          <ReportFilter type="select" label="Year" value={year} onChange={setYear} options={YEARS} />
          <ReportFilter type="select" label="Month" value={month} onChange={setMonth} options={MONTHS} />
          <ReportFilter type="date" label="Specific date" value={date} onChange={setDate} />
          <div className="ml-auto flex items-center gap-2 relative">
            <button
              onClick={reload}
              aria-label="Refresh"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-muted transition-colors hover:bg-surface-2"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent-strong' : ''}`} />
            </button>
            <Button
              type="button"
              variant="secondary"
              icon={Download}
              loading={exporting}
              onClick={() => setExportOpen((v) => !v)}
              ref={exportButtonRef}
            >
              Export
              <ChevronDown className="ml-2 h-4 w-7" />
            </Button>
          </div>
        </div>
      </div>

      {exportOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-40 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ring-1 ring-black/5 z-[9999]"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
            type="button"
            onClick={() => handleExport('csv')}
            disabled={exporting}
          >
            Export as CSV
            <span className="text-xs text-ink-muted">.csv</span>
          </button>
          <div className="border-t border-border" />
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
            type="button"
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
          >
            Export as Excel
            <span className="text-xs text-ink-muted">.xlsx</span>
          </button>
          <div className="border-t border-border" />
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
          >
            Export as PDF
            <span className="text-xs text-ink-muted">.pdf</span>
          </button>
        </div>,
        document.body
      )}

      <div className="report-card rounded-2xl border border-border bg-surface overflow-hidden" style={{ animationDelay: '150ms' }}>
        <ReportTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="No events found"
          emptyDescription="Try adjusting your filters."
        />
      </div>
    </div>
  );
}