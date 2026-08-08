import { useEffect, useMemo, useState } from "react";
import {
  Search,
  User as UserIcon,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  Crown,
  Briefcase,
  Users as UsersIcon,
  Home,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { accountsService } from "../services";
import { toast } from "react-hot-toast";

const ROLE_OPTIONS = [
  { label: "All roles", value: "" },
  { label: "Super Admin", value: "SUPERADMIN" },
  { label: "Staff", value: "STAFF" },
  { label: "Group Leader", value: "GROUP_LEADER" },
  { label: "Family Unit President", value: "FAMILY_UNIT_PRESIDENT" },
];

const STATUS_OPTIONS = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const PAGE_SIZE = 20;

// Real backend role values. Colors are literal hex (not Tailwind gray-100/
// blue-100 etc.) since those break in dark mode — same pattern used for
// chart color palettes elsewhere in the app.
const ROLE_META = {
  SUPERADMIN: { label: "Super Admin", icon: Crown, color: "var(--accent-strong)" },
  STAFF: { label: "Staff", icon: Briefcase, color: "#C99A3D" },
  GROUP_LEADER: { label: "Group Leader", icon: UsersIcon, color: "#2F7566" },
  FAMILY_UNIT_PRESIDENT: { label: "Family Unit President", icon: Home, color: "#8B3F63" },
};

function getRoleBadge(role) {
  const meta = ROLE_META[role];
  if (!meta) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-muted">
        <Shield size={12} />
        Unknown Role
      </span>
    );
  }
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function getStatusBadge(isActive) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">
        <UserCheck size={12} />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-xs font-medium text-danger-700">
      <UserX size={12} />
      Inactive
    </span>
  );
}

function getAvatarLetter(name) {
  if (!name) return "U";
  return name.trim().charAt(0).toUpperCase();
}

function displayName(user) {
  return user.full_name?.trim() || "No Name";
}

