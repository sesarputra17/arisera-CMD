import React, { useState } from 'react';
import { Palette, Check, Sparkles, Layout, Globe, ArrowRight } from 'lucide-react';
import { WebsiteTemplate, BusinessCategory } from '../../../types/database';

interface TemplateGalleryProps {
  templates: WebsiteTemplate[];
  onUseTemplate: (name: string, category: BusinessCategory, templateId: string) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  templates,
  onUseTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalTemplate, setModalTemplate] = useState<WebsiteTemplate | null>(null);
  const [websiteName, setWebsiteName] = useState('');

  const filtered = templates.filter(
    (t) => selectedCategory === 'all' || t.category === selectedCategory
  );

  const categoryLabels: Record<string, string> = {
    kuliner: 'Kuliner & F&B',
    fashion: 'Fashion & Busana',
    kosmetik: 'Kosmetik & Kecantikan',
    elektronik: 'Elektronik & Gadget',
    jasa: 'Jasa & Konsultan',
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTemplate || !websiteName.trim()) return;
    onUseTemplate(websiteName.trim(), modalTemplate.category, modalTemplate.id);
    setModalTemplate(null);
    setWebsiteName('');
  };

  // Preview palettes per template
  const themeDetails: Record<string, { bg: string; accent: string; previewBadge: string }> = {
    'tpl-kuliner': {
      bg: 'from-amber-900/10 to-orange-500/10',
      accent: '#6D4AFF',
      previewBadge: 'Kuliner & Katering',
    },
    'tpl-fashion': {
      bg: 'from-slate-900/10 to-neutral-500/10',
      accent: '#11111B',
      previewBadge: 'Lookbook & Distro',
    },
    'tpl-kosmetik': {
      bg: 'from-purple-900/10 to-pink-500/10',
      accent: '#C026D3',
      previewBadge: 'Organik & Spa',
    },
    'tpl-elektronik': {
      bg: 'from-indigo-900/10 to-cyan-500/10',
      accent: '#4F46E5',
      previewBadge: 'Gadget & Spesifikasi',
    },
    'tpl-jasa': {
      bg: 'from-blue-900/10 to-purple-500/10',
      accent: '#6D4AFF',
      previewBadge: 'Profil Agensi & Legal',
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#85859A]">
            <Palette className="w-3.5 h-3.5 text-[#6D4AFF]" />
            <span>Tema Arisera</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            Koleksi Templat Website Bisnis
          </h1>
          <p className="text-xs text-[#85859A] mt-0.5">
            Pilih templat yang dirancang spesifik untuk model bisnis Anda. Siap sesuaikan di Arisera Builder.
          </p>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {['all', 'kuliner', 'fashion', 'kosmetik', 'elektronik', 'jasa'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-[#11111B] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((tpl) => {
          const detail = themeDetails[tpl.id] || {
            bg: 'from-purple-900/10 to-indigo-500/10',
            accent: '#6D4AFF',
            previewBadge: 'Bisnis Modern',
          };

          return (
            <div
              key={tpl.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-[#6D4AFF] hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Visual Header Mockup */}
                <div
                  className={`h-40 bg-gradient-to-br ${detail.bg} p-5 border-b border-slate-100 flex flex-col justify-between relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded">
                      {categoryLabels[tpl.category] || tpl.category}
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium bg-white/70 px-2 py-0.5 rounded">
                      Mobile & Desktop
                    </span>
                  </div>

                  <div className="space-y-1.5 z-10">
                    <div className="w-16 h-2 bg-[#6D4AFF]/40 rounded-full" />
                    <div className="w-32 h-3.5 bg-slate-800/80 rounded" />
                    <div className="w-24 h-2 bg-slate-400/50 rounded" />
                  </div>

                  {/* Decorative geometrical pattern */}
                  <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full border border-black/5 pointer-events-none" />
                </div>

                {/* Content Info */}
                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#6D4AFF] transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-[#85859A] leading-relaxed">
                    {tpl.description}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>Preset Halaman:</span>
                    <span className="font-medium text-slate-800">
                      Beranda · Katalog · Kontak
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => {
                    setModalTemplate(tpl);
                    setWebsiteName('');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-[#11111B] hover:bg-[#6D4AFF] rounded-lg transition-colors shadow-xs"
                >
                  <span>Gunakan Templat Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Masukkan Nama Website */}
      {modalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Mulai dengan Templat "{modalTemplate.name}"
              </h3>
              <p className="text-xs text-[#85859A] mt-0.5">
                Beri nama website bisnis Anda untuk melanjutkan ke Arisera Builder.
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Website / Usaha
                </label>
                <input
                  type="text"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  placeholder="Contoh: Dapur Rasa Nusantara"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalTemplate(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-sm"
                >
                  Terapkan Templat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateGallery;
