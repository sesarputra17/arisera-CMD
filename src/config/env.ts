/**
 * ARISERA Platform - Konfigurasi Environment & Keamanan
 * Mengisolasi variabel lingkungan dan mencegah kebocoran rahasia ke bundle frontend.
 * Mendukung pembacaan dari environment Vite/Vercel (import.meta.env) serta
 * penyimpanan lokal browser (localStorage) yang aman untuk Google AI Studio & deployment web.
 */

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseConfigured: boolean;
  configSource: 'env' | 'browser_storage' | 'none';
  platformDomain: string;
  defaultWorkspaceName: string;
  googleClientId?: string;
  isGoogleConfigured: boolean;
  mode: string;
  appUrl: string;
}

// Polyfill import.meta.env saat dijalankan di luar lingkungan bundler Vite (misal: tsx / node test runner)
try {
  if (typeof import.meta !== 'undefined' && !(import.meta as any).env) {
    (import.meta as any).env = {
      VITE_SUPABASE_URL: typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL || '' : '',
      VITE_SUPABASE_ANON_KEY: typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY || '' : '',
      VITE_SUPABASE_PUBLISHABLE_KEY: typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || '' : '',
      VITE_PLATFORM_DOMAIN: typeof process !== 'undefined' ? process.env?.VITE_PLATFORM_DOMAIN || 'arisera.id' : 'arisera.id',
      VITE_DEFAULT_WORKSPACE_NAME: typeof process !== 'undefined' ? process.env?.VITE_DEFAULT_WORKSPACE_NAME || 'Ruang Kerja Utama' : 'Ruang Kerja Utama',
      VITE_APP_URL: typeof process !== 'undefined' ? process.env?.APP_URL || '' : '',
      MODE: typeof process !== 'undefined' ? process.env?.NODE_ENV || 'development' : 'development',
    };
  }
} catch {
  // Abaikan jika runtime membatasi mutasi import.meta
}

export const STORAGE_KEY_URL = 'arisera_supabase_url';
export const STORAGE_KEY_ANON_KEY = 'arisera_supabase_anon_key';

/**
 * Mendapatkan URL redirect yang valid dan kompatibel dengan Supabase Auth.
 * Memprioritaskan origin browser saat ini (Google AI Studio development runtime / Vercel),
 * variabel lingkungan VITE_APP_URL, dan fallback domain platform.
 */
export function getAuthRedirectUrl(): string {
  // 1. Cek origin browser saat ini jika berjalan di peramban
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.trim().replace(/\/$/, '');
    if (
      origin &&
      origin !== 'null' &&
      (origin.startsWith('https://') || origin.startsWith('http://localhost'))
    ) {
      return origin;
    }
  }

  // 2. Cek variabel lingkungan VITE_APP_URL atau process.env.APP_URL
  const appUrl = (
    import.meta.env.VITE_APP_URL ||
    (typeof process !== 'undefined' ? process.env?.APP_URL : '') ||
    ''
  )
    .trim()
    .replace(/\/$/, '');

  if (appUrl && (appUrl.startsWith('https://') || appUrl.startsWith('http://localhost'))) {
    return appUrl;
  }

  // 3. Fallback domain default platform
  return 'https://arisera.id';
}

/**
 * Masking URL untuk mencegah kebocoran informasi kredensial/token di UI atau logs.
 * Contoh: https://zlpzzozygipynhkuhjez.supabase.co -> https://zlp***jez.supabase.co
 */
export function maskUrl(url: string): string {
  if (!url) return '';
  try {
    const trimmed = url.trim();
    const parsed = new URL(trimmed);
    const hostParts = parsed.hostname.split('.');
    if (hostParts.length >= 3) {
      const proj = hostParts[0];
      const maskedProj =
        proj.length > 6
          ? `${proj.slice(0, 3)}***${proj.slice(-3)}`
          : `${proj.slice(0, 2)}***`;
      return `${parsed.protocol}//${maskedProj}.${hostParts.slice(1).join('.')}`;
    }
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return 'URL tidak valid';
  }
}

/**
 * Masking Key untuk mencegah kebocoran token anon di UI atau logs.
 * Contoh: eyJhbGci... -> eyJh...aXNl (46 karakter)
 */
