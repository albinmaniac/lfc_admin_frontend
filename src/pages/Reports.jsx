import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components';
import { Download, Loader2 } from 'lucide-react';
import DashboardReport from '../reports/Dashboard';
import FamiliesReport from '../reports/Families';
import EventsReport from '../reports/Events';
import NoticesReport from '../reports/Notices';
import GroupsReport from '../reports/Groups';
import StaffReport from '../reports/Staff';
import UsersReport from '../reports/Users';
import ExportReport from '../reports/Export';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'families', label: 'Families' },
  { id: 'groups', label: 'Groups' },
  { id: 'events', label: 'Events' },
  { id: 'notices', label: 'Notices' },
  { id: 'users', label: 'Users & Security' },
  { id: 'staff', label: 'Staff' },
  { id: 'export', label: 'Export', icon: Download },
];

function ComingSoon({ label }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-10 text-center text-ink-muted">
      <Loader2 className="mx-auto mb-3 opacity-40" size={22} />
      <p className="text-sm">{label} reports are wired up next.</p>
    </div>
  );
}

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || 'dashboard';

  const setCategory = (id) => {
    setSearchParams(id === 'dashboard' ? {} : { category: id });
  };

  const renderCategory = () => {
    switch (category) {
      case 'dashboard':
        return <DashboardReport />;
      case 'families':
        return <FamiliesReport />;
      case 'events':
        return <EventsReport />;
      case 'notices':
        return <NoticesReport />;
      case 'groups':
        return <GroupsReport />;
      case 'staff':
        return <StaffReport />;
      case 'users':
        return <UsersReport />;
      case 'export':
        return <ExportReport />;
      default:
        return <ComingSoon label={TABS.find((t) => t.id === category)?.label || category} />;
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Parish-wide statistics, membership trends, and activity summaries."
      />

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {TABS.map((t) => {
          const active = category === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCategory(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
                active
                  ? 'bg-accent text-accent-ink border-accent'
                  : 'bg-surface text-ink-muted border-border hover:bg-surface-2'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {renderCategory()}
    </div>
  );
}