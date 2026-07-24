import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Menu, X, Search, LogOut, ChevronDown, ChevronLeft } from 'lucide-react';
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

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors border-l-2 ${
          isActive
            ? 'bg-primary-50 text-primary-700 border-primary-600'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-transparent'
        } ${collapsed ? 'justify-center px-2' : ''}`
      }
    >
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
        <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {group.label}
        </p>
      )}
      <div className="space-y-0.5">
        {(visibleItems ?? []).map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-green border-r border-gray-200 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
          {!collapsed && <span className="font-semibold text-gray-900 tracking-tight">LFC Church</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {NAVIGATION.map((group) => (
            <NavGroup
              key={group.label}
              group={group}
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}

function Navbar({ onOpenSidebar }) {
  const { user, logout } = useAuth();
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
    <header className="h-14 shrink-0 flex items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        onClick={onOpenSidebar}
        className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 shrink-0"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full h-9 rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:bg-white"
        />
      </div>

      {/* Notifications hidden until a real notification backend/endpoint
          exists — showing a bell with a badge implied unread activity that
          was never real. */}

      <div className="ml-auto flex items-center gap-2 shrink-0" ref={profileRef}>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100"
          >
            <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">{displayName || 'User'}</span>
            <ChevronDown className="hidden md:block h-3.5 w-3.5 text-gray-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-100 bg-white shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100 px-4 lg:px-6 py-3 text-xs text-gray-400">
      <p>© {new Date().getFullYear()} LFC Church Management System.</p>
      <p>v1.0.0</p>
    </footer>
  );
}

const SIDEBAR_COLLAPSED_KEY = 'lfc_sidebar_collapsed';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSetCollapsed = useCallback((next) => {
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // ignore storage errors (private browsing, quota, etc.) — collapse
      // state just won't persist, not worth surfacing to the user
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
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