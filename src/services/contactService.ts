/**
 * ARISERA Platform - Contact Form Submissions Data Service
 * Menangani pengiriman formulir kontak publik, proteksi spam (honeypot & rate-limit),
 * penyimpanan ke database `contact_submissions`, dan pengelolaan pesan masuk untuk workspace member.
 */

import { getSupabase, isSupabaseLive } from './supabase';
import { ContactSubmission } from '../types/database';

export interface ContactServiceResult<T> {
  data: T | null;
  error: string | null;
}

export interface ContactFormData {
  website_id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  honeypot?: string; // Hidden spam bot trap
}

// In-memory cooldown per website untuk pencegahan spam cepat
const submissionTimestamps = new Map<string, number>();

export const contactService = {
  /**
   * Mengirim formulir kontak dari pengunjung website publik.
   */
  async submitContactForm(
    formData: ContactFormData
  ): Promise<ContactServiceResult<{ id: string; message: string }>> {
    // 1. Proteksi Anti-Spam: Cek Honeypot
    // Jika bot mengisi input tersembunyi 'honeypot', tolak secara diam-diam tanpa error untuk bot
    if (formData.honeypot && formData.honeypot.trim().length > 0) {
      console.warn('[ContactService] Honeypot triggered, submission silently discarded.');
      return {
        data: {
          id: `hp-${Date.now()}`,
          message: 'Pesan Anda telah diterima.',
        },
        error: null,
      };
    }

    // 2. Validasi Input Dasar
    const trimmedName = formData.name?.trim();
    const trimmedEmail = formData.email?.trim().toLowerCase();
    const trimmedMessage = formData.message?.trim();

    if (!trimmedName || trimmedName.length < 2) {
      return { data: null, error: 'Harap masukkan nama lengkap yang valid (minimal 2 karakter).' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return { data: null, error: 'Format alamat email tidak valid.' };
    }

    if (!trimmedMessage || trimmedMessage.length < 5) {
      return { data: null, error: 'Pesan terlalu singkat (minimal 5 karakter).' };
    }

    // 3. Client Rate-Limit Cooldown (Cegah pengiriman beruntun dalam 15 detik)
    const rateKey = `${formData.website_id}_${trimmedEmail}`;
    const lastTime = submissionTimestamps.get(rateKey);
    const now = Date.now();
    if (lastTime && now - lastTime < 15000) {
      const waitSeconds = Math.ceil((15000 - (now - lastTime)) / 1000);
      return {
        data: null,
        error: `Harap tunggu ${waitSeconds} detik sebelum mengirim pesan berikutnya.`,
      };
    }
    submissionTimestamps.set(rateKey, now);

    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      // Fallback Mode Demo Lokal
      const mockId = `sub-${Date.now()}`;
      return {
        data: {
          id: mockId,
          message: 'Pesan berhasil terkirim dan disimpan di sistem Arisera.',
        },
        error: null,
      };
    }

    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .insert({
          website_id: formData.website_id,
          name: trimmedName,
          email: trimmedEmail,
          phone: formData.phone?.trim() || null,
          subject: formData.subject?.trim() || 'Pertanyaan Umum',
          message: trimmedMessage,
          status: 'unread',
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            submittedAt: new Date().toISOString(),
          },
        })
        .select('id')
        .single();

      if (error) {
        return { data: null, error: `Gagal mengirim pesan: ${error.message}` };
      }

      return {
        data: {
          id: data.id,
          message: 'Pesan berhasil terkirim dan tersimpan di sistem.',
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal mengirim pesan formulir kontak.' };
    }
  },

  /**
   * Mengambil daftar pesan formulir masuk untuk pemilik website (terotentikasi).
   */
  async getSubmissions(websiteId: string): Promise<ContactServiceResult<ContactSubmission[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: (data as ContactSubmission[]) || [], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat pesan masuk.' };
    }
  },

  /**
   * Memperbarui status pesan (misal ditandai dibaca atau diarsipkan).
   */
  async updateStatus(
    id: string,
    status: ContactSubmission['status']
  ): Promise<ContactServiceResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: true, error: null };
    }

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status })
        .eq('id', id);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memperbarui status pesan.' };
    }
  },

  /**
   * Menghapus pesan masuk formulir.
   */
  async deleteSubmission(id: string): Promise<ContactServiceResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: true, error: null };
    }

    try {
      const { error } = await supabase.from('contact_submissions').delete().eq('id', id);
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menghapus pesan.' };
    }
  },
};

export default contactService;
