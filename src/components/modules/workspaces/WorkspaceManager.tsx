import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Users,
  Shield,
  Check,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  UserX,
  AlertTriangle,
  Sparkles,
  BarChart3,
  HardDrive,
  Globe,
  FileText,
  Package,
  Layers,
  X,
  Clock,
} from 'lucide-react';
import {
  Workspace,
  UserProfile,
  WorkspaceMember,
  WorkspaceInvite,
  WorkspaceRole,
  PlanTier,
} from '../../../types/database';
import store, { SAAS_PLANS } from '../../../services/store';

interface WorkspaceManagerProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  currentUser: UserProfile;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string) => void;
}

export const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
  workspaces,
  activeWorkspace,
  currentUser,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'workspaces' | 'members' | 'saas' | 'rbac'>('workspaces');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Invite Member Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Data from store
  const members = store.getWorkspaceMembers(activeWorkspace.id);
  const invites = store.getWorkspaceInvites(activeWorkspace.id);
  const myRole = store.getUserRoleInWorkspace(activeWorkspace.id);
  const { plan, tier, usage } = store.getActiveWorkspacePlan();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    onCreateWorkspace(newWorkspaceName.trim());
    setNewWorkspaceName('');
    setIsCreateModalOpen(false);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);

    const res = await store.inviteMemberAsync(inviteEmail.trim(), inviteRole);
    setInviteLoading(false);
    if (res.success) {
      setInviteMessage({ text: res.message, isError: false });
      setInviteEmail('');
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteMessage(null);
      }, 1500);
    } else {
      setInviteMessage({ text: res.message, isError: true });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    const success = await store.updateMemberRoleAsync(memberId, newRole);
    if (!success) {
      alert(store.getState().lastErrorMessage || 'Gagal mengubah peran anggota.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Apakah Anda yakin ingin mencabut akses anggota "${memberName}" dari ruang kerja ini?`)) {
      await store.removeMemberAsync(memberId);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (confirm('Batalkan undangan ini?')) {
      await store.revokeInviteAsync(inviteId);
    }
  };

  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#85859A]">
            <FolderGit2 className="w-3.5 h-3.5 text-[#6D4AFF]" />
            <span>Ruang Kerja & Kolaborasi Tim</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            Pengelolaan Multi-Workspace & Kuota SaaS
          </h1>
          <p className="text-xs text-[#85859A] mt-0.5">
            Pisahkan operasional antar bisnis secara terisolasi dengan kontrol peran (RBAC) dan pemantauan kuota paket.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'members' && isOwnerOrAdmin && (
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Undang Anggota</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Ruang Kerja</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('workspaces')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'workspaces'
              ? 'border-[#6D4AFF] text-[#6D4AFF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>Ruang Kerja Saya ({workspaces.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'members'
              ? 'border-[#6D4AFF] text-[#6D4AFF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Anggota & Kolaborasi ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saas')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'saas'
              ? 'border-[#6D4AFF] text-[#6D4AFF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Status Paket & Kuota SaaS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rbac')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'rbac'
              ? 'border-[#6D4AFF] text-[#6D4AFF]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Matriks Hak Akses (RBAC)</span>
        </button>
      </div>

      {/* TAB 1: WORKSPACES */}
      {activeTab === 'workspaces' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspace.id;
            const wsPlanTier = ws.plan_tier || 'starter';
            const wsPlan = SAAS_PLANS[wsPlanTier];

            return (
              <div
                key={ws.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-[#6D4AFF] ring-1 ring-[#6D4AFF]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#6D4AFF] text-white flex items-center justify-center font-bold text-sm">
                        {ws.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{ws.name}</h3>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded uppercase">
                            {wsPlan.name}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-[#85859A]">
                          slug: {ws.slug}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D4AFF] bg-[#6D4AFF]/10 px-2 py-0.5 rounded">
                        <Check className="w-3 h-3" />
                        <span>Sedang Aktif</span>
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Pemilik Utama:</span>
                      <span className="font-medium text-slate-900">{currentUser.full_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Isolasi RLS Database:</span>
                      <span className="font-medium text-emerald-600">Aktif & Terisolasi</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-[#85859A]">
                    Peran Anda: <strong className="text-slate-800 uppercase">{myRole}</strong>
                  </span>
                  {!isActive ? (
                    <button
                      type="button"
                      onClick={() => onSelectWorkspace(ws.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#6D4AFF] bg-slate-100 hover:bg-[#6D4AFF]/10 rounded-lg transition-colors"
                    >
                      Beralih ke Ruang Kerja Ini
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Ruang Kerja Terpilih</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: MEMBERS & COLLABORATION */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Active Members Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Daftar Anggota Aktif ({members.length})</span>
                </h3>
                <p className="text-xs text-[#85859A]">
                  Anggota yang memiliki hak akses terhadap ruang kerja "{activeWorkspace.name}".
                </p>
              </div>

              <span className="text-xs text-[#85859A]">
                Kuota: <strong className="text-slate-900">{members.length} / {plan.maxMembers} Anggota</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nama & Email</th>
                    <th className="py-2.5 px-3">Peran Saat Ini</th>
                    <th className="py-2.5 px-3">Tanggal Bergabung</th>
                    <th className="py-2.5 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => {
                    const isSelf = m.user_id === currentUser.id;
                    const isOwner = m.role === 'owner';

                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#6D4AFF] text-white flex items-center justify-center font-bold text-xs">
                              {m.user?.full_name?.charAt(0) || m.invited_email?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{m.user?.full_name || m.invited_email}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#85859A]">
                                {m.user?.email || m.invited_email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {isOwnerOrAdmin && !isOwner && !isSelf ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.id, e.target.value as WorkspaceRole)}
                              className="px-2 py-1 border border-slate-300 rounded bg-white text-xs font-semibold text-slate-800"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          ) : (
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${
                                isOwner
                                  ? 'bg-purple-100 text-purple-800'
                                  : m.role === 'admin'
                                  ? 'bg-blue-100 text-blue-800'
                                  : m.role === 'editor'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {m.role}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-[#85859A]">
                          {new Date(m.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {isOwnerOrAdmin && !isOwner && !isSelf ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id, m.user?.full_name || m.invited_email || '')}
                              className="text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                              Cabut Akses
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invites Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Undangan Menunggu Konfirmasi ({invites.length})</span>
                </h3>
                <p className="text-xs text-[#85859A]">
                  Tautan undangan yang telah dikirimkan ke calon anggota tim.
                </p>
              </div>
            </div>

            {invites.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Tidak ada undangan kolaborasi yang sedang aktif menunggu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Email Calon Anggota</th>
                      <th className="py-2.5 px-3">Peran Diajukan</th>
                      <th className="py-2.5 px-3">Token Undangan</th>
                      <th className="py-2.5 px-3">Kedaluwarsa</th>
                      <th className="py-2.5 px-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invites.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.email}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 uppercase">
                            {inv.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#85859A]">
                          {inv.token}
                        </td>
                        <td className="py-2.5 px-3 text-[#85859A]">
                          {new Date(inv.expires_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-slate-500 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50"
                          >
                            Batalkan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SAAS FOUNDATION & QUOTA */}
      {activeTab === 'saas' && (
        <div className="space-y-6">
          {/* Plan Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6D4AFF]" />
                <span className="text-xs text-[#85859A]">Paket Ruang Kerja Saat Ini</span>
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {plan.name}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#6D4AFF]/10 text-[#6D4AFF] uppercase">
                  Tingkat {tier}
                </span>
              </div>
              <p className="text-xs text-[#85859A] max-w-xl">
                Batas penggunaan dihitung dan ditegakkan secara ketat pada level server, database PostgreSQL trigger, dan aplikasi Arisera.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-slate-900">Perlu Penambahan Kuota?</div>
              <p className="text-[11px] text-[#85859A] max-w-xs">
                Hubungi administrator platform untuk meningkatkan paket ke Enterprise tanpa gangguan data.
              </p>
              <button
                type="button"
                onClick={() => alert('Permintaan upgrade paket telah dicatat ke tim dukungan Arisera.')}
                className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg transition-colors"
              >
                Ajukan Peningkatan Paket
              </button>
            </div>
          </div>

          {/* Quota Progress Meters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Websites Quota */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Globe className="w-4 h-4 text-[#6D4AFF]" />
                  <span>Website Aktif</span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {usage.websites} / {plan.maxWebsites}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#6D4AFF] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.websites / plan.maxWebsites) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-[#85859A]">
                Maksimal {plan.maxWebsites} website per ruang kerja pada paket ini.
              </div>
            </div>

            {/* 2. Pages Quota */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Halaman Website</span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {usage.pages} / {plan.maxPagesPerWebsite * plan.maxWebsites}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (usage.pages / (plan.maxPagesPerWebsite * plan.maxWebsites)) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-[11px] text-[#85859A]">
                Maksimal {plan.maxPagesPerWebsite} halaman per satu website.
              </div>
            </div>

            {/* 3. Products Quota */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Katalog Produk</span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {usage.products} / {plan.maxProducts}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.products / plan.maxProducts) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-[#85859A]">
                Kapasitas {plan.maxProducts} produk F&B / Fashion / Retail.
              </div>
            </div>

            {/* 4. Team Members */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Anggota Kolaborasi</span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {usage.members} / {plan.maxMembers}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.members / plan.maxMembers) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-[#85859A]">
                Kolaborasi hingga {plan.maxMembers} pengguna dengan hak akses aman.
              </div>
            </div>

            {/* 5. Storage Quota */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <HardDrive className="w-4 h-4 text-purple-600" />
                  <span>Penyimpanan Media</span>
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {usage.storageMB} MB / {plan.maxStorageMB} MB
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.storageMB / plan.maxStorageMB) * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-[#85859A]">
                Supabase Storage & file teroptimasi web.
              </div>
            </div>

            {/* 6. Feature Access Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Fitur Terintegrasi</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#85859A]">Domain Kustom:</span>
                  <span className={plan.customDomainEnabled ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {plan.customDomainEnabled ? '✓ Aktif' : 'Terkunci'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#85859A]">Google Workspace Sync:</span>
                  <span className={plan.googleSyncEnabled ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {plan.googleSyncEnabled ? '✓ Aktif' : 'Terkunci'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#85859A]">WhatsApp Checkout:</span>
                  <span className="text-emerald-600 font-bold">✓ Aktif</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RBAC PERMISSIONS MATRIX */}
      {activeTab === 'rbac' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#6D4AFF]" />
            <h3 className="text-sm font-bold text-slate-900">
              Matriks Penegakan Hak Akses Peran (RBAC)
            </h3>
          </div>
          <p className="text-xs text-[#85859A]">
            Otorisasi ditegakkan langsung pada level kebijakan Supabase PostgreSQL RLS dan endpoint layanan.
          </p>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[#85859A]">
                <tr>
                  <th className="py-2.5 px-3">Peran (Role)</th>
                  <th className="py-2.5 px-3">Kelola Ruang Kerja</th>
                  <th className="py-2.5 px-3">Undang & Atur Anggota</th>
                  <th className="py-2.5 px-3">Visual Builder</th>
                  <th className="py-2.5 px-3">Katalog Produk</th>
                  <th className="py-2.5 px-3">Publikasi Domain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span>Owner</span>
                  </td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh (Termasuk Admin)</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>Admin</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">Terbatas</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Editor & Viewer</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Editor</span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">Tidak</td>
                  <td className="py-3 px-3 text-slate-400">Tidak</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                  <td className="py-3 px-3 text-emerald-600 font-semibold">Penuh</td>
                  <td className="py-3 px-3 text-amber-600 font-semibold">Draft Saja</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Viewer</span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">Tidak</td>
                  <td className="py-3 px-3 text-slate-400">Tidak</td>
                  <td className="py-3 px-3 text-slate-500">Lihat Saja</td>
                  <td className="py-3 px-3 text-slate-500">Lihat Saja</td>
                  <td className="py-3 px-3 text-slate-400">Tidak</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: BUAT RUANG KERJA BARU */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Buat Ruang Kerja Baru</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Ruang Kerja
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Contoh: Klien Restoran Padang"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white font-semibold"
                >
                  Buat Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UNDANG ANGGOTA BARU */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#6D4AFF]" />
                <span>Undang Anggota ke "{activeWorkspace.name}"</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold ${
                  inviteMessage.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {inviteMessage.text}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Email Calon Anggota
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="rekan@perusahaan.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Peran & Wewenang
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#6D4AFF]"
                >
                  <option value="editor">Editor — Dapat mengedit website, builder, dan katalog produk</option>
                  <option value="admin">Admin — Dapat mengelola website dan mengundang anggota lain</option>
                  <option value="viewer">Viewer — Hanya dapat melihat konten dan pratinjau</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-1.5 rounded-lg bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white font-semibold disabled:opacity-50"
                >
                  {inviteLoading ? 'Mengirim...' : 'Kirim Undangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceManager;
