import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  Home,
  Check,
  AlertTriangle,
  Globe,
  Settings,
} from 'lucide-react';
import { Page, Website } from '../../../types/database';

interface PageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  website: Website;
  pages: Page[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage: (title: string, slug: string, isHomepage: boolean) => void;
  onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPages: (pages: Page[]) => void;
}

export const PageManagerModal: React.FC<PageManagerModalProps> = ({
  isOpen,
  onClose,
  website,
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onUpdatePage,
  onDeletePage,
  onReorderPages,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setNewSlug(autoSlug);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const titleTrimmed = newTitle.trim();
    const slugTrimmed = newSlug.trim().toLowerCase();

    if (!titleTrimmed) {
      setFormError('Nama halaman wajib diisi.');
      return;
    }

    if (!slugTrimmed) {
      setFormError('Slug URL halaman wajib diisi.');
      return;
    }

    // Cek apakah slug sudah ada
    if (pages.some((p) => p.slug.toLowerCase() === slugTrimmed)) {
      setFormError(`Slug URL "/${slugTrimmed}" sudah digunakan oleh halaman lain.`);
      return;
    }

    onCreatePage(titleTrimmed, slugTrimmed, false);
    setNewTitle('');
    setNewSlug('');
    setIsAdding(false);
  };

  const startEdit = (p: Page) => {
    setEditingPageId(p.id);
    setEditTitle(p.title);
    setEditSlug(p.slug);
    setFormError(null);
  };

  const handleSaveEdit = (pageId: string) => {
    const titleTrimmed = editTitle.trim();
    const slugTrimmed = editSlug.trim().toLowerCase();

    if (!titleTrimmed || !slugTrimmed) {
      setFormError('Nama dan slug tidak boleh kosong.');
      return;
    }

    // Cek duplikasi slug
    const duplicate = pages.find(
      (p) => p.id !== pageId && p.slug.toLowerCase() === slugTrimmed
    );
    if (duplicate) {
      setFormError(`Slug "/${slugTrimmed}" sudah dipakai halaman "${duplicate.title}".`);
      return;
    }

    onUpdatePage(pageId, {
      title: titleTrimmed,
      slug: slugTrimmed,
    });
    setEditingPageId(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const updated = [...pages];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onReorderPages(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#6D4AFF]/10 text-[#6D4AFF] rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Kelola Struktur Halaman ({website.name})
              </h3>
              <p className="text-[11px] text-slate-500">
                Atur navigasi, urutan, slug URL, dan status halaman website
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

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Tombol Tambah Halaman Baru */}
          {!isAdding && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Halaman ({pages.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true);
                  setFormError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Halaman Baru</span>
              </button>
            </div>
          )}

          {/* Form Tambah Halaman Baru */}
          {isAdding && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-4 bg-slate-50 border border-[#6D4AFF]/30 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Buat Halaman Baru
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Halaman
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Contoh: Tentang Kami"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:border-[#6D4AFF] outline-hidden bg-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Slug URL
                  </label>
                  <div className="flex items-center">
                    <span className="bg-slate-200 border border-r-0 border-slate-200 px-2 py-1.5 rounded-l-md text-slate-600 text-xs font-mono">
                      /
                    </span>
                    <input
                      type="text"
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value)}
                      placeholder="tentang-kami"
                      className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-r-md text-xs focus:border-[#6D4AFF] outline-hidden bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white rounded-md text-xs font-semibold shadow-xs"
                >
                  Simpan Halaman
                </button>
              </div>
            </form>
          )}

          {/* List Halaman */}
          <div className="space-y-2">
            {pages.map((p, index) => {
              const isActive = p.id === activePageId;
              const isEditing = editingPageId === p.id;

              return (
                <div
                  key={p.id}
                  className={`border rounded-lg p-3 transition-all ${
                    isActive
                      ? 'border-[#6D4AFF] bg-[#6D4AFF]/5 ring-1 ring-[#6D4AFF]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="px-2.5 py-1 border border-slate-200 rounded text-xs outline-hidden focus:border-[#6D4AFF]"
                        />
                        <div className="flex items-center">
                          <span className="bg-slate-100 border border-r-0 border-slate-200 px-2 py-1 rounded-l text-slate-500 text-xs">
                            /
                          </span>
                          <input
                            type="text"
                            value={editSlug}
                            disabled={p.is_homepage}
                            onChange={(e) => setEditSlug(e.target.value)}
                            className="flex-1 px-2.5 py-1 border border-slate-200 rounded-r text-xs outline-hidden focus:border-[#6D4AFF] disabled:bg-slate-50 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPageId(null)}
                          className="px-2.5 py-1 text-slate-600 text-xs hover:bg-slate-100 rounded"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(p.id)}
                          className="px-3 py-1 bg-[#6D4AFF] text-white text-xs font-semibold rounded"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.is_homepage ? (
                          <div className="p-1.5 bg-amber-100 text-amber-700 rounded-md" title="Halaman Beranda Utama">
                            <Home className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {p.title}
                            </span>
                            {p.is_homepage && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Beranda
                              </span>
                            )}
                            {isActive && (
                              <span className="bg-[#6D4AFF] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Aktif Diedit
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {p.is_homepage ? '/' : `/${p.slug}`}
                          </div>
                        </div>
                      </div>

                      {/* Aksi Baris */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Tombol Urutan */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                          title="Pindah ke atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === pages.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                          title="Pindah ke bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Nama/Slug */}
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs font-semibold"
                        >
                          Ubah
                        </button>

                        {/* Buka di Editor */}
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectPage(p.id);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-[#6D4AFF] hover:text-white text-slate-700 rounded text-xs font-semibold transition-colors"
                          >
                            Buka di Editor
                          </button>
                        )}

                        {/* Hapus (kecuali Beranda atau halaman satu-satunya) */}
                        {!p.is_homepage && pages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus halaman "${p.title}" beserta seluruh bloknya?`)) {
                                onDeletePage(p.id);
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Hapus Halaman"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <span className="text-[11px] text-slate-500">
            Total {pages.length} halaman terdaftar pada website ini.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageManagerModal;
