import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { reportsService } from '../services';
import { useReportData, ERROR_MESSAGES } from './hooks';
import { ReportTable, ReportFilter, Badge, Button, formatDate, formatEnumLabel } from '../components';
import { RotateCcw, Users, UserCheck, UserMinus, Download, ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RETIRED', label: 'Retired' },
];

const STATUS_BADGE_VARIANT = {
  ACTIVE: 'success',
  RETIRED: 'gray',
};

// Helper to extract filename from content-disposition header
function filenameFromDisposition(header, fallback) {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
}

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

// ExportDropdown component for exporting the staff report
function ExportDropdown({ search, status }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [open]);

  async function handleExport(format) {
    setExporting(true);
    try {
      const resp = await reportsService.exportReport({
        report: 'staff',
        format,
        filters: {
          search,
          status,
        },
      });
      // Expecting Axios response with blob and headers
      const blob = resp.data;
      const disposition = resp.headers['content-disposition'];
      let fallbackName = `staff.${format}`;
      if (format === 'xlsx') fallbackName = 'staff.xlsx';
      if (format === 'pdf') fallbackName = 'staff.pdf';
      if (format === 'csv') fallbackName = 'staff.csv';
      const filename = filenameFromDisposition(disposition, fallbackName);
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
    } catch (err) {
      window.alert('Failed to export report. Please try again.');
    }
    setExporting(false);
    setOpen(false);
  }

  // Only render menu if open (portal to body)
  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="z-50 rounded-lg border border-border bg-surface shadow-lg min-w-[10rem] text-sm absolute"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            minWidth: menuPos.width,
          }}
        >
          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors disabled:opacity-60"
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            tabIndex={0}
            type="button"
          >
            <Download className="h-4 w-4" /> Excel (.xlsx)
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors disabled:opacity-60"
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            tabIndex={0}
            type="button"
          >
            <Download className="h-4 w-4" /> PDF (.pdf)
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-surface-2 transition-colors disabled:opacity-60"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            tabIndex={0}
            type="button"
          >
            <Download className="h-4 w-4" /> CSV (.csv)
          </button>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Export"
        className="flex h-8 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-ink-muted transition-colors hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
        disabled={exporting}
        style={{ marginLeft: 8 }}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {menu}
    </>
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

function Avatar({ url, name }) {
  if (!url) {
    return (
      <div className="h-8 w-8 rounded-full bg-surface-2 flex items-center justify-center text-xs font-medium text-ink-muted">
        {name?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  }
  return <img src={url} alt={name} className="h-8 w-8 rounded-full object-cover" />;
}

const columns = [
  {
    key: 'name',
    header: 'Name',
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <Avatar url={r.photo_url} name={r.name} />
        <span>{r.name}</span>
      </div>
    ),
  },
  { key: 'designation', header: 'Designation' },
  { key: 'email', header: 'Email', render: (r) => r.email || '—' },
  { key: 'phone_number', header: 'Phone', render: (r) => r.phone_number || '—' },
  { key: 'start_date', header: 'Start Date', render: (r) => formatDate(r.start_date) },
  { key: 'end_date', header: 'End Date', render: (r) => (r.end_date ? formatDate(r.end_date) : '—') },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <Badge variant={STATUS_BADGE_VARIANT[r.status] || 'gray'}>{formatEnumLabel(r.status)}</Badge>,
  },
];

const searchFn = (row, q) => [row.name, row.designation, row.email].some((v) => v?.toLowerCase().includes(q));

export default function StaffReport() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const fetchFn = useMemo(
    () => () => reportsService.getStaffReport(status ? { status } : undefined),
    [status]
  );

  const { data, loading, errorType, refetch } = useReportData(fetchFn);

  const filtered = search ? data.filter((row) => searchFn(row, search.toLowerCase())) : data;

  const counts = useMemo(() => {
    const c = { total: data.length, active: 0, retired: 0 };
    data.forEach((r) => {
      if (r.status === 'ACTIVE') c.active += 1;
      else if (r.status === 'RETIRED') c.retired += 1;
    });
    return c;
  }, [data]);

  if (errorType) {
    return (
      <div className="report-card rounded-2xl border border-warning-500/30 bg-warning-50 p-5">
        <ReportStyles />
        <p className="mb-3 text-sm text-warning-700">{ERROR_MESSAGES[errorType]}</p>
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReportStyles />

      <div>
        <h2 className="text-lg font-semibold text-ink">Staff</h2>
        <p className="text-sm text-ink-muted">Browse and manage parish staff records</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatChip icon={Users} label="Total" value={loading ? '' : counts.total} loading={loading} delay={0} />
        <StatChip icon={UserCheck} label="Active" value={loading ? '' : counts.active} loading={loading} delay={30} />
        <StatChip icon={UserMinus} label="Retired" value={loading ? '' : counts.retired} loading={loading} delay={60} />
      </div>

      <div className="report-card rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: '90ms' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ReportFilter type="search" label="Search staff..." value={search} onChange={setSearch} />
          <ReportFilter type="select" label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <button
          onClick={refetch}
          aria-label="Refresh"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-muted transition-colors hover:bg-surface-2 sm:ml-auto"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-accent-strong' : ''}`} />
        </button>
        <ExportDropdown search={search} status={status} />
        </div>
      </div>

      <div className="report-card rounded-2xl border border-border bg-surface overflow-hidden" style={{ animationDelay: '130ms' }}>
        <ReportTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="No staff found"
          emptyDescription="Try adjusting your filters."
        />
      </div>
    </div>
  );
}