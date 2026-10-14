/**
 * ARISERA Platform - Supabase Client & Data Layer
 * Menghubungkan aplikasi ke Supabase PostgreSQL & Auth.
 * Menyediakan deteksi koneksi dinamis, diagnostik granular (format, inisialisasi, jaringan, auth, skema),
 * pengujian latensi nyata, isolasi keamanan token, dan pembaruan konfigurasi di runtime.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import env, {
  getEffectiveSupabaseConfig,
  refreshEnvConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  validateSupabaseCredentials,
  maskUrl,
  maskKey,
} from '../config/env';

export type SupabaseDiagnosticCode =
  | 'EMPTY_CONFIG'
  | 'INVALID_URL_FORMAT'
  | 'INVALID_KEY_FORMAT'
  | 'CLIENT_INIT_FAILED'
  | 'NETWORK_ERROR'
  | 'AUTH_REJECTED'
  | 'SCHEMA_MISSING'
  | 'CONNECTED';

export interface SupabaseConnectionStatus {
  code: SupabaseDiagnosticCode;
  isConfigured: boolean;
  isLive: boolean;
  maskedUrl: string;
  maskedKey: string;
  source: 'env' | 'browser_storage' | 'none';
  latencyMs?: number;
  errorMessage?: string;
  successMessage?: string;
  checkedAt?: string;
}

let supabaseInstance: SupabaseClient | null = null;
let cachedStatus: SupabaseConnectionStatus = {
  code: 'EMPTY_CONFIG',
  isConfigured: false,
  isLive: false,
  maskedUrl: '',
  maskedKey: '',
  source: 'none',
  errorMessage: 'Kredensial Supabase belum terkonfigurasi (Mode Demo Lokal).',
};

/**
 * Inisialisasi Supabase client dengan kredensial aktif
 */
export function initializeClient(): SupabaseConnectionStatus {
  const config = getEffectiveSupabaseConfig();
  refreshEnvConfig();

  if (!config.isConfigured || !config.url || !config.anonKey) {
    supabaseInstance = null;
    cachedStatus = {
      code: 'EMPTY_CONFIG',
      isConfigured: false,
      isLive: false,
      maskedUrl: '',
      maskedKey: '',
      source: 'none',
      errorMessage: 'Kredensial VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diatur.',
    };
    return cachedStatus;
  }

  const validation = validateSupabaseCredentials(config.url, config.anonKey);
  if (!validation.isValid) {
    supabaseInstance = null;
    cachedStatus = {
      code: validation.errorCode || 'INVALID_URL_FORMAT',
      isConfigured: false,
      isLive: false,
      maskedUrl: maskUrl(config.url),
      maskedKey: maskKey(config.anonKey),
      source: config.source,
      errorMessage: validation.error || 'Format kredensial Supabase tidak valid.',
    };
    return cachedStatus;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    // Perhatikan: isLive tetap false sampai uji koneksi ringan (testSupabaseConnection) berhasil dijalankan
    cachedStatus = {
      code: 'CLIENT_INIT_FAILED', // sementara sampai diverifikasi oleh ping
      isConfigured: true,
      isLive: false,
      maskedUrl: maskUrl(config.url),
      maskedKey: maskKey(config.anonKey),
      source: config.source,
      errorMessage: 'Klien Supabase siap diuji.',
    };
    return cachedStatus;
  } catch (error: any) {
    console.warn('[ARISERA] Inisialisasi Supabase client gagal:', error?.message);
    supabaseInstance = null;
    cachedStatus = {
      code: 'CLIENT_INIT_FAILED',
      isConfigured: true,
      isLive: false,
      maskedUrl: maskUrl(config.url),
      maskedKey: maskKey(config.anonKey),
      source: config.source,
      errorMessage: error?.message || 'Gagal inisialisasi client Supabase.',
    };
    return cachedStatus;
  }
}

// Inisialisasi saat bootstrap modul
initializeClient();

export const getSupabase = (): SupabaseClient | null => supabaseInstance;

export const isSupabaseLive = (): boolean => Boolean(supabaseInstance && cachedStatus.isLive);

export const getSupabaseStatus = (): SupabaseConnectionStatus => ({ ...cachedStatus });

/**
 * Menguji kesehatan koneksi nyata dengan melakukan kueri ringan ke Supabase Cloud
 */
