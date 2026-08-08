import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, LogOut, ChevronDown, ChevronLeft, Sun, Moon, Mail, Copy, User as UserIcon } from 'lucide-react';
import { FaInstagram, FaLinkedin, FaFacebook } from 'react-icons/fa';
import { NAVIGATION, ROLES, ROUTES } from './constants.js';
import { useAuth, usePermission, useHasRole } from './auth.jsx';
import { parishService } from './services.js';
import ColorBends from './components/ColorBends.jsx';

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

function Sidebar({ parish, collapsed, setCollapsed, mobileOpen, setMobileOpen, theme, toggleTheme }) {
  const { logout } = useAuth();
  const parishLogo = parish?.logo_url || null;

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
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center ${collapsed ? 'h-10 w-10' : 'h-7 w-7'} rounded-lg`}>
              {parishLogo ? (
                <img
                  src={parishLogo}
                  alt={parish?.name}
                  className={`${collapsed ? "h-10 w-10" : "h-12 w-12"} object-contain`}
                  loading="eager"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-ink text-xs font-bold">
                  L
                </span>
              )}
            </span>
            {!collapsed && (
              <span className="font-semibold tracking-tight text-ink">LFC Church</span>
            )}
          </div>
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

function Navbar({ onOpenSidebar, parish }) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user
    ? user.full_name || user.username || user.email || 'User'
    : '';
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
  const userEmail = user?.email || '';
  const userRole = user?.role || '';
  const profilePhoto = user?.profile_photo || null;

  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(now);
  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

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
          placeholder="Global search (Coming soon)"
          className="w-full h-9 rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none opacity-60 cursor-not-allowed"
          disabled
        />
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0" ref={profileRef}>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2"
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-accent text-accent-ink flex items-center justify-center text-xs font-semibold shrink-0">
                {userInitial}
              </div>
            )}
            <span className="hidden md:block text-sm font-medium text-ink">{displayName || 'User'}</span>
            <ChevronDown className="hidden md:block h-3.5 w-3.5 text-ink-muted" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-[360px] rounded-3xl shadow-2xl z-50 border border-border overflow-hidden bg-surface">
              {/* Decorative animated band — the effect lives here only,
                  contained by relative+isolate (the fix Login was missing),
                  so it can't bleed into or fight with the content below. */}
              <div className="relative isolate h-24 overflow-hidden">
                <div className="absolute inset-0 -z-10">
                  <ColorBends
                    className="h-full w-full"
                    colors={["#D7F369", "#90AB8B", "#5E7F63"]}
                    rotation={90}
                    speed={0.15}
                    scale={1.2}
                    frequency={1}
                    warpStrength={0.9}
                    mouseInfluence={0.3}
                    noise={0.05}
                    parallax={0.2}
                    iterations={2}
                    intensity={1.4}
                    bandWidth={5}
                    transparent={false}
                    autoRotate={5}
                  />
                </div>
                {/* Minimal scrim, only where the date/time text sits, so the
                    animation stays visible everywhere else in the band. */}
                <div className="absolute inset-x-0 top-0 h-9 bg-gradient-to-b from-black/25 to-transparent" />
                <div className="absolute top-2.5 inset-x-4 flex items-center justify-between text-[11px] font-medium text-white drop-shadow-sm">
                  <span>{formattedDate}</span>
                  <span>{formattedTime}</span>
                </div>
              </div>

              {/* Solid content panel — everything functional lives on a
                  fully opaque bg-surface, no blur/glass fighting for
                  legibility. Avatar overlaps the seam between the two. */}
              <div className="relative -mt-9 px-5 pb-5">
                <div className="flex flex-col items-center">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={displayName}
                      className="h-[72px] w-[72px] rounded-full object-cover border-4 border-surface shadow-md relative z-10"
                    />
                  ) : (
                    <div className="h-[72px] w-[72px] rounded-full bg-accent text-accent-ink flex items-center justify-center text-2xl font-bold border-4 border-surface shadow-md relative z-10">
                      {userInitial}
                    </div>
                  )}

                  <div className="mt-3 text-base font-semibold text-ink text-center">{displayName}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-success-600">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-500" />
                    Online
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 bg-accent text-accent-ink text-sm font-semibold hover:opacity-90 transition"
                    onClick={() => {
                      setProfileOpen(false);
                      requestAnimationFrame(() => {
                        navigate(ROUTES.MY_PROFILE);
                      });
                    }}
                    type="button"
                  >
                    <UserIcon className="h-3.5 w-3.5" />
                    My Profile
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 bg-surface-2 text-ink text-sm font-semibold hover:bg-surface-2/70 transition"
                    onClick={() => {
                      if (userEmail) navigator.clipboard.writeText(userEmail);
                    }}
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Email
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-border text-center text-sm text-ink-muted">
                  {userRole.replace(/_/g, ' ')} &bull; {parish?.name ?? 'LFC Church'}
                </div>

                <button
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-danger-600 hover:bg-danger-50 transition"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="shrink-0 border-t border-border px-4 lg:px-6 py-3 text-xs text-ink-muted bg-surface">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} LFC Church Management System.</p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between mt-2 gap-2">
        <span />
        <div className="flex items-center gap-2 sm:justify-end w-full">
          <span>
            Developed by <span className="font-medium text-ink">Albin Mathew</span> <span className="text-ink-muted">(@albinmaniac)</span>
          </span>
          <a href="https://www.instagram.com/albinmaniac/" className="text-ink-muted hover:text-accent transition-colors" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
            <FaInstagram className="h-4 w-4" />
          </a>
          <a href="https://www.linkedin.com/in/albinmathew-0761-/" className="text-ink-muted hover:text-accent transition-colors" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
            <FaLinkedin className="h-4 w-4" />
          </a>
          <a href="https://www.facebook.com/albinmaniac/" className="text-ink-muted hover:text-accent transition-colors" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
            <FaFacebook className="h-4 w-4" />
          </a>
          <a href="mailto:albin07work@gmail.com" className="text-ink-muted hover:text-accent transition-colors" aria-label="Email" target="_blank" rel="noopener noreferrer">
            <Mail className="h-4 w-4" />
          </a>
        </div>
      </div>
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
  const [parish, setParish] = useState(null);

  const handleSetCollapsed = useCallback((next) => {
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // ignore storage errors (private browsing, quota, etc.)
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    parishService
      .getParishDetail()
      .then((res) => setParish(res.data))
      .catch(() => setParish(null));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar
        parish={parish}
        collapsed={collapsed}
        setCollapsed={handleSetCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onOpenSidebar={() => setMobileOpen(true)} parish={parish} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}