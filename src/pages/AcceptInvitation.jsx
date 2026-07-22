import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { accountsService } from '../services.js';
import { Button, Input } from '../components.jsx';

function extractErrorMessage(err, fallback = 'This invitation link is invalid or expired') {
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

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm_password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Catch the mismatch instantly, before a round-trip to the server —
    // the backend enforces this too, but there's no reason to wait for it.
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      // POST /api/accounts/accept-invitation/
      // AcceptInvitationSerializer expects: token, password, confirm_password
      await accountsService.acceptInvitation({
        token,
        password: form.password,
        confirm_password: form.confirm_password,
      });
      toast.success('Account activated — please sign in');
      navigate('/login');
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
          <h1 className="text-lg font-semibold text-gray-900">Set your password</h1>
          <p className="text-sm text-gray-500">Complete your LFC Church account setup</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <Input
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <Input
                type="password"
                name="confirm_password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
              Activate Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}