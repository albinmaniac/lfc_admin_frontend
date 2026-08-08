import { NavLink, Outlet } from "react-router-dom";
import { Users, KeyRound, ShieldCheck } from "lucide-react";

const TABS = [
  { to: "/user-management/users", label: "Users", icon: Users, end: true },
  
  { to: "/user-management/password-reset", label: "Password Reset", icon: KeyRound },
];

// Scoped keyframes for the entrance — matches other report/list pages.
function PageStyles() {
  return (
    <style>{`
      @keyframes umCardIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .um-in {
        animation: umCardIn 0.35s ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        .um-in { animation: none; }
      }
    `}</style>
  );
}

export default function UserManagement() {
  return (
    <div className="flex h-full w-full min-w-0 flex-col p-6">
      <PageStyles />

      <div className="um-in mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-strong/15 text-accent-strong">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-ink">User Management</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Manage user accounts and password reset requests.
          </p>
        </div>
      </div>

      <div className="um-in mb-6 flex gap-2 overflow-x-auto pb-1" style={{ animationDelay: "60ms" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-accent-strong bg-accent-strong text-accent-ink"
                    : "border-border bg-surface text-ink-muted hover:bg-surface-2"
                }`
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </NavLink>
          );
        })}
      </div>

      <div
        className="um-in min-h-0 w-full flex-1"
        style={{ animationDelay: "110ms" }}
      >
        <Outlet />
      </div>
    </div>
  );
}