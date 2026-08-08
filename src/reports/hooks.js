import { useEffect, useState, useCallback, useRef } from 'react';

export const ERROR_MESSAGES = {
  auth: 'Your session has expired. Please sign in again.',
  forbidden: "You don't have permission to view this report.",
  server: 'Something went wrong loading this report. Please try again.',
  network: 'Network error — check your connection and try again.',
};

// Fetches a report's data on mount, tracks loading/error state, and guards
// against setting state after unmount. Scoped to the Reports module — every
// report file (Families, Groups, Staff, Users, ...) uses this instead of
// redefining the same fetch/loading/error boilerplate.
export function useReportData(fetchFn) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchReport = useCallback(() => {
    setLoading(true);
    setErrorType(null);
    fetchFn()
      .then((res) => {
        if (!mountedRef.current) return;
        setData(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        if (!err.response) setErrorType('network');
        else if (err.response.status === 401) setErrorType('auth');
        else if (err.response.status === 403) setErrorType('forbidden');
        else setErrorType('server');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [fetchFn]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    data,
    loading,
    errorType,
    reload: fetchReport,
    refetch: fetchReport,
  };
}