async function testClientHealth(
  client: SupabaseClient,
  rawUrl: string,
  rawKey: string,
  source: 'env' | 'browser_storage' | 'none'
): Promise<SupabaseConnectionStatus> {
  const startTime = Date.now();
  const maskedUrl = maskUrl(rawUrl);
  const maskedKey = maskKey(rawKey);

  try {
    // 1. Uji koneksi ringan ke tabel templates (publik membaca berdasarkan RLS)
    const { error: queryError } = await client
      .from('templates')
      .select('id', { count: 'exact', head: true });

    // 2. Uji endpoint Auth sesi
    const { error: authError } = await client.auth.getSession();

    const latencyMs = Date.now() - startTime;

    if (queryError) {
      let code: SupabaseDiagnosticCode = 'NETWORK_ERROR';
      let friendlyError = queryError.message;

      if (queryError.code === '42P01') {
        code = 'SCHEMA_MISSING';
        friendlyError =
          'Tabel database belum ditemukan (42P01). Pastikan berkas migrasi 00001–00006 sudah dijalankan di Supabase Cloud SQL Editor.';
      } else if (
        queryError.code === 'PGRST301' ||
        queryError.message?.toLowerCase().includes('jwt') ||
        queryError.message?.toLowerCase().includes('api key')
      ) {
        code = 'AUTH_REJECTED';
        friendlyError =
          'Kunci anon key ditolak oleh Supabase. Pastikan VITE_SUPABASE_ANON_KEY sesuai dengan Project API Keys di dasbor Supabase.';
      } else if (
        queryError.message?.toLowerCase().includes('failed to fetch') ||
        queryError.message?.toLowerCase().includes('network')
      ) {
        code = 'NETWORK_ERROR';
        friendlyError =
          'Gagal menghubungi server Supabase. Pastikan koneksi internet aktif dan status proyek Supabase tidak dijeda (paused).';
      }

      return {
        code,
        isConfigured: true,
        isLive: false,
        maskedUrl,
        maskedKey,
        source,
        latencyMs,
        errorMessage: friendlyError,
        checkedAt: new Date().toISOString(),
      };
    }

    if (authError && authError.message?.toLowerCase().includes('api key')) {
      return {
        code: 'AUTH_REJECTED',
        isConfigured: true,
        isLive: false,
        maskedUrl,
        maskedKey,
        source,
        latencyMs,
        errorMessage: `Kunci API ditolak oleh Supabase Auth: ${authError.message}`,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      code: 'CONNECTED',
      isConfigured: true,
      isLive: true,
      maskedUrl,
      maskedKey,
      source,
      latencyMs,
      successMessage: `Koneksi Supabase aktif dan responsif (${latencyMs}ms).`,
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      code: 'NETWORK_ERROR',
      isConfigured: true,
      isLive: false,
      maskedUrl,
      maskedKey,
      source,
      latencyMs,
      errorMessage: err?.message || 'Gagal terhubung ke endpoint Supabase.',
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Memeriksa status kesehatan koneksi Supabase nyata saat ini
 */
export async function testSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const config = getEffectiveSupabaseConfig();

  if (!supabaseInstance || !config.isConfigured) {
    cachedStatus = {
      code: 'EMPTY_CONFIG',
      isConfigured: false,
      isLive: false,
      maskedUrl: maskUrl(config.url),
      maskedKey: maskKey(config.anonKey),
      source: config.source,
      errorMessage: 'Kredensial VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diisi.',
      checkedAt: new Date().toISOString(),
    };
    return cachedStatus;
  }

  const result = await testClientHealth(
    supabaseInstance,
    config.url,
    config.anonKey,
    config.source
  );

  cachedStatus = result;
  return cachedStatus;
}

/**
 * Mengonfigurasi dan menguji kredensial Supabase baru secara dinamis di runtime
 */
export async function configureSupabase(
  url: string,
  anonKey: string
): Promise<SupabaseConnectionStatus> {
  const validation = validateSupabaseCredentials(url, anonKey);
  if (!validation.isValid) {
    return {
      code: validation.errorCode || 'INVALID_URL_FORMAT',
      isConfigured: false,
      isLive: false,
      maskedUrl: maskUrl(url),
      maskedKey: maskKey(anonKey),
      source: 'none',
      errorMessage: validation.error,
      checkedAt: new Date().toISOString(),
    };
  }

  const cleanUrl = url.trim().replace(/\/$/, '');
  const cleanKey = anonKey.trim();

  try {
    const testClient = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    const health = await testClientHealth(testClient, cleanUrl, cleanKey, 'browser_storage');

    if (health.isLive) {
      // Simpan ke localStorage jika dan HANYA JIKA uji ringan berhasil
      saveCustomSupabaseConfig(cleanUrl, cleanKey);
      refreshEnvConfig();
      supabaseInstance = testClient;
      cachedStatus = health;
      return cachedStatus;
    } else {
      return health;
    }
  } catch (err: any) {
    return {
      code: 'CLIENT_INIT_FAILED',
      isConfigured: false,
      isLive: false,
      maskedUrl: maskUrl(cleanUrl),
      maskedKey: maskKey(cleanKey),
      source: 'none',
      errorMessage: err?.message || 'Inisialisasi klien pengujian gagal.',
      checkedAt: new Date().toISOString(),
    };
  }
}

/**
 * Memutuskan koneksi kustom dan kembali ke Mode Demo Lokal
 */
export function disconnectSupabase(): void {
  clearCustomSupabaseConfig();
  refreshEnvConfig();
  initializeClient();
  cachedStatus = {
    code: 'EMPTY_CONFIG',
    isConfigured: false,
    isLive: false,
    maskedUrl: '',
    maskedKey: '',
    source: 'none',
    errorMessage: 'Telah beralih ke Mode Demo Lokal.',
  };
}

export default supabaseInstance;
