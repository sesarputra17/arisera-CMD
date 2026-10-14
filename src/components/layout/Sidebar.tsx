import React from 'react';
import {
  LayoutDashboard,
  Globe,
  ShoppingBag,
  Sparkles,
  Palette,
  Image as ImageIcon,
  FolderGit2,
  Plug,
  FileCode2,
  Settings,
  ChevronDown,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import AriseraLogo from '../../assets/logo/AriseraLogo';
import { Workspace } from '../../types/database';

export type ActiveNavTab =
  | 'overview'
  | 'websites'
  | 'cms'
  | 'builder'
  | 'templates'
  | 'media'
  | 'workspaces'
  | 'integrations'
  | 'docs'
  | 'settings';

interface SidebarProps {
  currentTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  onSelectWorkspace: (id: string) => void;
  onOpenNewWorkspaceModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onOpenNewWorkspaceModal,
}) => {
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = React.useState(false);

  const navItems = [
    {
      id: 'overview' as ActiveNavTab,
      label: 'Dasbor Arisera',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'websites' as ActiveNavTab,
      label: 'Situs Web Bisnis',
      icon: Globe,
      badge: null,
    },
    {
      id: 'cms' as ActiveNavTab,
      label: 'Katalog Produk & CMS',
      icon: ShoppingBag,
      badge: null,
    },
    {
      id: 'builder' as ActiveNavTab,
      label: 'Arisera Builder',
      icon: Sparkles,
      badge: 'Editor',
    },
    {
      id: 'templates' as ActiveNavTab,
      label: 'Tema Arisera',
      icon: Palette,
      badge: null,
    },
    {
      id: 'media' as ActiveNavTab,
      label: 'Media Arisera',
      icon: ImageIcon,
      badge: null,
    },
  ];

  const secondaryNavItems = [
    {
      id: 'workspaces' as ActiveNavTab,
      label: 'Ruang Kerja Arisera',
      icon: FolderGit2,
    },
    {
      id: 'integrations' as ActiveNavTab,
      label: 'Integrasi & API',
      icon: Plug,
    },
    {
      id: 'docs' as ActiveNavTab,
      label: 'Dokumen & Arsitektur',
      icon: FileCode2,
    },
    {
      id: 'settings' as ActiveNavTab,
      label: 'Pengaturan',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-[#11111B] text-white flex flex-col shrink-0 border-r border-[#1e1e2d] select-none h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-[#1e1e2d]">
        <AriseraLogo variant="full" theme="dark" size="sm" showSlogan={true} />
      </div>

      {/* Workspace Switcher Selector */}
      <div className="px-3 py-3 border-b border-[#1e1e2d] relative">
        <label className="text-[11px] font-semibold text-[#85859A] tracking-wider uppercase px-2 mb-1.5 block">
          Ruang Kerja Aktif
        </label>
        <button
          type="button"
          onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#181825] hover:bg-[#202030] rounded-lg border border-[#27273a] text-left transition-colors"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-6 h-6 rounded bg-[#6D4AFF] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {activeWorkspace?.name?.charAt(0) || 'R'}
            </div>
            <span className="text-sm font-medium text-slate-100 truncate">
              {activeWorkspace?.name || 'Ruang Kerja'}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#85859A] transition-transform duration-200 shrink-0 ${
              workspaceDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {workspaceDropdownOpen && (
          <div className="absolute left-3 right-3 top-18 bg-[#181825] border border-[#2b2b3f] rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-xs text-[#85859A] border-b border-[#242436] font-medium">
              Pilih Ruang Kerja
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    setWorkspaceDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    ws.id === activeWorkspace.id
                      ? 'bg-[#6D4AFF]/15 text-[#9B7BFF] font-semibold'
                      : 'text-slate-300 hover:bg-[#202032]'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === activeWorkspace.id && (
                    <span className="text-[10px] text-[#9B7BFF] font-medium">Aktif</span>
                  )}
                </button>
              ))}
            </div>
            <div className="pt-1.5 border-t border-[#242436] px-2">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceDropdownOpen(false);
                  onOpenNewWorkspaceModal();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#9B7BFF] hover:bg-[#6D4AFF]/10 rounded font-medium transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Buat Ruang Kerja Baru</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
        <div>
          <div className="text-[10px] font-bold text-[#85859A] tracking-wider uppercase px-2 mb-2">
            Navigasi Utama
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-[#6D4AFF] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#181825]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-[#85859A] group-hover:text-white'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#27273a] text-[#9B7BFF]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Konfigurasi & Sistem */}
        <div>
          <div className="text-[10px] font-bold text-[#85859A] tracking-wider uppercase px-2 mb-2">
            Sistem & Dokumentasi
          </div>
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-[#6D4AFF] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#181825]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-[#85859A] group-hover:text-white'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-[#1e1e2d] bg-[#141420]">
        <div className="p-2.5 rounded-lg bg-[#181825] border border-[#27273a] flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between text-[#85859A]">
            <span className="font-semibold text-slate-300">ARISERA v1.0</span>
            <span className="text-[10px] text-[#9B7BFF]">Tahap 1 Fondasi</span>
          </div>
          <p className="text-[11px] text-[#85859A] leading-relaxed">
            Platform CMS Universal & Visual Builder
          </p>
          <button
            type="button"
            onClick={() => onSelectTab('docs')}
            className="inline-flex items-center gap-1 text-[11px] text-[#9B7BFF] hover:text-white font-medium mt-0.5 transition-colors"
          >
            <span>Buka Arsitektur & Panduan</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
