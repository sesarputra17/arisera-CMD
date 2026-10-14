# ARISERA — DOKUMENTASI ARSITEKTUR SISTEM
**Universal CMS & Visual Website Builder**
*Slogan: "Bangun. Ciptakan. Berkembang."*

Dokumen ini menjelaskan arsitektur menyeluruh dari platform **ARISERA**, pembagian layer teknis, model keamanan, alur kerja multi-tenant, dan strategi skalabilitas.

---

## 1. Prinsip Desain & Lapisan Arsitektur

Platform ARISERA dirancang dengan pemisahan tanggung jawab yang ketat (*Separation of Concerns*) menjadi 5 lapisan utama:

```
+-----------------------------------------------------------------+
|                      PRESENTATION LAYER                         |
|   - Dasbor Arisera (React + Tailwind CSS)                       |
|   - Ruang Kerja & Pemilihan Modul                               |
|   - Arisera Builder (Panel Kiri, Canvas Tengah, Panel Kanan)    |
|   - Website Publik Renderer (Subdomain & Domain Kustom)         |
+-----------------------------------------------------------------+
                                |
+-----------------------------------------------------------------+
|                      APPLICATION LAYER                          |
|   - Layanan Bisnis (Workspace, Website, CMS Produk, Kategori)   |
|   - Validasi Payload (Zod / Input Sanitization)                 |
|   - State Management (Workspace Context, Builder State)         |
|   - Publishing Pipeline & Snapshots Versioning                  |
+-----------------------------------------------------------------+
                                |
+-----------------------------------------------------------------+
|                       SECURITY LAYER                            |
|   - Supabase Auth (JWT & Session Token)                         |
|   - PostgreSQL Row Level Security (RLS per-Workspace)           |
|   - Sanitasi Komponen (Anti-XSS, No Arbitrary Script Execution) |
|   - Proteksi Kredensial Server-Side (Google API / Secrets)      |
+-----------------------------------------------------------------+
                                |
+-----------------------------------------------------------------+
|                      DATA ACCESS LAYER                          |
|   - Supabase PostgreSQL Client Repository                       |
|   - Supabase Storage / Media Assets                             |
|   - Google Sheets Connector (Sinkronisasi Data Produk)          |
|   - Google Drive Connector (Penyimpanan Media Eksternal)        |
+-----------------------------------------------------------------+
                                |
+-----------------------------------------------------------------+
|                      PUBLISHING LAYER                           |
|   - Draft Page Versions vs Published Snapshots                  |
|   - Subdomain Dispatcher (slug.arisera.id)                      |
|   - Custom Domain DNS Verification Engine                       |
|   - Instant Rollback System (Pemulihan Versi Sebelumnya)        |
+-----------------------------------------------------------------+
```

---

## 2. Multi-Tenant Workspace & Keamanan RLS

Setiap data di ARISERA diisolasi berdasarkan `workspace_id`.
- Pengguna dapat memiliki banyak **Ruang Kerja** (contoh: Ruang Kerja Bisnis Kuliner, Ruang Kerja Fashion Distro).
- Setiap Ruang Kerja memiliki anggota (`workspace_members`) dengan peran:
  - `owner`: Kuasa penuh terhadap penagihan, penghapusan, dan manajemen anggota.
  - `admin`: Mengelola website, produk, media, dan domain.
  - `editor`: Mengubah tata letak, konten halaman di Arisera Builder, dan mengelola produk.
  - `viewer`: Hanya melihat konfigurasi dan analitik.
- Keamanan tidak mengandalkan penyembunyian tombol di UI, melainkan ditegakkan langsung pada level database menggunakan **Supabase Row Level Security (RLS)** dengan function `is_workspace_member()`.

---

## 3. Arsitektur Arisera Builder (3-Panel Visual Canvas)

Arisera Builder mengusung pendekatan *component-driven declarative schema*, bukan arbitrary HTML injection:
- **Panel Kiri**:
  - Manajemen halaman (Beranda, Menu/Produk, Tentang, Kontak).
  - Susunan hierarki layer komponen visual.
  - Tambah blok baru (Header, Hero, Showcase Produk, WhatsApp CTA, Testimoni, Footer).
- **Panel Tengah (Live Canvas)**:
  - Pratinjau multi-viewport (*Desktop*, *Tablet*, *Mobile*).
  - Seleksi blok interaktif dengan boundary visual.
  - Drag-and-drop ordering dan duplikasi blok.
- **Panel Kanan (Inspector)**:
  - Konfigurasi konten (Teks judul, deskripsi, gambar latar, teks tombol).
  - Konfigurasi gaya (Tipografi, warna aksen, padding/margin, sudut lengkung).
  - Integrasi nomor WhatsApp pemesanan dinamis.

---

## 4. Alur Pemesanan WhatsApp (WhatsApp Checkout Engine)

Khusus untuk website katalog bisnis (kuliner, fashion, kecantikan, barang elektronik):
1. Pengguna menentukan nomor WhatsApp bisnis dan format pesan di Dasbor Website (`0812xxxx`, format pesan: *"Halo {nama_toko}, saya ingin memesan {nama_produk} seharga {harga}"*).
2. Di halaman publik website, pengunjung memilih produk dan kuantitas.
3. Mengklik tombol **"Pesan via WhatsApp"** akan membuka tautan WhatsApp resmi (`https://wa.me/...`) dengan pesan otomatis terisi rapi tanpa memerlukan sistem pembayaran kompleks jika belum dibutuhkan.

---

## 5. Domain Kustom & Routing

- **Subdomain Platform**: Setiap situs otomatis mendapatkan alamat `https://[slug].arisera.id`.
- **Domain Kustom**: Pengguna dapat menambahkan domain sendiri (contoh: `tokoaya.com`).
  - Sistem menghasilkan `verification_token` dan record DNS (CNAME ke `cname.arisera.id` atau A record).
  - Status domain dicek berkala sebelum rilis aktif diizinkan.

---

## 6. Integrasi Eksternal (Google Sheets & Google Drive)

- **Google Sheets API**: Menghubungkan katalog produk dengan spreadsheet Google. Perubahan data di spreadsheet dapat disinkronkan ke tabel `products`.
- **Google Drive API**: Memungkinkan pemilihan gambar media langsung dari folder Google Drive tanpa menguras kuota server utama.
- **Prinsip Keamanan**: Kredensial rahasia (Service Account key, OAuth client secret) disimpan secara aman di backend/server proxy dan tidak pernah dibundel ke client web.
