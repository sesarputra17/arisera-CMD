/**
 * ARISERA Platform - Product & Category Data Service
 * Menangani operasi CRUD tabel `products` dan `categories` pada Supabase PostgreSQL.
 */

import { getSupabase, isSupabaseLive } from './supabase';
import { Product, ProductCategory } from '../types/database';

export interface ProductServiceResult<T> {
  data: T | null;
  error: string | null;
}

export const productService = {
  /**
   * Mengambil daftar produk untuk website tertentu.
   */
  async getProducts(websiteId: string): Promise<ProductServiceResult<Product[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Berjalan dalam mode lokal.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Product[], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat produk dari database.' };
    }
  },

  /**
   * Menambahkan produk baru ke database Supabase.
   */
  async createProduct(
    product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ProductServiceResult<Product>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Operasi database dibatalkan.',
      };
    }

    const slug = product.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          website_id: product.website_id,
          category_id: product.category_id || null,
          name: product.name.trim(),
          slug: slug || `produk-${Date.now()}`,
          sku: product.sku || null,
          description: product.description || '',
          price: product.price,
          sale_price: product.sale_price || null,
          stock_quantity: product.stock_quantity ?? 0,
          is_available: product.is_available ?? true,
          images: product.images || [],
          attributes: product.attributes || {},
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Product, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menyimpan produk baru ke database.' };
    }
  },

  /**
   * Mengubah informasi produk di database.
   */
  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'created_at'>>
  ): Promise<ProductServiceResult<Product>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Operasi database dibatalkan.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('products')
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

      return { data: data as Product, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memperbarui produk di database.' };
    }
  },

  /**
   * Menghapus produk dari database Supabase.
   */
  async deleteProduct(id: string): Promise<ProductServiceResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Operasi database dibatalkan.',
      };
    }

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menghapus produk dari database.' };
    }
  },

  /**
   * Mengambil kategori produk untuk website tertentu.
   */
  async getCategories(websiteId: string): Promise<ProductServiceResult<ProductCategory[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('website_id', websiteId)
        .order('display_order', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as ProductCategory[], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal mengambil kategori produk.' };
    }
  },

  /**
   * Menambahkan kategori baru ke database Supabase.
   */
  async createCategory(
    websiteId: string,
    name: string,
    description?: string
  ): Promise<ProductServiceResult<ProductCategory>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi.',
      };
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          website_id: websiteId,
          name: name.trim(),
          slug: slug || `kategori-${Date.now()}`,
          description: description || null,
          display_order: 1,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as ProductCategory, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal membuat kategori baru.' };
    }
  },
};

export default productService;
