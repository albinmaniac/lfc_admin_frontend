import api from './api.js';

// ---------------------------------------------------------------------------
// ACCOUNTS
// ---------------------------------------------------------------------------
export const accountsService = {
  /** POST /accounts/login/ — { email, password } → { access, refresh, user, permissions } */
  login: (credentials) => api.post('/accounts/login/', credentials),

  /** GET /accounts/me/ — returns the current authenticated user (flat User object). */
  getCurrentUser: () => api.get('/accounts/me/'),

  /** POST /accounts/change-password/ — { current_password, new_password, confirm_password } */
  changePassword: (data) => api.post('/accounts/change-password/', data),

  /** POST /accounts/reset-password/ — { token, new_password, confirm_password } */
  resetPassword: (data) => api.post('/accounts/reset-password/', data),

  /** POST /accounts/accept-invitation/ — { token, password, confirm_password } */
  acceptInvitation: (data) => api.post('/accounts/accept-invitation/', data),

  /** GET /accounts/users/ — list of users eligible for admin-triggered password reset. */
  listPasswordResetUsers: () => api.get('/accounts/users/'),

  /** POST /accounts/users/:userId/send-password-reset/ */
  sendPasswordReset: (userId) => api.post(`/accounts/users/${userId}/send-password-reset/`),
};

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
export const dashboardService = {
  /** GET /parish/dashboard/ — parish/staff/family/event/notice/gallery summary counts. */
  getSummary: () => api.get('/parish/dashboard/'),
};

// ---------------------------------------------------------------------------
// PARISH — Mass Timings, Parish Groups, Church Settings, Permissions
// ---------------------------------------------------------------------------
export const parishService = {
  // Mass Timings
  /** GET /parish/mass-timings/ — optional { day } query param. */
  getMassTimings: (params) => api.get('/parish/mass-timings/', { params }),
  /** POST /parish/mass-timings/ */
  createMassTiming: (data) => api.post('/parish/mass-timings/', data),
  /** GET /parish/mass-timings/:id/ */
  getMassTiming: (id) => api.get(`/parish/mass-timings/${id}/`),
  /** PATCH /parish/mass-timings/:id/ */
  updateMassTiming: (id, data) => api.patch(`/parish/mass-timings/${id}/`, data),
  /** DELETE /parish/mass-timings/:id/ — SuperAdmin only, backend-enforced. */
  deleteMassTiming: (id) => api.delete(`/parish/mass-timings/${id}/`),

  // Parish Groups
  /** GET /parish-groups/groups/ — optional { search } query param. */
  getParishGroups: (params, config) => api.get('/parish-groups/groups/', { params, ...config }),
  /** POST /parish-groups/groups/ — FormData (photo upload). */
  createParishGroup: (formData) => api.post('/parish-groups/groups/', formData),
  /** GET /parish-groups/groups/:id/ */
  getParishGroup: (id) => api.get(`/parish-groups/groups/${id}/`),
  /** PATCH /parish-groups/groups/:id/ — FormData (photo upload). */
  updateParishGroup: (id, formData) => api.patch(`/parish-groups/groups/${id}/`, formData),
  /** DELETE /parish-groups/groups/:id/ — SuperAdmin only, backend-enforced. */
  deleteParishGroup: (id) => api.delete(`/parish-groups/groups/${id}/`),

  // Parish Group Members
  /** GET /parish-groups/group-members/ — optional { group } query param. */
  getParishGroupMembers: (params) => api.get('/parish-groups/group-members/', { params }),
  /** POST /parish-groups/group-members/ — { group, member, role, joined_date }. */
  addParishGroupMember: (data) => api.post('/parish-groups/group-members/', data),
  /** PATCH /parish-groups/group-members/:id/ */
  updateParishGroupMember: (id, data) => api.patch(`/parish-groups/group-members/${id}/`, data),
  /** DELETE /parish-groups/group-members/:id/ */
  removeParishGroupMember: (id) => api.delete(`/parish-groups/group-members/${id}/`),

  // Parish detail / Church Settings
  /** GET /parish/ — single Parish record. */
  getParishDetail: () => api.get('/parish/'),
  /** PATCH /parish/manage/ — FormData (logo/cover_image upload). */
  updateParishSettings: (formData) => api.patch('/parish/manage/', formData),

  // Permissions
  /** GET /parish/permissions/ — optional { user } query param. */
  getPermissions: (params) => api.get('/parish/permissions/', { params }),
  /** POST /parish/permissions/ — { user, permission }. */
  createPermission: (data) => api.post('/parish/permissions/', data),
  /** DELETE /parish/permissions/:id/ */
  deletePermission: (id) => api.delete(`/parish/permissions/${id}/`),
  /**
   * POST /parish/permissions/bulk/ — { user_id, permissions: [...] }, full
   * replace of that user's permission set. NOTE: corrected back to POST —
   * this was found using PUT, which does not match the confirmed backend
   * URL (UserPermissionBulkUpdateAPIView is registered as POST).
   */
  bulkUpdatePermissions: (data) => api.post('/parish/permissions/bulk/', data),
  /** GET /parish/permissions/user/:userId/ — that user's assigned UserPermission rows. */
  getUserPermissions: (userId) => api.get(`/parish/permissions/user/${userId}/`),
};

