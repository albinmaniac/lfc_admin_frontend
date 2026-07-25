import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Church, Lock, Mail, Sparkles, Users } from 'lucide-react';
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

const HERO_BADGE = 'Faith • Community • Grace';

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
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f7efe2_0%,#efe1c4_45%,#e8d4a8_100%)] p-4 sm:p-8">
      <div className="relative w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-[0_40px_120px_rgba(72,46,13,0.16)] md:min-h-[620px] md:grid-cols-[1.02fr_0.98fr]">
          <div className="flex flex-col justify-between bg-[linear-gradient(180deg,#ffffff_0%,#fcf8f1_60%,#f7efe2_100%)] p-8 sm:p-12 lg:p-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#8A5A12]/10 bg-[#fffaf1] px-3.5 py-2 text-sm font-medium text-[#7a4b10] shadow-sm">
                <Church className="h-4 w-4" />
                LFC Church Administration
              </div>

              <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-900 sm:text-[2.6rem]">
                Welcome back
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600">
                Access the parish portal with your secure credentials and manage ministry operations with clarity.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@lfcchurch.org"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-11 pr-4 text-sm text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus:border-[#8A5A12]/40 focus:bg-white"
                  />
                </div>

                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-white/90 py-3.5 pl-11 pr-4 text-sm text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus:border-[#8A5A12]/40 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-sm">
                  <label className="flex items-center gap-2 text-slate-500">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#8A5A12] focus:ring-[#8A5A12]" />
                    Remember me
                  </label>
                  <a href="#" className="font-medium text-[#8A5A12] hover:text-[#6E4710]">
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  className="h-13 w-full rounded-full bg-slate-900 py-3.5 text-sm font-medium text-white shadow-[0_14px_35px_rgba(15,23,42,0.22)] transition hover:bg-slate-800"
                  loading={submitting}
                  disabled={submitting}
                >
                  <span className="flex items-center justify-center gap-2">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Trouble signing in? <a href="#" className="font-medium text-slate-800">Contact the office</a>
              </p>
            </div>
          </div>

          <div className="relative hidden overflow-hidden bg-[#4a2f0a] md:flex md:min-h-[620px]">
            <img
              src="/church-bg.png"
              alt="Parish church background"
              className="absolute inset-0 h-full w-full object-cover object-center scale-[1.03]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_40%,rgba(0,0,0,0.35))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_35%)]" />

            <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-10">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3.5 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                {HERO_BADGE}
              </div>

              <div className="max-w-sm rounded-[24px] border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/80">Parish life</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Serving the community with care.</h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  A refined portal for ministry teams, parish staff, and leadership to stay connected.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-full border border-white/35 bg-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/25"
                >
                  Parish Life
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/25"
                >
                  <Users className="h-4 w-4" />
                  Our Ministries
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}