import React from 'react';
import {
  Globe,
  Database,
  ExternalLink,
  Plus,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Workspace, Website, UserProfile } from '../../types/database';
import { isSupabaseLive } from '../../services/supabase';

interface TopNavbarProps {
  currentTabName: string;
  activeWorkspace: Workspace;
  activeWebsite?: Website;
  currentUser: UserProfile;
  isAuthenticated?: boolean;
  onOpenCreateWebsite: () => void;
  onOpenLivePreview?: () => void;
  onOpenPublicWebsite?: () => void;
  onOpenAuthModal?: () => void;
  onOpenSupabaseConfig?: () => void;
  onSignOut?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTabName,
  activeWorkspace,
  activeWebsite,
  currentUser,
  isAuthenticated = false,
  onOpenCreateWebsite,
  onOpenLivePreview,
  onOpenPublicWebsite,
  onOpenAuthModal,
  onOpenSupabaseConfig,
  onSignOut,
}) => {
  const isSupabaseConnected = isSupabaseLive();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 shrink-0 z-30 sticky top-0">
      {/* Zone 1: Breadcrumb Trail (Single line, quiet unboxed hierarchy) */}
      <div className="flex items-center gap-2 text-sm text-[#85859A] truncate">
        <span className="font-semibold text-slate-800 truncate">
          {activeWorkspace?.name || 'Ruang Kerja'}
        </span>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="text-slate-600 font-medium whitespace-nowrap">{currentTabName}</span>
        {activeWebsite && (
          <>
            <span aria-hidden="true" className="text-slate-300">/</span>
            <span className="text-[#6D4AFF] font-medium truncate">{activeWebsite.name}</span>
          </>
        )}
      </div>

      {/* Zone 2: Status Koneksi & Akses Cepat */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Supabase Status Indicator (Interactive) */}
        {onOpenSupabaseConfig ? (
          <button
            type="button"
            onClick={onOpenSupabaseConfig}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
              isSupabaseConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title={
              isSupabaseConnected
                ? 'Terhubung ke Supabase Cloud PostgreSQL. Klik untuk info/pengaturan.'
                : 'Berjalan dalam Mode Demo Lokal. Klik untuk menghubungkan Supabase Cloud.'
            }
          >
            <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="font-medium">
              {isSupabaseConnected ? 'Supabase Cloud' : 'Mode Demo (Hubungkan)'}
            </span>
          </button>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#85859A]">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span>Database:</span>
            {isSupabaseConnected ? (
              <span className="font-medium text-emerald-600">Supabase Aktif</span>
            ) : (
              <span className="font-medium text-slate-600">Lokal (Mode Demo)</span>
            )}
          </div>
        )}

        {/* Action Button: Pratinjau Website jika ada website aktif */}
        {activeWebsite && onOpenLivePreview && (
          <button
            type="button"
            onClick={onOpenLivePreview}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D4AFF] bg-[#6D4AFF]/10 hover:bg-[#6D4AFF]/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Pratinjau</span>
          </button>
        )}

        {/* Action Button: Website Publik Langsung jika statusnya 'published' */}
        {activeWebsite && activeWebsite.status === 'published' && onOpenPublicWebsite && (
          <button
            type="button"
            onClick={onOpenPublicWebsite}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            <span>Website Publik</span>
          </button>
        )}

        {/* Primary CTA Button: Buat Website Baru */}
        <button
          type="button"
          onClick={onOpenCreateWebsite}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Website Baru</span>
        </button>

        {/* Auth Button (Sign In / Sign Out) */}
        {onOpenAuthModal && (
          <div className="flex items-center pl-2 border-l border-slate-200 gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#11111B] text-white flex items-center justify-center text-xs font-bold tracking-tight">
                    {currentUser?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden xl:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-900 leading-tight">
                      {currentUser.full_name}
                    </span>
                    <span className="text-[10px] text-[#85859A] leading-tight truncate max-w-[120px]">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Keluar dari Akun"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#6D4AFF] bg-slate-100 hover:bg-[#6D4AFF]/10 rounded-lg transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk / Daftar</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNavbar;
