import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../auth";
import { dashboardService } from "../services";
import { SummaryCard, Button } from "../components";
import {
  Users,
  Home,
  CalendarDays,
  Megaphone,
  UserCog,
  Image,
  RotateCcw,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email || 'User'
    : '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // null | 'auth' | 'forbidden' | 'server' | 'network'

  // Guards against setState firing after the component has unmounted
  // (e.g. navigating away while the request is still in flight).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSummary = useCallback(() => {
    setLoading(true);
    setErrorType(null);

    dashboardService
      .getSummary()
      .then((res) => {
        if (!mountedRef.current) return;
        setData(res.data);
      })
      .catch((err) => {
        if (!mountedRef.current) return;

        if (!err.response) {
          setErrorType('network');
          return;
        }

        const status = err.response.status;
        if (status === 401) {
          setErrorType('auth');
        } else if (status === 403) {
          setErrorType('forbidden');
        } else {
          setErrorType('server');
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const cards = [
    { key: 'families', label: 'Total Families', icon: Users, value: data?.families?.total ?? 0 },
    { key: 'family_units', label: 'Active Family Units', icon: Home, value: data?.family_units?.active ?? 0 },
    { key: 'events', label: 'Upcoming Events', icon: CalendarDays, value: data?.events?.upcoming ?? 0 },
    { key: 'notices', label: 'Active Notices', icon: Megaphone, value: data?.notices?.active ?? 0 },
    { key: 'staffs', label: 'Active Staff', icon: UserCog, value: data?.staffs?.active ?? 0 },
    { key: 'gallery', label: 'Photos', icon: Image, value: data?.gallery?.photos ?? 0 },
  ];

  const ERROR_MESSAGES = {
    auth: 'Your session has expired. Please sign in again.',
    forbidden: "You don't have permission to view the dashboard summary.",
    server: 'Something went wrong loading your dashboard. Please try again.',
    network: 'Network error — check your connection and try again.',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Welcome back{displayName ? `, ${displayName}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {data?.parish?.name ? `${data.parish.name} — here's today's overview.` : "Here's what's happening in the parish today."}
        </p>
      </div>

      {errorType ? (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <p className="text-sm text-danger-600 mb-3">{ERROR_MESSAGES[errorType]}</p>
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={fetchSummary}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ key, label, icon, value }) => (
            <SummaryCard key={key} icon={icon} title={label} value={value} loading={loading} />
          ))}
        </div>
      )}
    </div>
  );
}