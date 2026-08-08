import { forwardRef } from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Shared date/time formatting — use this instead of new Date(x).toLocaleString()
// scattered across pages, so date display stays consistent app-wide.
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });
}

// Shared enum-label formatting — turns backend enum values like
// PARISH_FEAST or MALE into readable text (Parish Feast, Male).
// Use this instead of redefining the same split/capitalize logic per page.
export function formatEnumLabel(value) {
  if (!value) return '—';

  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
const BUTTON_VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong shadow-sm shadow-accent/20',
  secondary: 'bg-surface text-ink border border-border hover:bg-surface-2',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-2',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading = false, disabled, className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
// "primary" here now renders as a soft lime chip rather than lavender — the
// variant name stays the same since call sites (e.g. Events.jsx's
// STATUS_BADGE map) already reference it by that key.
const BADGE_VARIANTS = {
  gray: 'bg-surface-2 text-ink-muted',
  primary: 'bg-accent/25 text-accent-ink',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
};

export function Badge({ variant = 'gray', className = '', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Trend chip — the small "+12%" pill used inside SummaryCard. Exported on
// its own too, in case a page wants the same trend indicator somewhere
// outside a SummaryCard (e.g. next to a table total).
// ---------------------------------------------------------------------------
export function TrendChip({ value, className = '' }) {
  if (value === null || value === undefined) return null;
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isPositive ? 'bg-accent/25 text-accent-ink' : 'bg-danger-50 text-danger-600'
      } ${className}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------
export function Switch({ checked, onChange, disabled = false, label }) {
  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-accent-strong' : 'bg-surface-2'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-1'}`} />
      </button>
      {label && <span className="text-sm text-ink">{label}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Input (basic text input, used inside forms across pages)
// ---------------------------------------------------------------------------
export const Input = forwardRef(function Input({ className = '', error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full h-10 rounded-xl border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong ${error ? 'border-danger-400' : 'border-border'} ${className}`}
      {...props}
    />
  );
});

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------
export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
        {description && <p className="text-sm text-ink-muted mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------
export function DataTable({
  columns,
  data = [],
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription,
  rowActions,
  getRowKey = (row, i) => row.id ?? i,
}) {
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-border last:border-0">
            <div className="h-4 w-1/4 bg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-surface-2 rounded animate-pulse" />
            <div className="h-4 w-1/6 bg-surface-2 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-surface border border-border rounded-2xl">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <h3 className="text-sm font-semibold text-ink">{emptyTitle}</h3>
          {emptyDescription && <p className="text-sm text-ink-muted mt-1 max-w-sm">{emptyDescription}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              {columns.map((col) => (
                <th key={col.key} className="text-left font-medium text-ink-muted px-4 py-3 whitespace-nowrap">
                  {col.header}
                </th>
              ))}
              {rowActions && <th className="w-px px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={getRowKey(row, i)} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-ink whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {rowActions && <td className="px-4 py-3 text-right">{rowActions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard (small stat card — used on Dashboard and other list pages)
// ---------------------------------------------------------------------------
// `trend` prop (a plain number, e.g. 12 or -4) renders the pill chip next
// to the icon. Fully backward compatible — every existing call site that
// doesn't pass `trend` renders exactly as before, just on the flat
// surface/border card instead of glass.
export function SummaryCard({ icon: Icon, title, value, description, trend, loading }) {
  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 rounded-xl bg-surface-2" />
          <div className="h-5 w-12 rounded-full bg-surface-2" />
        </div>
        <div className="h-3 w-1/2 bg-surface-2 rounded mb-2" />
        <div className="h-8 w-1/3 bg-surface-2 rounded" />
      </div>
    );
  }
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
            <Icon className="h-5 w-5 text-accent-ink" />
          </div>
        )}
        <TrendChip value={trend} />
      </div>
      <p className="text-sm text-ink-muted">{title}</p>
      <p className="text-4xl font-bold text-ink mt-1 tabular-nums tracking-tight">{value ?? '—'}</p>
      {description && <p className="text-xs text-ink-muted mt-1.5">{description}</p>}
    </div>
  );
}
// ==================== Reports ====================
// Stat tiles reuse the existing SummaryCard (icon/title/value/trend/loading) —
// no separate report stat-card component needed.

// Proportional breakdown bars — e.g. dashboard record counts, category splits
export function ReportBreakdown({ title, rows }) {
  // rows: [{ key, label, value }]
  const max = Math.max(...rows.map((r) => r.value || 0), 1);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h3 className="text-base font-semibold text-ink mb-5">{title}</h3>
      <div className="space-y-4">
        {rows.map((row) => {
          const pct = Math.round(((row.value || 0) / max) * 100);
          return (
            <div key={row.key}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-ink">{row.label}</span>
                <span className="text-ink-muted tabular-nums">{row.value}</span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-strong transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Wraps the real DataTable with a report-specific toolbar: filters + export button
export function ReportTable({
  columns,
  data,
  loading,
  filters,
  onExport,
  exportLoading,
  emptyTitle,
  emptyDescription,
  getRowKey,
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {(filters || onExport) && (
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          {filters}
          {onExport && (
            <Button variant="secondary" size="sm" onClick={onExport} loading={exportLoading} className="ml-auto">
              Export
            </Button>
          )}
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        getRowKey={getRowKey}
      />
    </div>
  );
}

// Filter controls composed inside a ReportTable's toolbar
export function ReportFilter({ type = 'search', label, value, onChange, options }) {
  const fieldClass =
    'h-9 rounded-xl border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong';

  if (type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        <option value="">{label}</option>
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === 'date') {
    return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />;
  }

  return (
    <input type="text" placeholder={label} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass} />
  );
}

// For any report that returns real time-series data (none confirmed yet)
export function ReportChart({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h3 className="text-base font-semibold text-ink mb-4">{title}</h3>
      {children}
    </div>
  );
}