// ---------------------------------------------------------------------------
// FAMILIES — Families, Family Units, Family Members
// ---------------------------------------------------------------------------
export const familiesService = {
  // Families
  /** GET /families/families/ — optional { search, family_unit, active } query params. */
  getFamilies: (params, config) => api.get('/families/families/', { params, ...config }),
  /** POST /families/families/ */
  createFamily: (data) => api.post('/families/families/', data),
  /** GET /families/families/:id/ */
  getFamily: (id) => api.get(`/families/families/${id}/`),
  /** PATCH /families/families/:id/ */
  updateFamily: (id, data) => api.patch(`/families/families/${id}/`, data),
  /** DELETE /families/families/:id/ — SuperAdmin only, backend-enforced. */
  deleteFamily: (id) => api.delete(`/families/families/${id}/`),

  // Family Units
  /** GET /families/family-units/ — optional { search, active } query params. */
  getFamilyUnits: (params, config) => api.get('/families/family-units/', { params, ...config }),
  /** POST /families/family-units/ — FormData (saint_photo upload). */
  createFamilyUnit: (formData) => api.post('/families/family-units/', formData),
  /** GET /families/family-units/:id/ */
  getFamilyUnit: (id) => api.get(`/families/family-units/${id}/`),
  /** PATCH /families/family-units/:id/ — FormData (saint_photo upload). */
  updateFamilyUnit: (id, formData) => api.patch(`/families/family-units/${id}/`, formData),
  /** DELETE /families/family-units/:id/ — SuperAdmin only, backend-enforced. */
  deleteFamilyUnit: (id) => api.delete(`/families/family-units/${id}/`),

  // Family Members
  /** GET /families/family-members/ — optional { search, family, active } query params. */
  getFamilyMembers: (params, config) => api.get('/families/family-members/', { params, ...config }),
  /** POST /families/family-members/ — FormData (photo upload). */
  createFamilyMember: (formData) => api.post('/families/family-members/', formData),
  /** GET /families/family-members/:id/ */
  getFamilyMember: (id) => api.get(`/families/family-members/${id}/`),
  /** PATCH /families/family-members/:id/ — FormData (photo upload). */
  updateFamilyMember: (id, formData) => api.patch(`/families/family-members/${id}/`, formData),
  /** DELETE /families/family-members/:id/ — SuperAdmin only, backend-enforced. */
  deleteFamilyMember: (id) => api.delete(`/families/family-members/${id}/`),
};

// ---------------------------------------------------------------------------
// COMMUNICATION — Notices, Events
// ---------------------------------------------------------------------------
export const communicationService = {
  // Notices
  /** GET /notices/ — optional { search, notice_type } query params. */
  getNotices: (params, config) => api.get('/notices/', { params, ...config }),
  /** POST /notices/ — FormData (attachment upload). */
  createNotice: (formData) => api.post('/notices/', formData),
  /** GET /notices/:id/ */
  getNotice: (id) => api.get(`/notices/${id}/`),
  /** PATCH /notices/:id/ — FormData (attachment upload). */
  updateNotice: (id, formData) => api.patch(`/notices/${id}/`, formData),
  /** DELETE /notices/:id/ */
  deleteNotice: (id) => api.delete(`/notices/${id}/`),
  /** GET /notices/active/ */
  getActiveNotices: () => api.get('/notices/active/'),
  /** GET /notices/featured/ */
  getFeaturedNotices: () => api.get('/notices/featured/'),

  // Events
  /** GET /events/ — optional { search, event_type } query params. */
  getEvents: (params, config) => api.get('/events/', { params, ...config }),
  /** POST /events/ — FormData (cover_image upload). */
  createEvent: (formData) => api.post('/events/', formData),
  /** GET /events/:id/ */
  getEvent: (id) => api.get(`/events/${id}/`),
  /** PATCH /events/:id/ — FormData (cover_image upload). */
  updateEvent: (id, formData) => api.patch(`/events/${id}/`, formData),
  /** DELETE /events/:id/ — SuperAdmin only, backend-enforced. */
  deleteEvent: (id) => api.delete(`/events/${id}/`),
  /** GET /events/upcoming/ */
  getUpcomingEvents: () => api.get('/events/upcoming/'),
  /** GET /events/featured/ */
  getFeaturedEvents: () => api.get('/events/featured/'),
};

