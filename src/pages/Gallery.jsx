import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Image as ImageIcon, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { galleryService, communicationService } from '../services.js';
import { PageHeader, Button, Input, SummaryCard, Badge } from '../components.jsx';
import { PermissionGate } from '../auth.jsx';
import { PERMISSIONS, ROLES } from '../constants.js';
import { Star } from 'lucide-react';
import api from '../api.js';

const EMPTY_ALBUM_FORM = { title: '', description: '', event: '', is_public: true, is_featured: false, is_active: true };

function extractErrorMessage(err, fallback = 'Failed to save') {
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

export default function Gallery() {
  const [albums, setAlbums] = useState([]);
  const [pageInfo, setPageInfo] = useState({ count: 0, next: null, previous: null });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbumId, setEditingAlbumId] = useState(null);
  const [albumForm, setAlbumForm] = useState(EMPTY_ALBUM_FORM);
  const [coverFile, setCoverFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [photosModalAlbum, setPhotosModalAlbum] = useState(null);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    communicationService
      .getEvents()
      .then((res) => {
        if (mountedRef.current) setEvents(res.data.results ?? res.data);
      })
      .catch(() => {});
  }, []);

  const abortRef = useRef(null);

  const fetchAlbums = useCallback((url = null) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = {};
    if (!url) {
      if (search) params.search = search;
      if (statusFilter) params.active = statusFilter;
    }

    const request = url
      ? api.get(url, { signal: controller.signal })
      : galleryService.getAlbums(params, { signal: controller.signal });

    request
      .then((res) => {
        if (!mountedRef.current) return;
        const data = res.data;
        if (data.results) {
          setAlbums(data.results);
          setPageInfo({ count: data.count ?? 0, next: data.next ?? null, previous: data.previous ?? null });
        } else {
          setAlbums(data);
          setPageInfo({ count: data.length, next: null, previous: null });
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        toast.error('Could not load albums');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchAlbums(), 300);
    return () => clearTimeout(timeout);
  }, [fetchAlbums]);

  const goToPage = (url) => {
    if (url) fetchAlbums(url);
  };

  const openAddAlbum = () => {
    setEditingAlbumId(null);
    setAlbumForm(EMPTY_ALBUM_FORM);
    setCoverFile(null);
    setAlbumModalOpen(true);
  };

  const openEditAlbum = (album) => {
    setEditingAlbumId(album.id);
    setAlbumForm({
      title: album.title,
      description: album.description || '',
      event: album.event || '',
      is_public: album.is_public,
      is_featured: album.is_featured,
      is_active: album.is_active,
    });
    setCoverFile(null);
    setAlbumModalOpen(true);
  };

  const handleAlbumFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAlbumForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveAlbum = async (e) => {
    e.preventDefault();
    if (albumForm.is_featured && !albumForm.is_public) {
      toast.error('Featured albums must be public');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(albumForm).forEach(([key, value]) => {
        if (key === 'event') {
          formData.append(key, value);
          return;
        }
        if (value !== '') formData.append(key, value);
      });
      if (coverFile) formData.append('cover_image', coverFile);

      if (editingAlbumId) {
        await galleryService.updateAlbum(editingAlbumId, formData);
        toast.success('Album updated');
      } else {
        await galleryService.createAlbum(formData);
        toast.success('Album created');
      }
      setAlbumModalOpen(false);
      fetchAlbums();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save album'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAlbum = async (album) => {
    if (!window.confirm(`Delete album "${album.title}" and all its photos?`)) return;
    try {
      await galleryService.deleteAlbum(album.id);
      toast.success('Album deleted');
      fetchAlbums();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete album'));
    }
  };

  const openPhotosModal = async (album) => {
    setPhotosLoading(true);
    setPhotosModalAlbum({ ...album, photos: [] });
    setActivePhotoIndex(0);
    try {
      const res = await galleryService.getAlbum(album.id);
      if (!mountedRef.current) return;
      setPhotosModalAlbum(res.data);
      setActivePhotoIndex(0);
    } catch {
      if (!mountedRef.current) return;
      toast.error('Could not load this album — refreshing the list');
      setPhotosModalAlbum(null);
      fetchAlbums();
    } finally {
      if (mountedRef.current) setPhotosLoading(false);
    }
  };

  const refreshAlbumPhotos = async (albumId) => {
    if (!albumId) return;
    try {
      const res = await galleryService.getAlbum(albumId);
      if (!mountedRef.current) return;
      setPhotosModalAlbum(res.data);
      setAlbums((prev) => prev.map((a) => (a.id === albumId ? res.data : a)));
      setActivePhotoIndex((prev) => {
        const photos = res.data.photos || [];
        if (!photos.length) return 0;
        return Math.min(prev, photos.length - 1);
      });
      fetchAlbums();
    } catch {
      if (!mountedRef.current) return;
      toast.error('Could not refresh album — it may have been deleted');
      setPhotosModalAlbum(null);
      fetchAlbums();
    }
  };

  const goToPhoto = (direction) => {
    const photos = photosModalAlbum?.photos || [];
    if (!photos.length) return;
    setActivePhotoIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return photos.length - 1;
      if (next >= photos.length) return 0;
      return next;
    });
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!photosModalAlbum?.id) {
      toast.error('No album selected');
      return;
    }
    if (newPhotoFiles.length === 0) {
      toast.error('Choose at least one photo');
      return;
    }
    setUploadingPhoto(true);
    setUploadProgress({ done: 0, total: newPhotoFiles.length });

    let successCount = 0;
    let failCount = 0;

    for (const file of newPhotoFiles) {
      try {
        const formData = new FormData();
        formData.append('album', photosModalAlbum.id);
        formData.append('image', file);
        formData.append('is_active', true);
        if (newPhotoCaption) formData.append('caption', newPhotoCaption);
        await galleryService.uploadPhoto(formData);
        successCount += 1;
      } catch {
        failCount += 1;
      } finally {
        setUploadProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    }

    if (!mountedRef.current) return;
    setNewPhotoFiles([]);
    setNewPhotoCaption('');
    await refreshAlbumPhotos(photosModalAlbum.id);
    if (mountedRef.current) setUploadingPhoto(false);

    if (failCount === 0) {
      toast.success(`${successCount} photo${successCount === 1 ? '' : 's'} uploaded`);
    } else {
      toast.error(`${successCount} uploaded, ${failCount} failed`);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await galleryService.deletePhoto(photo.id);
      await refreshAlbumPhotos(photosModalAlbum?.id);
      toast.success('Photo deleted');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete photo'));
    }
  };

  const totalPhotosOnPage = albums.reduce((sum, a) => sum + (a.photo_count || 0), 0);
  const featuredCountOnPage = albums.filter((a) => a.is_featured).length;
  const hasActiveFilter = Boolean(search || statusFilter);
  const uploadPercent = uploadProgress.total ? Math.round((uploadProgress.done / uploadProgress.total) * 100) : 0;

  return (
    <div>
      <style>{`
        @keyframes albumFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .album-fade-in { animation: albumFadeIn 0.35s ease-out both; }
        @keyframes photoFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .photo-fade-in { animation: photoFadeIn 0.3s ease-out both; }
      `}</style>

      <PageHeader
        title="Gallery"
        description="Manage photo albums from parish events and services."
        actions={
          <PermissionGate permission={PERMISSIONS.MANAGE_GALLERY}>
            <Button icon={Plus} onClick={openAddAlbum}>Create Album</Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={ImageIcon} title="Total Albums" value={pageInfo.count} loading={loading} />
        <SummaryCard icon={ImageIcon} title="Photos (this page)" value={totalPhotosOnPage} loading={loading} />
        <SummaryCard icon={Star} title="Featured (this page)" value={featuredCountOnPage} loading={loading} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="Search by title, description, or event..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm"
        >
          <option value="">All albums</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-16 text-center">
          <h3 className="text-sm font-semibold text-ink">
            {hasActiveFilter ? 'No albums match the current filter' : 'No albums yet'}
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            {hasActiveFilter ? 'Try a different search term or filter.' : 'Create your first album to start uploading photos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album, i) => (
            <div
              key={album.id}
              onClick={() => openPhotosModal(album)}
              className="album-fade-in bg-surface border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent-strong/50 transition-colors"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="w-full h-32 bg-surface-2">
                {album.cover_image_url ? (
                  <img src={album.cover_image_url} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-muted">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                    {album.title}
                    {album.is_featured && <Star className="h-3.5 w-3.5 text-warning-500 fill-warning-500" />}
                  </h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={album.is_public ? 'primary' : 'gray'}>{album.is_public ? 'Public' : 'Internal'}</Badge>
                    {!album.is_active && <Badge variant="danger">Inactive</Badge>}
                  </div>
                </div>
                <p className="text-xs text-ink-muted mt-1">{album.photo_count} photo{album.photo_count === 1 ? '' : 's'}</p>

                <div className="flex items-center gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                  <PermissionGate permission={PERMISSIONS.MANAGE_GALLERY}>
                    <Button size="sm" variant="secondary" onClick={() => openPhotosModal(album)}>Manage Photos</Button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.MANAGE_GALLERY}>
                    <button onClick={() => openEditAlbum(album)} className="h-8 w-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-accent/20 hover:text-accent-ink" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate role={ROLES.SUPERADMIN}>
                    <button onClick={() => handleDeleteAlbum(album)} className="h-8 w-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-danger-50 hover:text-danger-600" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(pageInfo.next || pageInfo.previous) && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => goToPage(pageInfo.previous)}
            disabled={!pageInfo.previous || loading}
            className="flex items-center gap-1 text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs text-ink-muted">{pageInfo.count} total</span>
          <button
            onClick={() => goToPage(pageInfo.next)}
            disabled={!pageInfo.next || loading}
            className="flex items-center gap-1 text-sm text-ink-muted disabled:opacity-40 disabled:cursor-not-allowed hover:text-ink"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {albumModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl shadow-lg w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-ink">{editingAlbumId ? 'Edit Album' : 'Create Album'}</h3>
              <button onClick={() => setAlbumModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAlbum} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Title</label>
                <Input type="text" name="title" required value={albumForm.title} onChange={handleAlbumFormChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Description <span className="text-ink-muted">(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={albumForm.description}
                  onChange={handleAlbumFormChange}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface text-ink px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-strong"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Linked Event <span className="text-ink-muted">(optional)</span>
                </label>
                <select name="event" value={albumForm.event} onChange={handleAlbumFormChange} className="w-full h-10 rounded-xl border border-border bg-surface text-ink px-3 text-sm">
                  <option value="">No linked event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Cover Image <span className="text-ink-muted">(optional)</span>
                </label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} className="text-sm text-ink" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_public" checked={albumForm.is_public} onChange={handleAlbumFormChange} className="rounded border-border accent-accent-strong" />
                  Public
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_featured" checked={albumForm.is_featured} onChange={handleAlbumFormChange} className="rounded border-border accent-accent-strong" />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" name="is_active" checked={albumForm.is_active} onChange={handleAlbumFormChange} className="rounded border-border accent-accent-strong" />
                  Active
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setAlbumModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>{editingAlbumId ? 'Save Changes' : 'Create Album'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {photosModalAlbum && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 px-3 py-4 sm:px-6 overflow-y-auto">
          <div className="bg-surface border border-border rounded-3xl shadow-lg w-full max-w-5xl my-auto overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-ink">{photosModalAlbum.title}</h3>
                <p className="text-sm text-ink-muted">{photosModalAlbum.photos?.length || 0} photo{(photosModalAlbum.photos?.length || 0) === 1 ? '' : 's'}</p>
              </div>
              <button onClick={() => setPhotosModalAlbum(null)} className="h-8 w-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <PermissionGate permission={PERMISSIONS.MANAGE_GALLERY}>
                <form onSubmit={handleUploadPhoto} className="flex flex-col gap-2 mb-5 pb-5 border-b border-border">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setNewPhotoFiles(Array.from(e.target.files))}
                    className="text-sm text-ink"
                  />
                  {newPhotoFiles.length > 0 && (
                    <p className="text-xs text-ink-muted">{newPhotoFiles.length} photo{newPhotoFiles.length === 1 ? '' : 's'} selected</p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="text"
                      placeholder="Caption applied to all (optional)"
                      value={newPhotoCaption}
                      onChange={(e) => setNewPhotoCaption(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" icon={Upload} loading={uploadingPhoto}>
                      {uploadingPhoto ? `Uploading ${uploadProgress.done}/${uploadProgress.total}` : 'Upload'}
                    </Button>
                  </div>
                  {uploadingPhoto && (
                    <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-strong transition-all duration-300 ease-out"
                        style={{ width: `${uploadPercent}%` }}
                      />
                    </div>
                  )}
                </form>
              </PermissionGate>

              {photosLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 bg-surface-2 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (photosModalAlbum.photos || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-6 py-12 text-center">
                  <p className="text-sm text-ink-muted">No photos in this album yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Photo stage stays deliberately dark regardless of the
                      app theme — a black background is the standard,
                      correct choice for image contrast in a lightbox,
                      light-mode apps included. */}
                  <div className="relative overflow-hidden rounded-3xl bg-black">
                    <img
                      src={photosModalAlbum.photos[activePhotoIndex]?.image_url}
                      alt={photosModalAlbum.photos[activePhotoIndex]?.caption || photosModalAlbum.title}
                      className="w-full h-[340px] sm:h-[420px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Viewing</p>
                          <p className="text-sm font-medium">{photosModalAlbum.photos[activePhotoIndex]?.caption || 'No caption'}</p>
                        </div>
                        <p className="text-sm text-white/80">{activePhotoIndex + 1} / {photosModalAlbum.photos.length}</p>
                      </div>
                    </div>
                    {photosModalAlbum.photos.length > 1 && (
                      <>
                        <button
                          onClick={() => goToPhoto(-1)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => goToPhoto(1)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-ink-muted">Tap a thumbnail to preview a photo.</p>
                    <PermissionGate role={ROLES.SUPERADMIN}>
                      <button
                        onClick={() => handleDeletePhoto(photosModalAlbum.photos[activePhotoIndex])}
                        className="text-sm font-medium text-danger-600 hover:text-danger-700"
                      >
                        Delete current photo
                      </button>
                    </PermissionGate>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {photosModalAlbum.photos.map((photo, i) => (
                      <button
                        key={photo.id}
                        onClick={() => setActivePhotoIndex(i)}
                        className={`relative overflow-hidden rounded-xl border ${activePhotoIndex === i ? 'border-accent-strong ring-2 ring-accent/30' : 'border-border'} bg-surface`}
                      >
                        <img src={photo.image_url} alt={photo.caption || ''} className="w-full h-20 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}