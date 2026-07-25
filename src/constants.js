// ROUTES + PERMISSIONS + ROLES + sidebar navigation — all in one file.

import {
  Home,
  Clock3,
  Bell,
  CalendarDays,
  Images,
  Users,
  Building2,
  BarChart3,
  Shield,
  UserCog,
  MailPlus,
  Settings,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------
export const ROUTES = {
  LOGIN: '/login',
  ACCEPT_INVITATION: '/setup-password/:token',
  DASHBOARD: '/dashboard',

  MASS_TIMINGS: '/mass-timings',
  FAMILY_UNITS: '/family-units',
  FAMILIES: '/families',
  FAMILY_MEMBERS: '/family-members',
  PARISH_GROUPS: '/parish-groups',

  NOTICES: '/notices',
  EVENTS: '/events',
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
// SIDEBAR NAVIGATION — Layout.jsx maps over this. permission/role gate each
// item; SUPERADMIN bypass is handled centrally in auth.jsx, not here.
// Staff Management / Invitations have no matching PermissionChoices entry
// on the backend, so they stay role-gated to SUPERADMIN only.
// ---------------------------------------------------------------------------
export const NAVIGATION = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: ROUTES.DASHBOARD, permission: PERMISSIONS.VIEW_DASHBOARD, icon: Home },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Mass Timings', path: ROUTES.MASS_TIMINGS, permission: PERMISSIONS.MANAGE_PARISH, icon: Clock3 },
      { label: 'Notices', path: ROUTES.NOTICES, permission: PERMISSIONS.MANAGE_NOTICES, icon: Bell },
      { label: 'Events', path: ROUTES.EVENTS, permission: PERMISSIONS.MANAGE_EVENTS, icon: CalendarDays },
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
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Reports', path: ROUTES.REPORTS, permission: PERMISSIONS.VIEW_REPORTS, icon: BarChart3 },
      { label: 'Security', path: ROUTES.SECURITY, role: ROLES.SUPERADMIN, icon: Shield },
      { label: 'Staff Management', path: ROUTES.STAFF_MANAGEMENT, role: ROLES.SUPERADMIN, icon: UserCog },
      { label: 'Invitations', path: ROUTES.INVITATIONS, role: ROLES.SUPERADMIN, icon: MailPlus },
      { label: 'Permissions', path: ROUTES.PERMISSION_MANAGEMENT, role: ROLES.SUPERADMIN, icon: Shield },
      { label: 'Settings', path: ROUTES.CHURCH_SETTINGS, role: ROLES.SUPERADMIN, icon: Settings },
    ],
  },
];