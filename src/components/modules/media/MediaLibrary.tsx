import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  HardDrive,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { MediaAsset, Workspace } from '../../../types/database';
import mediaService from '../../../services/mediaService';
import { isSupabaseLive } from '../../../services/supabase';

interface MediaLibraryProps {
  activeWorkspace: Workspace;
  mediaAssets: MediaAsset[];
  onAddMedia: (media: MediaAsset) => void;
  onDeleteMedia?: (id: string, storagePath?: string) => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  activeWorkspace,
  mediaAssets,
  onAddMedia,
  onDeleteMedia,
}) => {
  const [filterSource, setFilterSource] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLive = isSupabaseLive();

  const filtered = mediaAssets.filter(
    (m) => filterSource === 'all' || m.source === filterSource
  );

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const result = await mediaService.uploadMedia(activeWorkspace.id, file);

      if (result.error || !result.data) {
        setErrorMessage(result.error || 'Gagal mengunggah file.');
      } else {
        onAddMedia(result.data);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat mengunggah.');
    } finally {
      setIsUploading(false);
      // Reset input agar dapat memilih file yang sama jika dibutuhkan
      e.target.value = '';
    }
  };

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (item: MediaAsset) => {
    if (!confirm(`Yakin ingin menghapus aset "${item.file_name}"?`)) return;

    if (onDeleteMedia) {
      onDeleteMedia(item.id, item.external_id);
    } else {
      await mediaService.deleteMedia(item.id, item.external_id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#85859A]">
            <ImageIcon className="w-3.5 h-3.5 text-[#6D4AFF]" />
            <span>Media Arisera</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            Pusat Pengelolaan Gambar & File
          </h1>
          <p className="text-xs text-[#85859A] mt-0.5">
            Penyimpanan gambar produk dan logo dengan dukungan Supabase Storage bucket{' '}
            <code className="font-mono text-[#6D4AFF]">media-assets</code> (maks. 5 MB/file).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label
            className={`cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-xs transition-colors ${
              isUploading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{isUploading ? 'Mengunggah ke Storage...' : 'Unggah File Gambar'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
              onChange={handleUploadFile}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Error Banner jika ada kegagalan unggah */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-900 font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Integration Notice Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <HardDrive className="w-4 h-4 text-slate-500" />
          <div>
            <span className="font-semibold text-slate-800">
              Penyimpanan Cloud Terstruktur: {isLive ? 'Supabase Storage Aktif' : 'Mode Demo Lokal'}
            </span>
            <p className="text-[#85859A]">
              Bucket: <code className="font-mono">media-assets</code> · Format didukung: JPG, PNG, WebP, SVG (Maksimal 5 MB).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {['all', 'supabase_storage', 'local_storage'].map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setFilterSource(src)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                filterSource === src
                  ? 'bg-[#11111B] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {src === 'all'
                ? 'Semua File'
                : src === 'supabase_storage'
                ? 'Supabase Storage'
                : 'Lokal'}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-slate-700">Belum ada file media yang diunggah</p>
            <p className="text-[11px] text-[#85859A] mt-0.5">
              Klik tombol "Unggah File Gambar" untuk mengunggah logo atau gambar produk Anda.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-[#6D4AFF]/50 transition-all flex flex-col justify-between group"
            >
              <div className="h-32 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                {item.url && item.url.startsWith('http') || item.url.startsWith('blob') ? (
                  <img
                    src={item.url}
                    alt={item.file_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback jika URL gagal di-render
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform" />
                )}

                <span className="absolute top-2 left-2 text-[9px] font-semibold uppercase tracking-wider bg-white/90 backdrop-blur-xs text-slate-700 px-1.5 py-0.5 rounded shadow-xs">
                  {item.source === 'supabase_storage' ? 'Supabase' : 'Lokal'}
                </span>
              </div>

              <div className="p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-slate-800 truncate" title={item.file_name}>
                  {item.file_name}
                </p>
                <div className="flex items-center justify-between text-[11px] text-[#85859A] font-mono">
                  <span>{(item.file_size / 1024).toFixed(0)} KB</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyUrl(item.id, item.url)}
                      className="text-slate-400 hover:text-[#6D4AFF] p-0.5"
                      title="Salin Tautan"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="text-slate-400 hover:text-red-600 p-0.5"
                      title="Hapus File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
