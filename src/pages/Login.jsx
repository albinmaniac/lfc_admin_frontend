import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Church, Lock, Mail } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { Button, Input } from '../components.jsx';
import ColorBends from "../components/ColorBends";
import Strands from '../components/Strands';

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
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg text-ink p-4 sm:p-8">
      <div className="absolute inset-0 -z-30 overflow-hidden">
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
      <div className="absolute inset-0 -z-20 bg-black/10" />
      {/* Animated ambient background — same technique as AcceptInvitation.jsx
          so the two pre-auth pages read as a matched pair. Pure CSS, no
          image asset to fail to load. Re-pointed to theme variables — these
          were still on the old sage/clay/teal hex from before the palette
          pivot, sitting redundantly under ColorBends' own animated colors. */}
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

      <div className="relative w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-[36px] border border-border bg-surface backdrop-blur-sm shadow-[0_40px_120px_rgba(30,50,30,0.12)] md:min-h-[620px] md:grid-cols-[1.02fr_0.98fr]">
          <div className="flex flex-col justify-between bg-surface p-8 sm:p-12 lg:p-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3.5 py-2 text-sm font-medium text-accent-ink shadow-sm">
                <Church className="h-4 w-4" />
                LFC Church Administration
              </div>

              <h1 className="mt-8 text-4xl font-semibold tracking-tight text-ink sm:text-[2.6rem]">
                Welcome back
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-7 text-ink-muted">
                Access the parish portal with your secure credentials and manage ministry operations with clarity.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@lfcchurch.org"
                    className="h-12 w-full rounded-2xl border border-border bg-surface py-3.5 pl-11 pr-4 text-sm text-ink shadow-[0_8px_24px_rgba(15,23,42,0.04)] placeholder:text-ink-muted focus:border-accent-strong"
                  />
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                  <Input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="h-12 w-full rounded-2xl border border-border bg-surface py-3.5 pl-11 pr-4 text-sm text-ink shadow-[0_8px_24px_rgba(15,23,42,0.04)] placeholder:text-ink-muted focus:border-accent-strong"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-sm">
                  <label className="flex items-center gap-2 text-ink-muted">
                    <input type="checkbox" className="h-4 w-4 rounded border-border text-accent-strong focus:ring-accent-strong" />
                    Remember me
                  </label>
                  <a href="#" className="font-medium text-ink hover:opacity-80">
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full"
                  loading={submitting}
                  disabled={submitting}
                >
                  <span className="flex items-center justify-center gap-2">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-muted">
                Trouble signing in? <a href="#" className="font-medium text-ink">Contact the office</a>
              </p>
            </div>
          </div>

          <div className="relative hidden md:block min-h-[620px] overflow-hidden bg-black">
            <Strands
              className="absolute inset-0"
              colors={["#D7F369", "#5E7F63", "#90AB8B"]}
              count={3}
              speed={0.45}
              amplitude={1}
              waviness={1}
              thickness={0.7}
              glow={2.8}
              taper={3}
              spread={1}
              intensity={0.7}
              saturation={1.6}
              opacity={1}
              scale={1.5}
              glass={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}