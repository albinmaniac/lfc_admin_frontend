import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../auth.jsx';
import { Button, Input } from '../components.jsx';

function extractErrorMessage(err, fallback = 'Invalid email or password') {
  const data = err.response?.data;
  if (!data) return fallback;
  if (data.detail) return data.detail;
  if (typeof data === 'string') return data;
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value) && value.length) return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Trim the email before it ever reaches the API — stray whitespace
      // from copy-paste is a common cause of "invalid credentials" that
      // are actually correct credentials with a leading/trailing space.
      await login({ ...form, email: form.email.trim() });
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-11 w-11 rounded-lg bg-primary-600 mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <h1 className="text-lg font-semibold text-gray-900">LFC Church</h1>
          <p className="text-sm text-gray-500">Management System</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <Input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@lfcchurch.org"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <Input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}