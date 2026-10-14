/**
 * ARISERA Platform - Website Data Service
 * Menangani operasi CRUD tabel `websites` pada Supabase PostgreSQL.
 */

import { getSupabase, isSupabaseLive } from './supabase';
import { Website, PublishStatus, BusinessCategory } from '../types/database';

export interface WebsiteServiceResult<T> {
  data: T | null;
  error: string | null;
}

export const websiteService = {
  /**
   * Mengambil seluruh website yang terhubung dengan workspace tertentu.
   */
  async getWebsites(workspaceId: string): Promise<WebsiteServiceResult<Website[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Berjalan dalam mode lokal.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('websites')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Website[], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat daftar website dari database.' };
    }
  },

  /**
   * Membuat website baru di Supabase.
   */
  async createWebsite(payload: {
    workspace_id: string;
    name: string;
    business_category: BusinessCategory;
    description?: string;
    whatsapp_number?: string;
    whatsapp_message_template?: string;
    theme_settings?: Record<string, any>;
    custom_domain?: string;
  }): Promise<WebsiteServiceResult<Website>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Operasi database dibatalkan.',
      };
    }

    const slug = payload.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const subdomain = `${slug || 'situs'}.arisera.id`;

    try {
      const { data, error } = await supabase
        .from('websites')
        .insert({
          workspace_id: payload.workspace_id,
          name: payload.name.trim(),
          slug: slug || `situs-${Date.now()}`,
          business_category: payload.business_category,
          description: payload.description || `Website bisnis ${payload.business_category} modern.`,
          whatsapp_number: payload.whatsapp_number || '6281234567890',
          whatsapp_message_template:
            payload.whatsapp_message_template ||
            'Halo, saya tertarik dengan produk {product_name} seharga {price}',
          status: 'draft',
          subdomain,
          custom_domain: payload.custom_domain || null,
          theme_settings: payload.theme_settings || {
            primaryColor: '#6D4AFF',
            accentColor: '#9B7BFF',
            backgroundColor: '#FFFFFF',
            textColor: '#11111B',
            fontFamily: 'Plus Jakarta Sans',
            borderRadius: '8px',
          },
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Website, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menyimpan website baru ke database.' };
    }
  },

  /**
   * Mengubah informasi website (nama, deskripsi, nomor WA, tema, custom domain).
   */
  async updateWebsite(
    id: string,
    updates: Partial<Omit<Website, 'id' | 'created_at'>>
  ): Promise<WebsiteServiceResult<Website>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Operasi database dibatalkan.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('websites')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Website, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memperbarui data website di database.' };
    }
  },

  /**
   * Memperbarui status publikasi website (draft | published | archived).
   */
  async updateWebsiteStatus(
    id: string,
    status: PublishStatus
  ): Promise<WebsiteServiceResult<Website>> {
    return this.updateWebsite(id, { status });
  },

  /**
   * Menghapus website secara permanen dari database.
   */
  async deleteWebsite(id: string): Promise<WebsiteServiceResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Operasi database dibatalkan.',
      };
    }

    try {
      const { error } = await supabase.from('websites').delete().eq('id', id);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menghapus website dari database.' };
    }
  },
};

export default websiteService;
