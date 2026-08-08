import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { reportsService } from '../services';
import { ReportTable, ReportFilter, Badge, Button, formatDate, formatEnumLabel } from '../components';
import { RotateCcw, Bell, Star, Globe, CalendarX2, Download, ChevronDown } from 'lucide-react';
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

function filenameFromDisposition(header, fallback) {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
}

function truncate(text, max = 80) {
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function isExpired(notice) {
  if (!notice.expiry_date) return false;
  return new Date(notice.expiry_date) < new Date();
}

const columns = [
  { key: 'title', header: 'Title' },
  {
    key: 'notice_type',
    header: 'Type',
    render: (r) => {
      const value =
        r.notice_type ??
        r.notice_category ??
        r.category ??
        r.type ??
        r.noticeType;

      if (value) {
        return formatEnumLabel(value);
      }

      return (
        <span
          className="text-ink-muted italic"
          title={JSON.stringify(r)}
        >
          —
        </span>
      );
    },
  },
  { key: 'content', header: 'Content', render: (r) => <span title={r.content}>{truncate(r.content)}</span> },
  { key: 'publish_date', header: 'Publish Date', render: (r) => formatDate(r.publish_date) },
  {
    key: 'expiry_date',
    header: 'Expiry Date',
    render: (r) =>
      r.expiry_date ? (
        <span className={isExpired(r) ? 'text-danger-600' : undefined}>{formatDate(r.expiry_date)}</span>
      ) : (
        '—'
      ),
  },
  { key: 'is_public', header: 'Public', render: (r) => <Badge variant={r.is_public ? 'primary' : 'gray'}>{r.is_public ? 'Public' : 'Private'}</Badge> },
  { key: 'is_featured', header: 'Featured', render: (r) => (r.is_featured ? <Badge variant="success">Featured</Badge> : '—') },
];

const searchFn = (row, q) => [row.title, row.content].some((v) => v?.toLowerCase().includes(q));

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

// Export dropdown component
function ExportDropdown({ filters }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const toggleOpen = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, [open]);

  const onClickOutside = (e) => {
    if (
      menuRef.current &&
      buttonRef.current &&
      !menuRef.current.contains(e.target) &&
      !buttonRef.current.contains(e.target)
    ) {
      close();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
    }
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('keydown', onKeyDown);
    } else {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const onExport = async (format) => {
    setExporting(true);
    try {
      const response = await reportsService.exportReport({
        report: 'notices',
        format,
        filters,
      });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = URL.createObjectURL(blob);
      const filename = filenameFromDisposition(
        response.headers['content-disposition'],
        `notices.${format}`,
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      close();
    }
  };

  const dropdown = (
    <div
      ref={menuRef}
      className="fixed w-38 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ring-1 ring-black/5 z-[9999]"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="export-menu-button"
      style={{ top: menuPos.top, left: menuPos.left }}
    >
      <button
        type="button"
        className="block w-full px-1 py-2 text-left-2 text-sm text-ink hover:bg-accent-50 focus:bg-accent-50 disabled:text-ink-muted disabled:cursor-not-allowed"
        role="menuitem"
        onClick={() => onExport('xlsx')}
        disabled={exporting}
      >
        Export as Excel (.xlsx)
      </button>
      <button
        type="button"
        className="block w-full px-2 py-2 text-left-2 text-sm text-ink hover:bg-accent-50 focus:bg-accent-50 disabled:text-ink-muted disabled:cursor-not-allowed"
        role="menuitem"
        onClick={() => onExport('pdf')}
        disabled={exporting}
      >
        Export as PDF (.pdf)
      </button>
      <button
        type="button"
        className="block w-full px-2 py-2 text-left-2 text-sm text-ink hover:bg-accent-50 focus:bg-accent-50 disabled:text-ink-muted disabled:cursor-not-allowed"
        role="menuitem"
        onClick={() => onExport('csv')}
        disabled={exporting}
      >
        Export as CSV (.csv)
      </button>
    </div>
  );

  return (
    <div className="relative inline-block text-left">
      <Button
        ref={buttonRef}
        type="button"
        variant="secondary"
        icon={Download}
        onClick={toggleOpen}
        id="export-menu-button"
        aria-haspopup="true"
        aria-expanded={open}
        disabled={exporting}
      >
        Export
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>
      {open && createPortal(dropdown, document.body)}
    </div>
  );
}

export default function NoticesReport() {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');

  const params = useMemo(() => {
    const p = {};
    if (year) p.year = year;
    if (month) p.month = month;
    if (date) p.date = date;
    return p;
  }, [year, month, date]);

  const fetchReport = useCallback(
    () => reportsService.getNoticeReport(params),
    [params]
  );

  const { data, loading, errorType, reload } = useReportData(
    fetchReport,
    [fetchReport]
  );

  const filtered = search ? data.filter((row) => searchFn(row, search.toLowerCase())) : data;

  const counts = useMemo(() => {
    const c = { total: data.length, featured: 0, public: 0, expired: 0 };
    data.forEach((r) => {
      if (r.is_featured) c.featured += 1;
      if (r.is_public) c.public += 1;
      if (isExpired(r)) c.expired += 1;
    });
    return c;
  }, [data]);

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
        <h2 className="text-lg font-semibold text-ink">Notices</h2>
        <p className="text-sm text-ink-muted">Browse and filter your parish notices</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatChip icon={Bell} label="Total" value={loading ? '' : counts.total} loading={loading} delay={0} />
        <StatChip icon={Star} label="Featured" value={loading ? '' : counts.featured} loading={loading} delay={30} />
        <StatChip icon={Globe} label="Public" value={loading ? '' : counts.public} loading={loading} delay={60} />
        <StatChip icon={CalendarX2} label="Expired" value={loading ? '' : counts.expired} loading={loading} delay={90} />
      </div>

      <div className="report-card rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: '110ms' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ReportFilter type="search" label="Search notices..." value={search} onChange={setSearch} />
          <ReportFilter type="select" label="Year" value={year} onChange={setYear} options={YEARS} />
          <ReportFilter type="select" label="Month" value={month} onChange={setMonth} options={MONTHS} />
          <ReportFilter type="date" label="Specific date" value={date} onChange={setDate} />
          <button
            onClick={reload}
            aria-label="Refresh"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-muted transition-colors hover:bg-surface-2 sm:ml-auto"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent-strong' : ''}`} />
          </button>
          <ExportDropdown filters={{ search, year, month, date }} />
        </div>
      </div>

      <div className="report-card rounded-2xl border border-border bg-surface overflow-hidden" style={{ animationDelay: '150ms' }}>
        <ReportTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="No notices found"
          emptyDescription="Try adjusting your filters."
        />
      </div>
    </div>
  );
}