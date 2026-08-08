import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Church, CheckCircle2, Send } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "react-hot-toast";
import { accountsService } from "../services";

// Scoped keyframes for the staggered card entrance — matches Login/MyProfile.
function AuthStyles() {
  return (
    <style>{`
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
  );
}

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
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <AuthStyles />

      <div className="auth-in w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-lg sm:p-10">
        <div className="mb-8 flex flex-col items-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-strong/15">
            <Church className="h-7 w-7 text-accent-strong" />
          </span>
          <h1 className="text-2xl font-bold text-ink">LFC Church</h1>
        </div>

        {!success ? (
          <>
            <h2 className="mb-2 text-center text-xl font-semibold text-ink">
              Forgot Password
            </h2>
            <p className="mb-6 text-center text-sm text-ink-muted">
              Enter your email address and we'll send you a password reset link.
            </p>

            <form className="w-full" onSubmit={handleSubmit} autoComplete="on">
              <div className="mb-5">
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                  Email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    className="pl-10"
                    placeholder="you@email.com"
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
                className="w-full"
                loading={submitting}
                disabled={submitting}
              >
                Send Reset Link
              </Button>
            </form>

            <div className="mt-6 flex w-full justify-center">
              <Link
                to="/login"
                className="flex items-center gap-2 text-sm font-medium text-accent-strong transition-colors hover:opacity-80"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </>
        ) : (
          <div className="auth-in flex w-full flex-col items-center" aria-live="polite">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
              <CheckCircle2 className="h-8 w-8 text-success-600" />
            </span>
            <h2 className="mb-2 text-center text-xl font-semibold text-ink">
              Password Reset Link Sent
            </h2>
            <p className="mb-6 text-center text-sm text-ink-muted">
              If an account exists with this email address, we've sent a password reset link. Please check your inbox and spam folder.
            </p>
            <Button as={Link} to="/login" className="w-full">
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;