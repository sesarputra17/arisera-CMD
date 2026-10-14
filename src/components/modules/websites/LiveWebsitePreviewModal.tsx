import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  MessageCircle,
  Globe,
} from 'lucide-react';
import { Website, Product, VisualComponentBlock, Page } from '../../../types/database';
import { ComponentRenderer } from '../builder/ComponentRenderer';
import store from '../../../services/store';

interface LiveWebsitePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  website: Website;
  products: Product[];
  components: VisualComponentBlock[];
  onOpenPublicUrl?: () => void;
}

export const LiveWebsitePreviewModal: React.FC<LiveWebsitePreviewModalProps> = ({
  isOpen,
  onClose,
  website,
  products,
  components,
  onOpenPublicUrl,
}) => {
  const [viewDevice, setViewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activePageSlug, setActivePageSlug] = useState<string>('home');

  if (!isOpen) return null;

  const websiteProducts = products.filter((p: Product) => p.website_id === website.id);
  const statePages = store.getState().pages.filter((p: Page) => p.website_id === website.id);
  const activePage =
    statePages.find((p: Page) => p.slug === activePageSlug || (activePageSlug === 'home' && p.is_homepage)) ||
    statePages[0];

  const pageComponents: VisualComponentBlock[] =
    activePage && store.getState().pageComponents[activePage.id]
      ? store.getState().pageComponents[activePage.id]
      : components;

  const activeComponents = pageComponents
    .filter((c: VisualComponentBlock) => !c.is_hidden)
    .sort((a: VisualComponentBlock, b: VisualComponentBlock) => a.order - b.order);

  const publicUrlDisplay = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${website.subdomain}.arisera.site`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Top Browser Simulation Bar */}
      <div className="h-14 bg-[#11111B] text-white px-6 flex items-center justify-between shrink-0 border-b border-[#222233]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="bg-[#181825] px-3 py-1 rounded-md text-xs font-mono text-slate-300 flex items-center gap-2 border border-[#2a2a3e]">
            <span className="text-emerald-400">https://</span>
            <span>{website.custom_domain || `${website.subdomain}.arisera.site`}</span>
          </div>

          {website.status === 'published' && onOpenPublicUrl && (
            <button
              type="button"
              onClick={onOpenPublicUrl}
              className="text-[11px] font-semibold text-[#9B7BFF] hover:underline flex items-center gap-1 ml-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Tab Publik</span>
            </button>
          )}
        </div>

        {/* Device Switcher */}
        <div className="flex items-center bg-[#181825] p-0.5 rounded-lg border border-[#2a2a3e]">
          <button
            type="button"
            onClick={() => setViewDevice('desktop')}
            className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 ${
              viewDevice === 'desktop'
                ? 'bg-[#6D4AFF] text-white font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewDevice('tablet')}
            className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 ${
              viewDevice === 'tablet'
                ? 'bg-[#6D4AFF] text-white font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewDevice('mobile')}
            className={`px-2.5 py-1 text-xs rounded transition-colors flex items-center gap-1.5 ${
              viewDevice === 'mobile'
                ? 'bg-[#6D4AFF] text-white font-medium'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222233] rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewport Frame */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-slate-950/40">
        <div
          className={`bg-white text-[#11111B] shadow-2xl transition-all duration-300 overflow-x-hidden ${
            viewDevice === 'mobile'
              ? 'w-[375px] rounded-3xl border-8 border-slate-800 min-h-[667px]'
              : viewDevice === 'tablet'
              ? 'w-[768px] rounded-2xl border-4 border-slate-800 min-h-[700px]'
              : 'w-full max-w-5xl rounded-xl border border-slate-300 min-h-[700px]'
          }`}
          style={{
            fontFamily: website.theme_settings?.fontFamily || 'Plus Jakarta Sans',
          }}
        >
          {activeComponents.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Belum ada komponen yang ditambahkan ke canvas.
            </div>
          ) : (
            activeComponents.map((block: VisualComponentBlock) => (
              <ComponentRenderer
                key={block.id}
                block={block}
                website={website}
                products={websiteProducts.length > 0 ? websiteProducts : products}
                onNavigatePage={(slug) => setActivePageSlug(slug)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveWebsitePreviewModal;
