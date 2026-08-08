import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { PageHeader, Button, Input, Badge } from "../components.jsx";
import { administrationService, accountsService } from "../services.js";
import { useAuth } from "../auth.jsx";
import { X, Pencil, Upload, Mail, Phone, MapPin, VenusAndMars, CalendarClock, ShieldCheck, LogOut } from "lucide-react";
import ColorBends from "../components/ColorBends";

const GENDER_OPTIONS = [
  { value: "", label: "Select Gender" },
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

const EMPTY_EDIT_FORM = {
  profile_photo: null,
  full_name: "",
  phone_number: "",
  address: "",
  gender: "",
};

const EMPTY_PASSWORD_FORM = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function MyProfile() {
  const { logout, refreshUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();

  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [changingPassword, setChangingPassword] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    Promise.all([administrationService.getMyProfile(), accountsService.getCurrentUser()])
      .then(([profileRes, currentUserRes]) => {
        const profileData = profileRes.data?.data ?? profileRes.data ?? profileRes;
        const currentData = currentUserRes.data ?? currentUserRes;
        const accountData = currentData.user ?? currentData;

        setProfile(profileData);
        setAccount(accountData);
        setPhotoPreview(profileData.profile_photo || null);
      })
      .catch(() => toast.error("Failed to load profile."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const openEditModal = () => {
    setEditForm({
      profile_photo: null,
      full_name: profile?.full_name || "",
      phone_number: profile?.phone_number || "",
      address: profile?.address || "",
      gender: profile?.gender || "",
    });
    setEditPhotoPreview(profile?.profile_photo || null);
    setModalOpen(true);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    setEditForm(EMPTY_EDIT_FORM);
    setEditPhotoPreview(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select a JPG, PNG, GIF or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Photo must be 10MB or smaller.");
      e.target.value = "";
      return;
    }

    setEditForm((f) => ({ ...f, profile_photo: file }));
    const reader = new window.FileReader();
    reader.onloadend = () => setEditPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!editForm.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    setSaving(true);

    const trimmedFullName = editForm.full_name.trim();
    const trimmedPhoneNumber = editForm.phone_number.trim();
    const trimmedAddress = editForm.address.trim();
    const genderValue = editForm.gender;

    let payload;
    if (editForm.profile_photo instanceof File) {
      payload = new FormData();
      payload.append("full_name", trimmedFullName);
      payload.append("phone_number", trimmedPhoneNumber);
      payload.append("address", trimmedAddress);
      payload.append("gender", genderValue);
      payload.append("profile_photo", editForm.profile_photo);
    } else {
      payload = {
        full_name: trimmedFullName,
        phone_number: trimmedPhoneNumber,
        address: trimmedAddress,
        gender: genderValue,
      };
    }

    try {
      await administrationService.updateMyProfile(payload);
      toast.success("Profile updated successfully.");
      await refreshUser?.();
      loadProfile();
      closeEditModal();
    } catch (err) {
      const response = err?.response?.data;
      if (response && response.errors) {
        Object.entries(response.errors).forEach(([, msgs]) => {
          toast.error(Array.isArray(msgs) ? msgs.join(" ") : msgs);
        });
      } else if (response && response.message) {
        toast.error(response.message);
      } else if (typeof response === "string") {
        toast.error(response);
      } else {
        toast.error("Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((f) => ({ ...f, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await accountsService.changePassword(passwordForm);
      toast.success("Password changed successfully.");
      setPasswordForm(EMPTY_PASSWORD_FORM);
    } catch (err) {
      const response = err?.response?.data;
      if (response && response.errors) {
        Object.entries(response.errors).forEach(([, msgs]) => {
          toast.error(Array.isArray(msgs) ? msgs.join(" ") : msgs);
        });
      } else if (response && response.message) {
        toast.error(response.message);
      } else if (typeof response === "string") {
        toast.error(response);
      } else {
        toast.error("Failed to change password.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <style>{`
        @keyframes profileFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .profile-fade-up {
          opacity: 0;
          animation: profileFadeUp 0.45s ease-out forwards;
        }
      `}</style>

      <PageHeader title="Settings" description="Manage your personal profile and account security." />

      {/* Profile hero card */}
      <div
        className="profile-fade-up bg-surface border border-border rounded-2xl shadow-sm overflow-hidden"
        style={{ animationDelay: "0ms" }}
      >
        {/* relative + isolate here is what the Login page was missing — this
            establishes a new stacking context so ColorBends' negative
            z-index layers stay contained within this band instead of
            escaping to sit behind the whole page (invisible-on-render bug). */}
        <div className="relative isolate h-24 sm:h-28 overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 -z-10 overflow-hidden">
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
        </div>

        <div className="px-6 pb-6 mt-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-10 gap-4">
            <div className="flex items-end gap-4">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-4 border-surface shadow-md relative z-10"
                />
              ) : (
                <div className="w-26 h-29 rounded-full bg-accent text-accent-ink flex items-center justify-center border-4 border-surface shadow-md text-xl font-semibold relative z-10">
                  {initials(profile?.full_name)}
                </div>
              )}
              <div className="pb-1">
                <h2 className="text-lg font-semibold text-ink leading-tight">{profile?.full_name || "—"}</h2>
                {account?.role && (
                  <Badge variant="accent" className="mt-1">
                    {account.role.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="secondary" icon={Pencil} onClick={openEditModal}>
              Edit Profile
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-8">
            <InfoRow icon={Mail} label="Email" value={account?.email} />
            <InfoRow icon={Phone} label="Phone Number" value={profile?.phone_number} />
            <InfoRow
              icon={VenusAndMars}
              label="Gender"
              value={GENDER_OPTIONS.find((g) => g.value === profile?.gender)?.label}
            />
            <InfoRow icon={CalendarClock} label="Member Since" value={formatDate(account?.date_joined)} />
            <InfoRow icon={MapPin} label="Address" value={profile?.address} className="sm:col-span-2" multiline />
          </div>
        </div>
      </div>

      {/* Change password */}
      <div
        className="profile-fade-up bg-surface border border-border rounded-2xl shadow-sm p-6"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-ink-muted" />
          <h3 className="text-sm font-semibold text-ink">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              type="password"
              name="current_password"
              placeholder="Current Password"
              value={passwordForm.current_password}
              onChange={handlePasswordChange}
              required
            />
            <Input
              type="password"
              name="new_password"
              placeholder="New Password"
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
              required
              minLength={8}
            />
            <Input
              type="password"
              name="confirm_password"
              placeholder="Confirm Password"
              value={passwordForm.confirm_password}
              onChange={handlePasswordChange}
              required
              minLength={8}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={changingPassword} disabled={changingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div
        className="profile-fade-up bg-surface border border-danger-200 rounded-2xl shadow-sm p-6 flex items-center justify-between gap-4"
        style={{ animationDelay: "160ms" }}
      >
        <div>
          <h3 className="text-sm font-semibold text-danger-600 dark:text-danger-400">
            Sign Out
          </h3>
          <p className="mt-0.5 text-xs text-danger-600/80 dark:text-danger-400/80">
            You'll need to log in again to access your account.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={LogOut}
          onClick={logout}
          className="
            border-danger-300
            text-danger-600
            hover:bg-danger-50
            hover:border-danger-400
            hover:text-danger-700
            dark:border-danger-700
            dark:text-danger-400
            dark:hover:bg-danger-950/40
            dark:hover:border-danger-600
            dark:hover:text-danger-300
            transition-colors
          "
        >
          Sign Out
        </Button>
      </div>

      {/* Edit Profile modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">Edit Profile</h3>
              <button
                onClick={closeEditModal}
                className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-5">
              <div className="flex justify-center">
                <label htmlFor="profile-photo-input" className="group relative cursor-pointer">
                  {editPhotoPreview ? (
                    <img
                      src={editPhotoPreview}
                      alt="Preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-surface-2 shadow-sm group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-surface-2 flex items-center justify-center border-4 border-surface-2 text-ink-muted group-hover:bg-surface-2/70 transition-colors">
                      <Upload className="h-6 w-6" />
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-accent text-accent-ink flex items-center justify-center border-2 border-surface">
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                  <input
                    id="profile-photo-input"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-center text-xs text-ink-muted -mt-3">JPG, PNG, GIF or WebP · Max 10MB</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="full_name"
                  placeholder="Enter full name"
                  value={editForm.full_name}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Phone Number"
                  name="phone_number"
                  placeholder="Enter phone number"
                  value={editForm.phone_number}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Role" name="role" value={account?.role?.replace(/_/g, " ") || ""} readOnly disabled />
                <Input label="Email" name="email" value={account?.email || ""} readOnly disabled />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm"
                  value={editForm.gender}
                  onChange={handleInputChange}
                >
                  {GENDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="address">
                  Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  rows={3}
                  value={editForm.address}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={closeEditModal}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" loading={saving} disabled={saving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, className = "", multiline = false }) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="h-8 w-8 shrink-0 rounded-lg bg-surface-2 flex items-center justify-center text-ink-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className={`text-sm font-medium text-ink ${multiline ? "whitespace-pre-line" : "truncate"}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}