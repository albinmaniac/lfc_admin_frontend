import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { reportsService } from '../services';
import { ReportTable, ReportFilter, Badge, Button, formatDate, formatEnumLabel } from '../components';
import { RotateCcw, AlertTriangle, BookUser, Church, IdCard, Users, Download, ChevronDown } from 'lucide-react';
import { useReportData, ERROR_MESSAGES } from './hooks';

// Scoped keyframes for the staggered card/tab entrance — matches Dashboard.
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

function StatusBadge({ active }) {
  return <Badge variant={active ? 'success' : 'gray'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

function filenameFromDisposition(header, fallback) {
  if (!header) return fallback;
  // Try to extract filename from content-disposition
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(header);
  if (match && match[1]) {
    let filename = match[1].replace(/['"]/g, '');
    // Some user agents may wrap filename in quotes
    return filename || fallback;
  }
  return fallback;
}

function ExportDropdown({ exportFileName, filters }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8 + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [open]);

  useEffect(() => {
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
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('mousedown', onClick);
        document.removeEventListener('keydown', onKeyDown);
      };
    }
  }, [open]);

  const doExport = async (type) => {
    setOpen(false);
    setExporting(true);
    try {
      const res = await reportsService.exportReport({
        report: exportFileName,
        format: type,
        filters,
      });
      if (!res?.data) throw new Error('Empty export response');
      const blob = new Blob([res.data]);
      const header = res.headers && (res.headers['content-disposition'] || res.headers['Content-Disposition']);
      const fallback = `${exportFileName}.${type}`;
      const filename = filenameFromDisposition(header, fallback);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);
    } catch (err) {
      // Optionally, you could show a notification here
      // eslint-disable-next-line no-console
      console.error('Export failed', err);
    }
    setExporting(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => !exporting && setOpen((v) => !v)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2"
        disabled={exporting}
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="h-3 w-3" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            tabIndex={-1}
            className="fixed w-46 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ring-1 ring-black/5 z-[9999]"
            style={{
              top: menuPos.top,
              left: menuPos.left - 68,
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => doExport('csv')}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-2 hover:text-ink focus:bg-surface-2 focus:text-ink focus:outline-none"
              disabled={exporting}
            >
              Export as CSV (.csv)
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => doExport('xlsx')}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-2 hover:text-ink focus:bg-surface-2 focus:text-ink focus:outline-none"
              disabled={exporting}
            >
              Export as Excel (.xlsx)
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => doExport('pdf')}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-2 hover:text-ink focus:bg-surface-2 focus:text-ink focus:outline-none"
              disabled={exporting}
            >
              Export as PDF (.pdf)
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

function SubReportView({ fetchFn, columns, searchPlaceholder, searchFn, emptyTitle, exportFileName }) {
  const { data, loading, errorType, refetch } = useReportData(fetchFn);
  const [search, setSearch] = useState('');

  if (errorType) {
    return (
      <div className="report-card rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <p className="text-sm text-amber-700 dark:text-amber-400">{ERROR_MESSAGES[errorType]}</p>
        </div>
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  const filtered = search ? data.filter((row) => searchFn(row, search.toLowerCase())) : data;

  return (
    <div className="report-card space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ReportFilter type="search" label={searchPlaceholder} value={search} onChange={setSearch} />
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          {!loading && (
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted">
              {filtered.length.toLocaleString()} {filtered.length === 1 ? 'record' : 'records'}
            </span>
          )}
          <button
            onClick={refetch}
            aria-label="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink-muted transition-colors hover:bg-surface/70"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              style={loading ? { color: 'var(--accent)' } : undefined}
            />
          </button>
          <ExportDropdown exportFileName={exportFileName} filters={{ search }} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <ReportTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle={emptyTitle}
          emptyDescription="Try adjusting your search."
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------
const directoryColumns = [
  { key: 'house_name', header: 'House Name' },
  { key: 'address', header: 'Address' },
  { key: 'ward_number', header: 'Ward No.' },
  { key: 'family_unit', header: 'Family Unit' },
  { key: 'head_of_family', header: 'Head of Family', render: (r) => r.head_of_family || '—' },
  { key: 'total_members', header: 'Members' },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
  { key: 'updated_at', header: 'Updated', render: (r) => formatDate(r.updated_at) },
];
const directorySearch = (row, q) =>
  [row.house_name, row.address, row.family_unit, row.head_of_family].some((v) => v?.toLowerCase().includes(q));

// ---------------------------------------------------------------------------
// Unit-wise
// ---------------------------------------------------------------------------
const unitColumns = [
  { key: 'family_unit_name', header: 'Family Unit' },
  { key: 'saint', header: 'Patron Saint' },
  { key: 'phone_number', header: 'Phone' },
  { key: 'president_name', header: 'President', render: (r) => r.president_name || '—' },
  { key: 'secretary_name', header: 'Secretary', render: (r) => r.secretary_name || '—' },
  { key: 'total_families', header: 'Families' },
  { key: 'total_members', header: 'Members' },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
];
const unitSearch = (row, q) =>
  [row.family_unit_name, row.saint, row.president_name, row.secretary_name].some((v) => v?.toLowerCase().includes(q));

// ---------------------------------------------------------------------------
// Heads
// ---------------------------------------------------------------------------
const headsColumns = [
  { key: 'full_name', header: 'Name' },
  { key: 'phone_number', header: 'Phone' },
  { key: 'email', header: 'Email', render: (r) => r.email || '—' },
  { key: 'house_name', header: 'House' },
  { key: 'family_unit', header: 'Family Unit' },
  { key: 'occupation', header: 'Occupation', render: (r) => r.occupation || '—' },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
];
const headsSearch = (row, q) =>
  [row.full_name, row.house_name, row.family_unit, row.occupation].some((v) => v?.toLowerCase().includes(q));

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
const membersColumns = [
  { key: 'full_name', header: 'Name' },
  { key: 'gender', header: 'Gender', render: (r) => formatEnumLabel(r.gender) },
  { key: 'relationship', header: 'Relationship', render: (r) => formatEnumLabel(r.relationship) },
  { key: 'phone_number', header: 'Phone' },
  { key: 'email', header: 'Email', render: (r) => r.email || '—' },
  { key: 'house_name', header: 'House' },
  { key: 'family_unit', header: 'Family Unit' },
  {
    key: 'is_family_head',
    header: 'Head',
    render: (r) => (r.is_family_head ? <Badge variant="primary">Head</Badge> : '—'),
  },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
];
const membersSearch = (row, q) =>
  [row.full_name, row.house_name, row.family_unit, row.occupation].some((v) => v?.toLowerCase().includes(q));

// ---------------------------------------------------------------------------
const SUB_TABS = [
  { id: 'directory', label: 'Directory', icon: BookUser },
  { id: 'unit-wise', label: 'Unit-wise', icon: Church },
  { id: 'heads', label: 'Heads', icon: IdCard },
  { id: 'members', label: 'Members', icon: Users },
];

export default function FamiliesReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'directory';

  const setView = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'directory') next.delete('view');
    else next.set('view', id);
    setSearchParams(next);
  };

  const renderView = () => {
    switch (view) {
      case 'unit-wise':
        return (
          <SubReportView
            fetchFn={reportsService.getFamilyUnitReport}
            columns={unitColumns}
            searchFn={unitSearch}
            searchPlaceholder="Search family units..."
            emptyTitle="No family units found"
            exportFileName="family-unit-wise"
          />
        );
      case 'heads':
        return (
          <SubReportView
            fetchFn={reportsService.getFamilyHeadsReport}
            columns={headsColumns}
            searchFn={headsSearch}
            searchPlaceholder="Search family heads..."
            emptyTitle="No family heads found"
            exportFileName="family-heads"
          />
        );
      case 'members':
        return (
          <SubReportView
            fetchFn={reportsService.getFamilyMembersReport}
            columns={membersColumns}
            searchFn={membersSearch}
            searchPlaceholder="Search family members..."
            emptyTitle="No family members found"
            exportFileName="family-members"
          />
        );
      case 'directory':
      default:
        return (
          <SubReportView
            fetchFn={reportsService.getFamilyDirectory}
            columns={directoryColumns}
            searchFn={directorySearch}
            searchPlaceholder="Search families..."
            emptyTitle="No families found"
            exportFileName="family-directory"
          />
        );
    }
  };

  return (
    <div className="space-y-5">
      <ReportStyles />

      <div className="report-card">
        <h2 className="text-lg font-semibold text-ink">Families</h2>
        <p className="text-sm text-ink-muted">Browse and manage your parish family records</p>
      </div>

        <div className="report-card flex gap-2 overflow-x-auto pb-1" style={{ animationDelay: '60ms' }}>
          {SUB_TABS.map((t) => {
            const active = view === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-accent-strong bg-accent-strong text-accent-ink'
                    : 'border-border bg-surface text-ink-muted hover:bg-surface-2'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

      {renderView()}
    </div>
  );
}