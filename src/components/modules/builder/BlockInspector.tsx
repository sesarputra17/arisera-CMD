import React, { useState } from 'react';
import {
  Type,
  Palette,
  Layout,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Sliders,
  Image as ImageIcon,
  Plus,
  X,
  Upload,
  Link as LinkIcon,
  Star,
  Check,
} from 'lucide-react';
import { VisualComponentBlock, Website } from '../../../types/database';
import { MediaPickerModal } from '../media/MediaPickerModal';

interface BlockInspectorProps {
  block: VisualComponentBlock;
  website: Website;
  onChangeContent: (key: string, value: any) => void;
  onChangeStyle: (key: string, value: any) => void;
  onRemoveBlock: () => void;
}

export const BlockInspector: React.FC<BlockInspectorProps> = ({
  block,
  website,
  onChangeContent,
  onChangeStyle,
  onRemoveBlock,
}) => {
  const content = block.content || {};
  const styles = block.styles || {};

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerTitle, setMediaPickerTitle] = useState('Pilih Berkas Media');
  const [currentMediaValue, setCurrentMediaValue] = useState('');
  const [mediaCallback, setMediaCallback] = useState<((url: string) => void) | null>(null);

  const openPicker = (title: string, currentValue: string, callback: (url: string) => void) => {
    setMediaPickerTitle(title);
    setCurrentMediaValue(currentValue || '');
    setMediaCallback(() => callback);
    setIsMediaPickerOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 text-xs">
      {/* Header Inspektur */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
          <Sliders className="w-3.5 h-3.5 text-[#6D4AFF]" />
          <span>Pengaturan Blok</span>
        </div>
        <button
          type="button"
          onClick={onRemoveBlock}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
          title="Hapus blok ini"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Konten Scrollable Inspektur */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Info Tipe Blok */}
        <div>
          <span className="text-[10px] font-bold text-[#85859A] uppercase tracking-wider block mb-1">
            Jenis Komponen
          </span>
          <div className="bg-slate-100 px-2.5 py-1.5 rounded text-xs font-mono font-semibold text-slate-800 capitalize">
            {block.type.replace('_', ' ')}
          </div>
        </div>

        {/* =================================================================== */}
        {/* FORM SPESIFIK BERDASARKAN TIPE BLOK */}
        {/* =================================================================== */}

        {/* 1. HEADER */}
        {block.type === 'header' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nama Brand / Toko
              </label>
              <input
                type="text"
                value={content.brandName || ''}
                placeholder={website.name}
                onChange={(e) => onChangeContent('brandName', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Teks Tombol Aksi (CTA)
              </label>
              <input
                type="text"
                value={content.ctaText || ''}
                onChange={(e) => onChangeContent('ctaText', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="stickyNavbar"
                checked={Boolean(styles.isSticky)}
                onChange={(e) => onChangeStyle('isSticky', e.target.checked)}
                className="rounded border-slate-300 text-[#6D4AFF] focus:ring-[#6D4AFF]"
              />
              <label htmlFor="stickyNavbar" className="text-xs text-slate-700 select-none">
                Bilah Tetap di Atas (Sticky)
              </label>
            </div>
          </div>
        )}

        {/* 2. HERO */}
        {block.type === 'hero' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Teks Lencana (Badge)
              </label>
              <input
                type="text"
                value={content.badgeText || ''}
                onChange={(e) => onChangeContent('badgeText', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Judul Utama (Headline)
              </label>
              <textarea
                rows={2}
                value={content.headline || ''}
                onChange={(e) => onChangeContent('headline', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Subjudul (Subheadline)
              </label>
              <textarea
                rows={3}
                value={content.subheadline || ''}
                onChange={(e) => onChangeContent('subheadline', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Gambar Latar / Banner Hero
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={content.backgroundImage || ''}
                  placeholder="https://... atau pilih media"
                  onChange={(e) => onChangeContent('backgroundImage', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:border-[#6D4AFF] outline-hidden"
                />
                <button
                  type="button"
                  onClick={() =>
                    openPicker('Pilih Gambar Latar Hero', content.backgroundImage, (url) =>
                      onChangeContent('backgroundImage', url)
                    )
                  }
                  className="px-2.5 py-1.5 bg-[#6D4AFF]/10 text-[#6D4AFF] hover:bg-[#6D4AFF]/20 font-semibold rounded-md flex items-center gap-1 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Media</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Teks Tombol Utama
              </label>
              <input
                type="text"
                value={content.primaryButtonText || ''}
                onChange={(e) => onChangeContent('primaryButtonText', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Teks Tombol WhatsApp
              </label>
              <input
                type="text"
                value={content.whatsappButtonText || ''}
                onChange={(e) => onChangeContent('whatsappButtonText', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
          </div>
        )}

        {/* 3. TEXT */}
        {block.type === 'text' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Judul Bagian
              </label>
              <input
                type="text"
                value={content.heading || ''}
                onChange={(e) => onChangeContent('heading', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Isi Paragraf Teks
              </label>
              <textarea
                rows={5}
                value={content.body || ''}
                onChange={(e) => onChangeContent('body', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
          </div>
        )}

        {/* 4. IMAGE (Dengan Media Library Terpadu) */}
        {block.type === 'image' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                URL Gambar
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={content.imageUrl || ''}
                  placeholder="https://..."
                  onChange={(e) => onChangeContent('imageUrl', e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    openPicker('Pilih Gambar Blok', content.imageUrl, (url) =>
                      onChangeContent('imageUrl', url)
                    )
                  }
                  className="px-2.5 py-1.5 bg-[#6D4AFF] text-white hover:bg-[#5b3ce0] font-semibold rounded-md flex items-center gap-1 transition-colors shadow-xs"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Media</span>
                </button>
              </div>
            </div>

            {content.imageUrl && (
              <div className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                <img
                  src={content.imageUrl}
                  alt="Pratinjau"
                  className="max-h-32 w-auto mx-auto object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Teks Keterangan (Caption)
              </label>
              <input
                type="text"
                value={content.caption || ''}
                onChange={(e) => onChangeContent('caption', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
          </div>
        )}

        {/* 5. GALLERY (Galeri Foto dengan Pemilih Media) */}
        {block.type === 'gallery' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Judul Galeri
              </label>
              <input
                type="text"
                value={content.title || ''}
                onChange={(e) => onChangeContent('title', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700">
                  Daftar Gambar Galeri
                </label>
                <button
                  type="button"
                  onClick={() => {
                    openPicker('Pilih Gambar untuk Galeri', '', (url) => {
                      const currentImages = Array.isArray(content.images) ? [...content.images] : [];
                      onChangeContent('images', [...currentImages, url]);
                    });
                  }}
                  className="text-xs font-semibold text-[#6D4AFF] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Foto</span>
                </button>
              </div>

              {Array.isArray(content.images) && content.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {content.images.map((imgUrl: string, idx: number) => (
                    <div
                      key={idx}
                      className="relative border border-slate-200 rounded-lg overflow-hidden group aspect-video bg-slate-100"
                    >
                      <img
                        src={imgUrl}
                        alt={`Galeri ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = content.images.filter((_: any, i: number) => i !== idx);
                          onChangeContent('images', updated);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus gambar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                  Belum ada foto dalam galeri ini.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. FEATURES (Daftar Keunggulan) */}
        {block.type === 'features' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Judul Bagian Fitur
              </label>
              <input
                type="text"
                value={content.title || ''}
                onChange={(e) => onChangeContent('title', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Subjudul Fitur
              </label>
              <input
                type="text"
                value={content.subtitle || ''}
                onChange={(e) => onChangeContent('subtitle', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
          </div>
        )}

        {/* 7. TESTIMONIALS (Testimoni & Rating) */}
        {block.type === 'testimonials' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Judul Bagian Testimoni
              </label>
              <input
                type="text"
                value={content.title || ''}
                onChange={(e) => onChangeContent('title', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Subjudul Testimoni
              </label>
              <input
                type="text"
                value={content.subtitle || ''}
                onChange={(e) => onChangeContent('subtitle', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
          </div>
        )}

        {/* 8. PRODUCT GRID */}
        {block.type === 'product_grid' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Judul Bagian Katalog
              </label>
              <input
                type="text"
                value={content.sectionTitle || ''}
                onChange={(e) => onChangeContent('sectionTitle', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Subjudul Katalog
              </label>
              <input
                type="text"
                value={content.sectionSubtitle || ''}
                onChange={(e) => onChangeContent('sectionSubtitle', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Jumlah Kolom Grid
              </label>
              <select
                value={styles.columns || 3}
                onChange={(e) => onChangeStyle('columns', Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs bg-white"
              >
                <option value={2}>2 Kolom</option>
                <option value={3}>3 Kolom (Standar)</option>
                <option value={4}>4 Kolom</option>
              </select>
            </div>
          </div>
        )}

        {/* 9. WHATSAPP CTA */}
        {block.type === 'whatsapp_cta' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Judul Ajakan Aksi
              </label>
              <input
                type="text"
                value={content.title || ''}
                onChange={(e) => onChangeContent('title', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Deskripsi Ajakan
              </label>
              <textarea
                rows={3}
                value={content.description || ''}
                onChange={(e) => onChangeContent('description', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Teks Tombol Chat
              </label>
              <input
                type="text"
                value={content.buttonText || ''}
                onChange={(e) => onChangeContent('buttonText', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
          </div>
        )}

        {/* 10. CONTACT / FORMULIR KONTAK */}
        {block.type === 'contact' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Judul Bagian Kontak
              </label>
              <input
                type="text"
                value={content.title || ''}
                onChange={(e) => onChangeContent('title', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Subjudul Kontak
              </label>
              <input
                type="text"
                value={content.subtitle || ''}
                onChange={(e) => onChangeContent('subtitle', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Email Kontak Penerima
              </label>
              <input
                type="email"
                value={content.email || ''}
                placeholder="halo@arisera.id"
                onChange={(e) => onChangeContent('email', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Lokasi / Alamat Toko
              </label>
              <input
                type="text"
                value={content.location || ''}
                placeholder="Jakarta, Indonesia"
                onChange={(e) => onChangeContent('location', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Teks Tombol Kirim
              </label>
              <input
                type="text"
                value={content.submitButtonText || ''}
                placeholder="Kirim Pesan Sekarang"
                onChange={(e) => onChangeContent('submitButtonText', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Pesan Konfirmasi Sukses
              </label>
              <textarea
                rows={2}
                value={content.successMessage || ''}
                placeholder="Terima kasih! Pesan Anda telah kami terima."
                onChange={(e) => onChangeContent('successMessage', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
          </div>
        )}

        {/* 11. FOOTER */}
        {block.type === 'footer' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Teks Hak Cipta (Copyright)
              </label>
              <input
                type="text"
                value={content.copyrightText || ''}
                onChange={(e) => onChangeContent('copyrightText', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Alamat Fisik / Keterangan Toko
              </label>
              <input
                type="text"
                value={content.address || ''}
                onChange={(e) => onChangeContent('address', e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-[#6D4AFF] outline-hidden text-xs"
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* PENGATURAN WARNA & TATA LETAK UMUM */}
        {/* =================================================================== */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <span className="text-[10px] font-bold text-[#85859A] uppercase tracking-wider block">
            Warna & Latar Belakang
          </span>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Warna Latar (Background)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.bgColor || '#FFFFFF'}
                onChange={(e) => onChangeStyle('bgColor', e.target.value)}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={styles.bgColor || '#FFFFFF'}
                onChange={(e) => onChangeStyle('bgColor', e.target.value)}
                className="flex-1 px-2.5 py-1 border border-slate-200 rounded-md text-xs font-mono outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Warna Teks
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styles.textColor || '#11111B'}
                onChange={(e) => onChangeStyle('textColor', e.target.value)}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={styles.textColor || '#11111B'}
                onChange={(e) => onChangeStyle('textColor', e.target.value)}
                className="flex-1 px-2.5 py-1 border border-slate-200 rounded-md text-xs font-mono outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Media Picker Terpadu */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        title={mediaPickerTitle}
        currentValue={currentMediaValue}
        onSelect={(url) => {
          if (mediaCallback) {
            mediaCallback(url);
          }
        }}
      />
    </div>
  );
};
