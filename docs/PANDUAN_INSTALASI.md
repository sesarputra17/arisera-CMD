# PANDUAN INSTALASI & KONFIGURASI ARISERA
**Universal CMS & Visual Website Builder**

Panduan ini berisi langkah-langkah pengaturan lingkungan pengembangan dan deployment produksi platform ARISERA.

---

## 1. Kebutuhan Sistem

- **Node.js**: v18.0.0 atau lebih baru (direkomendasikan v20+)
- **NPM** atau **Bun**
- Proyek **Supabase** (dapat menggunakan tier gratis Supabase)

---

## 2. Langkah Instalasi Cepat

### A. Clone & Instalasi Dependensi
```bash
# Masuk ke direktori proyek
cd arisera

# Pasang dependensi
npm install
```

### B. Konfigurasi Variabel Lingkungan (.env)
Salin berkas contoh `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Lengkapi variabel berikut:
```env
# URL & Kunci Anonim Supabase (didapat dari Dasbor Supabase > Project Settings > API)
VITE_SUPABASE_URL="https://proyek-anda.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."

# Domain Platform
VITE_PLATFORM_DOMAIN="arisera.id"
VITE_DEFAULT_WORKSPACE_NAME="Ruang Kerja Utama"

# (Opsional) Integrasi Google
VITE_GOOGLE_CLIENT_ID="123456789-abc.apps.googleusercontent.com"
```

---

## 3. Menjalankan Skrip Database Supabase

1. Buka Dasbor Proyek Supabase Anda.
2. Masuk ke menu **SQL Editor**.
3. Buat Query baru, kemudian salin isi berkas:
   ```
   supabase/migrations/00001_initial_schema.sql
   ```
4. Jalankan script (*Run*). Semua 14 tabel, fungsi pembantu, dan aturan Row Level Security (RLS) akan dibuat secara otomatis.

---

## 4. Menjalankan Server Pengembangan

Jalankan perintah berikut:
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:3000`.

---

## 5. Build untuk Produksi (Vercel / Cloud Run)

```bash
npm run build
```
Folder hasil build terletak di `/dist` dan siap di-deploy ke Vercel, Netlify, atau container hosting lainnya.
