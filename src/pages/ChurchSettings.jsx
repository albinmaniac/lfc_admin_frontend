import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { parishService } from '../services.js';
import { PageHeader, Button, Input } from '../components.jsx';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import {
  Pencil,
  Globe,
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  MapPinned,
  Building2,
  ImageOff,
} from 'lucide-react';
import ColorBends from '../components/ColorBends';

const EMPTY_FORM = {
  name: '', address: '', phone: '', email: '', website: '', diocese: '',
  patron_saint: '', established_year: '', office_phone: '', office_email: '',
  office_open_time: '', office_close_time: '', google_map_url: '',
  facebook_url: '', instagram_url: '', youtube_url: '', whatsapp_url: '',
  history: '', mission: '', vision: '',
};

const TABS = [
  { key: 'general', label: 'General Info' },
  { key: 'office', label: 'Office Hours' },
  { key: 'social', label: 'Social & Links' },
  { key: 'about', label: 'History & Mission' },
];

const URL_FIELDS = ['website', 'google_map_url', 'facebook_url', 'instagram_url', 'youtube_url', 'whatsapp_url'];

const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function extractErrorMessage(err, fallback = 'Failed to save settings') {
  const data = err.response?.data;
  if (!data) return fallback;
  if (data.detail) return data.detail;
  if (typeof data === 'string') return data;
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (Array.isArray(value) && value.length) return value[0];
    if (typeof value === 'string') return value;
  }
  return fallback;
}

function fillFormFromData(data) {
  return {
    name: data.name || '',
    address: data.address || '',
    phone: data.phone || '',
    email: data.email || '',
    website: data.website || '',
    diocese: data.diocese || '',
    patron_saint: data.patron_saint || '',
    established_year: data.established_year || '',
    office_phone: data.office_phone || '',
    office_email: data.office_email || '',
    office_open_time: data.office_open_time || '',
    office_close_time: data.office_close_time || '',
    google_map_url: data.google_map_url || '',
    facebook_url: data.facebook_url || '',
    instagram_url: data.instagram_url || '',
    youtube_url: data.youtube_url || '',
    whatsapp_url: data.whatsapp_url || '',
    history: data.history || '',
    mission: data.mission || '',
    vision: data.vision || '',
  };
}

function formatTime(value) {
  if (!value) return null;
  const [h, m] = value.split(':');
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

function ViewRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && (
        <div className="h-8 w-8 shrink-0 rounded-lg bg-surface-2 flex items-center justify-center text-ink-muted mt-0.5">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-muted">{label}</p>
        <div className="text-sm font-medium text-ink mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function ViewValue({ value, multiline = false }) {
  if (!value) return <span className="text-ink-muted font-normal">Not set</span>;
  return <span className={multiline ? 'whitespace-pre-line' : ''}>{value}</span>;
}

function ViewLink({ value, label }) {
  if (!value) return <span className="text-ink-muted font-normal">Not set</span>;
  return (
    <a href={value} target="_blank" rel="noopener noreferrer" className="text-accent-strong hover:underline break-all">
      {label || value}
    </a>
  );
}

// Small circular icon-link used in the identity card's social row —
// dims to a neutral state when a link isn't set, rather than disappearing,
// so the row doesn't visibly reflow as fields get filled in.
function SocialIcon({ icon: Icon, href, label }) {
  const active = Boolean(href);
  const content = <Icon className="h-4 w-4" />;
  const classes = `h-8 w-8 rounded-full flex items-center justify-center border transition-all duration-150 ${
    active
      ? 'bg-surface-2 border-border text-ink hover:bg-accent hover:text-accent-ink hover:border-transparent hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong'
      : 'bg-surface-2/40 border-border text-ink-muted/40 cursor-default'
  }`;
  if (!active) return <span className={classes} aria-label={`${label} not set`}>{content}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes} aria-label={label}>
      {content}
    </a>
  );
}

// Compact stat/fact card for the sidebar — mirrors the mockup's "Organization
// status" block, but sourced from the same live form state as the main
// content so it never goes stale while editing.
function FactCard({ title, children }) {
  return (
    <div className="bg-surface-2 rounded-2xl p-4">
      <h4 className="text-sm font-semibold text-ink mb-3">{title}</h4>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink text-right">{value || '—'}</span>
    </div>
  );
}