export function maskKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '********';
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)} (${trimmed.length} karakter)`;
}

/**
 * Validasi sintaksis dan keamanan URL & Key Supabase
 */
export function validateSupabaseCredentials(
  url: string,
  key: string
): { isValid: boolean; error?: string; errorCode?: 'EMPTY_CONFIG' | 'INVALID_URL_FORMAT' | 'INVALID_KEY_FORMAT' } {
  const trimmedUrl = (url || '').trim();
  const trimmedKey = (key || '').trim();

  if (!trimmedUrl || !trimmedKey) {
    return {
      isValid: false,
      error: 'URL dan Kunci Anon Supabase wajib diisi.',
      errorCode: 'EMPTY_CONFIG',
    };
  }

  if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://localhost')) {
    return {
      isValid: false,
      error: 'URL Supabase harus diawali dengan https:// (atau http://localhost untuk lingkungan dev).',
      errorCode: 'INVALID_URL_FORMAT',
    };
  }

  if (trimmedUrl.includes('your-project') || trimmedUrl.includes('example.com')) {
    return {
      isValid: false,
      error: 'URL Supabase masih berupa nilai contoh/placeholder.',
      errorCode: 'INVALID_URL_FORMAT',
    };
  }

  if (trimmedKey.includes('your-anon-key') || trimmedKey.includes('your-key')) {
    return {
      isValid: false,
      error: 'Anon key masih berupa nilai contoh/placeholder.',
      errorCode: 'INVALID_KEY_FORMAT',
    };
  }

  // DETEKSI PERLINDUNGAN KEAMANAN: Jangan izinkan service_role key di frontend!
  if (trimmedKey.toLowerCase().includes('service_role')) {
    return {
      isValid: false,
      error: 'BAHAYA KEAMANAN: Jangan gunakan service_role key di aplikasi peramban! Gunakan hanya anon/public key.',
      errorCode: 'INVALID_KEY_FORMAT',
    };
  }

  // Jika berupa JWT base64, periksa payload role tanpa kriptografi untuk mendeteksi service_role
  try {
    const parts = trimmedKey.split('.');
    if (parts.length === 3) {
      const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadStr);
      if (payload.role === 'service_role') {
        return {
          isValid: false,
          error: 'BAHAYA KEAMANAN: Kunci ini memiliki hak service_role (Admin Super). Harap ganti dengan kunci anon (publik)!',
          errorCode: 'INVALID_KEY_FORMAT',
        };
      }
    }
  } catch {
    // Key bukan JWT base64 (misal token publishable baru Supabase sb_publishable_...)
  }

  return { isValid: true };
}

/**
 * Mengambil konfigurasi Supabase yang efektif
 */
export function getEffectiveSupabaseConfig(): {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'browser_storage' | 'none';
} {
  // 1. Cek dari Browser LocalStorage (input aman langsung dari pengguna)
  let storedUrl = '';
  let storedKey = '';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      storedUrl = window.localStorage.getItem(STORAGE_KEY_URL) || '';
      storedKey = window.localStorage.getItem(STORAGE_KEY_ANON_KEY) || '';
    } catch {
      // Abaikan jika localStorage diblokir peramban
    }
  }

  if (storedUrl && storedKey) {
    const validation = validateSupabaseCredentials(storedUrl, storedKey);
    if (validation.isValid) {
      return {
        url: storedUrl.trim().replace(/\/$/, ''),
        anonKey: storedKey.trim(),
        isConfigured: true,
        source: 'browser_storage',
      };
    }
  }

  // 2. Cek dari Environment Variable (Vite / Vercel / CI / Google AI Studio Secrets)
  const envUrl = (
    import.meta.env.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') ||
    ''
  ) as string;

  const envKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof process !== 'undefined'
      ? process.env?.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY
      : '') ||
    ''
  ) as string;

  if (envUrl && envKey) {
    const validation = validateSupabaseCredentials(envUrl, envKey);
    if (validation.isValid) {
      return {
        url: envUrl.trim().replace(/\/$/, ''),
        anonKey: envKey.trim(),
        isConfigured: true,
        source: 'env',
      };
    }
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

/**
 * Menyimpan kredensial Supabase pengguna ke penyimpanan lokal browser yang aman
 */
export function saveCustomSupabaseConfig(
  url: string,
  anonKey: string
): { success: boolean; error?: string } {
  const validation = validateSupabaseCredentials(url, anonKey);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return { success: false, error: 'Penyimpanan lokal peramban tidak tersedia.' };
  }

  try {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanKey = anonKey.trim();
    window.localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    window.localStorage.setItem(STORAGE_KEY_ANON_KEY, cleanKey);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menyimpan ke penyimpanan peramban.' };
  }
}

/**
 * Menghapus konfigurasi kustom Supabase dari peramban dan mengembalikan ke mode default
 */
export function clearCustomSupabaseConfig(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY_URL);
      window.localStorage.removeItem(STORAGE_KEY_ANON_KEY);
    } catch {
      // Abaikan
    }
  }
}

// Inisialisasi konfigurasi saat modul dimuat
const initialEffective = getEffectiveSupabaseConfig();

export const env: EnvConfig = {
  supabaseUrl: initialEffective.url,
  supabaseAnonKey: initialEffective.anonKey,
  isSupabaseConfigured: initialEffective.isConfigured,
  configSource: initialEffective.source,
  platformDomain:
    (import.meta.env.VITE_PLATFORM_DOMAIN as string) ||
    (typeof process !== 'undefined' ? (process.env?.VITE_PLATFORM_DOMAIN as string) : '') ||
    'arisera.id',
  defaultWorkspaceName:
    (import.meta.env.VITE_DEFAULT_WORKSPACE_NAME as string) ||
    (typeof process !== 'undefined' ? (process.env?.VITE_DEFAULT_WORKSPACE_NAME as string) : '') ||
    'Ruang Kerja Utama',
  googleClientId:
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
    (typeof process !== 'undefined' ? (process.env?.VITE_GOOGLE_CLIENT_ID as string) : '') ||
    '',
  isGoogleConfigured: Boolean(
    ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      (typeof process !== 'undefined' ? (process.env?.VITE_GOOGLE_CLIENT_ID as string) : '') ||
      '') &&
      !String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').includes('your-google-client-id')
  ),
  mode: import.meta.env.MODE || (typeof process !== 'undefined' ? process.env?.NODE_ENV : '') || 'development',
  appUrl: getAuthRedirectUrl(),
};

/**
 * Memperbarui objek konfigurasi env saat kredensial diubah di runtime
 */
export function refreshEnvConfig(): EnvConfig {
  const effective = getEffectiveSupabaseConfig();
  env.supabaseUrl = effective.url;
  env.supabaseAnonKey = effective.anonKey;
  env.isSupabaseConfigured = effective.isConfigured;
  env.configSource = effective.source;
  env.appUrl = getAuthRedirectUrl();
  return env;
}

export default env;
