/**
 * ARISERA Platform - Supabase Authentication Service
 * Menangani alur Autentikasi Pengguna: Sign In, Sign Up, Sign Out, Reset Password,
 * Resend Email Konfirmasi, Pemrosesan Callback URL (verifikasi email / reset kata sandi),
 * dan Listener Sesi Pengguna.
 *
 * Mengutamakan keamanan:
 * - Tidak mengekspos token autentikasi di log browser
 * - Membersihkan hash/query parameter sensitif dari URL peramban setelah diproses
 * - Tidak menandai status terverifikasi jika belum dikonfirmasi oleh Supabase
 */

import { getSupabase, isSupabaseLive } from './supabase';
import { UserProfile } from '../types/database';
import { Session, User } from '@supabase/supabase-js';
import { getAuthRedirectUrl } from '../config/env';

export interface AuthResult<T> {
  data: T | null;
  error: string | null;
  requiresEmailConfirmation?: boolean;
}

export interface AuthCallbackResult {
  isCallback: boolean;
  type?: 'signup' | 'recovery' | 'magiclink' | 'invite' | 'error';
  status: 'success' | 'error' | 'none';
  errorCode?: string;
  errorMessage?: string;
  suggestedAction?: 'resend_email' | 'check_supabase_config' | 'login' | 'none';
  userEmail?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export { getAuthRedirectUrl };

export const authService = {
  /**
   * Mengambil sesi aktif saat aplikasi dimuat.
   */
  async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) return null;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return null;
      }
      return data.session;
    } catch {
      return null;
    }
  },

  /**
   * Mendaftar akun baru dengan email, kata sandi, dan nama lengkap.
   * Menyertakan emailRedirectTo dinamis yang sesuai dengan origin runtime Google AI Studio / Vercel.
   */
  async signUp(
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResult<{ user: User | null; session: Session | null }>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Silakan hubungkan database Supabase Cloud terlebih dahulu.',
      };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();

    if (!cleanName || cleanName.length < 2) {
      return { data: null, error: 'Nama lengkap minimal terdiri dari 2 karakter.' };
    }

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return { data: null, error: 'Format alamat email tidak valid.' };
    }

    if (!password || password.length < 6) {
      return { data: null, error: 'Kata sandi minimal terdiri dari 6 karakter.' };
    }

    const redirectUrl = getAuthRedirectUrl();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        let friendly = error.message;
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          friendly = 'Alamat email ini sudah terdaftar. Silakan gunakan menu Masuk Akun.';
        } else if (msg.includes('at least 6 characters')) {
          friendly = 'Kata sandi minimal terdiri dari 6 karakter.';
        } else if (msg.includes('rate limit')) {
          friendly = 'Terlalu banyak permintaan pendaftaran. Silakan coba beberapa saat lagi.';
        } else if (msg.includes('database error')) {
          friendly = 'Gagal menyimpan data pengguna. Pastikan migrasi database 00001–00006 sudah dijalankan di Supabase.';
        }
        return { data: null, error: friendly };
      }

      // Deteksi status konfirmasi email:
      // Hanya anggap terverifikasi jika Supabase secara eksplisit mencantumkan timestamp email_confirmed_at
      const isConfirmed = Boolean(data.user?.email_confirmed_at || data.user?.confirmed_at);
      const requiresConfirmation = Boolean(data.user && !isConfirmed && !data.session);

      return {
        data: { user: data.user, session: data.session },
        error: null,
        requiresEmailConfirmation: requiresConfirmation,
      };
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || '';
      let friendly = err?.message || 'Gagal mendaftar akun baru.';
      if (msg.includes('failed to fetch')) {
        friendly = 'Gagal terhubung ke server Supabase. Pastikan koneksi internet aktif dan proyek Supabase tidak dijeda.';
      }
      return { data: null, error: friendly };
    }
  },

  /**
   * Mengirim ulang email konfirmasi pendaftaran
   */
  async resendConfirmationEmail(email: string): Promise<AuthResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Silakan hubungkan database Supabase Cloud terlebih dahulu.',
      };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return { data: null, error: 'Masukkan alamat email yang valid untuk pengiriman ulang konfirmasi.' };
    }

    const redirectUrl = getAuthRedirectUrl();

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        let friendly = error.message;
        const msg = error.message.toLowerCase();
        if (msg.includes('rate limit')) {
          friendly = 'Terlalu banyak permintaan kirim ulang email. Silakan tunggu 1-2 menit sebelum mencoba lagi.';
        } else if (msg.includes('already confirmed')) {
          friendly = 'Email akun ini sudah terkonfirmasi sebelumnya. Silakan langsung masuk.';
        }
        return { data: null, error: friendly };
      }

      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal mengirim ulang email konfirmasi.' };
    }
  },

  /**
   * Masuk dengan email dan kata sandi.
   */
  async signIn(
    email: string,
    password: string
  ): Promise<AuthResult<{ user: User; session: Session }>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Silakan hubungkan database Supabase Cloud terlebih dahulu.',
      };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { data: null, error: 'Alamat email wajib diisi.' };
    }

    if (!password) {
      return { data: null, error: 'Kata sandi wajib diisi.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        let friendly = error.message;
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          friendly = 'Email atau kata sandi tidak cocok. Harap periksa kembali.';
        } else if (msg.includes('email not confirmed')) {
          friendly = 'Alamat email Anda belum dikonfirmasi. Silakan buka kotak masuk atau spam email Anda untuk mengklik tautan konfirmasi pendaftaran dari Supabase.';
        } else if (msg.includes('user not found')) {
          friendly = 'Akun dengan email ini belum terdaftar. Silakan daftar terlebih dahulu.';
        } else if (msg.includes('too many requests') || msg.includes('rate limit')) {
          friendly = 'Terlalu banyak percobaan masuk yang gagal. Silakan tunggu beberapa menit sebelum mencoba lagi.';
        }
        return { data: null, error: friendly };
      }

      if (!data.user || !data.session) {
        return { data: null, error: 'Sesi autentikasi tidak berhasil dibuat.' };
      }

      return {
        data: { user: data.user, session: data.session },
        error: null,
      };
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || '';
      let friendly = err?.message || 'Gagal masuk akun.';
      if (msg.includes('failed to fetch')) {
        friendly = 'Gagal menghubungi endpoint Supabase. Periksa jaringan internet atau status proyek Supabase Anda.';
      }
      return { data: null, error: friendly };
    }
  },

  /**
   * Keluar dari sesi Supabase Auth.
   */
  async signOut(): Promise<AuthResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: true, error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal keluar dari sesi.' };
    }
  },

  /**
   * Mengirim email pemulihan kata sandi.
   */
  async resetPassword(email: string): Promise<AuthResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi untuk pengiriman email pemulihan.',
      };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return { data: null, error: 'Format alamat email tidak valid.' };
    }

    const redirectUrl = getAuthRedirectUrl();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        let friendly = error.message;
        if (error.message.toLowerCase().includes('rate limit')) {
          friendly = 'Terlalu banyak permintaan reset kata sandi. Silakan tunggu sebentar.';
        }
        return { data: null, error: friendly };
      }

      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal mengirim email pemulihan.' };
    }
  },

  /**
   * Memproses URL callback setelah pengguna mengklik tautan email (konfirmasi / pemulihan).
   * Menangani access_token di fragment hash, error code seperti otp_expired, serta penukaran kode PKCE.
   * Membersihkan hash/query dari address bar peramban untuk mencegah kebocoran token.
   */
  async processAuthUrlCallback(): Promise<AuthCallbackResult> {
    if (typeof window === 'undefined') {
      return { isCallback: false, status: 'none' };
    }

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    // Jika tidak ada hash fragment atau query parameter, bukan merupakan callback auth
    if (!hash && !search) {
      return { isCallback: false, status: 'none' };
    }

    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
    const searchParams = new URLSearchParams(search.startsWith('?') ? search.substring(1) : search);

    // 1. Deteksi Error Callback dari Supabase (misal otp_expired, access_denied)
    const errorParam = hashParams.get('error') || searchParams.get('error');
    const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
    const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');

    if (errorParam || errorCode) {
      // Bersihkan hash dari URL browser agar pesan error tidak tersangkut di reload berikutnya
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        // Abaikan
      }

      const rawCode = (errorCode || errorParam || '').toLowerCase();
      let friendlyMessage = 'Verifikasi autentikasi tidak berhasil.';
      let suggestedAction: AuthCallbackResult['suggestedAction'] = 'resend_email';

      if (rawCode.includes('otp_expired') || errorDesc?.toLowerCase().includes('expired')) {
        friendlyMessage =
          'Tautan konfirmasi email sudah kedaluwarsa atau telah digunakan sebelumnya. Silakan masuk jika akun sudah aktif, atau minta tautan konfirmasi baru.';
        suggestedAction = 'resend_email';
      } else if (rawCode.includes('access_denied') || rawCode.includes('unauthorized')) {
        friendlyMessage =
          'Akses pengalihan ditolak oleh Supabase Auth. Pastikan URL pengalihan (Redirect URL) telah didaftarkan di dasbor Supabase -> Authentication -> URL Configuration.';
        suggestedAction = 'check_supabase_config';
      } else {
        friendlyMessage = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Proses verifikasi gagal.';
      }

      return {
        isCallback: true,
        type: 'error',
        status: 'error',
        errorCode: errorCode || errorParam || 'AUTH_ERROR',
        errorMessage: friendlyMessage,
        suggestedAction,
      };
    }

    // 2. Deteksi PKCE flow code di query parameter (?code=...)
    const code = searchParams.get('code');
    if (code) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          // Bersihkan code dari URL
          window.history.replaceState(null, '', window.location.pathname);

          if (exchangeErr) {
            return {
              isCallback: true,
              type: 'signup',
              status: 'error',
              errorCode: 'EXCHANGE_FAILED',
              errorMessage: `Gagal menukarkan kode sesi: ${exchangeErr.message}`,
              suggestedAction: 'resend_email',
            };
          }

          const isConfirmed = Boolean(data.user?.email_confirmed_at || data.user?.confirmed_at);
          if (!isConfirmed) {
            return {
              isCallback: true,
              type: 'signup',
              status: 'error',
              errorCode: 'NOT_CONFIRMED',
              errorMessage: 'Email belum terkonfirmasi oleh Supabase.',
              suggestedAction: 'resend_email',
            };
          }

          return {
            isCallback: true,
            type: 'signup',
            status: 'success',
            userEmail: data.user?.email,
          };
        } catch (err: any) {
          window.history.replaceState(null, '', window.location.pathname);
          return {
            isCallback: true,
            status: 'error',
            errorCode: 'EXCHANGE_EXCEPTION',
            errorMessage: err?.message || 'Terjadi kesalahan saat memproses kode verifikasi.',
            suggestedAction: 'login',
          };
        }
      }
    }

    // 3. Deteksi Implicit Flow Hash Fragment (#access_token=...&type=signup|recovery)
    const accessToken = hashParams.get('access_token');
    const typeParam = hashParams.get('type') as any;

    if (accessToken) {
      // Bersihkan hash dari URL browser secara instan demi keamanan token
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        // Abaikan
      }

      // Berikan waktu kecil bagi Supabase JS client untuk menyimpan sesi via detectSessionInUrl
      const supabase = getSupabase();
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (user) {
          const isConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
          if (typeParam === 'signup' && !isConfirmed) {
            return {
              isCallback: true,
              type: 'signup',
              status: 'error',
              errorCode: 'NOT_CONFIRMED',
              errorMessage: 'Email belum terkonfirmasi di database Supabase.',
              suggestedAction: 'resend_email',
              userEmail: user.email,
            };
          }

          return {
            isCallback: true,
            type: typeParam || 'signup',
            status: 'success',
            userEmail: user.email,
          };
        }
      }
    }

    return { isCallback: false, status: 'none' };
  },

  /**
   * Mengambil data profil pengguna dari tabel `public.users`.
   * Jika baris belum ada karena trigger tertunda, lakukan sinkronisasi mandiri yang aman.
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) return null;

    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        return data as UserProfile;
      }

      // Jika data profil belum ada di public.users, coba upsert berdasarkan sesi auth saat ini
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user && authData.user.id === userId) {
        const u = authData.user;
        const newProfile: Partial<UserProfile> = {
          id: u.id,
          email: u.email || '',
          full_name: (u.user_metadata?.full_name as string) || u.email?.split('@')[0] || 'Pengguna Arisera',
          avatar_url: (u.user_metadata?.avatar_url as string) || '',
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .upsert(newProfile, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (!insertErr && inserted) {
          return inserted as UserProfile;
        }
      }

      return null;
    } catch (err) {
      console.warn('[ARISERA Auth] getUserProfile warning:', err);
      return null;
    }
  },

  /**
   * Memasang listener perubahan status autentikasi.
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { unsubscribe: () => {} };
    }

    try {
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });

      return {
        unsubscribe: () => {
          listener.subscription.unsubscribe();
        },
      };
    } catch {
      return { unsubscribe: () => {} };
    }
  },
};

export default authService;
