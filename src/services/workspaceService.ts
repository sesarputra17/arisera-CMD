/**
 * ARISERA Platform - Workspace Data Service
 * Menangani operasi CRUD tabel `workspaces` pada Supabase PostgreSQL.
 */

import { getSupabase, isSupabaseLive } from './supabase';
import { Workspace } from '../types/database';

export interface WorkspaceServiceResult<T> {
  data: T | null;
  error: string | null;
}

export const workspaceService = {
  /**
   * Mengambil daftar ruang kerja yang dimiliki atau diikuti pengguna.
   */
  async getWorkspaces(): Promise<WorkspaceServiceResult<Workspace[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Berjalan dalam mode lokal.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Workspace[], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat ruang kerja dari database.' };
    }
  },

  /**
   * Membuat ruang kerja baru pada database Supabase.
   */
  async createWorkspace(name: string, ownerId: string): Promise<WorkspaceServiceResult<Workspace>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Operasi database dibatalkan.',
      };
    }

    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'ruang-kerja';
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name: name.trim(),
          slug: uniqueSlug,
          owner_id: ownerId,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Workspace, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal membuat ruang kerja di database.' };
    }
  },

  /**
   * Mengambil satu ruang kerja berdasarkan ID.
   */
  async getWorkspaceById(id: string): Promise<WorkspaceServiceResult<Workspace>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: null, error: 'Supabase belum terkonfigurasi.' };
    }

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Workspace, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal mengambil data ruang kerja.' };
    }
  },
};

export default workspaceService;
