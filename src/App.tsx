/**
 * ARISERA — Sistem Manajemen Konten (CMS) Universal & Pembuat Website Visual
 * Slogan: "Bangun. Ciptakan. Berkembang."
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveNavTab } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { DashboardOverview } from './components/modules/dashboard/DashboardOverview';
import { WebsitesList } from './components/modules/websites/WebsitesList';
import { ProductCatalog } from './components/modules/cms/ProductCatalog';
import { BuilderWireframe } from './components/modules/builder/BuilderWireframe';
import { TemplateGallery } from './components/modules/templates/TemplateGallery';
import { MediaLibrary } from './components/modules/media/MediaLibrary';
import { WorkspaceManager } from './components/modules/workspaces/WorkspaceManager';
import { IntegrationsHub } from './components/modules/integrations/IntegrationsHub';
import { DocsViewer } from './components/modules/docs/DocsViewer';
import { SettingsView } from './components/modules/settings/SettingsView';
import { CreateWebsiteModal } from './components/modules/websites/CreateWebsiteModal';
import { LiveWebsitePreviewModal } from './components/modules/websites/LiveWebsitePreviewModal';
import { PublicWebsiteViewer } from './components/modules/websites/PublicWebsiteViewer';
import { AuthModal } from './components/modules/auth/AuthModal';
import { AuthGate } from './components/modules/auth/AuthGate';
import { SupabaseConfigModal } from './components/modules/settings/SupabaseConfigModal';
import store from './services/store';
import authService from './services/authService';
import { Website, BusinessCategory, PublishStatus } from './types/database';
import { AlertTriangle, CheckCircle, Database, X, Zap } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ActiveNavTab>('overview');
  const [appState, setAppState] = useState(store.getState());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authModalInitialEmail, setAuthModalInitialEmail] = useState('');
  const [authModalInitialError, setAuthModalInitialError] = useState<string | null>(null);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);
  const [previewWebsite, setPreviewWebsite] = useState<Website | null>(null);
  const [publicWebsiteSlug, setPublicWebsiteSlug] = useState<string | null>(() => {
    // Deteksi apakah user membuka rute publik langsung via URL query (?site=slug) atau hash (#/site/slug)
    const params = new URLSearchParams(window.location.search);
    const siteParam = params.get('site') || params.get('subdomain');
    if (siteParam) return siteParam;

    const hash = window.location.hash;
    if (hash.startsWith('#/site/')) {
      return hash.replace('#/site/', '');
    }
    return null;
  });
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Subscribe ke store reaktif & Inisialisasi Supabase
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setAppState({ ...store.getState() });
    });

    // Inisialisasi data dari database jika Supabase aktif
    store.initialize();

    // Deteksi dan proses callback URL dari Supabase Auth (verifikasi email / reset kata sandi)
    const checkAuthCallback = async () => {
      try {
        const result = await authService.processAuthUrlCallback();
        if (result.isCallback) {
          if (result.status === 'success') {
            store.setSuccessMessage(
              'Email Anda berhasil diverifikasi! Selamat datang di ARISERA. Ruang kerja Anda siap digunakan.'
            );
            const session = await authService.getSession();
            if (session?.user) {
              await store.handleSessionSync(session.user);
            }
          } else if (result.status === 'error') {
            setAuthModalInitialMode('signin');
            if (result.userEmail) {
              setAuthModalInitialEmail(result.userEmail);
            }
            setAuthModalInitialError(result.errorMessage || 'Verifikasi email tidak berhasil.');
            setIsAuthModalOpen(true);
          }
        }
      } catch (err: any) {
        console.warn('[ARISERA] Gagal memproses callback autentikasi:', err?.message);
      }
    };

    checkAuthCallback();

    return unsubscribe;
  }, []);

  const activeWorkspace =
    appState.workspaces.find((w) => w.id === appState.activeWorkspaceId) ||
    appState.workspaces[0];

  const activeWebsite =
    appState.websites.find((w) => w.id === appState.activeWebsiteId) ||
    appState.websites.find((w) => w.workspace_id === activeWorkspace.id) ||
    appState.websites[0];

  const activePageId =
    appState.pages.find((p) => p.website_id === activeWebsite?.id)?.id ||
    'page-home-01';

  const currentComponents = appState.pageComponents[activePageId] || [];

  const tabLabels: Record<ActiveNavTab, string> = {
    overview: 'Dasbor Arisera',
    websites: 'Situs Web Bisnis',
    cms: 'Katalog Produk & CMS',
    builder: 'Arisera Builder',
    templates: 'Tema Arisera',
    media: 'Media Arisera',
    workspaces: 'Ruang Kerja Arisera',
    integrations: 'Integrasi & API',
    docs: 'Dokumen & Arsitektur',
    settings: 'Pengaturan',
  };

  const handleCreateWebsite = async (
    name: string,
    category: BusinessCategory,
    templateId?: string
  ) => {
    const newWeb = await store.createWebsiteAsync(name, category, templateId);
    if (newWeb) {
      setCurrentTab('builder');
    }
  };

  const handleUseTemplate = async (
    name: string,
    category: BusinessCategory,
    templateId: string
  ) => {
    const newWeb = await store.createWebsiteAsync(name, category, templateId);
    if (newWeb) {
      setCurrentTab('builder');
    }
  };

  const handleDeleteWebsite = async (id: string) => {
    await store.deleteWebsiteAsync(id);
  };

  const handleUpdateWebsiteStatus = async (id: string, status: PublishStatus) => {
    await store.updateWebsiteStatusAsync(id, status);
  };

  const handlePublishWebsite = async () => {
    if (activeWebsite) {
      await store.updateWebsiteStatusAsync(activeWebsite.id, 'published');
    }
  };

  const handleUpdateWhatsApp = async (phone: string, template: string) => {
    if (activeWebsite) {
      await store.updateWebsiteInfoAsync(activeWebsite.id, {
        whatsapp_number: phone,
        whatsapp_message_template: template,
      });
    }
  };

  const isPrivateTab = [
    'overview',
    'websites',
    'cms',
    'builder',
    'media',
    'workspaces',
    'settings',
  ].includes(currentTab);

  const isAuthRequired =
    appState.storageMode === 'supabase_live' && !appState.isAuthenticated && isPrivateTab;

  // Jika URL mengarah ke akses website publik independen:
  if (publicWebsiteSlug) {
    return (
      <PublicWebsiteViewer
        subdomainOrSlug={publicWebsiteSlug}
        onBackToApp={() => {
          setPublicWebsiteSlug(null);
          // bersihkan hash atau query param
          if (window.location.hash.startsWith('#/site/')) {
            window.location.hash = '';
          }
          const url = new URL(window.location.href);
          url.searchParams.delete('site');
          url.searchParams.delete('subdomain');
          window.history.replaceState({}, '', url.pathname);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F8F8FC] overflow-hidden text-[#11111B] antialiased">
      {/* 1. Sidebar Navigasi Resmi Arisera */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        workspaces={appState.workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={(id) => store.setActiveWorkspace(id)}
        onOpenNewWorkspaceModal={() => setCurrentTab('workspaces')}
      />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar
          currentTabName={tabLabels[currentTab]}
          activeWorkspace={activeWorkspace}
          activeWebsite={activeWebsite}
          currentUser={appState.currentUser}
          isAuthenticated={appState.isAuthenticated}
          onOpenCreateWebsite={() => setIsCreateModalOpen(true)}
          onOpenLivePreview={
            activeWebsite ? () => setPreviewWebsite(activeWebsite) : undefined
          }
          onOpenPublicWebsite={
            activeWebsite
              ? () => setPublicWebsiteSlug(activeWebsite.subdomain || activeWebsite.slug)
              : undefined
          }
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
          onSignOut={() => store.signOutAsync()}
        />

        {/* Global Feedback Notifications */}
        {appState.lastErrorMessage && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between text-xs text-red-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-medium">{appState.lastErrorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => store.clearMessages()}
              className="p-1 hover:bg-red-100 rounded text-red-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {appState.lastSuccessMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{appState.lastSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => store.clearMessages()}
              className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Storage Mode Notice Banner */}
        {!bannerDismissed && (
          <div
            className={`border-b px-6 py-2 flex items-center justify-between text-xs transition-colors ${
              appState.storageMode === 'supabase_live'
                ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900'
                : 'bg-amber-50/70 border-amber-100 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database
                className={`w-3.5 h-3.5 ${
                  appState.storageMode === 'supabase_live' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
              {appState.storageMode === 'supabase_live' ? (
                <span>
                  <strong>Penyimpanan Permanen Aktif:</strong> Terhubung ke Supabase Cloud PostgreSQL dengan Row Level Security.
                </span>
              ) : (
                <span>
                  <strong>Mode Demonstrasi Lokal:</strong>{' '}
                  {appState.lastErrorMessage || 'Supabase belum terkonfigurasi. Data saat ini disimpan sementara di memori peramban.'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {appState.storageMode === 'local_demo' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsSupabaseConfigOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-2.5 py-0.5 rounded-md transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-700" />
                    <span>Hubungkan Supabase Cloud</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('integrations')}
                    className="text-[11px] font-semibold text-[#6D4AFF] hover:underline whitespace-nowrap"
                  >
                    Panduan Migrasi
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="Sembunyikan pesan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport Konten Dinamis */}
        <main className="flex-1 overflow-y-auto p-6">
          {isAuthRequired ? (
            <AuthGate
              onSuccess={() => {}}
              onExploreDemo={() => setCurrentTab('templates')}
            />
          ) : (
            <>
              {currentTab === 'overview' && (
                <DashboardOverview
                  activeWorkspace={activeWorkspace}
                  websites={appState.websites}
                  products={appState.products}
                  activityLogs={appState.activityLogs}
                  contactSubmissions={appState.contactSubmissions}
                  onNavigateTab={setCurrentTab}
                  onSelectWebsite={(id) => store.setActiveWebsite(id)}
                  onOpenCreateWebsite={() => setIsCreateModalOpen(true)}
                  onOpenLivePreview={(web) => setPreviewWebsite(web)}
                />
              )}

              {currentTab === 'websites' && (
                <WebsitesList
                  activeWorkspace={activeWorkspace}
                  websites={appState.websites}
                  onSelectWebsite={(id) => store.setActiveWebsite(id)}
                  onOpenCreateWebsite={() => setIsCreateModalOpen(true)}
                  onNavigateTab={setCurrentTab}
                  onOpenLivePreview={(web) => setPreviewWebsite(web)}
                  onDeleteWebsite={handleDeleteWebsite}
                  onUpdateStatus={handleUpdateWebsiteStatus}
                />
              )}

              {currentTab === 'cms' && activeWebsite && (
                <ProductCatalog
                  website={activeWebsite}
                  products={appState.products}
                  categories={appState.categories}
                  onAddProduct={(data) => store.createProductAsync(data)}
                  onUpdateProduct={(id, updates) => store.updateProductAsync(id, updates)}
                  onDeleteProduct={(id) => store.deleteProductAsync(id)}
                />
              )}

              {currentTab === 'builder' && activeWebsite && (
                <BuilderWireframe
                  website={activeWebsite}
                  pages={appState.pages.filter((p) => p.website_id === activeWebsite.id)}
                  components={currentComponents}
                  products={appState.products}
                  onUpdateComponents={(pageId, comps) =>
                    store.updateComponents(pageId, comps)
                  }
                  onSaveDraft={(pageId, comps) =>
                    store.savePageDraftAsync(activeWebsite.id, pageId, comps)
                  }
                  onPublishWebsite={handlePublishWebsite}
                  onOpenLivePreview={() => setPreviewWebsite(activeWebsite)}
                  onOpenPublicUrl={() =>
                    setPublicWebsiteSlug(activeWebsite.subdomain || activeWebsite.slug)
                  }
                />
              )}

              {currentTab === 'templates' && (
                <TemplateGallery
                  templates={appState.templates}
                  onUseTemplate={handleUseTemplate}
                />
              )}

              {currentTab === 'media' && (
                <MediaLibrary
                  activeWorkspace={activeWorkspace}
                  mediaAssets={appState.mediaAssets}
                  onAddMedia={(media) => store.addMediaAsset(media)}
                  onDeleteMedia={(id, storagePath) =>
                    store.deleteMediaAssetAsync(id, storagePath)
                  }
                />
              )}

              {currentTab === 'workspaces' && (
                <WorkspaceManager
                  workspaces={appState.workspaces}
                  activeWorkspace={activeWorkspace}
                  currentUser={appState.currentUser}
                  onSelectWorkspace={(id) => store.setActiveWorkspace(id)}
                  onCreateWorkspace={(name) => store.createWorkspaceAsync(name)}
                />
              )}

              {currentTab === 'integrations' && (
                <IntegrationsHub
                  activeWebsite={activeWebsite}
                  activeWorkspace={activeWorkspace}
                />
              )}

              {currentTab === 'docs' && <DocsViewer />}

              {currentTab === 'settings' && (
                <SettingsView
                  activeWorkspace={activeWorkspace}
                  activeWebsite={activeWebsite}
                  onUpdateWebsiteWhatsApp={handleUpdateWhatsApp}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Modal Buat Website Baru */}
      <CreateWebsiteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        templates={appState.templates}
        onCreate={handleCreateWebsite}
      />

      {/* 4. Modal Pratinjau Publik Interaktif */}
      {previewWebsite && (
        <LiveWebsitePreviewModal
          isOpen={Boolean(previewWebsite)}
          onClose={() => setPreviewWebsite(null)}
          website={previewWebsite}
          products={appState.products}
          components={currentComponents}
          onOpenPublicUrl={() => {
            setPreviewWebsite(null);
            setPublicWebsiteSlug(previewWebsite.subdomain || previewWebsite.slug);
          }}
        />
      )}

      {/* 5. Modal Autentikasi Pengguna */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthModalInitialError(null);
        }}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setAuthModalInitialError(null);
        }}
        initialMode={authModalInitialMode}
        initialEmail={authModalInitialEmail}
        initialError={authModalInitialError}
        onOpenConfig={() => setIsSupabaseConfigOpen(true)}
      />

      {/* 6. Modal Konfigurasi Supabase Cloud */}
      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
      />
    </div>
  );
}