function Avatar({ user, size = "w-9 h-9" }) {
  if (user.profile_photo) {
    return (
      <img
        src={user.profile_photo}
        alt={displayName(user)}
        className={`${size} shrink-0 rounded-full border border-border object-cover`}
      />
    );
  }
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full border border-border bg-bg font-bold text-ink`}
    >
      {getAvatarLetter(user.full_name)}
    </span>
  );
}

function formatLastLogin(dateStr) {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// Compact skeleton row shown while a page of results is loading, so the
// table shell (headers, filter bar) never disappears — only the rows.
function SkeletonRow() {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-surface-2" />
          <div className="h-3.5 w-32 animate-pulse rounded bg-surface-2" />
        </div>
      </td>
      <td className="px-6 py-4"><div className="h-3.5 w-40 animate-pulse rounded bg-surface-2" /></td>
      <td className="px-6 py-4"><div className="h-5 w-24 animate-pulse rounded-full bg-surface-2" /></td>
      <td className="px-6 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-surface-2" /></td>
      <td className="px-6 py-4"><div className="h-3.5 w-28 animate-pulse rounded bg-surface-2" /></td>
      <td className="px-6 py-4"><div className="h-8 w-24 animate-pulse rounded-2xl bg-surface-2" /></td>
    </tr>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce the raw search input so we don't hit the backend on every
  // keystroke — server-side filtering means each change is a network call.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change resets pagination back to page 1.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  const params = useMemo(() => {
    const p = { page, page_size: PAGE_SIZE };
    if (debouncedSearch) p.search = debouncedSearch;
    if (role) p.role = role;
    if (status) p.status = status;
    return p;
  }, [debouncedSearch, role, status, page]);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (debouncedSearch) chips.push({ key: "search", label: `"${debouncedSearch}"`, clear: () => setSearch("") });
    if (role) chips.push({ key: "role", label: ROLE_OPTIONS.find((r) => r.value === role)?.label, clear: () => setRole("") });
    if (status) chips.push({ key: "status", label: STATUS_OPTIONS.find((s) => s.value === status)?.label, clear: () => setStatus("") });
    return chips;
  }, [debouncedSearch, role, status]);

  const hasActiveFilters = activeFilters.length > 0;

  const clearAllFilters = () => {
    setSearch("");
    setRole("");
    setStatus("");
  };

  const fetchUsers = async (queryParams, showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const response = await accountsService.listUsers(queryParams);
      // DRF paginated responses return { count, next, previous, results }.
      const data = response?.data ?? response;
      const results = data?.results ?? data ?? [];
      setUsers(results);
      setCount(data?.count ?? results.length);
    } catch (e) {
      toast.error("Failed to fetch users");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers(params, false);
    setRefreshing(false);
    toast.success("User list refreshed");
  };

  const handleActivate = async (user) => {
    if (!window.confirm(`Activate user "${displayName(user)}" (${user.email})?`)) return;
    try {
      await accountsService.activateUser(user.id);
      await fetchUsers(params, false);
      toast.success("User activated");
    } catch (e) {
      toast.error("Failed to activate user");
    }
  };

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate user "${displayName(user)}" (${user.email})?`)) return;
    try {
      await accountsService.deactivateUser(user.id);
      await fetchUsers(params, false);
      toast.success("User deactivated");
    } catch (e) {
      toast.error("Failed to deactivate user");
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const rangeStart = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="flex h-full w-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">User Management</h1>
          <p className="text-sm text-ink-muted">
            Manage user accounts and account status.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={refreshing ? "animate-spin" : ""} size={18} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-3 flex shrink-0 flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full rounded-2xl border border-border bg-surface py-2 pl-9 pr-3 text-ink focus:outline-none focus:ring-2 focus:ring-accent-strong/40"
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-2xl border border-border bg-surface px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent-strong/40"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Filter by role"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-border bg-surface px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent-strong/40"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter chips + result count */}
      <div className="mb-4 flex min-h-[28px] shrink-0 flex-wrap items-center gap-2">
        {hasActiveFilters ? (
          <>
            {activeFilters.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink transition hover:border-danger-700/40 hover:text-danger-700"
              >
                {chip.label}
                <X size={12} />
              </button>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Clear all
            </button>
            <span className="ml-auto text-xs text-ink-muted" aria-live="polite">
              {loading ? "Searching…" : `${count} matching user${count === 1 ? "" : "s"}`}
            </span>
          </>
        ) : (
          <span className="ml-auto text-xs text-ink-muted" aria-live="polite">
            {loading ? "Loading…" : `${count} user${count === 1 ? "" : "s"} total`}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {!loading && users.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-ink-muted">
            <UserIcon size={36} />
            {hasActiveFilters ? (
              <>
                <span>No users match these filters.</span>
                <button
                  onClick={clearAllFilters}
                  className="text-sm font-medium text-accent-strong hover:underline"
                >
                  Clear filters to see everyone
                </button>
              </>
            ) : (
              <span>No users yet.</span>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:flex">
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-border bg-surface-2 shadow-[0_1px_0_0_var(--border)]">
                      <th className="bg-surface-2 px-6 py-3 text-left text-xs font-semibold text-ink-muted">User</th>
                      <th className="bg-surface-2 px-6 py-3 text-left text-xs font-semibold text-ink-muted">Email</th>
                      <th className="bg-surface-2 px-6 py-3 text-left text-xs font-semibold text-ink-muted">Role</th>
                      <th className="bg-surface-2 px-6 py-3 text-left text-xs font-semibold text-ink-muted">Status</th>
                      <th className="bg-surface-2 px-6 py-3 text-left text-xs font-semibold text-ink-muted">Last Login</th>
                      <th className="bg-surface-2 px-6 py-3 text-left text-xs font-semibold text-ink-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-border transition last:border-b-0 hover:bg-bg"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar user={user} />
                              <span className="font-medium text-ink">{displayName(user)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-ink">{user.email}</td>
                          <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                          <td className="px-6 py-4">{getStatusBadge(user.is_active)}</td>
                          <td className="px-6 py-4 text-ink-muted">{formatLastLogin(user.last_login)}</td>
                          <td className="px-6 py-4">
                            {user.is_active ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeactivate(user)}
                                className="flex items-center gap-1"
                              >
                                <UserX size={16} />
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleActivate(user)}
                                className="flex items-center gap-1"
                              >
                                <UserCheck size={16} />
                                Activate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="flex flex-col gap-4 overflow-auto md:hidden">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-surface-2" />
                        <div className="flex flex-col gap-1.5">
                          <div className="h-3.5 w-28 animate-pulse rounded bg-surface-2" />
                          <div className="h-3 w-36 animate-pulse rounded bg-surface-2" />
                        </div>
                      </div>
                      <div className="h-8 w-full animate-pulse rounded-2xl bg-surface-2" />
                    </div>
                  ))
                : users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="w-10 h-10" />
                        <div>
                          <div className="font-medium text-ink">{displayName(user)}</div>
                          <div className="text-xs text-ink-muted">{user.email}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.is_active)}
                      </div>
                      <div className="mt-1 text-xs text-ink-muted">
                        Last Login: {formatLastLogin(user.last_login)}
                      </div>
                      <div className="mt-2 flex gap-2">
                        {user.is_active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(user)}
                            className="flex w-full items-center gap-1"
                          >
                            <UserX size={16} />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleActivate(user)}
                            className="flex w-full items-center gap-1"
                          >
                            <UserCheck size={16} />
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
            </div>

            {/* Pagination */}
            {count > PAGE_SIZE && (
              <div className="mt-4 flex shrink-0 items-center justify-between text-sm text-ink-muted">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {count}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </Button>
                  <span className="px-1">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}