export default function ChurchSettings() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoUrl, setLogoUrl] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [editing, setEditing] = useState(false);

  const snapshotRef = useRef({ form: EMPTY_FORM, logoUrl: null, coverUrl: null });
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parishService.getParishDetail();
      const data = res.data.results ?? res.data;
      const filled = fillFormFromData(data);
      setForm(filled);
      setLogoUrl(data.logo_url || null);
      setCoverUrl(data.cover_image_url || null);
      snapshotRef.current = { form: filled, logoUrl: data.logo_url || null, coverUrl: data.cover_image_url || null };
    } catch {
      toast.error('Could not load parish settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateImage = (file, label) => {
    if (!file) return true;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(`${label} must be a JPEG, PNG, WEBP, or GIF image`);
      return false;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`${label} must be under ${MAX_IMAGE_SIZE_MB}MB`);
      return false;
    }
    return true;
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!validateImage(file, 'Logo')) {
      e.target.value = '';
      setLogoFile(null);
      return;
    }
    setLogoFile(file || null);
    if (file) setLogoUrl(URL.createObjectURL(file));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!validateImage(file, 'Cover image')) {
      e.target.value = '';
      setCoverFile(null);
      return;
    }
    setCoverFile(file || null);
    if (file) setCoverUrl(URL.createObjectURL(file));
  };

  const startEditing = () => setEditing(true);

  const cancelEditing = () => {
    setForm(snapshotRef.current.form);
    setLogoUrl(snapshotRef.current.logoUrl);
    setCoverUrl(snapshotRef.current.coverUrl);
    setLogoFile(null);
    setCoverFile(null);
    setEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (form.office_open_time && form.office_close_time && form.office_open_time >= form.office_close_time) {
      toast.error('Office closing time must be later than opening time');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        const finalValue = URL_FIELDS.includes(key) ? String(value ?? '').trim() : (value ?? '');
        formData.append(key, finalValue);
      });
      if (logoFile) formData.append('logo', logoFile);
      if (coverFile) formData.append('cover_image', coverFile);

      await parishService.updateParishSettings(formData);
      toast.success('Church settings updated');

      setLogoFile(null);
      setCoverFile(null);
      setEditing(false);
      await loadSettings();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Church Settings" description="Configure parish identity, contact details, and public presence." />
        <div className="h-40 sm:h-56 bg-surface-2 rounded-2xl animate-pulse mb-6" />
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-2 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <PageHeader title="Church Settings" description="Configure parish identity, contact details, and public presence." />

      {/* Single hidden file inputs — triggered programmatically from the
          floating edit buttons below. Upload logic is untouched. */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleLogoChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleCoverChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ------------------------------------------------------------ */}
      {/* IDENTITY CARD — banner + overlapping logo/name/socials/edit  */}
      {/* ------------------------------------------------------------ */}
      <div className="mb-6">
        {/* BANNER — cover photo strip, back in its original spot. */}
        <div className="h-32 sm:h-44 md:h-56 rounded-2xl overflow-hidden bg-surface-2 relative isolate">
          <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
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
          <div className="absolute inset-0  z-10 bg-black/15 dark:bg-black/30 pointer-events-none" />
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="absolute inset-0 z-20 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 text-ink-muted">
              <ImageOff className="h-7 w-7 opacity-40" />
              <p className="text-sm font-medium opacity-70">No Banner Uploaded</p>
              <p className="text-xs opacity-50">Upload a parish cover image</p>
            </div>
          )}
          {editing && (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              aria-label="Change banner image"
              className="
                  absolute
                  top-3
                  right-3
                  z-[100]
                  rounded-full
                  backdrop-blur
                  bg-accent
                  text-accent-ink
                  px-2
                  py-2
                  flex
                  items-center
                  gap-2
                 
                  hover:bg-black/70
                  transition
                  focus-visible:outline
                  focus-visible:outline-2
                  focus-visible:outline-white
              "
            >
              <span className="relative z-[100]  flex items-center">
                <Pencil className="h-4 w-4 " />
              </span>
              {/* Change Banner */}
            </button>
          )}
        </div>

        {/* IDENTITY CARD — overlaps the banner, ColorBends is ITS background. */}
        <div className="relative -mt-10 sm:-mt-12 mx-2 sm:mx-4">
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm">
            {/* Animated background layer for the card itself. */}
            <div className="absolute inset-0 z-0" aria-hidden="true">
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
              {/* Darkening scrim so logo/text/icons stay legible over the gradient. */}
              <div className="absolute inset-0 bg-black/35" />
            </div>

            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative shrink-0 -mt-8 sm:mt-0">
                  {logoUrl ? (
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-surface shadow-md bg-surface flex items-center justify-center overflow-hidden">
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-accent text-accent-ink flex items-center justify-center border-4 border-surface shadow-md">
                      <Building2 className="h-8 w-8" />
                    </div>
                  )}
                  {editing && (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      aria-label="Change logo"
                      className="
                          absolute
                          -bottom-1
                          -right-1
                          h-7
                          w-7
                          rounded-full
                          bg-accent
                          text-accent-ink
                          flex
                          items-center
                          justify-center
                          border-2
                          border-surface
                          hover:brightness-95
                          transition
                          focus-visible:outline
                          focus-visible:outline-2
                          focus-visible:outline-accent-strong
                      "
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl font-semibold text-white truncate drop-shadow-sm">{form.name || 'Church Name'}</h2>
                      <p className="text-sm text-white/80 mt-0.5 break-words drop-shadow-sm">
                        {[form.diocese, form.address].filter(Boolean).join(' · ') || 'Diocese and address not set'}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                      {editing ? (
                        <>
                          <Button type="button" variant="secondary" onClick={cancelEditing} disabled={saving}>
                            Cancel
                          </Button>
                          <Button type="submit" loading={saving}>Save Settings</Button>
                        </>
                      ) : (
                        <Button type="button" icon={Pencil} onClick={startEditing}>Edit</Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <SocialIcon icon={Globe} href={form.website} label="Website" />
                    <SocialIcon icon={FaFacebook} href={form.facebook_url} label="Facebook" />
                    <SocialIcon icon={FaInstagram} href={form.instagram_url} label="Instagram" />
                    <SocialIcon icon={FaYoutube} href={form.youtube_url} label="YouTube" />
                    <SocialIcon icon={MessageCircle} href={form.whatsapp_url} label="WhatsApp" />
                    <SocialIcon icon={MapPinned} href={form.google_map_url} label="Google Maps" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* MAIN GRID — tab content (left) + always-on facts sidebar     */}
      {/* ------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0">
          <div className="flex items-center gap-1 mb-4 border-b border-border overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong ${
                  activeTab === tab.key
                    ? 'border-accent-strong text-ink dark:text-accent-strong'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-2xl shadow-sm p-5">
            {activeTab === 'general' && (
              editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Church Name</label>
                      <Input type="text" name="name" required value={form.name} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Diocese</label>
                      <Input type="text" name="diocese" value={form.diocese} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Patron Saint</label>
                      <Input type="text" name="patron_saint" value={form.patron_saint} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Established Year</label>
                      <Input type="number" name="established_year" value={form.established_year} onChange={handleChange} placeholder="e.g. 1965" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Address</label>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={2}
                      className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Phone</label>
                      <Input type="text" name="phone" value={form.phone} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                      <Input type="email" name="email" value={form.email} onChange={handleChange} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Website</label>
                    <Input type="url" name="website" value={form.website} onChange={handleChange} />
                  </div>
                  <p className="text-xs text-ink-muted">
                    Logo and cover image can be changed from the card above while editing.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <ViewRow icon={MapPin} label="Address"><ViewValue value={form.address} multiline /></ViewRow>
                  <ViewRow icon={Phone} label="Phone"><ViewValue value={form.phone} /></ViewRow>
                  <ViewRow icon={Mail} label="Email"><ViewValue value={form.email} /></ViewRow>
                  <ViewRow icon={Globe} label="Website"><ViewLink value={form.website} /></ViewRow>
                </div>
              )
            )}

            {activeTab === 'office' && (
              editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Office Phone</label>
                      <Input type="text" name="office_phone" value={form.office_phone} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Office Email</label>
                      <Input type="email" name="office_email" value={form.office_email} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Opening Time</label>
                      <Input type="time" name="office_open_time" value={form.office_open_time} onChange={handleChange} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-1.5">Closing Time</label>
                      <Input type="time" name="office_close_time" value={form.office_close_time} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <ViewRow icon={Phone} label="Office Phone"><ViewValue value={form.office_phone} /></ViewRow>
                  <ViewRow icon={Mail} label="Office Email"><ViewValue value={form.office_email} /></ViewRow>
                  <ViewRow icon={Clock} label="Office Hours">
                    {form.office_open_time && form.office_close_time ? (
                      <ViewValue value={`${formatTime(form.office_open_time)} – ${formatTime(form.office_close_time)}`} />
                    ) : (
                      <ViewValue value={null} />
                    )}
                  </ViewRow>
                </div>
              )
            )}

            {activeTab === 'social' && (
              editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Google Maps URL</label>
                    <Input type="url" name="google_map_url" value={form.google_map_url} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Facebook URL</label>
                    <Input type="url" name="facebook_url" value={form.facebook_url} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Instagram URL</label>
                    <Input type="url" name="instagram_url" value={form.instagram_url} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">YouTube URL</label>
                    <Input type="url" name="youtube_url" value={form.youtube_url} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">WhatsApp URL</label>
                    <Input type="url" name="whatsapp_url" value={form.whatsapp_url} onChange={handleChange} />
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <ViewRow icon={MapPinned} label="Google Maps"><ViewLink value={form.google_map_url} label="View on Google Maps" /></ViewRow>
                  <ViewRow icon={FaFacebook} label="Facebook"><ViewLink value={form.facebook_url} /></ViewRow>
                  <ViewRow icon={FaInstagram} label="Instagram"><ViewLink value={form.instagram_url} /></ViewRow>
                  <ViewRow icon={FaYoutube} label="YouTube"><ViewLink value={form.youtube_url} /></ViewRow>
                  <ViewRow icon={MessageCircle} label="WhatsApp"><ViewLink value={form.whatsapp_url} /></ViewRow>
                </div>
              )
            )}

            {activeTab === 'about' && (
              editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">History</label>
                    <textarea name="history" value={form.history} onChange={handleChange} rows={4} className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Mission</label>
                    <textarea name="mission" value={form.mission} onChange={handleChange} rows={3} className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1.5">Vision</label>
                    <textarea name="vision" value={form.vision} onChange={handleChange} rows={3} className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong" />
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <ViewRow label="History"><ViewValue value={form.history} multiline /></ViewRow>
                  <ViewRow label="Mission"><ViewValue value={form.mission} multiline /></ViewRow>
                  <ViewRow label="Vision"><ViewValue value={form.vision} multiline /></ViewRow>
                </div>
              )
            )}
          </div>
        </div>

        {/* Sidebar — always-on live summary, mirrors the mockup's
            "Organization status" / "Locations" cards. Sourced from the same
            form state, so it updates in real time even while editing. */}
        <div className="space-y-4">
          <FactCard title="Parish Facts">
            <Fact label="Founded" value={form.established_year} />
            <Fact label="Diocese" value={form.diocese} />
            <Fact label="Patron Saint" value={form.patron_saint} />
          </FactCard>

          <FactCard title="Office Hours">
            <Fact
              label="Hours"
              value={
                form.office_open_time && form.office_close_time
                  ? `${formatTime(form.office_open_time)} – ${formatTime(form.office_close_time)}`
                  : null
              }
            />
            <Fact label="Phone" value={form.office_phone} />
            <Fact label="Email" value={form.office_email} />
          </FactCard>

          <FactCard title="Location">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-ink-muted shrink-0 mt-0.5" />
              <span className="text-ink">{form.address || <span className="text-ink-muted">Not set</span>}</span>
            </div>
            {form.google_map_url && (
              <a
                href={form.google_map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-medium text-accent-strong hover:underline mt-1"
              >
                View on Google Maps
              </a>
            )}
          </FactCard>
        </div>
      </div>
    </form>
  );
}