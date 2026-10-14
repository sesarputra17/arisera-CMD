import React, { useState } from 'react';
import {
  X,
  Globe,
  Search,
  Share2,
  Image as ImageIcon,
  Check,
  FileCode,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Website, Page } from '../../../types/database';
import { MediaPickerModal } from '../media/MediaPickerModal';

interface SeoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  website: Website;
  activePage: Page;
  allPages: Page[];
  onSavePageSeo: (pageId: string, seoData: {
    seo_title?: string;
    seo_description?: string;
    og_image?: string;
    slug?: string;
  }) => void;
  onSaveWebsiteSeo: (data: {
    faviconUrl?: string;
    description?: string;
  }) => void;
}

export const SeoSettingsModal: React.FC<SeoSettingsModalProps> = ({
  isOpen,
  onClose,
  website,
  activePage,
  allPages,
  onSavePageSeo,
  onSaveWebsiteSeo,
}) => {
  const [activeTab, setActiveTab] = useState<'page' | 'website' | 'sitemap'>('page');

  // Page SEO state
  const [seoTitle, setSeoTitle] = useState(activePage?.seo_title || activePage?.title || '');
  const [seoDescription, setSeoDescription] = useState(activePage?.seo_description || '');
  const [ogImage, setOgImage] = useState(activePage?.og_image || '');
  const [slug, setSlug] = useState(activePage?.slug || 'beranda');

  // Website SEO state
  const [siteDescription, setSiteDescription] = useState(website?.description || '');
  const [faviconUrl, setFaviconUrl] = useState(website?.theme_settings?.faviconUrl || '');

  // Media Picker state
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'og' | 'favicon'>('og');

  if (!isOpen) return null;

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${website.subdomain || `${website.slug}.arisera.id`}`;

  const currentFullUrl = `${baseUrl}${activePage.is_homepage ? '' : `/${slug}`}`;

  const handleSave = () => {
    onSavePageSeo(activePage.id, {
      seo_title: seoTitle.trim(),
      seo_description: seoDescription.trim(),
      og_image: ogImage.trim(),
      slug: slug.trim(),
    });

    onSaveWebsiteSeo({
      description: siteDescription.trim(),
      faviconUrl: faviconUrl.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[88vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#6D4AFF]/10 text-[#6D4AFF] rounded-lg">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Pengaturan SEO & Metadata — Halaman "{activePage.title}"
              </h3>
              <p className="text-[11px] text-slate-500">
                Optimasi mesin pencari Google, pratinjau sosial (Open Graph), dan sitemap
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
        <div className="px-5 pt-3 border-b border-slate-100 flex items-center gap-2 bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('page')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'page'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>SEO Halaman ({activePage.title})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('website')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'website'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Metadata Website & Favicon</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sitemap')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sitemap'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Sitemap.xml & Robots.txt</span>
          </button>
        </div>

        {/* Isi Konten Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-800">
          {/* TAB 1: SEO HALAMAN */}
          {activeTab === 'page' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Form Input SEO */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Judul SEO (Meta Title)
                    </label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder={`${activePage.title} | ${website.name}`}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:border-[#6D4AFF] outline-hidden"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>Rekomendasi Google: 50–60 karakter</span>
                      <span className={seoTitle.length > 60 ? 'text-amber-500 font-bold' : ''}>
                        {seoTitle.length}/60
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Deskripsi Ringkas (Meta Description)
                    </label>
                    <textarea
                      rows={3}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Ringkasan informatif isi halaman untuk muncul di hasil pencarian..."
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:border-[#6D4AFF] outline-hidden"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>Rekomendasi Google: 120–160 karakter</span>
                      <span className={seoDescription.length > 160 ? 'text-amber-500 font-bold' : ''}>
                        {seoDescription.length}/160
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Slug URL Halaman
                    </label>
                    <div className="flex items-center">
                      <span className="bg-slate-100 border border-r-0 border-slate-200 px-2 py-1.5 rounded-l-md text-slate-500 text-xs">
                        /
                      </span>
                      <input
                        type="text"
                        disabled={activePage.is_homepage}
                        value={activePage.is_homepage ? '' : slug}
                        onChange={(e) =>
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                        }
                        placeholder={activePage.is_homepage ? '(Beranda / Root)' : 'kontak'}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-r-md text-xs focus:border-[#6D4AFF] outline-hidden disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>
                    {activePage.is_homepage && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Halaman beranda selalu beralamat pada root URL domain.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Gambar Berbagi Sosial (Open Graph Image)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ogImage}
                        onChange={(e) => setOgImage(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:border-[#6D4AFF] outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setMediaPickerTarget('og');
                          setIsMediaPickerOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md text-xs flex items-center gap-1 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Pilih</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pratinjau Google SERP & Social Card */}
                <div className="space-y-4">
                  {/* Google SERP Preview */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white shadow-xs space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Pratinjau Hasil Pencarian Google
                    </span>
                    <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-1 font-sans">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                        <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold">
                          {website.name.charAt(0)}
                        </span>
                        <span className="font-semibold">{website.name}</span>
                        <span className="text-slate-400">›</span>
                        <span className="text-slate-500 truncate">{currentFullUrl}</span>
                      </div>
                      <h4 className="text-sm font-medium text-[#1a0dab] hover:underline cursor-pointer truncate">
                        {seoTitle || `${activePage.title} | ${website.name}`}
                      </h4>
                      <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                        {seoDescription ||
                          `Kunjungi situs resmi ${website.name} untuk menemukan informasi produk, pemesanan WhatsApp, dan layanan terbaik.`}
                      </p>
                    </div>
                  </div>

                  {/* Open Graph Social Card Preview */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white shadow-xs space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Pratinjau Berbagi (WhatsApp / Facebook)
                    </span>
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      {ogImage ? (
                        <img
                          src={ogImage}
                          alt="OG Preview"
                          className="w-full h-28 object-cover border-b border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-20 bg-slate-200 flex items-center justify-center text-slate-400 text-xs">
                          Tidak ada gambar Open Graph
                        </div>
                      )}
                      <div className="p-2.5 space-y-0.5">
                        <div className="text-[10px] uppercase font-bold text-slate-400 truncate">
                          {baseUrl.replace('https://', '')}
                        </div>
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {seoTitle || activePage.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {seoDescription || website.description || 'Situs Resmi Arisera'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: METADATA WEBSITE & FAVICON */}
          {activeTab === 'website' && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Deskripsi Global Website
                </label>
                <textarea
                  rows={3}
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder="Deskripsi bisnis utama..."
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:border-[#6D4AFF] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ikon Favicon Website
                </label>
                <div className="flex gap-2 items-center">
                  {faviconUrl && (
                    <img
                      src={faviconUrl}
                      alt="Favicon"
                      className="w-7 h-7 rounded border border-slate-200 object-contain p-0.5"
                    />
                  )}
                  <input
                    type="text"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://.../favicon.ico"
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-xs focus:border-[#6D4AFF] outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMediaPickerTarget('favicon');
                      setIsMediaPickerOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md text-xs flex items-center gap-1 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Pilih</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Format yang disarankan: PNG atau ICO (32x32 px).
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Injeksi Dinamis Metadata Klien</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pada arsitektur SPA Vite, tag <code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">&lt;title&gt;</code>, <code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">&lt;meta name="description"&gt;</code>, dan tag Open Graph diperbarui secara langsung saat pengunjung membuka halaman publik.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SITEMAP & ROBOTS */}
          {activeTab === 'sitemap' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Di bawah ini adalah struktur peta situs (<code className="font-mono">sitemap.xml</code>) dan instruksi robot perayap (<code className="font-mono">robots.txt</code>) yang dihasilkan otomatis berdasarkan seluruh halaman website Anda:
                </p>
              </div>

              <div>
                <span className="font-bold text-[11px] text-slate-700 block mb-1">
                  Simulasi sitemap.xml
                </span>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto">
{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>${baseUrl}${p.is_homepage ? '' : `/${p.slug}`}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>${p.is_homepage ? 'daily' : 'weekly'}</changefreq>
    <priority>${p.is_homepage ? '1.0' : '0.8'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`}
                </pre>
              </div>

              <div>
                <span className="font-bold text-[11px] text-slate-700 block mb-1">
                  Simulasi robots.txt
                </span>
                <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg">
{`User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Simpan Pengaturan SEO</span>
          </button>
        </div>
      </div>

      {/* Media Picker Modal Terpadu */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        currentValue={mediaPickerTarget === 'og' ? ogImage : faviconUrl}
        title={
          mediaPickerTarget === 'og'
            ? 'Pilih Gambar Open Graph'
            : 'Pilih Favicon Website'
        }
        onSelect={(url) => {
          if (mediaPickerTarget === 'og') {
            setOgImage(url);
          } else {
            setFaviconUrl(url);
          }
        }}
      />
    </div>
  );
};

export default SeoSettingsModal;
