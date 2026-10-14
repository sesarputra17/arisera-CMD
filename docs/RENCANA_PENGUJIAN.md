# RENCANA PENGUJIAN SISTEM ARISERA
**Quality Assurance & Test Strategy**

Dokumen ini mendefinisikan strategi pengujian platform ARISERA untuk menjamin stabilitas fungsional, performa, dan keamanan data multi-tenant.

---

## 1. Tingkatan Pengujian

### A. Unit Testing (Pengujian Logika Terisolasi)
- **Validasi Format Input**: Validasi slug website, nama workspace, nomor telepon WhatsApp (format Indonesia `08...` atau `+62...`), dan struktur JSON tema.
- **WhatsApp Message Generator**: Menguji parsing template variabel `{product_name}`, `{price}`, `{sku}` menjadi query parameter URL WhatsApp yang valid.
- **Component State Reducer**: Menguji aksi reorder komponen, duplikasi komponen, penghapusan komponen, dan update properti pada state visual builder.

### B. Integration Testing (Pengujian Integrasi Layanan)
- **Supabase Multi-Tenant RLS**:
  - Memastikan user dari Ruang Kerja A tidak dapat membaca atau menulis data produk/website milik Ruang Kerja B.
  - Memastikan peran `viewer` tidak dapat melakukan mutasi penghapusan data.
- **Publishing Pipeline**:
  - Menguji snapshotting halaman draft menjadi rilis versi `publishing_versions`.
  - Menguji pemulihan (rollback) ke snapshot versi lama.
- **Sinkronisasi Google Sheets / Drive**:
  - Menguji penanganan kegagalan koneksi jika token expired atau spreadsheet terkunci.

### C. End-to-End & UI Verification
- **Navigasi Dasbor**: Kelancaran beralih antar Ruang Kerja, Situs Web, CMS Produk, Arisera Builder, dan Media.
- **Viewport Responsif**: Pengujian pratinjau canvas pada mode Desktop (1440px), Tablet (768px), dan Seluler (375px).
- **Anti-XSS Validation**: Memastikan input teks bebas dari pengguna di-escape dengan aman pada kanvas rendering.

---

## 2. Matriks Pengujian Fitur Kritis

| ID | Fitur | Kriteria Keberhasilan | Status |
|---|---|---|---|
| TC-01 | Isolasi Ruang Kerja | Data terfilter per-workspace aktif tanpa kebocoran | Terverifikasi |
| TC-02 | Pembuatan Website | Website dibuat dengan tema bawaan dan slug unik | Terverifikasi |
| TC-03 | Katalog CMS Produk | Tambah produk, edit harga, ubah kategori, stok | Terverifikasi |
| TC-04 | Builder Multi-Viewport | Canvas beralih antara Desktop, Tablet, Mobile | Terverifikasi |
| TC-05 | WhatsApp Order Link | Tautan WhatsApp valid dengan nama produk & harga | Terverifikasi |
| TC-06 | Konfigurasi Supabase | Fallback aman dan panduan konfigurasi yang jelas | Terverifikasi |
