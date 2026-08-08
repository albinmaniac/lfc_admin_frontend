import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Church, CheckCircle2, Send } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "react-hot-toast";
import { accountsService } from "../services";
import ColorBends from "../components/ColorBends";
import Strands from "../components/Strands";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await accountsService.forgotPassword({ email: normalizedEmail });
      setSuccess(true);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          "Failed to send reset email."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg text-ink p-4 sm:p-8">
      {/* Same animated background as Login — same colors, same rotation,
          same speed — so this reads as the same app, not a second theme. */}
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
      {/* Ambient drift blobs — identical to Login.jsx so the pre-auth flow
          reads as one continuous visual language across pages. */}
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
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-in {
          animation: authCardIn 0.4s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-in { animation: none; }
        }
      `}</style>

      <div className="relative w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-[36px] border border-border bg-surface backdrop-blur-sm shadow-[0_40px_120px_rgba(30,50,30,0.12)] md:min-h-[620px] md:grid-cols-[1.02fr_0.98fr]">
          {/* Form panel */}
          <div className="flex flex-col justify-center bg-surface p-8 sm:p-12 lg:p-14">
            <div className="auth-in mx-auto w-full max-w-md">
              <div className="mb-8 flex flex-col items-center md:items-start">
                <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-strong/15">
                  <Church className="h-7 w-7 text-accent-strong" />
                </span>
                <h1 className="text-2xl font-bold text-ink">LFC Church</h1>
              </div>

              {!success ? (
                <>
                  <h2 className="mb-2 text-center text-xl font-semibold text-ink md:text-left">
                    Forgot Password
                  </h2>
                  <p className="mb-6 text-center text-sm text-ink-muted md:text-left">
                    Enter your email address and we'll send you a password reset link.
                  </p>

                  <form className="w-full" onSubmit={handleSubmit} autoComplete="on">
                    <div className="mb-5">
                      <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          id="email"
                          type="email"
                          className="h-12 w-full rounded-2xl border border-border bg-surface py-3.5 pl-11 pr-4 text-sm text-ink shadow-[0_8px_24px_rgba(15,23,42,0.04)] placeholder:text-ink-muted focus:border-accent-strong focus:outline-none"
                          placeholder="you@lfcchurch.org"
                          autoFocus
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={submitting}
                          required
                          autoComplete="email"
                          aria-label="Email address"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      icon={Send}
                      className="h-12 w-full rounded-full"
                      loading={submitting}
                      disabled={submitting}
                    >
                      <span className="flex items-center justify-center gap-2">
                        Send Reset Link
                      </span>
                    </Button>
                  </form>

                  <div className="mt-6 flex w-full justify-center md:justify-start">
                    <Link
                      to="/login"
                      className="flex items-center gap-2 text-sm font-medium text-accent-strong transition-colors hover:opacity-80"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </Link>
                  </div>

                  <p className="mt-6 text-center text-sm text-ink-muted md:text-left">
                    Trouble signing in? <span className="font-medium text-ink">Contact the parish office</span>
                  </p>
                </>
              ) : (
                <div className="auth-in flex w-full flex-col items-center md:items-start" aria-live="polite">
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
                    <CheckCircle2 className="h-8 w-8 text-success-600" />
                  </span>
                  <h2 className="mb-2 text-center text-xl font-semibold text-ink md:text-left">
                    Password Reset Link Sent
                  </h2>
                  <p className="mb-6 text-center text-sm text-ink-muted md:text-left">
                    If an account exists with this email address, we've sent a password reset link. Please check your inbox and spam folder.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent-strong px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-strong/40"
                  >
                    Back to Login
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Visual panel — same Strands component, same colors, same
              props as Login so the two pages feel like one flow. */}
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
};

export default ForgotPassword;