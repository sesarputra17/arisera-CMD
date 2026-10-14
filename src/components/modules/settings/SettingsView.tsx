import React, { useState } from 'react';
import {
  Settings,
  Globe,
  Shield,
  Database,
  Save,
  Check,
  Plus,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Copy,
  Trash2,
  Server,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Workspace, Website, WebsiteDomain } from '../../../types/database';
import env from '../../../config/env';
import store from '../../../services/store';
import runProductionAudit, { AuditCheckResult } from '../../../services/productionAudit';

interface SettingsViewProps {
  activeWorkspace: Workspace;
  activeWebsite?: Website;
  onUpdateWebsiteWhatsApp?: (phone: string, template: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeWorkspace,
  activeWebsite,
  onUpdateWebsiteWhatsApp,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'domains' | 'routing' | 'production'>('general');

  // WhatsApp form state
  const [waPhone, setWaPhone] = useState(activeWebsite?.whatsapp_number || '6281234567890');
  const [waTemplate, setWaTemplate] = useState(
    activeWebsite?.whatsapp_message_template ||
      'Halo Resto Aroma Nusantara, saya ingin memesan menu {product_name} sejumlah {quantity}.'
  );
  const [saved, setSaved] = useState(false);

  // Domains state
  const websiteDomains = activeWebsite ? store.getWebsiteDomains(activeWebsite.id) : [];
  const [newDomainInput, setNewDomainInput] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainSuccess, setDomainSuccess] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  // Production check state
  const [runningAudit, setRunningAudit] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditCheckResult[]>([]);

