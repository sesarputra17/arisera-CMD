/**
 * ARISERA Platform - Google Workspace Client Authentication
 * Menggunakan Firebase Auth Client SDK untuk Google OAuth dengan mematuhi prinsip least privilege.
 * Token akses disimpan secara aman di memory (bukan di localStorage/sessionStorage).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Inisialisasi Firebase App (idempotent untuk menghindari error multi-instance)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Provider Google dengan scope Workspace
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache token di memori aplikasi
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

export const googleAuthService = {
  /**
   * Listener status otentikasi Google
   */
  initAuthListener(
    onSuccess?: (user: User, token: string) => void,
    onFailure?: () => void
  ) {
    return onAuthStateChanged(auth, async (user) => {
      cachedUser = user;
      if (user && cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    });
  },

  /**
   * Masuk dengan Akun Google melalui Popup
   */
  async signIn(): Promise<{ user: User; accessToken: string }> {
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        throw new Error('Gagal mendapatkan access token dari Google OAuth.');
      }

      cachedAccessToken = credential.accessToken;
      cachedUser = result.user;

      return { user: result.user, accessToken: cachedAccessToken };
    } catch (err: any) {
      console.error('[GoogleAuth] Sign-in error:', err);
      // Tangani popup ditutup oleh pengguna
      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('Jendela otorisasi Google ditutup sebelum selesai.');
      }
      throw new Error(err?.message || 'Gagal menghubungkan akun Google.');
    } finally {
      isSigningIn = false;
    }
  },

  /**
   * Mengambil access token saat ini dari memori
   */
  getAccessToken(): string | null {
    return cachedAccessToken;
  },

  /**
   * Mengambil user Google yang sedang login
   */
  getCurrentUser(): User | null {
    return cachedUser;
  },

  /**
   * Memeriksa apakah token Google aktif
   */
  isConnected(): boolean {
    return Boolean(cachedAccessToken && cachedUser);
  },

  /**
   * Keluar dan bersihkan token dari memori
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } finally {
      cachedAccessToken = null;
      cachedUser = null;
    }
  },
};

export default googleAuthService;
