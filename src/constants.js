// ROUTES + PERMISSIONS + ROLES + sidebar navigation — all in one file.

import {
  Home,
  Clock3,
  Bell,
  CalendarDays,
  CalendarRange,
  PartyPopper,
  Images,
  Users,
  Building2,
  BarChart3,
  Shield,
  UserCog,
  MailPlus,
  Settings,
  UserCircle,
  UsersRound,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------
export const ROUTES = {
  LOGIN: '/login',
  ACCEPT_INVITATION: '/setup-password/:token',
  DASHBOARD: '/dashboard',
  MY_PROFILE: '/my-profile',
  USER_MANAGEMENT: "/user-management",
  USER_MANAGEMENT_USERS: "/user-management/users",
  USER_MANAGEMENT_PASSWORD_RESET: "/user-management/password-reset",

  MASS_TIMINGS: '/mass-timings',
  FAMILY_UNITS: '/family-units',
  FAMILIES: '/families',
  FAMILY_MEMBERS: '/family-members',
  PARISH_GROUPS: '/parish-groups',

  NOTICES: '/notices',
  EVENTS: '/events',
  FEASTS: '/feasts',
  CALENDAR: '/calendar',
  GALLERY: '/gallery',

  REPORTS: '/reports',
  SECURITY: '/security',

  STAFF_MANAGEMENT: '/staff-management',
  INVITATIONS: '/invitations',
  PERMISSION_MANAGEMENT: '/permission-management',
  CHURCH_SETTINGS: '/church-settings',
};

// ---------------------------------------------------------------------------
// ROLES
// ---------------------------------------------------------------------------
export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  STAFF: 'STAFF',
  GROUP_LEADER: 'GROUP_LEADER',
  FAMILY_UNIT_PRESIDENT: 'FAMILY_UNIT_PRESIDENT',
};

// ---------------------------------------------------------------------------
// PERMISSIONS — mirrors UserPermission.PermissionChoices exactly (parish app)
// ---------------------------------------------------------------------------
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  MANAGE_PARISH: 'MANAGE_PARISH',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  MANAGE_FAMILY_UNITS: 'MANAGE_FAMILY_UNITS',
  MANAGE_FAMILIES: 'MANAGE_FAMILIES',
  MANAGE_FAMILY_MEMBERS: 'MANAGE_FAMILY_MEMBERS',
  MANAGE_GROUPS: 'MANAGE_GROUPS',
  MANAGE_EVENTS: 'MANAGE_EVENTS',
  MANAGE_NOTICES: 'MANAGE_NOTICES',
  MANAGE_GALLERY: 'MANAGE_GALLERY',
  MANAGE_SECURITY: 'MANAGE_SECURITY',
  MANAGE_PERMISSIONS: 'MANAGE_PERMISSIONS',
  VIEW_REPORTS: 'VIEW_REPORTS',
};

// ---------------------------------------------------------------------------
// PERMISSION LABELS — human-readable display text for each PermissionChoices
// value. Single source of truth for anywhere permissions are rendered
// (Invitations form, Permission Management page, etc). Keep in sync with
// PERMISSIONS above — every key here should have a matching PERMISSIONS entry.
// ---------------------------------------------------------------------------
export const PERMISSION_LABELS = {
  VIEW_DASHBOARD: 'View Dashboard',
  MANAGE_PARISH: 'Manage Parish',
  MANAGE_SETTINGS: 'Manage Settings',
  MANAGE_FAMILY_UNITS: 'Manage Family Units',
  MANAGE_FAMILIES: 'Manage Families',
  MANAGE_FAMILY_MEMBERS: 'Manage Family Members',
  MANAGE_GROUPS: 'Manage Parish Groups',
  MANAGE_EVENTS: 'Manage Events',
  MANAGE_NOTICES: 'Manage Notices',
  MANAGE_GALLERY: 'Manage Gallery',
  MANAGE_SECURITY: 'Manage Security',
  MANAGE_PERMISSIONS: 'Manage Permissions',
  VIEW_REPORTS: 'View Reports',
};

// ---------------------------------------------------------------------------
// INVITABLE PERMISSIONS — subset offerable through the Invitation flow.
// Excludes MANAGE_SECURITY, MANAGE_SETTINGS, MANAGE_PERMISSIONS — those stay
// SuperAdmin-only in the UI (same rule as the nav gating below), so they're
// never offered to a Staff/Group Leader/Unit President invite, even via the
// "Customize" checkbox list on the Invitations form.
// ---------------------------------------------------------------------------
export const INVITABLE_PERMISSIONS = Object.values(PERMISSIONS).filter(
  (p) => ![PERMISSIONS.MANAGE_SECURITY, PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.MANAGE_PERMISSIONS].includes(p)
);

