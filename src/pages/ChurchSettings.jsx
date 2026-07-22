import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { parishService } from '../services.js';
import { PageHeader, Button, Input } from '../components.jsx';

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

export default function ChurchSettings() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoUrl, setLogoUrl] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parishService.getParishDetail();
      const data = res.data.results ?? res.data;
      setForm(fillFormFromData(data));
      setLogoUrl(data.logo_url || null);
      setCoverUrl(data.cover_image_url || null);
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
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!validateImage(file, 'Cover image')) {
      e.target.value = '';
      setCoverFile(null);
      return;
    }
    setCoverFile(file || null);
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
        if (value === '') return;
        // Trim URL fields specifically — stray whitespace from copy-paste
        // is a common source of a URLField failing validation silently.
        const finalValue = URL_FIELDS.includes(key) ? String(value).trim() : value;
        formData.append(key, finalValue);
      });
      if (logoFile) formData.append('logo', logoFile);
      if (coverFile) formData.append('cover_image', coverFile);

      await parishService.updateParishSettings(formData);
      toast.success('Church settings updated');

      // Reload from the backend rather than trusting local form state —
      // picks up any server-side normalization (e.g. trimmed values,
      // computed fields) and gives fresh logo/cover URLs for the previews.
      setLogoFile(null);
      setCoverFile(null);
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
        <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <PageHeader
        title="Church Settings"
        description="Configure parish identity, contact details, and public presence."
        actions={<Button type="submit" loading={saving}>Save Settings</Button>}
      />

      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        {activeTab === 'general' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Church Name</label>
                <Input type="text" name="name" required value={form.name} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Diocese</label>
                <Input type="text" name="diocese" value={form.diocese} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Patron Saint</label>
                <Input type="text" name="patron_saint" value={form.patron_saint} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Established Year</label>
                <Input type="number" name="established_year" value={form.established_year} onChange={handleChange} placeholder="e.g. 1965" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <Input type="text" name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <Input type="email" name="email" value={form.email} onChange={handleChange} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <Input type="url" name="website" value={form.website} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Logo <span className="text-gray-400">(max {MAX_IMAGE_SIZE_MB}MB)</span>
                </label>
                {logoUrl && !logoFile && (
                  <div className="flex items-center gap-2 mb-2">
                    <img src={logoUrl} alt="Current logo" className="h-12 w-12 rounded-lg object-cover border border-gray-100" />
                    <span className="text-xs text-gray-500">Current logo</span>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleLogoChange} className="text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cover Image <span className="text-gray-400">(max {MAX_IMAGE_SIZE_MB}MB)</span>
                </label>
                {coverUrl && !coverFile && (
                  <div className="flex items-center gap-2 mb-2">
                    <img src={coverUrl} alt="Current cover" className="h-12 w-20 rounded-lg object-cover border border-gray-100" />
                    <span className="text-xs text-gray-500">Current cover</span>
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleCoverChange} className="text-sm" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'office' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Office Phone</label>
                <Input type="text" name="office_phone" value={form.office_phone} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Office Email</label>
                <Input type="email" name="office_email" value={form.office_email} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Opening Time</label>
                <Input type="time" name="office_open_time" value={form.office_open_time} onChange={handleChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Closing Time</label>
                <Input type="time" name="office_close_time" value={form.office_close_time} onChange={handleChange} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'social' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Maps URL</label>
              <Input type="url" name="google_map_url" value={form.google_map_url} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Facebook URL</label>
              <Input type="url" name="facebook_url" value={form.facebook_url} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram URL</label>
              <Input type="url" name="instagram_url" value={form.instagram_url} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">YouTube URL</label>
              <Input type="url" name="youtube_url" value={form.youtube_url} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp URL</label>
              <Input type="url" name="whatsapp_url" value={form.whatsapp_url} onChange={handleChange} />
            </div>
          </>
        )}

        {activeTab === 'about' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">History</label>
              <textarea name="history" value={form.history} onChange={handleChange} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mission</label>
              <textarea name="mission" value={form.mission} onChange={handleChange} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vision</label>
              <textarea name="vision" value={form.vision} onChange={handleChange} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500" />
            </div>
          </>
        )}
      </div>
    </form>
  );
}