  const handleSaveWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateWebsiteWhatsApp) {
      onUpdateWebsiteWhatsApp(waPhone, waTemplate);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWebsite || !newDomainInput.trim()) return;
    setDomainError(null);
    setDomainSuccess(null);

    const res = await store.addDomainAsync(activeWebsite.id, newDomainInput.trim());
    if (res.error) {
      setDomainError(res.error);
    } else {
      setDomainSuccess(`Domain "${res.domain?.domain}" berhasil ditambahkan! Silakan pasang konfigurasi DNS di bawah.`);
      setNewDomainInput('');
      setTimeout(() => setDomainSuccess(null), 4000);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingId(domainId);
    setDomainError(null);
    setDomainSuccess(null);

    const res = await store.verifyDomainAsync(domainId);
    setVerifyingId(null);
    if (res.success) {
      setDomainSuccess(res.message);
      setTimeout(() => setDomainSuccess(null), 4000);
    } else {
      setDomainError(res.message);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    await store.setPrimaryDomainAsync(domainId);
  };

  const handleRemoveDomain = async (domainId: string, domainName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus domain "${domainName}" dari website ini?`)) {
      await store.removeDomainAsync(domainId);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedRecord(label);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const runSystemAudit = async () => {
    setRunningAudit(true);
    try {
      const results = await runProductionAudit();
      setAuditResults(results);
      setAuditComplete(true);
    } finally {
      setRunningAudit(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-[#85859A]">
          <Settings className="w-3.5 h-3.5 text-[#6D4AFF]" />
          <span>Konfigurasi & Pengaturan</span>
        </div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
          Pengaturan Website, Domain & Kesiapan Produksi
        </h1>
        <p className="text-xs text-[#85859A] mt-0.5">
          Kelola WhatsApp checkout gateway, domain kustom dengan verifikasi DNS, routing hosting, dan audit keamanan.
        </p>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 mt-6 -mb-6 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'general'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pemesanan & WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domains')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'domains'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Domain Kustom & DNS ({websiteDomains.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'routing'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Panduan Hosting & Routing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('production')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'production'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audit Kesiapan Produksi</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GENERAL & WHATSAPP */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveWhatsApp} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Konfigurasi WhatsApp Checkout ({activeWebsite?.name || 'Website Terpilih'})</span>
              </h3>
              <p className="text-xs text-[#85859A] mt-0.5">
                Pengunjung website akan langsung terhubung ke nomor WhatsApp ini saat memesan produk.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nomor WhatsApp Bisnis (Gunakan format kode negara, contoh: 6281234567890)
                </label>
                <input
                  type="text"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="6281234567890"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Template Pesan Otomatis Checkout
                </label>
                <textarea
                  value={waTemplate}
                  onChange={(e) => setWaTemplate(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  required
                />
                <p className="text-[11px] text-[#85859A] mt-1">
                  Variabel yang didukung: <code className="font-mono text-[#6D4AFF]">{'{product_name}'}</code>,{' '}
                  <code className="font-mono text-[#6D4AFF]">{'{price}'}</code>,{' '}
                  <code className="font-mono text-[#6D4AFF]">{'{quantity}'}</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {saved ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Pengaturan WhatsApp berhasil disimpan</span>
                </span>
              ) : (
                <span className="text-xs text-[#85859A]">
                  Perubahan berlaku langsung untuk pengunjung website publik.
                </span>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: DOMAIN KUSTOM & DNS */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          {/* Subdomain Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#6D4AFF]" />
                  <span>Subdomain Resmi Platform Arisera</span>
                </h3>
                <p className="text-xs text-[#85859A]">
                  Disediakan gratis secara otomatis dengan sertifikat SSL/TLS bawaan.
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                ✓ Aktif
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-slate-800">
                https://{activeWebsite?.subdomain || `${activeWebsite?.slug}.arisera.id`}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(`https://${activeWebsite?.subdomain || `${activeWebsite?.slug}.arisera.id`}`, 'subdomain')}
                className="text-[#6D4AFF] hover:underline flex items-center gap-1"
              >
                {copiedRecord === 'subdomain' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRecord === 'subdomain' ? 'Tersalin' : 'Salin URL'}</span>
              </button>
            </div>
          </div>

          {/* Add Custom Domain Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Hubungkan Domain Kustom Sendiri</span>
              </h3>
              <p className="text-xs text-[#85859A] mt-0.5">
                Gunakan domain milik Anda (seperti <code className="font-mono">restorananda.com</code>) untuk brand website Anda.
              </p>
            </div>

            {domainError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{domainError}</span>
              </div>
            )}

            {domainSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{domainSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddDomain} className="flex gap-3 text-xs">
              <input
                type="text"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                placeholder="contoh: tokosaya.com atau www.tokosaya.com"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#6D4AFF] font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#6D4AFF] hover:bg-[#5b3ce0] text-white font-semibold rounded-lg shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Domain</span>
              </button>
            </form>
          </div>

          {/* Connected Custom Domains List */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[#85859A]">
              Daftar Domain Kustom Terdaftar ({websiteDomains.length})
            </h4>

            {websiteDomains.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                Belum ada domain kustom yang didaftarkan untuk website ini.
              </div>
            ) : (
              websiteDomains.map((dom) => (
                <div
                  key={dom.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#6D4AFF] flex items-center justify-center font-bold text-xs">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 font-mono">
                            {dom.domain}
                          </span>
                          {dom.is_primary && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-purple-100 text-purple-800">
                              Domain Utama
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                              dom.is_verified
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {dom.is_verified ? '✓ Terverifikasi & SSL Aktif' : 'Menunggu DNS CNAME'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#85859A]">
                          Didaftarkan: {new Date(dom.created_at).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!dom.is_verified && (
                        <button
                          type="button"
                          onClick={() => handleVerifyDomain(dom.id)}
                          disabled={verifyingId === dom.id}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === dom.id ? 'animate-spin' : ''}`} />
                          <span>{verifyingId === dom.id ? 'Memeriksa DNS...' : 'Verifikasi DNS & SSL'}</span>
                        </button>
                      )}

                      {dom.is_verified && !dom.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(dom.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Jadikan Utama
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(dom.id, dom.domain)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* DNS Instructions Box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-[#6D4AFF]" />
                        <span>Instruksi DNS Provider (Cloudflare, Niagahoster, DomaiNesia, dll)</span>
                      </span>
                      <span className="text-[11px] text-[#85859A]">
                        Atur di panel DNS domain manager Anda
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Tipe</th>
                            <th className="py-2 px-3">Nama Host</th>
                            <th className="py-2 px-3">Target Nilai</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3 text-right">Salin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dom.dns_records.map((rec, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-900">{rec.type}</td>
                              <td className="py-2 px-3 text-slate-700">{rec.name}</td>
                              <td className="py-2 px-3 text-[#6D4AFF] truncate max-w-xs">{rec.value}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-sans font-semibold ${
                                    rec.status === 'verified'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {rec.status === 'verified' ? 'Tervalidasi' : 'Menunggu'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(rec.value, `${dom.id}-${rIdx}`)}
                                  className="text-slate-500 hover:text-slate-800 font-sans text-[11px]"
                                >
                                  {copiedRecord === `${dom.id}-${rIdx}` ? 'Tersalin' : 'Salin'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#85859A]">
                      <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>
                        Sertifikat SSL Let's Encrypt akan diterbitkan otomatis secara aman setelah catatan CNAME berhasil diverifikasi oleh resolver DNS Arisera.
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HOSTING & ROUTING GUIDE */}
      {activeTab === 'routing' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-[#6D4AFF]" />
              <span>Arsitektur Routing, Subdomain Wildcard & Deployment Hosting</span>
            </h3>
            <p className="text-[#85859A] mt-0.5">
              Panduan produksi untuk routing URL langsung, single-page application (SPA) rewrite, dan integrasi wildcard DNS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Guide Card 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>1. Resolusi URL Langsung & Hash Routing</span>
              </h4>
              <p className="text-[#85859A] leading-relaxed">
                Aplikasi Arisera mendukung akses langsung pengunjung ke website publik melalui tiga saluran:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 font-mono text-[11px]">
                <li><code className="text-[#6D4AFF]">#/site/aroma-nusantara</code> (Client hash)</li>
                <li><code className="text-[#6D4AFF]">?site=aroma-nusantara</code> (Query param)</li>
                <li><code className="text-[#6D4AFF]">aroma-nusantara.arisera.id</code> (Host header)</li>
              </ul>
              <p className="text-[#85859A] text-[11px]">
                Tidak ada redirect loop atau tabrakan rute privat dashboard.
              </p>
            </div>

            {/* Guide Card 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>2. Konfigurasi Wildcard DNS (*.arisera.id)</span>
              </h4>
              <p className="text-[#85859A] leading-relaxed">
                Membaca <code className="font-mono">window.location.hostname</code> saja di browser tidak cukup tanpa catatan DNS wildcard di penyedia hosting.
              </p>
              <div className="p-2.5 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-800">
                A / CNAME &nbsp;&nbsp; *.arisera.id &nbsp;&nbsp; -&gt; &nbsp;&nbsp; [IP / CNAME Server]
              </div>
              <p className="text-[#85859A] text-[11px]">
                Di Vercel/Cloudflare, tambahkan wildcard domain pada dashboard proyek untuk mengaktifkan routing otomatis.
              </p>
            </div>

            {/* Guide Card 3 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>3. Rewrites SPA & Halaman 404</span>
              </h4>
              <p className="text-[#85859A] leading-relaxed">
                Untuk mencegah error 404 saat pengguna merefresh halaman sub-rute (<code className="font-mono">/menu</code> atau <code className="font-mono">/kontak</code>), server web harus mengarahkan seluruh permintaan ke <code className="font-mono">index.html</code>.
              </p>
              <div className="p-2.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-700">
                // vercel.json rewrite rule:<br />
                {JSON.stringify({ rewrites: [{ source: '/(.*)', destination: '/' }] }, null, 2)}
              </div>
            </div>

            {/* Guide Card 4 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>4. SEO Client-Side Rendering vs Prerender</span>
              </h4>
              <p className="text-[#85859A] leading-relaxed">
                Arisera secara dinamis memperbarui <code className="font-mono">&lt;title&gt;</code>, <code className="font-mono">&lt;meta name="description"&gt;</code>, Open Graph, dan favicon saat runtime browser.
              </p>
              <p className="text-[#85859A] text-[11px]">
                Untuk crawler sosial media yang tidak mengeksekusi JavaScript (WhatsApp/Twitter card preview), disarankan menggunakan Edge Middleware atau prerendering proxy pada domain kustom produksi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCTION READINESS AUDIT */}
      {activeTab === 'production' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#6D4AFF]" />
                <span>Audit Otomatis Kesiapan Produksi (Production Readiness)</span>
              </h3>
              <p className="text-[#85859A] mt-0.5">
                Uji isolasi tenant, penegakan RLS, sanitasi formulir kontak, dan integritas data website.
              </p>
            </div>

            <button
              type="button"
              onClick={runSystemAudit}
              disabled={runningAudit}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-xs transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningAudit ? 'animate-spin' : ''}`} />
              <span>{runningAudit ? 'Memeriksa Keamanan...' : 'Jalankan Audit Produksi'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {auditResults.length > 0 ? (
              auditResults.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                    item.status === 'PASSED'
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : item.status === 'WARNING'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-red-50/60 border-red-200'
                  }`}
                >
                  {item.status === 'PASSED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : item.status === 'WARNING' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                          {item.id}
                        </span>
                        <span>{item.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase self-start ${
                          item.status === 'PASSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 leading-relaxed">
                      {item.description}
                    </div>

                    <div className="p-2.5 bg-white/80 rounded-lg border border-slate-200/80 font-mono text-[11px] text-slate-800 space-y-0.5">
                      <div className="text-[10px] font-sans font-bold text-[#85859A] uppercase tracking-wider">
                        Bukti Pengujian Aktual (Evidence):
                      </div>
                      <div>{item.evidence}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900">
                      Isolasi Multi-Tenant & Kebijakan PostgreSQL RLS
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Semua kueri database difilter melalui <code className="font-mono">workspace_id</code>. Pengguna dari satu workspace tidak dapat mengakses produk, website, atau file milik workspace lain.
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900">
                      Perlindungan Formulir Kontak (Anti-Spam & Rate Limiting)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Honeypot field mendeteksi spam bot tanpa mengganggu pengguna asli. Rate limit 15 detik memblokir serangan pengiriman berulang di klien dan database.
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900">
                      Penyimpanan Kredensial & Google OAuth
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Tidak ada API client secret atau token pengguna yang disimpan di storage lokal browser yang rentan terhadap XSS. Token diisolasi dalam memori runtime aplikasi.
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900">
                      Penegakan Kuota SaaS (Server-Side & Client)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Pembatasan jumlah website, halaman, katalog produk, dan kapasitas storage diuji pada layer aplikasi dan diproteksi oleh trigger PostgreSQL di database dengan row-level lock.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
