import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Church, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Check, X } from 'lucide-react'
import { Button } from "../components/ui/button";
import { toast } from 'react-hot-toast'
import { accountsService } from '../services'
import ColorBends from "../components/ColorBends";
import Strands from "../components/Strands";

function PasswordToggle({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? 'Hide password' : 'Show password'}
      aria-pressed={shown}
      className="absolute inset-y-0 right-3 flex items-center text-ink-muted transition-colors hover:text-ink"
    >
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

export default function ResetPassword() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const meetsLength = password.trim().length >= 8
  const matches = confirmPassword.length > 0 && password.trim() === confirmPassword.trim()
  const mismatch = confirmPassword.length > 0 && !matches

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('Invalid or expired password reset link.')
      return
    }
    if (!password.trim() || !confirmPassword.trim()) {
      toast.error('Both password fields are required.')
      return
    }
    if (password.trim() !== confirmPassword.trim()) {
      toast.error('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await accountsService.resetPassword({
        token,
        new_password: password.trim(),
        confirm_password: confirmPassword.trim(),
      })
      setSuccess(true)
    } catch (error) {
      const detail = error.response?.data?.detail
      if (detail && typeof detail === 'object') {
        toast.error(Object.values(detail)[0])
      } else {
        toast.error(
          detail ||
            error.response?.data?.message ||
            'Unable to reset password.'
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg text-ink p-4 sm:p-8">
      {/* Same animated background as Login/ForgotPassword — identical
          colors, rotation, speed — so the whole pre-auth flow reads as
          one continuous visual language. */}
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
              {success ? (
                <div className="flex flex-col items-center text-center md:items-start md:text-left" aria-live="polite">
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
                    <CheckCircle2 className="h-8 w-8 text-success-600" />
                  </span>
                  <h1 className="mb-2 text-2xl font-semibold text-ink">Password Updated</h1>
                  <p className="mb-6 text-sm text-ink-muted">
                    Your password has been changed successfully. Please sign in using your new password.
                  </p>
                  {/* Keep asChild consistent with the project's Button API. */}
                  <Button asChild className="h-12 w-full rounded-full">
                    <Link to="/login">Go to Login</Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-8 flex flex-col items-center md:items-start">
                    <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-strong/15">
                      <Church className="h-7 w-7 text-accent-strong" />
                    </span>
                    <h1 className="text-2xl font-semibold text-ink">Reset Password</h1>
                    <p className="mt-1 text-center text-sm text-ink-muted md:text-left">
                      Enter your new password below to update your account.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div>
                      <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-ink">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={submitting}
                          aria-required="true"
                          aria-label="New password"
                          required
                          className="h-12 w-full rounded-2xl border border-border bg-surface py-3.5 pl-4 pr-10 text-sm text-ink shadow-[0_8px_24px_rgba(15,23,42,0.04)] placeholder:text-ink-muted focus:border-accent-strong focus:outline-none disabled:opacity-60"
                        />
                        <PasswordToggle shown={showPassword} onClick={() => setShowPassword((s) => !s)} />
                      </div>
                      {password.length > 0 && (
                        <p className={`mt-1.5 flex items-center gap-1 text-xs ${meetsLength ? 'text-success-600' : 'text-ink-muted'}`}>
                          {meetsLength ? <Check className="h-3 w-3" /> : <span className="h-1 w-1 rounded-full bg-ink-muted" />}
                          Minimum 8 characters required
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-ink">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={submitting}
                          aria-required="true"
                          aria-label="Confirm password"
                          required
                          className="h-12 w-full rounded-2xl border border-border bg-surface py-3.5 pl-4 pr-10 text-sm text-ink shadow-[0_8px_24px_rgba(15,23,42,0.04)] placeholder:text-ink-muted focus:border-accent-strong focus:outline-none disabled:opacity-60"
                        />
                        <PasswordToggle shown={showPassword} onClick={() => setShowPassword((s) => !s)} />
                      </div>
                      {confirmPassword.length > 0 && (
                        <p className={`mt-1.5 flex items-center gap-1 text-xs ${matches ? 'text-success-600' : 'text-danger-600'}`}>
                          {matches ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {matches ? 'Passwords match' : "Passwords don't match"}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      icon={KeyRound}
                      className="h-12 w-full rounded-full"
                      loading={submitting}
                      disabled={submitting || (confirmPassword.length > 0 && mismatch)}
                    >
                      Update Password
                    </Button>
                  </form>

                  <div className="mt-6 text-center md:text-left">
                    <Link
                      to="/login"
                      className="inline-flex items-center text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Back to Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Visual panel — same Strands component, same colors, same
              props as Login/ForgotPassword so the whole flow feels like one. */}
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
  )
}