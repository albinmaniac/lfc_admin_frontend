import { useState } from 'react'
import { Link, NavLink, useParams } from 'react-router-dom'
import { Church, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Check, X } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { toast } from 'react-hot-toast'
import { accountsService } from '../services'

// Scoped keyframes for the staggered card entrance — matches ForgotPassword/Login.
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
  )
}

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

  if (success) {
    return (
      
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
        <AuthStyles />
        <div
          className="auth-in w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-lg"
          aria-live="polite"
        >
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <CheckCircle2 className="h-8 w-8 text-success-600" />
          </span>
          <h1 className="mb-2 text-2xl font-semibold text-ink">Password Updated</h1>
          <p className="mb-6 text-sm text-ink-muted">
            Your password has been changed successfully. Please sign in using your new password.
          </p>
          {/* Keep asChild consistent with the project's Button API. */}
          <Button asChild className="w-full">
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <AuthStyles />
      <div className="auth-in w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-lg sm:p-10">
        <div className="mb-8 flex flex-col items-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-strong/15">
            <Church className="h-7 w-7 text-accent-strong" />
          </span>
          <h1 className="text-2xl font-semibold text-ink">Reset Password</h1>
          <p className="mt-1 text-center text-sm text-ink-muted">
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
                className="pr-10 w-full rounded-xl border border-border bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-strong disabled:opacity-60"
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
                className="pr-10 w-full rounded-xl border border-border bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-strong disabled:opacity-60"
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
            className="w-full"
            loading={submitting}
            disabled={submitting || (confirmPassword.length > 0 && mismatch)}
          >
            Update Password
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}