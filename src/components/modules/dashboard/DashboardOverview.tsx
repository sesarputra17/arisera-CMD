import React from 'react';
import {
  Globe,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  MessageCircle,
  Database,
  Layers,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { Workspace, Website, Product, ActivityLog, ContactSubmission } from '../../../types/database';
import { isSupabaseLive } from '../../../services/supabase';
import { Mail, CheckCircle } from 'lucide-react';

interface DashboardOverviewProps {
  activeWorkspace: Workspace;
  websites: Website[];
  products: Product[];
  activityLogs: ActivityLog[];
  contactSubmissions?: ContactSubmission[];
  onNavigateTab: (tab: any) => void;
  onSelectWebsite: (id: string) => void;
  onOpenCreateWebsite: () => void;
  onOpenLivePreview: (website: Website) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  activeWorkspace,
  websites,
  products,
  activityLogs,
  contactSubmissions = [],
  onNavigateTab,
  onSelectWebsite,
  onOpenCreateWebsite,
  onOpenLivePreview,
}) => {
  const workspaceWebsites = websites.filter((w) => w.workspace_id === activeWorkspace.id);
  const totalProducts = products.length;
  const isSupabase = isSupabaseLive();

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#85859A]">
            <span>Ruang Kerja Bisnis</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-800">{activeWorkspace.name}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Pusat Pengelolaan Platform Arisera
          </h1>
          <p className="text-sm text-[#85859A] max-w-2xl leading-relaxed">
            Kelola situs web bisnis, katalog produk CMS, integrasi pemesanan WhatsApp, dan bangun tata letak visual tanpa batasan kode.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('builder')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Buka Arisera Builder</span>
          </button>
        </div>
      </div>

      {/* Structured Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#85859A]">Situs Web Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-[#6D4AFF]/10 text-[#6D4AFF] flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {workspaceWebsites.length}
            </div>
            <div className="text-xs text-[#85859A] mt-1 flex items-center gap-1.5">
              <span>{workspaceWebsites.filter((w) => w.status === 'published').length} terpublikasi</span>
              <span aria-hidden="true">·</span>
              <span>{workspaceWebsites.filter((w) => w.status === 'draft').length} draf</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#85859A]">Total Produk CMS</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {totalProducts}
            </div>
            <div className="text-xs text-[#85859A] mt-1 flex items-center gap-1.5">
              <span>Siap dipesan via WhatsApp</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#85859A]">WhatsApp Gateway</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              Aktif
            </div>
            <div className="text-xs text-[#85859A] mt-1 truncate">
              Format pesan otomatis terpasang
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#85859A]">Status PostgreSQL</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl font-bold text-slate-900">
              {isSupabase ? 'Supabase Live' : 'Lokal (Siap DDL)'}
            </div>
            <div className="text-xs text-[#85859A] mt-1">
              {isSupabase ? 'Koneksi cloud terotentikasi' : '14 tabel skema siap eksekusi'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Daftar Website Bisnis dalam Workspace */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Website Bisnis Anda</h2>
            <p className="text-xs text-[#85859A]">
              Situs yang berada dalam ruang kerja "{activeWorkspace.name}"
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateWebsite}
            className="text-xs font-semibold text-[#6D4AFF] hover:text-[#5b3ce0] transition-colors"
          >
            + Tambah Website
          </button>
        </div>

        {workspaceWebsites.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Globe className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">Belum ada website di ruang kerja ini</h3>
            <p className="text-xs text-[#85859A] mt-1 max-w-sm mx-auto">
              Mulai buat website pertama Anda menggunakan templat industri siap pakai atau kanvas kosong.
            </p>
            <button
              type="button"
              onClick={onOpenCreateWebsite}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#6D4AFF] rounded-lg hover:bg-[#5b3ce0] transition-colors"
            >
              Buat Website Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaceWebsites.map((web) => (
              <div
                key={web.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-[#6D4AFF]/50 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-semibold text-[#6D4AFF] uppercase tracking-wider block">
                        {categoryLabels[web.business_category] || web.business_category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5 group-hover:text-[#6D4AFF] transition-colors">
                        {web.name}
                      </h3>
                    </div>
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        web.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {web.status === 'published' ? 'Terbit' : 'Draf'}
                    </span>
                  </div>

                  <p className="text-xs text-[#85859A] line-clamp-2 leading-relaxed">
                    {web.description || 'Tidak ada deskripsi'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[#85859A]">Subdomain:</span>
                      <span className="font-mono text-[11px] text-[#6D4AFF] truncate max-w-[170px]">
                        {web.subdomain}
                      </span>
                    </div>
                    {web.custom_domain && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[#85859A]">Domain Kustom:</span>
                        <span className="font-mono text-[11px] text-slate-800 truncate max-w-[170px]">
                          {web.custom_domain}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectWebsite(web.id);
                      onNavigateTab('builder');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D4AFF] hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Edit di Builder</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectWebsite(web.id);
                        onNavigateTab('cms');
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                      title="Katalog Produk"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenLivePreview(web)}
                      className="p-1.5 text-slate-500 hover:text-[#6D4AFF] hover:bg-slate-200 rounded-md transition-colors"
                      title="Pratinjau Publik"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pesan Masuk Formulir Kontak Publik */}
      {contactSubmissions && contactSubmissions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#6D4AFF]" />
              <h3 className="text-sm font-bold text-slate-900">
                Pesan Masuk Formulir Kontak ({contactSubmissions.length})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Tersimpan di Database
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {contactSubmissions.slice(0, 5).map((sub: ContactSubmission) => (
              <div key={sub.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{sub.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({sub.email})</span>
                    {sub.phone && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        WA: {sub.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 line-clamp-1 italic">"{sub.message}"</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400">
                    {new Date(sub.created_at).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary Dual Column: Activity Log & Quick Architecture Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Logs (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#6D4AFF]" />
              <h3 className="text-sm font-bold text-slate-900">Aktivitas Terbaru</h3>
            </div>
            <span className="text-xs text-[#85859A]">Audit Trail</span>
          </div>

          <div className="divide-y divide-slate-100">
            {activityLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <p className="font-medium text-slate-800">{log.action}</p>
                  <p className="text-[11px] text-[#85859A] mt-0.5">
                    Target: <span className="font-mono">{log.target_type}</span>
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
                  {new Date(log.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Architecture Summary (1 col) */}
        <div className="bg-[#11111B] text-white rounded-xl border border-[#232338] p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9B7BFF]">
              <Layers className="w-4 h-4" />
              <span>Arsitektur Fondasi Tahap 1</span>
            </div>
            <h4 className="text-sm font-bold text-slate-100">
              5 Lapisan & Keamanan Multi-Tenant
            </h4>
            <p className="text-xs text-[#85859A] leading-relaxed">
              Arisera dibangun dengan pemisahan mutlak antara lapisan presentasi, logika aplikasi, akses data, keamanan RLS, dan sistem publikasi.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#232338]">
            <button
              type="button"
              onClick={() => onNavigateTab('docs')}
              className="w-full flex items-center justify-between text-xs text-[#9B7BFF] hover:text-white font-medium transition-colors"
            >
              <span>Pelajari Detail Arsitektur</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
