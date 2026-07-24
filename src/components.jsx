import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
const BUTTON_VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
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
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
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
const BADGE_VARIANTS = {
  gray: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-50 text-primary-700',
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
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-1'}`} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
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
      className={`w-full h-10 rounded-lg border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${error ? 'border-danger-400' : 'border-gray-300'} ${className}`}
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
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{description}</p>}
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
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-gray-50 last:border-0">
            <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/6 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <h3 className="text-sm font-semibold text-gray-900">{emptyTitle}</h3>
          {emptyDescription && <p className="text-sm text-gray-500 mt-1 max-w-sm">{emptyDescription}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {columns.map((col) => (
                <th key={col.key} className="text-left font-medium text-gray-500 px-4 py-3 whitespace-nowrap">
                  {col.header}
                </th>
              ))}
              {rowActions && <th className="w-px px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={getRowKey(row, i)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
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
export function SummaryCard({ icon: Icon, title, value, description, loading }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 animate-pulse">
        <div className="h-9 w-9 rounded-lg bg-gray-200 mb-3" />
        <div className="h-3 w-1/2 bg-gray-200 rounded mb-2" />
        <div className="h-7 w-1/3 bg-gray-200 rounded" />
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
      {Icon && (
        <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center mb-3">
          <Icon className="h-4.5 w-4.5 text-primary-600" />
        </div>
      )}
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-0.5 tabular-nums">{value ?? '—'}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  );
}