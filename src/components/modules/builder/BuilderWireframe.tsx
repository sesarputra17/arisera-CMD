import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Sliders,
  Check,
  Save,
  Globe,
  Sparkles,
  ShoppingBag,
  MessageCircle,
  History,
  RotateCcw,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Grid,
  Award,
  Phone,
  PanelBottom,
  ExternalLink,
  ChevronDown,
  Search,
  Settings,
} from 'lucide-react';
import {
  Website,
  Page,
  VisualComponentBlock,
  Product,
  PublishingVersion,
  PageVersion,
  ComponentBlockType,
} from '../../../types/database';
import { ComponentRenderer } from './ComponentRenderer';
import { BlockInspector } from './BlockInspector';
import { PageManagerModal } from './PageManagerModal';
import { SeoSettingsModal } from './SeoSettingsModal';
import { COMPONENT_PRESETS, createBlockFromPreset } from './componentPresets';
import publishingService from '../../../services/publishingService';
import pageService from '../../../services/pageService';
import store from '../../../services/store';

interface BuilderWireframeProps {
  website: Website;
  pages: Page[];
  components: VisualComponentBlock[];
  products: Product[];
  onUpdateComponents: (pageId: string, components: VisualComponentBlock[]) => void;
  onSaveDraft?: (
    pageId: string,
    components: VisualComponentBlock[]
  ) => Promise<{ success: boolean; pageId?: string; error?: string }>;
  onPublishWebsite: () => void;
  onOpenLivePreview: () => void;
  onOpenPublicUrl?: () => void;
}

