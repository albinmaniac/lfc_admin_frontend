import { useState, useMemo } from 'react';
import { useAuth } from '../auth';
import { reportsService } from '../services';
import { Button } from '../components';
import {
  Download,
  ShieldAlert,
  CheckCircle2,
  Check,
  FileSpreadsheet,
  FileText,
  Table2,
  Home,
  HeartHandshake,
  CalendarDays,
  Users,
  IdCard,
  FileDown,
} from 'lucide-react';

const REPORT_GROUPS = [
  {
    label: 'Families',
    icon: Home,
    options: [
      { value: 'family-directory', label: 'Family Directory' },
      { value: 'family-unit-wise', label: 'Family Units' },
      { value: 'family-heads', label: 'Family Heads' },
      { value: 'family-members', label: 'Family Members' },
    ],
  },
  {
    label: 'Parish Groups',
    icon: HeartHandshake,
    options: [
      { value: 'group-directory', label: 'Group Directory' },
      { value: 'group-members', label: 'Group Members' },
      { value: 'group-leaders', label: 'Group Leaders' },
      { value: 'group-statistics', label: 'Group Statistics' },
    ],
  },
  {
    label: 'Events & Notices',
    icon: CalendarDays,
    options: [
      { value: 'events', label: 'Events' },
      { value: 'notices', label: 'Notices' },
    ],
  },
  {
    label: 'Users & Security',
    icon: Users,
    options: [
      { value: 'login-history', label: 'Login History' },
      { value: 'invitations', label: 'Invitations' },
      { value: 'recent-users', label: 'Recent Users' },
      { value: 'disabled-users', label: 'Disabled Accounts' },
      { value: 'permission-audit', label: 'Permission Audit' },
      { value: 'sessions', label: 'Active Sessions' },
    ],
  },
  {
    label: 'Staff',
    icon: IdCard,
    options: [{ value: 'staff', label: 'Staff' }],
  },
];

const REPORT_OPTIONS = REPORT_GROUPS.flatMap((g) => g.options);
const REPORT_META = REPORT_GROUPS.reduce((acc, g) => {
  g.options.forEach((o) => {
    acc[o.value] = { groupLabel: g.label, icon: g.icon, label: o.label };
  });
  return acc;
}, {});

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV', description: 'Plain text, opens anywhere', icon: Table2 },
  { value: 'xlsx', label: 'Excel', description: 'Formatted spreadsheet', icon: FileSpreadsheet },
  { value: 'pdf', label: 'PDF', description: 'Print-ready document', icon: FileText },
];

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

function StepLabel({ number, children }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-strong text-[11px] font-bold text-accent-ink">
        {number}
      </span>
      <h3 className="text-sm font-semibold text-ink">{children}</h3>
    </div>
  );
}

function CategoryTile({ group, active, count, onClick }) {
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${
        active
          ? 'border-accent-strong bg-accent-strong text-accent-ink shadow-sm'
          : 'border-border bg-surface text-ink hover:bg-surface-2'
      }`}
      style={{ minWidth: 116 }}
    >
      <Icon className="h-4.5 w-4.5" />
      <div>
        <p className="text-xs font-semibold leading-tight">{group.label}</p>
        <p className={`mt-0.5 text-[11px] ${active ? 'text-accent-ink/75' : 'text-ink-muted'}`}>
          {count} report{count !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  );
}

function ReportRow({ option, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
        active
          ? 'border-accent-strong bg-accent-strong/10 text-ink'
          : 'border-transparent bg-surface hover:bg-surface-2 text-ink'
      }`}
    >
      <span className="font-medium">{option.label}</span>
      <span
        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          active ? 'border-accent-strong bg-accent-strong' : 'border-border'
        }`}
      >
        {active && <Check className="h-3 w-3 text-accent-ink" strokeWidth={3} />}
      </span>
    </button>
  );
}

function FormatCard({ option, active, onClick }) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? 'border-accent-strong bg-accent-strong text-accent-ink'
          : 'border-border bg-surface text-ink hover:bg-surface-2'
      }`}
    >
      {active && (
        <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-ink/15">
          <Check className="h-3 w-3 text-accent-ink" strokeWidth={3} />
        </span>
      )}
      <Icon className="h-5 w-5" />
      <div>
        <p className="text-sm font-semibold">{option.label}</p>
        <p className={`mt-0.5 text-xs ${active ? 'text-accent-ink/80' : 'text-ink-muted'}`}>
          {option.description}
        </p>
      </div>
    </button>
  );
}

