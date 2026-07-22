import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Image as ImageIcon, Upload, Users, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Guards every setState call after unmount. This replaces the previous
  // unmount cleanup that called setPhotosModalAlbum(null) directly — that
  // was pointless (React discards all state on unmount regardless of what
  // you set it to) and didn't protect against the real risk, which is a
  // slow async response resolving after the component is already gone.
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
      if (search) params.search = search; // covers title, description, event__title per backend search_fields
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
    try {
      const res = await galleryService.getAlbum(album.id);
      if (!mountedRef.current) return;
      setPhotosModalAlbum(res.data);
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
      // Keep the single matching card in sync immediately for instant
      // feedback, AND refetch the full list so pageInfo/summary totals
      // (which derive from the whole page's data) stay accurate too.
      setAlbums((prev) => prev.map((a) => (a.id === albumId ? res.data : a)));
      fetchAlbums();
    } catch {
      if (!mountedRef.current) return;
      toast.error('Could not refresh album — it may have been deleted');
      setPhotosModalAlbum(null);
      fetchAlbums();
    }
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

  // Reflect only the current page — pageInfo.count (Total Albums card) is
  // the accurate figure regardless of pagination.
  const totalPhotosOnPage = albums.reduce((sum, a) => sum + (a.photo_count || 0), 0);
  const featuredCountOnPage = albums.filter((a) => a.is_featured).length;
  const hasActiveFilter = Boolean(search || statusFilter);

  return (
    <div>
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
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="">All albums</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl py-16 text-center">
          <h3 className="text-sm font-semibold text-gray-900">
            {hasActiveFilter ? 'No albums match the current filter' : 'No albums yet'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {hasActiveFilter ? 'Try a different search term or filter.' : 'Create your first album to start uploading photos.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => openPhotosModal(album)}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="w-full h-32 bg-gray-100">
                {album.cover_image_url ? (
                  <img src={album.cover_image_url} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    {album.title}
                    {album.is_featured && <Star className="h-3.5 w-3.5 text-warning-500 fill-warning-500" />}
                  </h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={album.is_public ? 'primary' : 'gray'}>{album.is_public ? 'Public' : 'Internal'}</Badge>
                    {!album.is_active && <Badge variant="danger">Inactive</Badge>}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{album.photo_count} photo{album.photo_count === 1 ? '' : 's'}</p>

                <div className="flex items-center gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                  <PermissionGate permission={PERMISSIONS.MANAGE_GALLERY}>
                    <Button size="sm" variant="secondary" onClick={() => openPhotosModal(album)}>Manage Photos</Button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.MANAGE_GALLERY}>
                    <button onClick={() => openEditAlbum(album)} className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </PermissionGate>
                  <PermissionGate role={ROLES.SUPERADMIN}>
                    <button onClick={() => handleDeleteAlbum(album)} className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:bg-danger-50 hover:text-danger-600" aria-label="Delete">
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
            className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-xs text-gray-400">{pageInfo.count} total</span>
          <button
            onClick={() => goToPage(pageInfo.next)}
            disabled={!pageInfo.next || loading}
            className="flex items-center gap-1 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-gray-900"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {albumModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{editingAlbumId ? 'Edit Album' : 'Create Album'}</h3>
              <button onClick={() => setAlbumModalOpen(false)} className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAlbum} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <Input type="text" name="title" required value={albumForm.title} onChange={handleAlbumFormChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={albumForm.description}
                  onChange={handleAlbumFormChange}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Linked Event <span className="text-gray-400">(optional)</span>
                </label>
                <select name="event" value={albumForm.event} onChange={handleAlbumFormChange} className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm">
                  <option value="">No linked event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cover Image <span className="text-gray-400">(optional)</span>
                </label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} className="text-sm" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_public" checked={albumForm.is_public} onChange={handleAlbumFormChange} className="rounded border-gray-300" />
                  Public
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_featured" checked={albumForm.is_featured} onChange={handleAlbumFormChange} className="rounded border-gray-300" />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_active" checked={albumForm.is_active} onChange={handleAlbumFormChange} className="rounded border-gray-300" />
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{photosModalAlbum.title} — Photos</h3>
              <button onClick={() => setPhotosModalAlbum(null)} className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <PermissionGate permission={PERMISSIONS.MANAGE_GALLERY}>
                <form onSubmit={handleUploadPhoto} className="flex flex-col gap-2 mb-5 pb-5 border-b border-gray-100">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setNewPhotoFiles(Array.from(e.target.files))}
                    className="text-sm"
                  />
                  {newPhotoFiles.length > 0 && (
                    <p className="text-xs text-gray-500">{newPhotoFiles.length} photo{newPhotoFiles.length === 1 ? '' : 's'} selected</p>
                  )}
                  <div className="flex gap-2">
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
                </form>
              </PermissionGate>

              {photosLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (photosModalAlbum.photos || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No photos in this album yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photosModalAlbum.photos.map((photo) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-100">
                      <img src={photo.image_url} alt={photo.caption || ''} className="w-full h-28 object-cover" />
                      {photo.caption && (
                        <p className="text-xs text-gray-600 px-2 py-1.5 bg-white">{photo.caption}</p>
                      )}
                      <PermissionGate role={ROLES.SUPERADMIN}>
                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          className="absolute top-1.5 right-1.5 h-7 w-7 flex items-center justify-center rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Delete photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}