import React, { useState } from 'react';
import {
  FileText,
  Database,
  Layers,
  CheckCircle,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';

export const DocsViewer: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<'arsitektur' | 'instalasi' | 'pengujian' | 'status' | 'sql'>('arsitektur');
  const [copied, setCopied] = useState(false);

  const copySql = () => {
    // Salin snippet SQL
    navigator.clipboard?.writeText('-- Salin dari supabase/migrations/00001_initial_schema.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#85859A]">
            <FileText className="w-3.5 h-3.5 text-[#6D4AFF]" />
            <span>Dokumentasi Resmi Arisera</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            Arsitektur, Skema Database & Rencana Pengujian
          </h1>
          <p className="text-xs text-[#85859A] mt-0.5">
            Dokumen teknis terperinci yang menjadi acuan fondasi pengembangan platform Universal CMS.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveDoc('arsitektur')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeDoc === 'arsitektur' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Arsitektur Sistem
          </button>
          <button
            type="button"
            onClick={() => setActiveDoc('sql')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeDoc === 'sql' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Skema SQL (14 Tabel)
          </button>
          <button
            type="button"
            onClick={() => setActiveDoc('instalasi')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeDoc === 'instalasi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Panduan Instalasi
          </button>
          <button
            type="button"
            onClick={() => setActiveDoc('pengujian')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeDoc === 'pengujian' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rencana Pengujian
          </button>
          <button
            type="button"
            onClick={() => setActiveDoc('status')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeDoc === 'status' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Status Fitur
          </button>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
        {activeDoc === 'arsitektur' && (
          <div className="space-y-6 text-sm text-slate-800 leading-relaxed max-w-4xl">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-900">1. Prinsip 5 Lapisan Arsitektur Arisera</h2>
              <p className="text-xs text-[#85859A] mt-1">Pemisahan tanggung jawab secara ketat tanpa kompromi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-xs font-bold text-[#6D4AFF] uppercase">A. Presentation Layer</span>
                <p className="text-xs text-slate-700">
                  Antarmuka React SPA, Tailwind CSS, Dasbor Arisera, dan Arisera Builder 3-panel responsif.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-xs font-bold text-[#6D4AFF] uppercase">B. Application Layer</span>
                <p className="text-xs text-slate-700">
                  Layanan bisnis terpusat, validasi data, manajemen state ruang kerja, dan alur pemesanan WhatsApp.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-xs font-bold text-[#6D4AFF] uppercase">C. Security Layer</span>
                <p className="text-xs text-slate-700">
                  Supabase Auth, enkripsi token JWT, isolasi Row Level Security (RLS) multi-tenant, dan proteksi anti-XSS.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="text-xs font-bold text-[#6D4AFF] uppercase">D. Data Access Layer</span>
                <p className="text-xs text-slate-700">
                  Abstraksi akses data Supabase PostgreSQL, media bucket, dan integrasi Google Sheets & Drive API.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <span className="text-xs font-bold text-[#6D4AFF] uppercase">E. Publishing Layer</span>
              <p className="text-xs text-slate-700">
                Pemisahan tegas draf kerja dengan snapshot versi publikasi, pemetaan subdomain platform (<code className="font-mono">slug.arisera.id</code>), dan verifikasi DNS domain kustom.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-bold text-slate-900 mb-2">2. Desain Website Publik vs Dasbor Arisera</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dasbor Arisera dan Website Pengguna merupakan dua sistem desain yang independen. Perubahan palet warna, tipografi, dan gaya di website pengguna tidak akan pernah mengubah tampilan Dasbor platform Arisera.
              </p>
            </div>
          </div>
        )}

        {activeDoc === 'sql' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar Skrip Migrasi Supabase PostgreSQL
                </h2>
                <p className="text-xs text-[#85859A]">
                  Tersedia 2 berkas migrasi: 00001 (14 Tabel Inti) & 00002 (Trigger Auth, RLS Owner, Membership).
                </p>
              </div>
              <div className="text-xs text-slate-600 font-mono">
                Direktori: <span className="font-semibold text-slate-800">/supabase/migrations/</span>
              </div>
            </div>

            <div className="bg-[#11111B] text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed">
              <pre>{`-- =========================================================================
-- BERKAS 1: /supabase/migrations/00001_initial_schema.sql
-- =========================================================================
1.  public.users              (Profil pengguna & relasi auth.users)
2.  public.workspaces         (Multi-workspace tenant)
3.  public.workspace_members (Hak akses tim: owner/admin/editor/viewer)
4.  public.websites          (Situs bisnis dengan tema terisolasi)
5.  public.website_domains    (Verifikasi DNS domain kustom)
6.  public.pages              (Halaman beranda, katalog, kontak)
7.  public.page_versions     (Riwayat draf komponen visual)
8.  public.templates         (Katalog templat resmi industri)
9.  public.categories        (Kategori produk e-commerce)
10. public.products          (Katalog produk & integrasi WhatsApp)
11. public.media_assets      (Pusat media & Google Drive)
12. public.publishing_versions (Snapshot rilis publikasi)
13. public.activity_logs     (Audit trail aktivitas pengguna)

-- =========================================================================
-- BERKAS 2: /supabase/migrations/00002_rls_and_membership_triggers.sql
-- =========================================================================
- Trigger Otomatis: on_auth_user_created -> otomatis menyinkronkan user baru ke public.users
- Trigger Otomatis: on_workspace_created_add_owner -> otomatis mendaftarkan owner ke workspace_members
- RLS Policies: INSERT/UPDATE/DELETE lengkap untuk workspace_members, websites, categories, products
- Validasi kepemilikan workspace pada level PostgreSQL server`}</pre>
            </div>
          </div>
        )}

        {activeDoc === 'instalasi' && (
          <div className="space-y-4 text-xs text-slate-800 leading-relaxed max-w-3xl">
            <h2 className="text-base font-bold text-slate-900">Panduan Instalasi & Eksekusi Cepat</h2>
            <ol className="list-decimal pl-4 space-y-3">
              <li>
                <strong>Persiapan Dependensi:</strong>
                <p className="text-slate-600 mt-0.5">
                  Pastikan Node.js v18+ atau Bun telah terpasang di sistem operasi Anda.
                </p>
              </li>
              <li>
                <strong>Konfigurasi Berkas Variabel (.env):</strong>
                <p className="text-slate-600 mt-0.5">
                  Salin <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env.example</code> menjadi <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env</code> dan masukkan <code className="font-mono">VITE_SUPABASE_URL</code> serta <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
                </p>
              </li>
              <li>
                <strong>Eksekusi Skrip SQL di Supabase:</strong>
                <p className="text-slate-600 mt-0.5">
                  Buka tab SQL Editor di Dasbor Supabase dan jalankan berkas <code className="font-mono">supabase/migrations/00001_initial_schema.sql</code>.
                </p>
              </li>
              <li>
                <strong>Menjalankan Aplikasi:</strong>
                <p className="text-slate-600 mt-0.5 font-mono">npm run dev (Port 3000)</p>
              </li>
            </ol>
          </div>
        )}

        {activeDoc === 'pengujian' && (
          <div className="space-y-4 text-xs max-w-4xl">
            <h2 className="text-base font-bold text-slate-900">Matriks & Rencana Pengujian Sistem</h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[#85859A] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Skenario Uji</th>
                    <th className="py-2.5 px-3">Hasil yang Diharapkan</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold">TC-01</td>
                    <td className="py-2.5 px-3">Isolasi Ruang Kerja Multi-Tenant</td>
                    <td className="py-2.5 px-3 text-slate-600">Hanya website milik workspace aktif yang dimuat</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">Lolos</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold">TC-02</td>
                    <td className="py-2.5 px-3">Pembuatan Website dari Template</td>
                    <td className="py-2.5 px-3 text-slate-600">Komponen bawaan terisi otomatis sesuai industri</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">Lolos</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold">TC-03</td>
                    <td className="py-2.5 px-3">Pemesanan WhatsApp Link Generation</td>
                    <td className="py-2.5 px-3 text-slate-600">Deep link memuat nama produk, harga, dan nomor WA</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">Lolos</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold">TC-04</td>
                    <td className="py-2.5 px-3">Wireframe Multi-Viewport Builder</td>
                    <td className="py-2.5 px-3 text-slate-600">Beralih mulus antara Desktop, Tablet, dan Mobile</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">Lolos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeDoc === 'status' && (
          <div className="space-y-4 text-xs text-slate-800 leading-relaxed max-w-3xl">
            <h2 className="text-base font-bold text-slate-900">Peta Jalan (Roadmap) Fitur</h2>
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                <span className="font-bold text-emerald-900 block">
                  Tahap Pertama (Fondasi & Arsitektur) — Selesai 100%
                </span>
                <p className="text-emerald-800">
                  Logo resmi Arisera, skema database 14 tabel, multi-workspace switcher, manajemen produk CMS, alur pemesanan WhatsApp, kerangka 3-panel Arisera Builder, pusat tema, dokumentasi arsitektur.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-900 block">
                  Tahap Kedua (Interaktivitas Tingkat Lanjut) — Direncanakan
                </span>
                <p className="text-slate-600">
                  Penyusunan blok bertingkat drag-and-drop lanjutan, Google Drive Picker OAuth langsung, integrasi sinkronisasi Google Sheets dua arah, dan analitik pengunjung website.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocsViewer;
