import axios from 'axios';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://lfc-backend.onrender.com/api/';
// Normalize away a trailing slash so URL concatenation below never produces
// a double slash regardless of how VITE_API_BASE_URL is set.
const BASE_URL = RAW_BASE_URL.endsWith('/') ? RAW_BASE_URL.slice(0, -1) : RAW_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s — prevents requests hanging indefinitely on a dead connection
});

// ---------------------------------------------------------------------------
// Request interceptor — attach the access token to every outgoing request.
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lfc_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Refresh queue — when multiple requests 401 at the same moment (e.g. a page
// that fires several parallel GETs right as the access token expires), only
// ONE refresh call is made. Every other failed request waits for that single
// refresh to resolve, then retries with the new token. Without this, N
// simultaneous 401s would previously fire N refresh calls and race each
// other, sometimes logging the user out incorrectly.
// ---------------------------------------------------------------------------
let isRefreshing = false;
let refreshQueue = []; // { resolve, reject } pairs waiting on the in-flight refresh

function resolveQueue(newToken) {
  refreshQueue.forEach(({ resolve }) => resolve(newToken));
  refreshQueue = [];
}

function rejectQueue(err) {
  refreshQueue.forEach(({ reject }) => reject(err));
  refreshQueue = [];
}

function clearSessionAndRedirect() {
  localStorage.removeItem('lfc_access_token');
  localStorage.removeItem('lfc_refresh_token');
  localStorage.removeItem('lfc_permissions');
  delete api.defaults.headers.common.Authorization;
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network error (no response at all — server unreachable, CORS failure,
    // timeout, offline, etc.) is fundamentally different from a 401 and
    // must not trigger the refresh/logout flow.
    if (!error.response) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest?.url?.includes('/token/refresh/') ||
      originalRequest?.url?.includes('/accounts/login/');

    // Never attempt to "refresh" the refresh call itself, or the login call
    // — a 401 from either of those means the credentials/refresh token are
    // genuinely invalid, not that the access token expired mid-session.
    if (error.response.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('lfc_refresh_token');

      if (!refreshToken) {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        // A refresh is already in flight — queue this request and retry it
        // once that refresh resolves, instead of firing a second refresh call.
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/token/refresh/`,
          { refresh: refreshToken },
          { timeout: 30000 }
        );

        localStorage.setItem('lfc_access_token', data.access);
        // Keep the instance-level default header in sync too, so any code
        // that reads api.defaults directly (or requests fired without going
        // through the per-request interceptor) still get the fresh token.
        api.defaults.headers.common.Authorization = `Bearer ${data.access}`;

        resolveQueue(data.access);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        rejectQueue(refreshError);
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    // 401 on the refresh/login endpoints themselves, or a retry that still
    // failed — nothing left to do but surface the error.
    if (error.response.status === 401 && isAuthEndpoint) {
      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  }
);

export default api;