// ---------------------------------------------------------------------------
// GALLERY — Albums, Photos
// ---------------------------------------------------------------------------
export const galleryService = {
  /** GET /gallery/albums/ — optional { event, featured, active } query params. */
  getAlbums: (params, config) => api.get('/gallery/albums/', { params, ...config }),
  /** POST /gallery/albums/ — FormData (cover_image upload). */
  createAlbum: (formData) => api.post('/gallery/albums/', formData),
  /** GET /gallery/albums/:id/ — includes nested `photos` array. */
  getAlbum: (id) => api.get(`/gallery/albums/${id}/`),
  /** PATCH /gallery/albums/:id/ — FormData (cover_image upload). */
  updateAlbum: (id, formData) => api.patch(`/gallery/albums/${id}/`, formData),
  /** DELETE /gallery/albums/:id/ — SuperAdmin only, backend-enforced. */
  deleteAlbum: (id) => api.delete(`/gallery/albums/${id}/`),
  /** GET /gallery/albums/featured/ */
  getFeaturedAlbums: () => api.get('/gallery/albums/featured/'),

  /** GET /gallery/photos/ — optional { album } query param. */
  getPhotos: (params) => api.get('/gallery/photos/', { params }),
  /** POST /gallery/photos/ — FormData ({ album, image, caption, is_active }). */
  uploadPhoto: (formData) => api.post('/gallery/photos/', formData),
  /** GET /gallery/photos/:id/ */
  getPhoto: (id) => api.get(`/gallery/photos/${id}/`),
  /** PATCH /gallery/photos/:id/ — FormData. */
  updatePhoto: (id, formData) => api.patch(`/gallery/photos/${id}/`, formData),
  /** DELETE /gallery/photos/:id/ — SuperAdmin only, backend-enforced. */
  deletePhoto: (id) => api.delete(`/gallery/photos/${id}/`),
};

// ---------------------------------------------------------------------------
// SECURITY — Login History, Active Sessions, Force Logout
// ---------------------------------------------------------------------------
export const securityService = {
  /** GET /accounts/settings/login-history/ — SuperAdmin sees all, others see only their own. */
  getLoginHistory: (params) => api.get('/accounts/settings/login-history/', { params }),
  /** GET /accounts/settings/sessions/ — SuperAdmin sees all, others see only their own. */
  getActiveSessions: () => api.get('/accounts/settings/sessions/'),
  /** POST /accounts/settings/sessions/:sessionId/force-logout/ — SuperAdmin only (frontend-gated). */
  forceLogout: (sessionId) => api.post(`/accounts/settings/sessions/${sessionId}/force-logout/`),
  /** POST /accounts/settings/logout-all/ — logs the current user out of every device. */
  logoutAllDevices: () => api.post('/accounts/settings/logout-all/'),
};

// ---------------------------------------------------------------------------
// ADMINISTRATION — Staff, Invitations
// ---------------------------------------------------------------------------
export const administrationService = {
  // Staff
  /** GET /staffs/ — optional { search } query param. */
  getStaff: (params, config) => api.get('/staffs/', { params, ...config }),
  /** POST /staffs/ — FormData (photo upload). */
  createStaff: (formData) => api.post('/staffs/', formData),
  /** GET /staffs/:id/ */
  getStaffMember: (id) => api.get(`/staffs/${id}/`),
  /** PATCH /staffs/:id/ — FormData (photo upload). */
  updateStaffMember: (id, formData) => api.patch(`/staffs/${id}/`, formData),
  /** DELETE /staffs/:id/ */
  deleteStaffMember: (id) => api.delete(`/staffs/${id}/`),
  /** POST /staffs/:id/deactivate/ */
  deactivateStaff: (id) => api.post(`/staffs/${id}/deactivate/`),
  /** POST /staffs/:id/reactivate/ */
  reactivateStaff: (id) => api.post(`/staffs/${id}/reactivate/`),

  // Invitations
  /** GET /accounts/invitations/ */
  getInvitations: (params) => api.get('/accounts/invitations/', { params }),
  /** POST /accounts/invitations/ — { email, role }. */
  createInvitation: (data) => api.post('/accounts/invitations/', data),
  /** DELETE /accounts/invitations/:id/ */
  deleteInvitation: (id) => api.delete(`/accounts/invitations/${id}/`),
  /** POST /accounts/invitations/:id/cancel/ */
  cancelInvitation: (id) => api.post(`/accounts/invitations/${id}/cancel/`),
  /** POST /accounts/invitations/:id/resend/ */
  resendInvitation: (id) => api.post(`/accounts/invitations/${id}/resend/`),
};

// ---------------------------------------------------------------------------
// REPORTS — no backend endpoints exist yet, stubbed for future use
// ---------------------------------------------------------------------------
export const reportsService = {
  /** No backend endpoint exists yet — throws until Reports has a real API. */
  getSummary: () => {
    throw new Error('reportsService.getSummary: backend endpoint not yet available');
  },
};