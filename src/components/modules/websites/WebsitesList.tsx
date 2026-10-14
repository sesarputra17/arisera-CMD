import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Search,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import { Website, Workspace, BusinessCategory, PublishStatus } from '../../../types/database';

interface WebsitesListProps {
  activeWorkspace: Workspace;
  websites: Website[];
  onSelectWebsite: (id: string) => void;
  onOpenCreateWebsite: () => void;
  onNavigateTab: (tab: any) => void;
  onOpenLivePreview: (website: Website) => void;
  onDeleteWebsite?: (id: string) => void;
  onUpdateStatus?: (id: string, status: PublishStatus) => void;
}

export const WebsitesList: React.FC<WebsitesListProps> = ({
  activeWorkspace,
  websites,
  onSelectWebsite,
  onOpenCreateWebsite,
  onNavigateTab,
  onOpenLivePreview,
  onDeleteWebsite,
  onUpdateStatus,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const workspaceWebsites = websites.filter((w) => w.workspace_id === activeWorkspace.id);

  const filtered = workspaceWebsites.filter((web) => {
    const matchesSearch =
      web.name.toLowerCase().includes(search.toLowerCase()) ||
      web.subdomain.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || web.business_category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categoryLabels: Record<string, string> = {
    kuliner: 'Kuliner & F&B',
    fashion: 'Fashion & Busana',
    kosmetik: 'Kosmetik & Kecantikan',
    elektronik: 'Elektronik & Gadget',
    jasa: 'Jasa & Konsultan',
    retail: 'Retail & Toko',
    portofolio: 'Portofolio',
    lainnya: 'Lainnya',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#85859A]">
            <span>Situs Web Bisnis</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-800">{activeWorkspace.name}</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            Daftar Website dalam Ruang Kerja
          </h1>
          <p className="text-xs text-[#85859A] mt-0.5">
            Setiap website memiliki pengaturan domain, tema visual, katalog, dan alur pemesanan sendiri.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateWebsite}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Website Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama situs atau subdomain..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {['all', 'kuliner', 'fashion', 'kosmetik', 'elektronik', 'jasa'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-[#11111B] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((web) => (
          <div
            key={web.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-[#6D4AFF]/50 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-[#6D4AFF] uppercase tracking-wider block">
                    {categoryLabels[web.business_category] || web.business_category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{web.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                      web.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : web.status === 'archived'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {web.status === 'published'
                      ? 'Terbit'
                      : web.status === 'archived'
                      ? 'Arsip'
                      : 'Draf'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#85859A] line-clamp-2">{web.description}</p>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#85859A]">Subdomain:</span>
                  <span className="font-mono text-[11px] text-[#6D4AFF] truncate max-w-[170px]">
                    {web.subdomain}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#85859A]">WhatsApp:</span>
                  <span className="font-mono text-[11px] text-slate-700">
                    +{web.whatsapp_number || '6281234567890'}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onSelectWebsite(web.id);
                  onNavigateTab('builder');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D4AFF] hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buka Builder</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectWebsite(web.id);
                    onNavigateTab('cms');
                  }}
                  className="px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
                  title="Katalog Produk"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Katalog</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenLivePreview(web)}
                  className="p-1.5 text-slate-500 hover:text-[#6D4AFF] hover:bg-slate-200 rounded transition-colors"
                  title="Pratinjau Publik"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                {onDeleteWebsite && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus website "${web.name}"?`)) {
                        onDeleteWebsite(web.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Hapus Website"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebsitesList;
