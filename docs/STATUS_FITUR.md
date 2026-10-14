# STATUS FITUR PLATFORM ARISERA
**Peta Jalan Pengembangan (Roadmap & Feature Status)**

Dokumen ini memetakan perkembangan fitur yang telah diselesaikan pada **Tahap Pertama (Fondasi & Arsitektur)** serta fitur yang direncanakan untuk tahap berikutnya.

---

## 1. Status Fitur Tahap Pertama (Selesai Dilaksanakan)

- [x] **Identitas Merek ARISERA**:
  - Implementasi komponen resmi `AriseraLogo` (Segitiga membulat dengan elemen panah naik ke atas bergradasi ungu, violet, magenta, dan putih).
  - Skema warna terpusat (#6D4AFF, #9B7BFF, #11111B, #F8F8FC, #85859A, #FFFFFF).
  - Tipografi Plus Jakarta Sans dan JetBrains Mono tabular numbers.
  - Antarmuka 100% Bahasa Indonesia baku dan profesional.
- [x] **Arsitektur Multi-Tenant**:
  - Model data untuk 14 tabel PostgreSQL.
  - Skrip migrasi DDL `supabase/migrations/00001_initial_schema.sql`.
  - Kebijakan Row Level Security (RLS) multi-workspace.
- [x] **Dasbor Arisera**:
  - Sidebar modular dengan navigasi ruang kerja, situs web, produk CMS, builder, media, tema, integrasi, dan dokumen.
  - Header profil pengguna, status koneksi Supabase & Google, dan pencarian cepat.
  - Workspace Switcher interaktif untuk berpindah ruang kerja bisnis secara instan.
- [x] **Pengelolaan Website Bisnis**:
  - Dukungan multi-kategori: Kuliner, Fashion, Kosmetik, Elektronik, Jasa, Retail, Portofolio.
  - Dukungan status Draft, Published, dan Archived.
  - Konfigurasi WhatsApp bisnis dan pesan instan.
- [x] **CMS Produk & Kategori**:
  - Pengelolaan katalog produk lengkap (nama, harga, diskon, stok, SKU, gambar, kategori).
  - Filter pencarian dan kategori produk.
  - Simulasi generator tautan WhatsApp Checkout.
- [x] **Arisera Builder (Kerangka Wireframe 3-Panel)**:
  - Panel Kiri: Manajemen halaman, pohon komponen/layer, dan penambahan blok visual.
  - Panel Tengah: Live canvas multi-resolusi (Desktop 1440px, Tablet 768px, Mobile 375px) dengan mode preview interaktif.
  - Panel Kanan: Inspektur properti (teks judul, warna tema, tombol, link WhatsApp).
- [x] **Koleksi Tema Arisera**:
  - Galeri templat spesifik industri (Kuliner Nusantara, Velvet Fashion, Aura Botanica, Apex Gadget, Solusi Prima Jasa).
- [x] **Pusat Media Arisera**:
  - Antarmuka manajemen aset media dengan metadata ukuran file dan sumber (Lokal / Supabase / Google Drive).
- [x] **Pusat Integrasi**:
  - Status koneksi Supabase, Google Sheets API, Google Drive API, dan WhatsApp Gateway.
- [x] **Dokumentasi Terintegrasi**:
  - Viewer dokumentasi langsung di dalam dasbor (Arsitektur, Panduan Instalasi, Rencana Pengujian, Status Fitur).

---

## 2. Status Fitur Tahap Kedua (Tahap 2.1 – 2.4: Selesai Dilaksanakan)

- [x] **Tahap 2.1 — Supabase PostgreSQL Data Layer**:
  - Migrasi skema database terverifikasi (00001, 00002, 00003).
  - Repositori data Supabase terpusat untuk workspaces, websites, products, dan categories.
  - Dukungan fallback mode demo lokal otomatis tanpa crash jika variabel lingkungan belum terkonfigurasi.
- [x] **Tahap 2.2 — Supabase Authentication & Session Lifecycle**:
  - UI registrasi, masuk (email/kata sandi), keluar akun, dan pemulihan kata sandi (`AuthModal` & `AuthGate`).
  - Pemulihan sesi nyata otomatis (`authService.getSession` & `authService.onAuthStateChange`).
  - Perlindungan dasbor dan modul privat (Dasbor, Website, CMS, Builder, Media, Workspaces, Pengaturan).
  - Pembuatan profil pengguna dan workspace perdana otomatis tanpa duplikasi.
  - Keamanan murni client-side (hanya menggunakan anon key, tidak menggunakan service_role key).
- [x] **Tahap 2.3 — Supabase Storage & Media Library**:
  - Penghubungan Media Library ke bucket Supabase Storage `media-assets` (5 MB, JPG/PNG/WebP/SVG/GIF).
  - Sinkronisasi metadata aset ke tabel `public.media_assets`.
  - Fitur unggah dengan progress loader, validasi format & ukuran, salin URL publik, dan penghapusan permanen dari bucket dan tabel database.
- [x] **Tahap 2.4 — Arisera Builder, Snapshot Versi & Publikasi Permanen**:
  - Penyimpanan snapshot konfigurasi visual JSON ke tabel `public.publishing_versions`.
  - Riwayat versi rilis lengkap dan pemulihan versi (*rollback*) langsung dari antarmuka builder.
  - Sinkronisasi status publikasi website (`status: 'published'`, `published_version_id`) konsisten di database dan state global.
  - Penyimpanan draf visual tanpa merusak status rilis.

---

## 3. Rencana Tahap Ketiga & Lanjutan

- [ ] Integrasi drag-and-drop lanjutan untuk nesting blok tingkat dalam (Arisera Builder Tingkat Lanjut).
- [ ] Implementasi langsung OAuth Google Drive Picker client-side.
- [ ] Pengiriman webhook sinkronisasi dua arah Google Sheets.
- [ ] Verifikasi DNS otomatis via Cloudflare API untuk domain kustom.
- [ ] Modul analitik pengunjung per-website (tampilan halaman, klik WhatsApp checkout).
