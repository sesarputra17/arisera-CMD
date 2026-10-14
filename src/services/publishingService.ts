/**
 * ARISERA Platform - Publishing & Versioning Service
 * Menangani pembekuan snapshot halaman, penyimpanan riwayat versi publikasi ke tabel `publishing_versions`,
 * pembaruan status publikasi website, dan pemulihan versi (*rollback*).
 */

import { getSupabase, isSupabaseLive } from './supabase';
import { PublishingVersion, Website } from '../types/database';

export interface PublishingResult<T> {
  data: T | null;
  error: string | null;
}

export const publishingService = {
  /**
   * Mengambil riwayat versi publikasi untuk website tertentu.
   */
  async getVersionHistory(websiteId: string): Promise<PublishingResult<PublishingVersion[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Berjalan dalam mode lokal.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('publishing_versions')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as PublishingVersion[], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat riwayat versi.' };
    }
  },

  /**
   * Menyimpan snapshot konfigurasi visual dan memublikasikan website secara permanen.
   */
  async publishWebsite(
    websiteId: string,
    snapshotData: any,
    versionTag?: string,
    notes?: string
  ): Promise<PublishingResult<{ version: PublishingVersion; website: Website }>> {
    const supabase = getSupabase();
    const tag = versionTag || `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}.${Date.now().toString().slice(-4)}`;

    if (!supabase || !isSupabaseLive()) {
      // Fallback Mode Demo Lokal
      const demoVersion: PublishingVersion = {
        id: `ver-${Date.now()}`,
        website_id: websiteId,
        version_tag: tag,
        notes: notes || 'Publikasi versi visual Arisera Builder',
        published_by: 'usr-arisera-01',
        snapshot_data: snapshotData,
        created_at: new Date().toISOString(),
      };
      return {
        data: {
          version: demoVersion,
          website: { id: websiteId } as Website,
        },
        error: null,
      };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || null;

      // 1. Simpan snapshot versi ke tabel public.publishing_versions
      const { data: versionRow, error: versionError } = await supabase
        .from('publishing_versions')
        .insert({
          website_id: websiteId,
          version_tag: tag,
          notes: notes || 'Rilis publikasi via Arisera Builder',
          published_by: currentUserId,
          snapshot_data: snapshotData,
        })
        .select()
        .single();

      if (versionError) {
        return {
          data: null,
          error: `Gagal menyimpan snapshot versi ke database: ${versionError.message}`,
        };
      }

      // 2. Perbarui status website menjadi 'published' dan tautkan published_version_id
      const { data: updatedWebsite, error: websiteError } = await supabase
        .from('websites')
        .update({
          status: 'published',
          published_version_id: versionRow.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', websiteId)
        .select()
        .single();

      if (websiteError) {
        return {
          data: null,
          error: `Versi tersimpan, namun gagal memperbarui status website: ${websiteError.message}`,
        };
      }

      return {
        data: {
          version: versionRow as PublishingVersion,
          website: updatedWebsite as Website,
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memproses publikasi website.' };
    }
  },

  /**
   * Memulihkan website ke versi rilis sebelumnya (*Rollback*).
   */
  async rollbackToVersion(
    websiteId: string,
    versionId: string
  ): Promise<PublishingResult<PublishingVersion>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: null, error: 'Supabase belum terkonfigurasi untuk rollback.' };
    }

    try {
      // 1. Ambil data snapshot versi yang dituju
      const { data: targetVersion, error: fetchError } = await supabase
        .from('publishing_versions')
        .select('*')
        .eq('id', versionId)
        .eq('website_id', websiteId)
        .single();

      if (fetchError || !targetVersion) {
        return { data: null, error: 'Versi target tidak ditemukan.' };
      }

      // 2. Perbarui published_version_id di tabel websites
      const { error: updateError } = await supabase
        .from('websites')
        .update({
          published_version_id: versionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', websiteId);

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      return { data: targetVersion as PublishingVersion, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memulihkan versi.' };
    }
  },
};

export default publishingService;
