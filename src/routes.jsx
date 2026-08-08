import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, ProtectedRoute } from './auth.jsx';
import { ROUTES, PERMISSIONS, ROLES } from './constants.js';
import Layout from './Layout.jsx';

import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import AcceptInvitation from './pages/AcceptInvitation.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MassTimings from './pages/MassTimings.jsx';
import FamilyUnits from './pages/FamilyUnits.jsx';
import Families from './pages/Families.jsx';
import FamilyMembers from './pages/FamilyMembers.jsx';
import ParishGroups from './pages/ParishGroups.jsx';
import Notices from './pages/Notices.jsx';
import Events from './pages/Events.jsx';
import Feasts from './pages/Feasts.jsx';
import Calendar from './pages/Calendar.jsx';
import Gallery from './pages/Gallery.jsx';
import Reports from './pages/Reports.jsx';
import Security from './pages/Security.jsx';
import StaffManagement from './pages/StaffManagement.jsx';
import Invitations from './pages/Invitations.jsx';
import MyProfile from './pages/MyProfile.jsx';
import PermissionManagement from './pages/PermissionManagement.jsx';
import ChurchSettings from './pages/ChurchSettings.jsx';
import Users from "./pages/Users.jsx";
import PasswordReset from "./pages/PasswordReset.jsx";
import NotFound from './pages/NotFound.jsx';
import UserManagement from './pages/UserManagement.jsx';

const routeConfig = [
  { path: ROUTES.DASHBOARD, element: <Dashboard />, permission: PERMISSIONS.VIEW_DASHBOARD },
  { path: ROUTES.MASS_TIMINGS, element: <MassTimings />, permission: PERMISSIONS.MANAGE_PARISH },
  { path: ROUTES.FAMILY_UNITS, element: <FamilyUnits />, permission: PERMISSIONS.MANAGE_FAMILY_UNITS },
  { path: ROUTES.FAMILIES, element: <Families />, permission: PERMISSIONS.MANAGE_FAMILIES },
  { path: ROUTES.FAMILY_MEMBERS, element: <FamilyMembers />, permission: PERMISSIONS.MANAGE_FAMILY_MEMBERS },
  { path: ROUTES.PARISH_GROUPS, element: <ParishGroups />, permission: PERMISSIONS.MANAGE_GROUPS },
  { path: ROUTES.NOTICES, element: <Notices />, permission: PERMISSIONS.MANAGE_NOTICES },
  { path: ROUTES.EVENTS, element: <Events />, permission: PERMISSIONS.MANAGE_EVENTS },
  { path: ROUTES.FEASTS, element: <Feasts />, permission: PERMISSIONS.MANAGE_EVENTS },
  // Calendar's backend endpoint is AllowAny — no permission gate here either.
  // Still sits behind RequireAuth/Layout below, so it's login-only, not
  // fully public like /login or /setup-password.
  { path: ROUTES.CALENDAR, element: <Calendar /> },
  { path: ROUTES.GALLERY, element: <Gallery />, permission: PERMISSIONS.MANAGE_GALLERY },
  { path: ROUTES.REPORTS, element: <Reports />, permission: PERMISSIONS.VIEW_REPORTS },
  { path: ROUTES.SECURITY, element: <Security />, role: ROLES.SUPERADMIN },
  { path: ROUTES.STAFF_MANAGEMENT, element: <StaffManagement />, role: ROLES.SUPERADMIN },
  { path: ROUTES.INVITATIONS, element: <Invitations />, role: ROLES.SUPERADMIN },
  { path: ROUTES.MY_PROFILE, element: <MyProfile /> },
  { path: ROUTES.PERMISSION_MANAGEMENT, element: <PermissionManagement />, role: ROLES.SUPERADMIN },
  { path: ROUTES.CHURCH_SETTINGS, element: <ChurchSettings />, role: ROLES.SUPERADMIN },
];

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path={ROUTES.ACCEPT_INVITATION} element={<AcceptInvitation />} />
      

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        {routeConfig.map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={
              <ProtectedRoute permission={r.permission} role={r.role}>
                {r.element}
              </ProtectedRoute>
            }
          />
        ))}
        <Route
          path={ROUTES.USER_MANAGEMENT}
          element={
            <ProtectedRoute role={ROLES.SUPERADMIN}>
              <UserManagement />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<Navigate to="users" replace />}
          />

          <Route
            path="users"
            element={
              <ProtectedRoute role={ROLES.SUPERADMIN}>
                <Users />
              </ProtectedRoute>
            }
          />

          <Route
            path="password-reset"
            element={
              <ProtectedRoute role={ROLES.SUPERADMIN}>
                <PasswordReset />
              </ProtectedRoute>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}