// ---------------------------------------------------------------------------
// PERMISSION PRESETS — invite-time convenience only. A hardcoded lookup, not
// a backend model (deliberate v1 simplification — see project notes on why a
// full PermissionPreset model was dropped). Unrelated to ROLES and unrelated
// to ParishGroupMember.role — purely a shortcut for pre-filling
// permission_snapshot on the Invitations form. Editing a preset here only
// affects invitations sent after the edit; already-sent/accepted invitations
// keep whatever snapshot they were created with.
// ---------------------------------------------------------------------------
export const PERMISSION_PRESETS = {
  family_unit_president: {
    label: 'Family Unit President',
    permissions: [
      PERMISSIONS.MANAGE_FAMILIES,
      PERMISSIONS.MANAGE_FAMILY_MEMBERS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.VIEW_DASHBOARD,
    ],
  },
  treasurer: {
    label: 'Treasurer',
    permissions: [PERMISSIONS.VIEW_REPORTS, PERMISSIONS.VIEW_DASHBOARD],
  },
  parish_secretary: {
    label: 'Parish Secretary',
    permissions: [PERMISSIONS.MANAGE_NOTICES, PERMISSIONS.MANAGE_EVENTS, PERMISSIONS.VIEW_DASHBOARD],
  },
  catechism_teacher: {
    label: 'Catechism Teacher',
    permissions: [PERMISSIONS.VIEW_DASHBOARD],
  },
  choir_group_leader: {
    label: 'Choir / Group Leader',
    permissions: [PERMISSIONS.MANAGE_GROUPS, PERMISSIONS.VIEW_DASHBOARD],
  },
};

// ---------------------------------------------------------------------------
// SIDEBAR NAVIGATION — Layout.jsx maps over this. permission/role gate each
// item; SUPERADMIN bypass is handled centrally in auth.jsx, not here.
// Staff Management / Invitations have no matching PermissionChoices entry
// on the backend, so they stay role-gated to SUPERADMIN only.
//
// Feasts and Calendar both reuse MANAGE_EVENTS — there is no separate
// backend permission for either. Feasts are managed under the same gate as
// Events (create/edit; delete stays SuperAdmin-only same as every other
// module). Calendar is read-only for anyone who already has MANAGE_EVENTS,
// since it's just a combined viewing surface over Events + Feasts data,
// not its own manageable resource.
// ---------------------------------------------------------------------------
export const NAVIGATION = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: ROUTES.DASHBOARD, permission: PERMISSIONS.VIEW_DASHBOARD, icon: Home },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        label: 'My Profile',
        path: ROUTES.MY_PROFILE,
        icon: UserCircle,
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Mass Timings', path: ROUTES.MASS_TIMINGS, permission: PERMISSIONS.MANAGE_PARISH, icon: Clock3 },
      { label: 'Notices', path: ROUTES.NOTICES, permission: PERMISSIONS.MANAGE_NOTICES, icon: Bell },
      { label: 'Events', path: ROUTES.EVENTS, permission: PERMISSIONS.MANAGE_EVENTS, icon: CalendarDays },
      { label: 'Feasts', path: ROUTES.FEASTS, permission: PERMISSIONS.MANAGE_EVENTS, icon: PartyPopper },
      { label: 'Calendar', path: ROUTES.CALENDAR, permission: PERMISSIONS.MANAGE_EVENTS, icon: CalendarRange },
      { label: 'Gallery', path: ROUTES.GALLERY, permission: PERMISSIONS.MANAGE_GALLERY, icon: Images },
    ],
  },
  {
    label: 'Directory',
    items: [
      { label: 'Family Units', path: ROUTES.FAMILY_UNITS, permission: PERMISSIONS.MANAGE_FAMILY_UNITS, icon: Building2 },
      { label: 'Families', path: ROUTES.FAMILIES, permission: PERMISSIONS.MANAGE_FAMILIES, icon: Users },
      { label: 'Family Members', path: ROUTES.FAMILY_MEMBERS, permission: PERMISSIONS.MANAGE_FAMILY_MEMBERS, icon: Users },
      { label: 'Parish Groups', path: ROUTES.PARISH_GROUPS, permission: PERMISSIONS.MANAGE_GROUPS, icon: Users },
      { label: 'Staff Management', path: ROUTES.STAFF_MANAGEMENT, role: ROLES.SUPERADMIN, icon: UserCog },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Reports', path: ROUTES.REPORTS, permission: PERMISSIONS.VIEW_REPORTS, icon: BarChart3 },
      { label: 'Security', path: ROUTES.SECURITY, role: ROLES.SUPERADMIN, icon: Shield },
    ],
  },
  {
    label: 'Access Control',
    items: [
      { label: 'User Management', path: ROUTES.USER_MANAGEMENT, role: ROLES.SUPERADMIN, icon: UsersRound },
      { label: 'Invitations', path: ROUTES.INVITATIONS, role: ROLES.SUPERADMIN, icon: MailPlus },
      { label: 'Permissions', path: ROUTES.PERMISSION_MANAGEMENT, role: ROLES.SUPERADMIN, icon: Shield },
      { label: 'Settings', path: ROUTES.CHURCH_SETTINGS, role: ROLES.SUPERADMIN, icon: Settings },
    ],
  },
];