import React, { useState, useEffect } from 'react';
import {
  Website,
  Product,
  PublishingVersion,
  VisualComponentBlock,
  Page,
} from '../../../types/database';
import { ComponentRenderer } from '../builder/ComponentRenderer';
import {
  Globe,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  CheckCircle,
  ExternalLink,
  ShoppingBag,
  HelpCircle,
  Server,
  FileText,
  X,
  Code,
  ShieldCheck,
} from 'lucide-react';
import publishingService from '../../../services/publishingService';
import store from '../../../services/store';

interface PublicWebsiteViewerProps {
  subdomainOrSlug: string;
  onBackToApp?: () => void;
}

export const PublicWebsiteViewer: React.FC<PublicWebsiteViewerProps> = ({
  subdomainOrSlug,
  onBackToApp,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [website, setWebsite] = useState<Website | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [allPageComponents, setAllPageComponents] = useState<Record<string, VisualComponentBlock[]>>({});
  const [versionTag, setVersionTag] = useState<string>('v1.0');

  // Multi-page slug aktif dari URL (?page=slug atau default homepage)
  const [activePageSlug, setActivePageSlug] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');
    if (pageParam) return pageParam.toLowerCase();

    const hash = window.location.hash;
    const parts = hash.split('/');
    if (parts.length >= 4 && parts[1] === 'site') {
      return parts[3].toLowerCase();
    }
    return 'home';
  });

  const [errorStatus, setErrorStatus] = useState<
    'not_found' | 'not_published' | 'page_not_found' | 'render_error' | null
  >(null);

  const [isDeployInfoOpen, setIsDeployInfoOpen] = useState(false);

  useEffect(() => {
    loadPublicWebsite();
  }, [subdomainOrSlug]);

  // Efek Sinkronisasi SEO & Dynamic Meta Tags
  useEffect(() => {
    if (!website) return;

    const currentP = pages.find(
      (p) => p.slug.toLowerCase() === activePageSlug.toLowerCase() || (activePageSlug === 'home' && p.is_homepage)
    ) || pages[0];

    if (!currentP) return;

    // 1. Injeksi Document Title
    const originalTitle = document.title;
    const computedTitle = currentP.seo_title || `${currentP.title} | ${website.name}`;
    document.title = computedTitle;

    // 2. Injeksi Meta Description
    const computedDescription =
      currentP.seo_description || website.description || `Situs resmi ${website.name}.`;
    updateMetaTag('description', computedDescription);

    // 3. Injeksi Open Graph Tags
    const fullUrl = window.location.href;
    updateMetaTag('og:title', computedTitle, 'property');
    updateMetaTag('og:description', computedDescription, 'property');
    updateMetaTag('og:url', fullUrl, 'property');
    if (currentP.og_image) {
      updateMetaTag('og:image', currentP.og_image, 'property');
    }

    // 4. Injeksi Favicon
    if (website.theme_settings?.faviconUrl) {
      updateFavicon(website.theme_settings.faviconUrl);
    }

    // 5. Injeksi Canonical Link
    updateCanonicalLink(fullUrl);

    return () => {
      document.title = originalTitle;
    };
  }, [website, pages, activePageSlug]);

  const updateMetaTag = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
    let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, name);
      document.head.appendChild(element);
    }
    element.content = content;
  };

  const updateFavicon = (iconUrl: string) => {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }
    link.href = iconUrl;
  };

  const updateCanonicalLink = (url: string) => {
    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url.split('?')[0]; // Canonical tanpa query tracking
  };

  const loadPublicWebsite = async () => {
    setIsLoading(true);
    setErrorStatus(null);

    try {
      const state = store.getState();
      const cleanTarget = subdomainOrSlug.toLowerCase().trim();

      // Cari website berdasarkan subdomain, slug, atau custom domain
      const foundWeb = state.websites.find(
        (w) =>
          w.subdomain.toLowerCase() === cleanTarget ||
          w.slug.toLowerCase() === cleanTarget ||
          w.custom_domain?.toLowerCase() === cleanTarget
      );

      // Jika subdomain/slug tidak ditemukan, tampilkan 404 secara ketat (mencegah kebocoran data website lain)
      if (!foundWeb) {
        setErrorStatus('not_found');
        setIsLoading(false);
        return;
      }

      // Verifikasi status publikasi (Hanya website 'published' yang dapat diakses publik)
      if (foundWeb.status !== 'published') {
        setErrorStatus('not_published');
        setWebsite(foundWeb);
        setIsLoading(false);
        return;
      }

      setWebsite(foundWeb);

      // Ambil produk website
      const webProducts = state.products.filter((p) => p.website_id === foundWeb?.id);
      setProducts(webProducts);

      // Ambil snapshot terpublikasi dari publishing_versions
      let resolvedPages: Page[] = [];
      let resolvedAllPageComponents: Record<string, VisualComponentBlock[]> = {};
      let fallbackComponents: VisualComponentBlock[] = [];

      if (foundWeb.published_version_id && state.storageMode === 'supabase_live') {
        const histRes = await publishingService.getVersionHistory(foundWeb.id);
        if (histRes.data) {
          const publishedVer = histRes.data.find((v) => v.id === foundWeb?.published_version_id);
          if (publishedVer && publishedVer.snapshot_data) {
            setVersionTag(publishedVer.version_tag);
            if (publishedVer.snapshot_data.pages) {
              resolvedPages = publishedVer.snapshot_data.pages;
            }
            if (publishedVer.snapshot_data.all_page_components) {
              resolvedAllPageComponents = publishedVer.snapshot_data.all_page_components;
            }
            if (publishedVer.snapshot_data.components) {
              fallbackComponents = publishedVer.snapshot_data.components;
            }
          }
        }
      }

      // Fallback ke data halaman dan draf lokal jika belum ada snapshot terisolasi
      if (resolvedPages.length === 0) {
        resolvedPages = state.pages.filter((p) => p.website_id === foundWeb?.id);
      }
      if (Object.keys(resolvedAllPageComponents).length === 0) {
        resolvedAllPageComponents = { ...state.pageComponents };
      }

      setPages(resolvedPages);
      setAllPageComponents(resolvedAllPageComponents);
    } catch (err) {
      console.error('[PublicViewer] Error rendering website:', err);
      setErrorStatus('render_error');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigasi Antar Halaman Publik Tanpa Reload
  const handleNavigate = (targetSlug: string) => {
    const cleanSlug = targetSlug.replace('/', '').toLowerCase();
    setActivePageSlug(cleanSlug);

    // Sinkronisasi URL browser
    const url = new URL(window.location.href);
    if (cleanSlug === 'home' || cleanSlug === '') {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', cleanSlug);
    }
    window.history.pushState({}, '', url.toString());

    // Scroll ke atas halaman secara halus
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tampilan Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-[#6D4AFF] animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">Memuat Halaman Publik...</h2>
        <p className="text-xs text-slate-500 mt-1">Mengambil snapshot terpublikasi dari server.</p>
      </div>
    );
  }

  // Tampilan 404: Website Tidak Ditemukan
  if (errorStatus === 'not_found' || !website) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Website Tidak Ditemukan (404)
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2 leading-relaxed">
          Alamat subdomain atau website <code className="font-mono font-bold">{subdomainOrSlug}</code>{' '}
          tidak terdaftar di sistem platform Arisera.
        </p>
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#6D4AFF] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#5b3ce0]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dasbor Arisera</span>
          </button>
        )}
      </div>
    );
  }

  // Tampilan 403 / Draf: Belum Dipublikasikan
  if (errorStatus === 'not_published') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
          <Globe className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Website Belum Dipublikasikan
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2 leading-relaxed">
          Situs <strong className="text-slate-800">{website.name}</strong> masih berstatus draf
          dan belum dibuka untuk akses publik.
        </p>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs max-w-md">
          Pemilik website dapat memublikasikan snapshot rilis melalui menu <strong>Arisera Builder</strong>.
        </div>
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#6D4AFF] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#5b3ce0]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Editor Builder</span>
          </button>
        )}
      </div>
    );
  }

  // Resolusi Halaman Aktif Berdasarkan Slug
  const activePage =
    pages.find(
      (p) =>
        p.slug.toLowerCase() === activePageSlug.toLowerCase() ||
        (activePageSlug === 'home' && p.is_homepage)
    ) || (activePageSlug === 'home' ? pages[0] : null);

  // Jika slug halaman tertentu tidak ditemukan di website yang dipublikasikan (Page 404)
  if (!activePage) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Halaman Tidak Ditemukan (404)
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2 leading-relaxed">
          Halaman <code className="font-mono font-bold">/{activePageSlug}</code> tidak ditemukan pada
          situs <strong>{website.name}</strong>.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => handleNavigate('home')}
            className="px-4 py-2 bg-[#6D4AFF] text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-[#5b3ce0]"
          >
            Kembali ke Beranda Situs
          </button>
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
            >
              Dasbor Studio
            </button>
          )}
        </div>
      </div>
    );
  }

  // Ambil komponen untuk halaman aktif dari snapshot
  const activeComponents =
    allPageComponents[activePage.id] ||
    (activePage.is_homepage && allPageComponents['page-home-01']) ||
    [];

  return (
    <div
      className="min-h-screen bg-white text-[#11111B] antialiased flex flex-col justify-between"
      style={{
        fontFamily: website.theme_settings?.fontFamily || 'Plus Jakarta Sans',
      }}
    >
      {/* Top Banner Publik Transparan (Hanya info jika dibuka dari AI Studio / Dasbor) */}
      {onBackToApp && (
        <div className="bg-[#11111B] text-white px-4 py-1.5 flex items-center justify-between text-[11px] shrink-0 border-b border-slate-800 z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Situs Publik Nyata: <strong>{website.name}</strong> · Halaman: <strong>{activePage.title}</strong> ({versionTag})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDeployInfoOpen(true)}
              className="text-[#9B7BFF] hover:underline flex items-center gap-1 font-semibold"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Info Hosting & DNS</span>
            </button>

            <button
              type="button"
              onClick={onBackToApp}
              className="text-white hover:text-slate-300 flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Arisera</span>
            </button>
          </div>
        </div>
      )}

      {/* Render Seluruh Blok Komponen Visual dari Snapshot Halaman Ini */}
      <main className="flex-1">
        {activeComponents.length === 0 ? (
          <div className="py-24 text-center text-xs text-slate-400">
            Halaman "{activePage.title}" ini belum memiliki komponen visual terpublikasi.
          </div>
        ) : (
          activeComponents
            .filter((c) => !c.is_hidden)
            .sort((a, b) => a.order - b.order)
            .map((block) => (
              <ComponentRenderer
                key={block.id}
                block={block}
                website={website}
                products={products}
                onNavigatePage={(slug) => handleNavigate(slug)}
              />
            ))
        )}
      </main>

      {/* Modal Info Deployment, DNS & Subdomain Routing */}
      {isDeployInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[#6D4AFF]" />
                <h3 className="font-bold text-sm text-slate-900">
                  Arsitektur Hosting, DNS & Subdomain
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeployInfoOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#6D4AFF]" />
                  <span>Alamat Subdomain / Domain Terdaftar</span>
                </div>
                <div className="font-mono text-[11px] text-[#6D4AFF]">
                  https://{website.subdomain || `${website.slug}.arisera.id`}
                </div>
                {website.custom_domain && (
                  <div className="font-mono text-[11px] text-emerald-600">
                    Custom Domain: https://{website.custom_domain}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">
                  1. Mekanisme Subdomain & Wildcard DNS di Produksi
                </h4>
                <p>
                  Pada penyedia hosting (seperti Vercel, Netlify, atau Cloudflare), aktifkan record DNS:
                </p>
                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] mt-1 space-y-0.5">
                  <div>Type: CNAME</div>
                  <div>Name: *.arisera.id</div>
                  <div>Value: cname.arisera.id (atau alias domain hosting)</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">
                  2. Single-Page Application (SPA) Client Routing & Rewrite
                </h4>
                <p>
                  Karena ARISERA menggunakan Vite React SPA, server hosting wajib mengonfigurasi rewrite seluruh rute (wildcard) ke berkas <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">index.html</code> (misal file <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">vercel.json</code> atau <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">_redirects</code>) agar saat pengunjung me-refresh URL seperti <code className="font-mono">/tentang</code> tidak menghasilkan HTTP 404 dari web server.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Website publik terisolasi penuh dari dasbor privat dan hanya membaca data snapshot yang berstatus <strong>published</strong>.
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDeployInfoOpen(false)}
                className="px-4 py-1.5 bg-[#6D4AFF] text-white rounded-lg font-semibold hover:bg-[#5b3ce0]"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicWebsiteViewer;
