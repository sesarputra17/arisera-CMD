/**
 * ARISERA Platform - Media Storage Data Service
 * Menangani pengunggahan berkas media ke bucket Supabase Storage `media-assets`,
 * pengambilan public URL, penyimpanan metadata ke tabel `media_assets`, dan penghapusan berkas.
 */

import { getSupabase, isSupabaseLive } from './supabase';
import { MediaAsset } from '../types/database';

export interface MediaServiceResult<T> {
  data: T | null;
  error: string | null;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const mediaService = {
  /**
   * Mengambil seluruh aset media untuk ruang kerja tertentu.
   */
  async getMediaAssets(workspaceId: string): Promise<MediaServiceResult<MediaAsset[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Berjalan dalam mode lokal.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as MediaAsset[], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat aset media.' };
    }
  },

  /**
   * Mengunggah berkas gambar ke bucket `media-assets` dan menyimpan metadata ke tabel `media_assets`.
   */
  async uploadMedia(
    workspaceId: string,
    file: File,
    websiteId?: string
  ): Promise<MediaServiceResult<MediaAsset>> {
    // 1. Validasi Tipe File
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        data: null,
        error: `Format file "${file.type || 'tidak dikenal'}" tidak didukung. Harap unggah format JPG, PNG, WebP, atau SVG.`,
      };
    }

    // 2. Validasi Ukuran File (Maksimal 5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        data: null,
        error: `Ukuran file (${fileSizeMB} MB) melebihi batas maksimal 5 MB.`,
      };
    }

    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      // Fallback Mode Demo Lokal
      const localUrl = URL.createObjectURL(file);
      const demoAsset: MediaAsset = {
        id: `med-${Date.now()}`,
        workspace_id: workspaceId,
        website_id: websiteId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        url: localUrl,
        source: 'local_storage',
        created_at: new Date().toISOString(),
      };
      return { data: demoAsset, error: null };
    }

    try {
      // Sanitasi nama file dan buat path unik di bucket
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${workspaceId}/${Date.now()}_${sanitizedName}`;

      // 3. Unggah ke Supabase Storage bucket `media-assets`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        return {
          data: null,
          error: `Gagal mengunggah file ke Storage: ${uploadError.message}. Pastikan bucket "media-assets" telah dibuat di Supabase.`,
        };
      }

      // 4. Ambil Public URL
      const { data: publicUrlData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(uploadData.path);

      const finalUrl = publicUrlData.publicUrl;

      // 5. Simpan metadata ke tabel public.media_assets
      const { data: recordData, error: recordError } = await supabase
        .from('media_assets')
        .insert({
          workspace_id: workspaceId,
          website_id: websiteId || null,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          url: finalUrl,
          source: 'supabase_storage',
          external_id: uploadData.path,
        })
        .select()
        .single();

      if (recordError) {
        // Jika penyimpanan metadata gagal, tetap kembalikan URL yang sudah terunggah
        const fallbackAsset: MediaAsset = {
          id: `med-${Date.now()}`,
          workspace_id: workspaceId,
          website_id: websiteId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          url: finalUrl,
          source: 'supabase_storage',
          external_id: uploadData.path,
          created_at: new Date().toISOString(),
        };
        return { data: fallbackAsset, error: null };
      }

      return { data: recordData as MediaAsset, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Terjadi kesalahan saat memproses media.' };
    }
  },

  /**
   * Menghapus file media dari Supabase Storage dan menghapus metadata di database.
   */
  async deleteMedia(id: string, storagePath?: string): Promise<MediaServiceResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: true, error: null };
    }

    try {
      // 1. Hapus dari bucket storage jika storagePath tersedia
      if (storagePath) {
        await supabase.storage.from('media-assets').remove([storagePath]);
      }

      // 2. Hapus baris dari tabel media_assets
      const { error } = await supabase.from('media_assets').delete().eq('id', id);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menghapus aset media.' };
    }
  },

  /**
   * Menyimpan aset media dari penyedia eksternal (Google Drive / tautan eksternal) ke database
   */
  async createExternalMediaAsset(
    workspaceId: string,
    assetData: {
      file_name: string;
      file_size: number;
      mime_type: string;
      url: string;
      source: 'google_drive' | 'local_storage';
      external_id?: string;
      website_id?: string;
    }
  ): Promise<MediaServiceResult<MediaAsset>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      const demoAsset: MediaAsset = {
        id: `med-ext-${Date.now()}`,
        workspace_id: workspaceId,
        website_id: assetData.website_id,
        file_name: assetData.file_name,
        file_size: assetData.file_size,
        mime_type: assetData.mime_type,
        url: assetData.url,
        source: assetData.source,
        external_id: assetData.external_id,
        created_at: new Date().toISOString(),
      };
      return { data: demoAsset, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('media_assets')
        .insert({
          workspace_id: workspaceId,
          website_id: assetData.website_id || null,
          file_name: assetData.file_name,
          file_size: assetData.file_size,
          mime_type: assetData.mime_type,
          url: assetData.url,
          source: assetData.source,
          external_id: assetData.external_id,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as MediaAsset, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menyimpan aset media eksternal ke Supabase.' };
    }
  },
};

export default mediaService;
