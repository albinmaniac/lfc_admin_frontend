import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Menu, X, Search, LogOut, ChevronDown, ChevronLeft, Sun, Moon } from 'lucide-react';
import { NAVIGATION, ROLES } from './constants.js';
import { useAuth, usePermission, useHasRole } from './auth.jsx';

// Mirrors the exact bypass predicate usePermission/useHasRole use internally
// (SuperAdmin bypass, null permission = always allowed, otherwise membership
// check) — used here only to decide whether a whole NAV GROUP has anything
// visible in it, so we can skip rendering its header entirely. The actual
// per-item gating enforcement still happens in NavItem via the real hooks;
// this is a read-only mirror for a layout decision, not a second source of
// permission truth.
function isItemAllowed(user, permission, role) {
  const userRole = user?.role ?? null;
  const userPermissions = user?.permissions ?? [];
  const permissionOk = userRole === ROLES.SUPERADMIN || !permission || userPermissions.includes(permission);
  const roleOk = !role || userRole === role;
  return permissionOk && roleOk;
}

function NavItem({ item, collapsed, onNavigate }) {
  const allowed = usePermission(item.permission) && useHasRole(item.role);
  if (!allowed) return null;

  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      title={item.label}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-accent text-accent-ink font-semibold'
            : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
        } ${collapsed ? 'justify-center px-0 h-11 w-11 mx-auto' : ''}`
      }
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0" /> : <span className="h-5 w-5 shrink-0" />}
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

function NavGroup({ group, collapsed, onNavigate }) {
  const { user } = useAuth();

  const roleOk = !group.role || user?.role === group.role;
  const visibleItems = group.items ? group.items.filter((item) => isItemAllowed(user, item.permission, item.role)) : null;

  // Skip rendering entirely if the group's own role gate fails, or if it has
  // an items list and none of them would actually be visible.
  if (!roleOk) return null;
  if (visibleItems && visibleItems.length === 0) return null;

  return (
    <div className="mb-1">
      {!collapsed && (
        <p className="px-3.5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted/70">
          {group.label}
        </p>
      )}
      <div className="space-y-1">
        {(visibleItems ?? []).map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

// Flat, solid sidebar — no blur, no gradients, no SVG. Matches the
// reference: rounded logo mark, pill-highlighted active nav item, utility
// row (theme toggle + log out) pinned to the bottom.
function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, theme, toggleTheme }) {
  const { logout } = useAuth();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 flex flex-col bg-surface border-r border-border transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-ink text-xs font-bold">
                L
              </span>
              <span className="font-semibold tracking-tight text-ink">LFC Church</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAVIGATION.map((group) => (
            <NavGroup
              key={group.label}
              group={group}
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* Utility row — theme toggle + log out, pinned to the bottom like
            the reference's Help/Log Out block. "Help" was left out since
            there's no real help page behind it yet — a dead link isn't
            better UI just because the reference had one. */}
        <div className="border-t border-border px-3 py-3 space-y-1 shrink-0">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors ${
              collapsed ? 'justify-center px-0 h-11 w-11 mx-auto' : ''
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
            {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium text-ink-muted hover:bg-danger-50 hover:text-danger-600 transition-colors ${
              collapsed ? 'justify-center px-0 h-11 w-11 mx-auto' : ''
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function Navbar({ onOpenSidebar }) {
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Click-outside to close the profile dropdown.
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fallback chain: full name -> username -> email -> "User".
  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email || 'User'
    : '';

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 border-b border-border bg-surface px-4 lg:px-6">
      <button
        onClick={onOpenSidebar}
        className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 shrink-0"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full h-9 rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong focus-visible:bg-surface"
        />
      </div>

      {/* Notifications hidden until a real notification backend/endpoint
          exists — showing a bell with a badge implied unread activity that
          was never real. */}

      <div className="ml-auto flex items-center gap-2 shrink-0" ref={profileRef}>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2"
          >
            <div className="h-7 w-7 rounded-full bg-accent text-accent-ink flex items-center justify-center text-xs font-semibold shrink-0">
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium text-ink">{displayName || 'User'}</span>
            <ChevronDown className="hidden md:block h-3.5 w-3.5 text-ink-muted" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-surface shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-ink truncate">{displayName || 'User'}</p>
                <p className="text-xs text-ink-muted truncate">{user?.role}</p>
              </div>
              {/* Log out now lives in the sidebar's bottom utility row too —
                  kept here as well since it's a conventional place to look
                  for it, and removing it would be a behavior change beyond
                  what was asked for. */}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border px-4 lg:px-6 py-3 text-xs text-ink-muted">
      <p>© {new Date().getFullYear()} LFC Church Management System.</p>
      <p>v1.0.0</p>
    </footer>
  );
}

const SIDEBAR_COLLAPSED_KEY = 'lfc_sidebar_collapsed';
const THEME_KEY = 'lfc_theme';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore storage errors — fall through to system preference
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  const handleSetCollapsed = useCallback((next) => {
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // ignore storage errors (private browsing, quota, etc.) — collapse
      // state just won't persist, not worth surfacing to the user
    }
  }, []);

  // Applies/removes the `.dark` class that index.css's @custom-variant and
  // CSS-variable theme tokens key off of, and persists the choice.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors — theme just won't persist across reloads
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={handleSetCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}