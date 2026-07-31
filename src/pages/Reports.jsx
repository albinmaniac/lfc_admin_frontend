import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../components.jsx';

export default function Reports() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analytics and reporting for parish growth, attendance, and activity."
      />
      <div className="rounded-xl border border-border bg-surface py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
          <BarChart3 className="h-6 w-6 text-ink-muted" />
        </div>
        <h3 className="text-sm font-semibold text-ink">Reports coming soon</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          This module is waiting on backend reporting endpoints. It'll be built once those are available.
        </p>
      </div>
    </div>
  );
}