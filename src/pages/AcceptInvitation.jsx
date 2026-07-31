import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Lock } from 'lucide-react';
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

    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
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
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-bg">
      {/* Animated ambient background — soft accent blobs drifting slowly.
          Pure CSS, no images/WebGL, so this stays fast on a page most
          people reach cold (straight from an email link, no warm bundle
          cache) — see the ColorBends tradeoff discussion. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl animate-[drift1_16s_ease-in-out_infinite]" style={{ background: 'color-mix(in srgb, var(--accent-strong) 25%, transparent)' }} />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full blur-3xl animate-[drift2_20s_ease-in-out_infinite]" style={{ background: 'color-mix(in srgb, var(--brand-accent) 20%, transparent)' }} />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full blur-3xl animate-[drift1_18s_ease-in-out_infinite_reverse]" style={{ background: 'color-mix(in srgb, var(--accent-strong) 15%, transparent)' }} />
      </div>
      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.08); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 40px) scale(1.05); }
        }
      `}</style>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-accent mx-auto mb-4 flex items-center justify-center text-accent-ink font-bold text-2xl shadow-lg shadow-accent-strong/25">
            L
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-xs font-medium text-accent-strong shadow-sm mb-3">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Invitation confirmed
          </div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Set your password</h1>
          <p className="text-sm text-ink-muted mt-1">Complete your LFC Church account setup</p>
        </div>

        <div className="bg-surface/90 backdrop-blur-sm border border-border rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink mb-1.5">
                <Lock className="h-3.5 w-3.5 text-ink-muted" />
                New Password
              </label>
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
              <label className="flex items-center gap-1.5 text-sm font-medium text-ink mb-1.5">
                <Lock className="h-3.5 w-3.5 text-ink-muted" />
                Confirm Password
              </label>
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

        <p className="text-center text-xs text-ink-muted mt-6">
          © {new Date().getFullYear()} LFC Church Management System
        </p>
      </div>
    </div>
  );
}