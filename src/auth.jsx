import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from './api.js';
import { ROLES } from './constants.js';

// ---------------------------------------------------------------------------
// AuthContext — user, tokens, login/logout
// ---------------------------------------------------------------------------
// `undefined` (no default) rather than `null` lets useAuth()/usePermission()/
// useHasRole() reliably detect "no provider in the tree" vs. "provider
// present but nothing selected yet."
const AuthContext = createContext(undefined);

function clearStoredSession() {
  localStorage.removeItem('lfc_access_token');
  localStorage.removeItem('lfc_refresh_token');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // authError distinguishes "couldn't confirm the session because the
  // server/network failed" from "there is no session" — only the latter
  // should redirect to /login. The former should let the user retry.
  const [authError, setAuthError] = useState(null);

  const fetchCurrentUser = useCallback(() => {
    const token = localStorage.getItem('lfc_access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(null);

    // GET /accounts/me/ now returns { user: {...}, permissions: [...] } —
    // same shape as POST /accounts/login/.
    api
      .get('/accounts/me/')
      .then((res) => {
        setUser({ ...res.data.user, permissions: res.data.permissions ?? [] });
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          // Genuine auth failure — the refresh flow in api.js already had
          // its chance. Clear the session for real.
          clearStoredSession();
          setUser(null);
        } else {
          // Network error or server-side failure (5xx, timeout, offline).
          // The session may still be valid — don't log the user out over a
          // flaky connection. Keep the token, offer a retry instead.
          setAuthError(
            err.response
              ? 'Could not verify your session. Please try again.'
              : 'Network error — check your connection and try again.'
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(async (credentials) => {
    const res = await api.post('/accounts/login/', credentials);
    const { access, refresh, user: loggedInUser, permissions } = res.data;

    // Validate the shape before persisting anything — a malformed response
    // fails loudly here rather than silently corrupting local state.
    if (!access || !refresh || !loggedInUser || !loggedInUser.id) {
      throw new Error('Login response was missing required fields. Please try again.');
    }

    localStorage.setItem('lfc_access_token', access);
    localStorage.setItem('lfc_refresh_token', refresh);

    const userWithPermissions = { ...loggedInUser, permissions: permissions ?? [] };
    setUser(userWithPermissions);
    setAuthError(null);
    return userWithPermissions;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/accounts/settings/logout/');
    } catch {
      // ignore — clear local session regardless of server response
    } finally {
      clearStoredSession();
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, authError, retry: fetchCurrentUser, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// PermissionContext — derives role + permission list from the logged-in user
// ---------------------------------------------------------------------------
const PermissionContext = createContext(undefined);

export function PermissionProvider({ children }) {
  const { user } = useAuth();

  const value = useMemo(() => {
    const role = user?.role ?? null;
    const permissions = user?.permissions ?? [];

    // SuperAdmin bypass — the one place this check lives. Every other
    // hook/guard/gate routes through hasPermission() rather than comparing
    // role directly, so this stays the single source of truth.
    function hasPermission(permission) {
      if (role === ROLES.SUPERADMIN) return true;
      if (!permission) return true;
      return permissions.includes(permission);
    }

    return { role, permissions, hasPermission };
  }, [user]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission(permission) {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context.hasPermission(permission);
}

export function useHasRole(role) {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('useHasRole must be used within a PermissionProvider');
  }
  if (!role) return true;
  return context.role === role;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function AuthErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white border border-gray-100 rounded-xl shadow-sm p-6 text-center">
        <h3 className="text-base font-semibold text-gray-900 mb-1.5">Connection problem</h3>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <button
          onClick={onRetry}
          className="w-full h-10 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export function RequireAuth({ children }) {
  const { isAuthenticated, loading, authError, retry, user } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (authError && !user && localStorage.getItem('lfc_access_token')) {
    return <AuthErrorScreen message={authError} onRetry={retry} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export function ProtectedRoute({ permission, role, children }) {
  const hasPermission = usePermission(permission);
  const hasRole = useHasRole(role);

  if (!hasPermission || !hasRole) {
    return <PermissionDeniedRedirect />;
  }
  return children;
}

function PermissionDeniedRedirect() {
  const [showModal, setShowModal] = useState(true);
  const [redirect, setRedirect] = useState(false);

  if (redirect) return <Navigate to="/dashboard" replace />;

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">
              Permission Denied
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              You don't have access to this page. Contact a superadmin if you think this is a mistake.
            </p>
            <button
              onClick={() => {
                setShowModal(false);
                setRedirect(true);
              }}
              className="w-full h-10 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function PermissionGate({ permission, role, fallback = null, children }) {
  const hasPermission = usePermission(permission);
  const hasRole = useHasRole(role);
  return hasPermission && hasRole ? children : fallback;
}