export const BuilderWireframe: React.FC<BuilderWireframeProps> = ({
  website,
  pages,
  components: initialComponents,
  products,
  onUpdateComponents,
  onSaveDraft,
  onPublishWebsite,
  onOpenLivePreview,
  onOpenPublicUrl,
}) => {
  // Website Pages yang terikat ke website ini
  const websitePages = pages.filter((p) => p.website_id === website.id);
  const defaultPageId = websitePages[0]?.id || 'page-home-01';

  const [activePageId, setActivePageId] = useState<string>(defaultPageId);
  const [localComponents, setLocalComponents] = useState<VisualComponentBlock[]>(() => {
    return store.getState().pageComponents[defaultPageId] || initialComponents || [];
  });

  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedBlockId, setSelectedBlockId] = useState<string>(localComponents[0]?.id || '');
  const [leftTab, setLeftTab] = useState<'layers' | 'pages' | 'add'>('layers');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveDraftError, setSaveDraftError] = useState<string | null>(null);

  // Modals
  const [isPageManagerOpen, setIsPageManagerOpen] = useState(false);
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Publish & History state
  const [versionTag, setVersionTag] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<PublishingVersion[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'published' | 'drafts'>('published');
  const [pageDraftVersions, setPageDraftVersions] = useState<PageVersion[]>([]);
  const [isLoadingDraftVersions, setIsLoadingDraftVersions] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [activeLoadedVersionId, setActiveLoadedVersionId] = useState<string | null>(null);
  const [restoreFeedback, setRestoreFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    versionId?: string;
    versionNumber?: number;
  } | null>(null);
  const [confirmingRollbackId, setConfirmingRollbackId] = useState<string | null>(null);

  // Halaman aktif objek
  const activePage = websitePages.find((p) => p.id === activePageId) || websitePages[0] || {
    id: activePageId,
    website_id: website.id,
    title: 'Beranda',
    slug: 'home',
    is_homepage: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Sinkronisasi komponen ketika website atau halaman berganti
  useEffect(() => {
    if (websitePages.length > 0 && !websitePages.some((p) => p.id === activePageId)) {
      const newPageId = websitePages[0].id;
      setActivePageId(newPageId);
      const targetComps = store.getState().pageComponents[newPageId];
      if (targetComps && targetComps.length > 0) {
        setLocalComponents(targetComps);
        setSelectedBlockId(targetComps[0]?.id || '');
      }
      return;
    }

    const pComps = store.getState().pageComponents[activePageId];
    if (pComps && pComps.length > 0) {
      setLocalComponents(pComps);
      setSelectedBlockId((prev) =>
        pComps.some((c) => c.id === prev) ? prev : pComps[0]?.id || ''
      );
    }
  }, [activePageId, website.id, websitePages]);

  const selectedBlock = localComponents.find((c) => c.id === selectedBlockId);

  // Ganti Halaman yang Sedang Diedit
  const handleSwitchPage = (targetPageId: string) => {
    // Simpan draf halaman saat ini ke store
    onUpdateComponents(activePageId, localComponents);

    // Beralih ke halaman target
    setActivePageId(targetPageId);
    const targetComps = store.getState().pageComponents[targetPageId] || [];
    setLocalComponents(targetComps);
    setSelectedBlockId(targetComps[0]?.id || '');
  };

  // Komponen Reordering (Naik / Turun)
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newComponents = [...localComponents];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newComponents.length) return;

    const temp = newComponents[index];
    newComponents[index] = newComponents[targetIndex];
    newComponents[targetIndex] = temp;

    newComponents.forEach((c, idx) => {
      c.order = idx + 1;
    });

    setLocalComponents(newComponents);
    onUpdateComponents(activePageId, newComponents);
  };

  // Duplikasi Blok
  const duplicateBlock = (block: VisualComponentBlock) => {
    const duplicated: VisualComponentBlock = {
      ...block,
      id: `comp-${block.type}-${Date.now()}`,
      order: localComponents.length + 1,
      content: JSON.parse(JSON.stringify(block.content || {})),
      styles: JSON.parse(JSON.stringify(block.styles || {})),
    };
    const updated = [...localComponents, duplicated];
    setLocalComponents(updated);
    onUpdateComponents(activePageId, updated);
    setSelectedBlockId(duplicated.id);
  };

  // Sembunyikan / Tampilkan Blok
  const toggleVisibility = (blockId: string) => {
    const updated = localComponents.map((c) =>
      c.id === blockId ? { ...c, is_hidden: !c.is_hidden } : c
    );
    setLocalComponents(updated);
    onUpdateComponents(activePageId, updated);
  };

  // Hapus Blok
  const removeBlock = (blockId: string) => {
    if (localComponents.length <= 1) return;
    const updated = localComponents.filter((c) => c.id !== blockId);
    setLocalComponents(updated);
    onUpdateComponents(activePageId, updated);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(updated[0]?.id || '');
    }
  };

  // Tambah Blok dari Preset Reusable
  const handleAddPreset = (type: ComponentBlockType) => {
    const preset = COMPONENT_PRESETS.find((p) => p.type === type);
    if (!preset) return;

    const newBlock = createBlockFromPreset(preset, localComponents.length + 1, website.name);
    const updated = [...localComponents, newBlock];
    setLocalComponents(updated);
    onUpdateComponents(activePageId, updated);
    setSelectedBlockId(newBlock.id);
    setLeftTab('layers');
  };

  // Pembaruan Konten / Style oleh Inspektur
  const handleUpdateContent = (key: string, value: any) => {
    if (!selectedBlockId) return;
    const updated = localComponents.map((c) => {
      if (c.id === selectedBlockId) {
        return {
          ...c,
          content: { ...c.content, [key]: value },
        };
      }
      return c;
    });
    setLocalComponents(updated);
    onUpdateComponents(activePageId, updated);
  };

  const handleUpdateStyle = (key: string, value: any) => {
    if (!selectedBlockId) return;
    const updated = localComponents.map((c) => {
      if (c.id === selectedBlockId) {
        return {
          ...c,
          styles: { ...c.styles, [key]: value },
        };
      }
      return c;
    });
    setLocalComponents(updated);
    onUpdateComponents(activePageId, updated);
  };

  // Simpan Draf ke Supabase
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setSaveDraftError(null);
    setSaveStatus(null);

    // Pastikan perubahan draf aktif disinkronkan ke memori store
    onUpdateComponents(activePageId, localComponents);

    try {
      const res = onSaveDraft
        ? await onSaveDraft(activePageId, localComponents)
        : await store.savePageDraftAsync(website.id, activePageId, localComponents);

      if (res && res.success) {
        if (res.pageId && res.pageId !== activePageId) {
          setActivePageId(res.pageId);
        }
        setSaveStatus('Draf Tersimpan');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const errMsg = res?.error || 'Gagal menyimpan draf ke database Supabase.';
        setSaveDraftError(errMsg);
      }
    } catch (err: any) {
      setSaveDraftError(err?.message || 'Terjadi kesalahan sistem saat menyimpan draf.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Buka Modal Publikasi
  const handleOpenPublishModal = () => {
    const autoTag = `v1.${new Date().toISOString().slice(5, 10).replace('-', '.')}.${Date.now().toString().slice(-3)}`;
    setVersionTag(autoTag);
    setVersionNotes(`Rilis pembaruan multi-page ${website.name}`);
    setPublishError(null);
    setIsPublishModalOpen(true);
  };

  // Konfirmasi Publikasi ke Supabase (Menyimpan snapshot SELURUH halaman)
  const handleConfirmPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setPublishError(null);

    // Pastikan halaman aktif tersimpan ke dictionary sebelum snapshot dibekukan
    onUpdateComponents(activePageId, localComponents);

    const allPageComponents = {
      ...store.getState().pageComponents,
      [activePageId]: localComponents,
    };

    const snapshotData = {
      website_id: website.id,
      pages: websitePages,
      components: localComponents, // Fallback kompatibilitas single-page
      all_page_components: allPageComponents, // Struktur seluruh halaman multi-page
      products_count: products.length,
      published_at: new Date().toISOString(),
    };

    try {
      const res = await store.publishWebsiteAsync(
        website.id,
        snapshotData,
        versionTag,
        versionNotes
      );

      if (!res.success || res.error) {
        setPublishError(res.error || 'Gagal memproses publikasi.');
      } else {
        onPublishWebsite();
        setIsPublishModalOpen(false);
        setSaveStatus(`Terpublikasi (${versionTag})`);
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err: any) {
      setPublishError(err?.message || 'Gagal memproses publikasi.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Buka Riwayat Versi
  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setIsLoadingDraftVersions(true);
    setRestoreFeedback(null);
    setConfirmingRollbackId(null);
    try {
      const targetPageId = activePage.id || activePageId;
      const [pubRes, draftRes] = await Promise.all([
        publishingService.getVersionHistory(website.id),
        pageService.getPageDraftVersions(targetPageId),
      ]);
      if (pubRes.data) {
        setHistoryList(pubRes.data);
      }
      if (draftRes.data) {
        setPageDraftVersions(draftRes.data);
      }
    } catch {
      // Fallback diam
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingDraftVersions(false);
    }
  };

  // Muat versi draf tertentu ke kanvas halaman aktif (Restore Draft Snapshot)
  const handleRestoreDraft = async (v: PageVersion) => {
    setRestoringVersionId(v.id);
    setRestoreFeedback(null);

    try {
      const targetPageId = activePage.id || activePageId;
      // 1. Ambil snapshot versi dari store / pageService dan validasi strukturnya
      const res = await store.loadDraftVersionToCanvasAsync(
        website.id,
        targetPageId,
        v.id,
        v
      );

      if (!res.success || !res.components) {
        setRestoreFeedback({
          type: 'error',
          message: res.error || 'Gagal memuat snapshot versi draf ke kanvas.',
        });
        return;
      }

      // 2. Terapkan komponen versi yang divalidasi ke state lokal kanvas
      setLocalComponents(res.components);
      onUpdateComponents(activePageId, res.components);

      // 3. Sinkronkan Inspector: pilih blok pertama jika ada
      if (res.components.length > 0) {
        setSelectedBlockId(res.components[0].id);
      } else {
        setSelectedBlockId('');
      }

      // 4. Catat status versi yang aktif dimuat
      setActiveLoadedVersionId(v.id);
      setRestoreFeedback({
        type: 'success',
        message: `Versi Draf #${v.version_number} (${res.components.length} blok komponen) berhasil dimuat ke kanvas! Kanvas dan Inspector telah diperbarui.`,
        versionId: v.id,
        versionNumber: v.version_number,
      });

      // 5. Update status di toolbar builder
      setSaveStatus(`Draf #${v.version_number} Dimuat ke Kanvas`);
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      setRestoreFeedback({
        type: 'error',
        message: err?.message || 'Terjadi kesalahan sistem saat memulihkan versi.',
      });
    } finally {
      setRestoringVersionId(null);
    }
  };

  // Rollback ke Versi Tertentu (Memulihkan SELURUH rilis publikasi)
  const handleRollback = async (v: PublishingVersion) => {
    setIsLoadingHistory(true);
    setRestoreFeedback(null);
    try {
      const res = await store.rollbackVersionAsync(website.id, v.id);
      if (!res.success || res.error) {
        setRestoreFeedback({
          type: 'error',
          message: res.error || 'Gagal memulihkan rilis publikasi.',
        });
        return;
      }

      // Muat ulang komponen halaman aktif saat ini
      const updatedComps = store.getState().pageComponents[activePageId] || [];
      setLocalComponents(updatedComps);
      if (updatedComps.length > 0) {
        setSelectedBlockId(updatedComps[0].id);
      }
      setConfirmingRollbackId(null);
      setRestoreFeedback({
        type: 'success',
        message: `Seluruh halaman website berhasil di-rollback ke rilis "${v.version_tag}".`,
      });
      setSaveStatus(`Dipulihkan ke ${v.version_tag}`);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setRestoreFeedback({
        type: 'error',
        message: err?.message || 'Terjadi kesalahan saat memulihkan rilis publikasi.',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Lebar canvas viewport responsif
  const viewportWidthClass = {
    desktop: 'w-full max-w-5xl min-h-[750px]',
    tablet: 'w-[768px] min-h-[750px]',
    mobile: 'w-[375px] min-h-[667px]',
  }[viewport];

  const getPresetIcon = (type: ComponentBlockType) => {
    switch (type) {
      case 'header':
        return <Layers className="w-4 h-4 text-slate-700" />;
      case 'hero':
        return <Sparkles className="w-4 h-4 text-[#6D4AFF]" />;
      case 'text':
        return <FileText className="w-4 h-4 text-slate-600" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-blue-600" />;
      case 'gallery':
        return <Grid className="w-4 h-4 text-purple-600" />;
      case 'features':
        return <Award className="w-4 h-4 text-amber-600" />;
      case 'product_grid':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'product_featured':
        return <ShoppingBag className="w-4 h-4 text-teal-600" />;
      case 'testimonials':
        return <Award className="w-4 h-4 text-orange-600" />;
      case 'whatsapp_cta':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'contact':
        return <Phone className="w-4 h-4 text-indigo-600" />;
      case 'footer':
        return <PanelBottom className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#F8F8FC] overflow-hidden -m-6">
      {/* 1. TOP BUILDER TOOLBAR */}
      <div className="h-13 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-3">
          {/* Info Website */}
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">
              {website.name}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                website.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {website.status === 'published' ? 'Terpublikasi' : 'Draf'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Pemilih Halaman Aktif (Multi-page Selector) */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={activePageId}
                onChange={(e) => handleSwitchPage(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg pl-2.5 pr-7 py-1.5 focus:border-[#6D4AFF] outline-hidden cursor-pointer"
              >
                {websitePages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.is_homepage ? '/' : `/${p.slug}`})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setIsPageManagerOpen(true)}
              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Kelola semua halaman website"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Halaman</span>
            </button>
          </div>

          {website.status === 'published' && onOpenPublicUrl && (
            <button
              type="button"
              onClick={onOpenPublicUrl}
              className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D4AFF] hover:underline"
              title="Akses halaman publik"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Situs Publik</span>
            </button>
          )}
        </div>

        {/* Viewport Switcher Controls */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewport === 'desktop'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Desktop (1100px)"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewport === 'tablet'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Tablet (768px)"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewport === 'mobile'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Mobile (375px)"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Builder Action Buttons */}
        <div className="flex items-center gap-2">
          {saveStatus && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              {saveStatus}
            </span>
          )}

          {saveDraftError && (
            <span
              className="text-xs font-medium text-red-600 flex items-center gap-1 animate-in fade-in"
              title={saveDraftError}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="max-w-[180px] truncate">{saveDraftError}</span>
            </span>
          )}

          {/* Tombol SEO & Meta */}
          <button
            type="button"
            onClick={() => setIsSeoModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            title="Pengaturan SEO, Google Snippet, dan Open Graph"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">SEO</span>
          </button>

          <button
            type="button"
            onClick={onOpenLivePreview}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            title="Pratinjau langsung di modal interaktif"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Pratinjau</span>
          </button>

          <button
            type="button"
            onClick={handleOpenHistory}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            title="Lihat riwayat rilis & rollback versi"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Riwayat</span>
          </button>

          <button
            type="button"
            disabled={isSavingDraft}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors"
          >
            {isSavingDraft ? (
              <Loader2 className="w-3.5 h-3.5 text-[#6D4AFF] animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{isSavingDraft ? 'Menyimpan...' : 'Simpan'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPublishModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-xs transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Publikasikan</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN 3-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* PANEL KIRI: Layers, Multi-page & Komponen (280px) */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Tabs Navigasi Panel Kiri */}
          <div className="flex border-b border-slate-200 text-xs font-semibold bg-slate-50">
            <button
              type="button"
              onClick={() => setLeftTab('layers')}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                leftTab === 'layers'
                  ? 'border-[#6D4AFF] text-[#6D4AFF] bg-white'
                  : 'border-transparent text-[#85859A] hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layers ({localComponents.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('pages')}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                leftTab === 'pages'
                  ? 'border-[#6D4AFF] text-[#6D4AFF] bg-white'
                  : 'border-transparent text-[#85859A] hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Halaman ({websitePages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setLeftTab('add')}
              className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                leftTab === 'add'
                  ? 'border-[#6D4AFF] text-[#6D4AFF] bg-white'
                  : 'border-transparent text-[#85859A] hover:text-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Blok</span>
            </button>
          </div>

          {/* Isi Tab Layers: Urutan & Kontrol Blok */}
          {leftTab === 'layers' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="text-[10px] font-bold text-[#85859A] uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>Struktur "{activePage.title}"</span>
                <span className="text-[9px] font-normal text-slate-400">Reorder / Hide</span>
              </div>
              {localComponents.map((block, idx) => {
                const isSelected = block.id === selectedBlockId;
                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[#6D4AFF] bg-[#6D4AFF]/5 text-[#6D4AFF] font-bold'
                        : 'border-slate-100 hover:border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono text-slate-400 w-3">{idx + 1}</span>
                      {getPresetIcon(block.type)}
                      <span className="capitalize truncate text-xs">
                        {block.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(idx, 'up');
                        }}
                        disabled={idx === 0}
                        className="p-1 hover:text-[#6D4AFF] disabled:opacity-20"
                        title="Geser ke atas"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(idx, 'down');
                        }}
                        disabled={idx === localComponents.length - 1}
                        className="p-1 hover:text-[#6D4AFF] disabled:opacity-20"
                        title="Geser ke bawah"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(block.id);
                        }}
                        className="p-1 hover:text-[#6D4AFF]"
                        title={block.is_hidden ? 'Tampilkan' : 'Sembunyikan'}
                      >
                        {block.is_hidden ? (
                          <EyeOff className="w-3 h-3 text-red-500" />
                        ) : (
                          <Eye className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateBlock(block);
                        }}
                        className="p-1 hover:text-[#6D4AFF]"
                        title="Duplikasi blok"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Isi Tab Pages: Daftar & Pengalihan Halaman */}
          {leftTab === 'pages' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <div className="text-[10px] font-bold text-[#85859A] uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>Halaman Website</span>
                <button
                  type="button"
                  onClick={() => setIsPageManagerOpen(true)}
                  className="text-[#6D4AFF] hover:underline normal-case text-xs font-semibold"
                >
                  Kelola →
                </button>
              </div>

              {websitePages.map((p) => {
                const isActive = p.id === activePageId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSwitchPage(p.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isActive
                        ? 'border-[#6D4AFF] bg-[#6D4AFF]/5 text-[#6D4AFF] font-bold shadow-2xs'
                        : 'border-slate-100 hover:border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono pl-5 block">
                        {p.is_homepage ? '/' : `/${p.slug}`}
                      </span>
                    </div>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#6D4AFF] shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Isi Tab Add: Katalog Blok Reusable */}
          {leftTab === 'add' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              <div className="text-[10px] font-bold text-[#85859A] uppercase tracking-wider mb-2">
                Pilih Komponen Reusable
              </div>
              {COMPONENT_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleAddPreset(preset.type)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#6D4AFF] hover:bg-[#6D4AFF]/5 text-left transition-colors flex items-start gap-2.5 group"
                >
                  <div className="mt-0.5">{getPresetIcon(preset.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 group-hover:text-[#6D4AFF]">
                      {preset.title}
                    </div>
                    <div className="text-[10px] text-[#85859A] line-clamp-2 mt-0.5">
                      {preset.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* PANEL TENGAH: Live Visual Canvas Editor */}
        <main className="flex-1 overflow-auto p-8 flex justify-center items-start bg-slate-200/60">
          <div
            className={`bg-white rounded-xl shadow-lg border border-slate-300 transition-all duration-300 overflow-hidden ${viewportWidthClass}`}
            style={{
              fontFamily: website.theme_settings?.fontFamily || 'Plus Jakarta Sans',
            }}
          >
            {localComponents.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-400">
                Canvas kosong. Tambahkan blok komponen melalui panel sebelah kiri.
              </div>
            ) : (
              localComponents.map((block) => {
                if (block.is_hidden) return null;
                const isSelected = block.id === selectedBlockId;

                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`relative cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-[#6D4AFF] ring-inset'
                        : 'hover:ring-1 hover:ring-slate-400/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 left-2 z-30 bg-[#6D4AFF] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md pointer-events-none uppercase tracking-wider flex items-center gap-1">
                        <span>{block.type.replace('_', ' ')}</span>
                      </div>
                    )}

                    <ComponentRenderer
                      block={block}
                      website={website}
                      products={products}
                      isEditable={true}
                      onNavigatePage={(slug) => {
                        const target = websitePages.find((p) => p.slug === slug);
                        if (target) handleSwitchPage(target.id);
                      }}
                    />
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* PANEL KANAN: Inspektur Properti Komponen (320px) */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
          {selectedBlock ? (
            <BlockInspector
              block={selectedBlock}
              website={website}
              onChangeContent={handleUpdateContent}
              onChangeStyle={handleUpdateStyle}
              onRemoveBlock={() => removeBlock(selectedBlock.id)}
            />
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              <Sliders className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              Pilih salah satu blok pada canvas atau panel kiri untuk mengatur konten dan gayanya.
            </div>
          )}
        </aside>
      </div>

      {/* Modal Kelola Halaman (Multi-page Manager) */}
      <PageManagerModal
        isOpen={isPageManagerOpen}
        onClose={() => setIsPageManagerOpen(false)}
        website={website}
        pages={websitePages}
        activePageId={activePageId}
        onSelectPage={(pId) => handleSwitchPage(pId)}
        onCreatePage={async (title, slug, isHomepage) => {
          const newP = await store.createPageAsync(website.id, title, slug, isHomepage);
          if (newP) {
            handleSwitchPage(newP.id);
          }
        }}
        onUpdatePage={async (pId, updates) => {
          await store.updatePageAsync(pId, updates);
        }}
        onDeletePage={async (pId) => {
          await store.deletePageAsync(pId);
          if (activePageId === pId) {
            const nextP = websitePages.find((p) => p.id !== pId);
            if (nextP) handleSwitchPage(nextP.id);
          }
        }}
        onReorderPages={(reordered) => {
          store.reorderPages(reordered);
        }}
      />

      {/* Modal Pengaturan SEO & Metadata */}
      <SeoSettingsModal
        isOpen={isSeoModalOpen}
        onClose={() => setIsSeoModalOpen(false)}
        website={website}
        activePage={activePage}
        allPages={websitePages}
        onSavePageSeo={async (pId, seoData) => {
          await store.updatePageAsync(pId, seoData);
          setSaveStatus('SEO Tersimpan');
          setTimeout(() => setSaveStatus(null), 2500);
        }}
        onSaveWebsiteSeo={async (siteData) => {
          await store.updateWebsiteInfoAsync(website.id, {
            description: siteData.description,
            theme_settings: {
              ...website.theme_settings,
              faviconUrl: siteData.faviconUrl,
            },
          });
        }}
      />

      {/* Modal Konfirmasi Publikasi */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#6D4AFF]" />
                <h3 className="font-bold text-sm text-slate-900">Publikasikan Versi Website</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPublish} className="mt-4 space-y-4 text-xs">
              {publishError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              <p className="text-slate-600 leading-relaxed">
                Tindakan ini akan membekukan seluruh struktur (<strong>{websitePages.length} halaman</strong>)
                dan membuat snapshot versi baru di sistem Arisera. Pengunjung publik akan langsung melihat perubahan ini.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tag Versi Rilis
                </label>
                <input
                  type="text"
                  required
                  value={versionTag}
                  onChange={(e) => setVersionTag(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-xs focus:border-[#6D4AFF] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Catatan Rilis (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#6D4AFF] outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-4 py-1.5 bg-[#6D4AFF] hover:bg-[#5b3ce0] disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Publikasikan Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Versi & Rollback */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200">
            {/* Header Modal */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#6D4AFF]" />
                <h3 className="font-bold text-sm text-slate-900">
                  Riwayat & Titik Pemulihan Versi
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    website.status === 'published'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {website.status === 'published' ? 'Status: Publik' : 'Status: DRAF'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigasi Tab: Riwayat Publikasi vs Riwayat Draf Halaman */}
            <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setHistoryTab('published')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  historyTab === 'published'
                    ? 'border-[#6D4AFF] text-[#6D4AFF]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Riwayat Publikasi Website</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                  {historyList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryTab('drafts')}
                className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  historyTab === 'drafts'
                    ? 'border-[#6D4AFF] text-[#6D4AFF]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Riwayat Draf Halaman: {activePage.title}</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                  {pageDraftVersions.length}
                </span>
              </button>
            </div>

            {/* Konten Modal Berdasarkan Tab */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
              {/* Feedback Notifikasi Muat ke Kanvas / Rollback */}
              {restoreFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2.5 transition-all animate-in fade-in-50 ${
                    restoreFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}
                >
                  {restoreFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-xs">
                      {restoreFeedback.type === 'success'
                        ? 'Berhasil Dimuat ke Kanvas'
                        : 'Gagal Memuat Versi'}
                    </div>
                    <div className="text-[11px] mt-0.5 leading-relaxed text-slate-700">
                      {restoreFeedback.message}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRestoreFeedback(null)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Tutup notifikasi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* TAB 1: RIWAYAT PUBLIKASI (public.publishing_versions) */}
              {historyTab === 'published' && (
                <>
                  {isLoadingHistory ? (
                    <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#6D4AFF]" />
                      <span>Memuat riwayat versi publikasi dari tabel database...</span>
                    </div>
                  ) : historyList.length === 0 ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-lg text-amber-900 space-y-2">
                        <div className="font-semibold flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Website ini berstatus DRAF dan belum pernah dipublikasikan</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-800">
                          Tabel <code>public.publishing_versions</code> didesain khusus untuk membekukan snapshot seluruh halaman ketika Anda menekan tombol <strong>Publikasikan</strong>. Karena website &ldquo;{website.name}&rdquo; masih berstatus <strong>DRAF</strong>, tabel publikasi belum memiliki riwayat rilis.
                        </p>
                        <p className="text-[11px] leading-relaxed text-amber-800">
                          Setiap kali Anda menekan tombol <strong>Simpan</strong>, draf visual Anda tetap disimpan secara aman dan terisolasi di tabel <code>public.page_versions</code> tanpa mengubah status website menjadi publik.
                        </p>
                      </div>

                      <div className="text-center py-6 text-slate-500 text-xs">
                        Buka tab <strong className="text-slate-700">Riwayat Draf Halaman</strong> di atas untuk melihat versi draf yang tersimpan dari tombol Simpan.
                      </div>
                    </div>
                  ) : (
                    historyList.map((ver) => {
                      const isCurrentLive = website.published_version_id === ver.id;
                      const pagesCount =
                        ver.snapshot_data?.pages?.length ||
                        (ver.snapshot_data?.all_page_components
                          ? Object.keys(ver.snapshot_data.all_page_components).length
                          : 1);

                      return (
                        <div
                          key={ver.id}
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            isCurrentLive
                              ? 'border-emerald-300 bg-emerald-50/50'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {ver.version_tag}
                              </span>
                              {isCurrentLive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">
                                  Aktif Publik
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {pagesCount} Halaman
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">{ver.notes || 'Rilis pembaruan'}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(ver.created_at).toLocaleString('id-ID')}
                            </div>
                          </div>

                          <div>
                            {!isCurrentLive && (
                              confirmingRollbackId === ver.id ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRollback(ver)}
                                    className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 cursor-pointer shadow-2xs"
                                  >
                                    Ya, Rollback
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmingRollbackId(null)}
                                    className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs font-semibold hover:bg-slate-300 cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmingRollbackId(ver.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-[#6D4AFF] hover:text-white text-slate-700 rounded-md font-semibold text-xs transition-colors cursor-pointer"
                                  title="Rollback seluruh halaman ke rilis ini"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Rollback</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* TAB 2: RIWAYAT DRAF HALAMAN (public.page_versions) */}
              {historyTab === 'drafts' && (
                <>
                  <div className="text-[11px] text-slate-500 pb-1">
                    Menampilkan checkpoint versi draf dari tabel <code>public.page_versions</code> untuk halaman <strong>{activePage.title}</strong>. Setiap penekanan tombol <strong>Simpan</strong> membentuk versi draf baru secara otomatis.
                  </div>

                  {isLoadingDraftVersions ? (
                    <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#6D4AFF]" />
                      <span>Memuat riwayat versi draf halaman dari database...</span>
                    </div>
                  ) : pageDraftVersions.length === 0 ? (
                    <div className="py-10 text-center text-slate-500">
                      Belum ada versi draf tersimpan di database untuk halaman ini.
                    </div>
                  ) : (
                    pageDraftVersions.map((ver) => {
                      const isCurrentDbDraft = activePage.current_draft_version_id === ver.id;
                      const isCurrentlyLoaded = activeLoadedVersionId === ver.id;
                      const isRestoringThis = restoringVersionId === ver.id;
                      const blockCount = Array.isArray(ver.components) ? ver.components.length : 0;

                      return (
                        <div
                          key={ver.id}
                          className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                            isCurrentlyLoaded
                              ? 'border-emerald-400 bg-emerald-50/70 shadow-2xs'
                              : isCurrentDbDraft
                              ? 'border-indigo-300 bg-indigo-50/50'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                Versi Draf #{ver.version_number}
                              </span>
                              {isCurrentlyLoaded ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Sedang Aktif di Kanvas</span>
                                </span>
                              ) : isCurrentDbDraft ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  Draf Tersimpan Terakhir
                                </span>
                              ) : null}
                              <span className="text-[10px] text-slate-500">
                                {blockCount} Blok Komponen
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Disimpan pada {new Date(ver.created_at).toLocaleString('id-ID')}
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleRestoreDraft(ver)}
                              disabled={isRestoringThis}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                                isCurrentlyLoaded
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                  : 'bg-slate-100 hover:bg-[#6D4AFF] hover:text-white text-slate-700'
                              } ${isRestoringThis ? 'opacity-70 cursor-not-allowed' : ''}`}
                              title="Muat snapshot isi komponen draf versi ini ke kanvas"
                            >
                              {isRestoringThis ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Memuat...</span>
                                </>
                              ) : isCurrentlyLoaded ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Aktif di Kanvas</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Muat ke Kanvas</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-3 border-t border-slate-200 flex justify-between items-center bg-slate-50 rounded-b-xl">
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Penyimpanan draf menjaga status tetap <strong>DRAF</strong> tanpa publikasi otomatis.</span>
              </span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {activeLoadedVersionId ? 'Tutup & Lihat Kanvas' : 'Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