export default function ExportReport() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [activeGroup, setActiveGroup] = useState(REPORT_GROUPS[0].label);
  const [report, setReport] = useState('');
  const [format, setFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastExported, setLastExported] = useState(null);

  const currentGroup = useMemo(
    () => REPORT_GROUPS.find((g) => g.label === activeGroup),
    [activeGroup]
  );

  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <ShieldAlert className="mx-auto mb-3 text-ink-muted" size={22} />
        <p className="text-sm text-ink-muted">Report export is only available to SuperAdmins.</p>
      </div>
    );
  }

  const selectedMeta = report ? REPORT_META[report] : null;
  const SelectedIcon = selectedMeta?.icon;
  const selectedFormatMeta = FORMAT_OPTIONS.find((f) => f.value === format);

  const handleSelectGroup = (label) => {
    setActiveGroup(label);
    setReport('');
    setError(null);
  };

  const handleExport = async () => {
    if (!report) {
      setError('Choose a report to export.');
      return;
    }
    setLoading(true);
    setError(null);
    setLastExported(null);
    try {
      const res = await reportsService.exportReport({ report, format, filters: {} });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameFromDisposition(res.headers?.['content-disposition'], `${report}.${format}`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setLastExported({
        label: REPORT_OPTIONS.find((r) => r.value === report)?.label,
        format: format.toUpperCase(),
      });
    } catch (err) {
      setError('Export failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <ReportStyles />

      <div>
        <h2 className="text-lg font-semibold text-ink">Export a Report</h2>
        <p className="text-sm text-ink-muted">Download any parish report as CSV, Excel, or PDF</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ------------------------------------------------------------ */}
        {/* Left: selection flow                                        */}
        {/* ------------------------------------------------------------ */}
        <div className="space-y-4 lg:col-span-2">
          {/* Step 1 — category */}
          <div className="report-card rounded-2xl border border-border bg-surface p-4">
            <StepLabel number={1}>Choose a category</StepLabel>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {REPORT_GROUPS.map((g) => (
                <CategoryTile
                  key={g.label}
                  group={g}
                  count={g.options.length}
                  active={activeGroup === g.label}
                  onClick={() => handleSelectGroup(g.label)}
                />
              ))}
            </div>
          </div>

          {/* Step 2 — specific report */}
          <div className="report-card rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: '60ms' }}>
            <StepLabel number={2}>Choose a report</StepLabel>
            <div className="space-y-1.5">
              {currentGroup.options.map((opt) => (
                <ReportRow
                  key={opt.value}
                  option={opt}
                  active={report === opt.value}
                  onClick={() => {
                    setReport(opt.value);
                    setError(null);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Step 3 — format */}
          <div className="report-card rounded-2xl border border-border bg-surface p-4" style={{ animationDelay: '110ms' }}>
            <StepLabel number={3}>Choose a format</StepLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FORMAT_OPTIONS.map((opt) => (
                <FormatCard
                  key={opt.value}
                  option={opt}
                  active={format === opt.value}
                  onClick={() => setFormat(opt.value)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Right: sticky summary + export action                       */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-1">
          <div
            className="report-card sticky top-4 space-y-4 rounded-2xl border border-border bg-surface p-5"
            style={{ animationDelay: '160ms' }}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-strong/15 text-accent-strong">
                <FileDown className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-ink">Export summary</h3>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                <span className="text-ink-muted">Report</span>
                {selectedMeta ? (
                  <span className="flex items-center gap-1.5 text-right font-medium text-ink">
                    <SelectedIcon className="h-3.5 w-3.5 shrink-0 text-accent-strong" />
                    {selectedMeta.label}
                  </span>
                ) : (
                  <span className="text-right text-ink-muted">Not selected</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                <span className="text-ink-muted">Format</span>
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <selectedFormatMeta.icon className="h-3.5 w-3.5 shrink-0 text-accent-strong" />
                  {selectedFormatMeta.label}
                </span>
              </div>
            </div>

            {!report && (
              <p className="text-xs text-ink-muted">Select a report above to enable export.</p>
            )}

            {error && <p className="text-sm text-danger-600">{error}</p>}

            {lastExported && !loading && (
              <div className="report-card flex items-center gap-2 rounded-xl border border-success-500/30 bg-success-50 px-3 py-2 text-xs text-success-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Exported <span className="font-semibold">{lastExported.label}</span> as {lastExported.format}
                </span>
              </div>
            )}

            <Button
              variant="primary"
              icon={Download}
              loading={loading}
              disabled={!report || loading}
              onClick={handleExport}
              className="w-full"
            >
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}