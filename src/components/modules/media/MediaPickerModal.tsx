import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Search,
  Image as ImageIcon,
  Check,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  FileText,
  FolderOpen,
} from 'lucide-react';
import { MediaAsset } from '../../../types/database';
import store from '../../../services/store';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  currentValue?: string;
  title?: string;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentValue = '',
  title = 'Pilih Berkas Media',
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'url'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string>(currentValue);
  const [customUrl, setCustomUrl] = useState<string>(currentValue);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const appState = store.getState();
  const mediaAssets = appState.mediaAssets || [];
  const activeWorkspaceId = appState.activeWorkspaceId;

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentValue);
      setCustomUrl(currentValue);
      setUploadError(null);
      // Muat ulang daftar media jika di mode live
      if (activeWorkspaceId) {
        store.loadMediaAssetsAsync(activeWorkspaceId);
      }
    }
  }, [isOpen, currentValue, activeWorkspaceId]);

  if (!isOpen) return null;

  const filteredAssets = mediaAssets.filter((asset) =>
    asset.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validasi tipe berkas
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Hanya format gambar JPG, PNG, WebP, SVG, dan GIF yang didukung.');
      return;
    }

    // Validasi ukuran berkas (Maks 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file melebihi batas 5 MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const uploaded = await store.uploadMediaAssetAsync(activeWorkspaceId, file);
      if (uploaded) {
        setSelectedUrl(uploaded.url);
        setActiveTab('library');
      } else {
        setUploadError(store.getState().lastErrorMessage || 'Gagal mengunggah berkas.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Terjadi kesalahan saat mengunggah.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmSelection = () => {
    const finalUrl = activeTab === 'url' ? customUrl.trim() : selectedUrl.trim();
    if (finalUrl) {
      onSelect(finalUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#6D4AFF]/10 text-[#6D4AFF] rounded-lg">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">
                Pilih dari aset tersimpan atau unggah berkas baru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigasi */}
        <div className="px-5 pt-3 border-b border-slate-100 flex items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'library'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Pustaka Media ({mediaAssets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Berkas Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'url'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Tautan URL Eksternal</span>
          </button>
        </div>

        {/* Konten Tab */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[300px]">
          {/* TAB 1: PUSTAKA MEDIA */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {/* Kolom Pencarian */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berkas berdasarkan nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:border-[#6D4AFF] outline-hidden bg-slate-50 focus:bg-white"
                />
              </div>

              {filteredAssets.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    {searchQuery ? 'Tidak ada berkas yang cocok.' : 'Pustaka media masih kosong.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="text-xs font-semibold text-[#6D4AFF] hover:underline"
                  >
                    Unggah gambar pertama sekarang →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-1">
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedUrl === asset.url;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedUrl(asset.url)}
                        className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all aspect-square flex flex-col justify-end bg-slate-100 ${
                          isSelected
                            ? 'border-[#6D4AFF] ring-2 ring-[#6D4AFF]/20 shadow-md'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={asset.url}
                          alt={asset.file_name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />

                        {/* Indikator Terpilih */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#6D4AFF] text-white p-1 rounded-full shadow-md z-10">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}

                        {/* Overlay Nama File */}
                        <div className="relative z-10 bg-linear-to-t from-slate-900/80 via-slate-900/40 to-transparent p-2 text-white">
                          <p className="text-[10px] font-medium truncate">{asset.file_name}</p>
                          <p className="text-[9px] text-slate-300">
                            {(asset.file_size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UNGGAH BARU */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isUploading
                    ? 'border-[#6D4AFF] bg-[#6D4AFF]/5'
                    : 'border-slate-300 hover:border-[#6D4AFF] bg-slate-50/50'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                {isUploading ? (
                  <div className="space-y-2 py-4">
                    <Loader2 className="w-8 h-8 text-[#6D4AFF] animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-800">
                      Mengunggah ke Supabase Storage...
                    </p>
                    <p className="text-[11px] text-slate-500">Mohon tunggu beberapa detik.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-white rounded-full shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-[#6D4AFF]">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Seret & lepas berkas gambar ke sini
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Format yang didukung: JPG, PNG, WebP, SVG, GIF (Maks. 5 MB)
                      </p>
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs transition-colors">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Pilih Berkas dari Komputer</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: URL EKSTERNAL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Masukkan Alamat URL Gambar
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#6D4AFF] outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Gunakan URL publik yang dapat diakses secara bebas (HTTPS).
                </p>
              </div>

              {customUrl && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-700">Pratinjau Gambar:</span>
                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex items-center justify-center max-h-48 overflow-hidden">
                    <img
                      src={customUrl}
                      alt="Pratinjau"
                      className="max-h-40 max-w-full object-contain rounded"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
            {activeTab === 'url' ? (
              <span>URL: {customUrl || 'Belum diisi'}</span>
            ) : (
              <span>Terpilih: {selectedUrl ? '1 Berkas' : 'Belum ada gambar terpilih'}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={activeTab === 'url' ? !customUrl.trim() : !selectedUrl.trim()}
              onClick={handleConfirmSelection}
              className="px-4 py-1.5 bg-[#6D4AFF] hover:bg-[#5b3ce0] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Gunakan Gambar Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPickerModal;
