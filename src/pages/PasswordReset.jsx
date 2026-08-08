import { useEffect, useMemo, useState } from "react";
import { Search, User as UserIcon, Shield, KeyRound, Crown, Briefcase, Users as UsersIcon, Home, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { accountsService } from "../services";
import { toast } from "react-hot-toast";

// -----------------------------------------------------------------------
// NOTE: The following helpers are duplicated from Users.jsx to satisfy the
// "deliver one file at a time" rule. They should be extracted into
// components.jsx as shared exports (getRoleBadge, Avatar, displayName,
// formatLastLogin, ROLE_META, ROLE_OPTIONS) with both Users.jsx and this
// file importing from there instead of redefining them. Flagging per
// project convention rather than silently duplicating.
// -----------------------------------------------------------------------

const ROLE_OPTIONS = [
  { label: "All roles", value: "" },
  { label: "Super Admin", value: "SUPERADMIN" },
  { label: "Staff", value: "STAFF" },
  { label: "Group Leader", value: "GROUP_LEADER" },
  { label: "Family Unit President", value: "FAMILY_UNIT_PRESIDENT" },
];

const ROLE_META = {
  SUPERADMIN: {
    label: "Super Admin",
    icon: Crown,
    className: "bg-accent-strong/15 text-accent-strong",
  },
  STAFF: {
    label: "Staff",
    icon: Briefcase,
    className: "bg-secondary/15 text-primary-strong",
  },
  GROUP_LEADER: {
    label: "Group Leader",
    icon: UsersIcon,
    className: "bg-info/15 text-info",
  },
  FAMILY_UNIT_PRESIDENT: {
    label: "Family Unit President",
    icon: Home,
    className: "bg-warning/15 text-warning",
  },
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
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function getAvatarLetter(name) {
  if (!name?.trim()) {
    return "U";
  }
  return name.trim()[0].toUpperCase();
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

// Compact skeleton row shown while results are loading, so the table shell
// (breadcrumb, header, filters) never disappears — only the rows.
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
      <td className="px-6 py-4"><div className="h-3.5 w-28 animate-pulse rounded bg-surface-2" /></td>
      <td className="px-6 py-4"><div className="h-8 w-36 animate-pulse rounded-2xl bg-surface-2" /></td>
    </tr>
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function PasswordReset() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => {
    const p = {};
    if (debouncedSearch) p.search = debouncedSearch;
    if (role) p.role = role;
    return p;
  }, [debouncedSearch, role]);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (debouncedSearch) chips.push({ key: "search", label: `"${debouncedSearch}"`, clear: () => setSearch("") });
    if (role) chips.push({ key: "role", label: ROLE_OPTIONS.find((r) => r.value === role)?.label, clear: () => setRole("") });
    return chips;
  }, [debouncedSearch, role]);

  const hasActiveFilters = activeFilters.length > 0;

  const clearAllFilters = () => {
    setSearch("");
    setRole("");
  };

  const fetchUsers = async (queryParams, showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const response = await accountsService.listPasswordResetUsers(queryParams);
      const data = response?.data ?? response;
      setUsers(data?.results ?? data ?? []);
    } catch (e) {
      toast.error("Failed to fetch users");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchUsers(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleSendReset = async (user) => {
    if (!window.confirm(`Send password reset email to ${displayName(user)} (${user.email})?`)) return;
    setSendingId(user.id);
    try {
      await accountsService.sendPasswordReset(user.id);
      toast.success("Password reset email sent successfully.");
    } catch (e) {
      const detail = e?.response?.data?.detail;
      let message;

      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        message = detail[0];
      } else if (detail && typeof detail === "object") {
        message = Object.values(detail)[0];
      } else {
        message = e?.response?.data?.message || "Unable to send password reset email.";
      }

      toast.error(message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col p-6">
      {/* Breadcrumb + Header */}
      <div className="mb-6 shrink-0">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <span>Users</span>
          <span>/</span>
          <span className="text-ink">Password Reset</span>
        </div>
        <h1 className="text-2xl font-bold text-ink">Password Reset</h1>
        <p className="text-sm text-ink-muted">
          Send a password reset email to any user account.
        </p>
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
              {loading ? "Searching…" : `${users.length} matching user${users.length === 1 ? "" : "s"}`}
            </span>
          </>
        ) : (
          <span className="ml-auto text-xs text-ink-muted" aria-live="polite">
            {loading ? "Loading…" : `${users.length} user${users.length === 1 ? "" : "s"}`}
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
              <span>No users found.</span>
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
                      <th className="bg-surface-2 px-6 py-3 text-left text-xs font-semibold text-ink-muted">Last Login</th>
                      <th className="bg-surface-2 px-6 py-3 text-left text-xs font-semibold text-ink-muted">Action</th>
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
                            <td className="px-6 py-4 text-ink-muted">{formatLastLogin(user.last_login)}</td>
                            <td className="px-6 py-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendReset(user)}
                                disabled={sendingId === user.id}
                                aria-label={`Send password reset email to ${displayName(user)}`}
                                className="flex items-center gap-1"
                              >
                                <KeyRound className={sendingId === user.id ? "animate-spin" : ""} size={16} />
                                {sendingId === user.id ? "Sending..." : "Send Reset Email"}
                              </Button>
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
                      <div className="mt-2 flex flex-wrap gap-2">{getRoleBadge(user.role)}</div>
                      <div className="mt-1 text-xs text-ink-muted">
                        Last Login: {formatLastLogin(user.last_login)}
                      </div>
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReset(user)}
                          disabled={sendingId === user.id}
                          aria-label={`Send password reset email to ${displayName(user)}`}
                          className="flex w-full items-center gap-1"
                        >
                          <KeyRound className={sendingId === user.id ? "animate-spin" : ""} size={16} />
                          {sendingId === user.id ? "Sending..." : "Send Reset Email"}
                        </Button>
                      </div>
                    </div>
                  ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}