import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Database,
  ShieldCheck,
  Settings,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import AriseraLogo from '../../../assets/logo/AriseraLogo';
import store from '../../../services/store';
import { isSupabaseLive } from '../../../services/supabase';
import { getAuthRedirectUrl } from '../../../config/env';
import { SupabaseConfigModal } from '../settings/SupabaseConfigModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (fullName?: string) => void;
  initialMode?: 'signin' | 'signup' | 'forgot';
  initialEmail?: string;
  initialError?: string | null;
  onOpenConfig?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
  initialEmail = '',
  initialError = null,
  onOpenConfig,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [showUrlGuide, setShowUrlGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialEmail) setEmail(initialEmail);
      if (initialError) setErrorMsg(initialError);
    }
  }, [isOpen, initialMode, initialEmail, initialError]);

  if (!isOpen) return null;

  const isLive = isSupabaseLive();
  const currentRedirectUrl = getAuthRedirectUrl();

  const handleCopyRedirectUrl = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentRedirectUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setErrorMsg('Masukkan alamat email untuk mengirim ulang tautan konfirmasi.');
      return;
    }

    setIsResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await store.resendConfirmationEmailAsync(email);
    setIsResending(false);

    if (res.success) {
      setSuccessMsg('Email konfirmasi baru telah dikirim! Silakan periksa kotak masuk atau spam email Anda.');
    } else {
      setErrorMsg(res.error || 'Gagal mengirim ulang email konfirmasi.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim() || !email.trim() || !password) {
          setErrorMsg('Semua kolom formulir pendaftaran wajib diisi.');
          setIsLoading(false);
          return;
        }

        const res = await store.signUpAsync(email, password, fullName);
        if (!res.success) {
          setErrorMsg(res.error || 'Pendaftaran akun gagal.');
        } else if (res.requiresEmailConfirmation) {
          setSuccessMsg(
            'Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan buka kotak masuk atau spam email Anda untuk mengaktifkan akun.'
          );
          setMode('signin');
        } else {
          setSuccessMsg('Pendaftaran berhasil! Akun Anda siap digunakan.');
          setTimeout(() => {
            onSuccess(fullName);
            onClose();
          }, 1000);
        }
      } else if (mode === 'signin') {
        if (!email.trim() || !password) {
          setErrorMsg('Email dan kata sandi wajib diisi.');
          setIsLoading(false);
          return;
        }

        const res = await store.signInAsync(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Email atau kata sandi tidak cocok.');
        } else {
          setSuccessMsg('Berhasil masuk! Memuat data ruang kerja...');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1000);
        }
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setErrorMsg('Harap masukkan alamat email Anda.');
          setIsLoading(false);
          return;
        }

        const res = await store.resetPasswordAsync(email);
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal mengirim email pemulihan.');
        } else {
          setSuccessMsg('Tautan pemulihan kata sandi telah dikirim ke email Anda.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const showResendOption =
    mode === 'signin' &&
    (errorMsg?.toLowerCase().includes('belum dikonfirmasi') ||
      errorMsg?.toLowerCase().includes('otp_expired') ||
      errorMsg?.toLowerCase().includes('kedaluwarsa') ||
      errorMsg?.toLowerCase().includes('expired') ||
      successMsg?.includes('Tautan konfirmasi telah dikirim'));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
          {/* Header Modal */}
          <div className="bg-[#11111B] p-6 text-white text-center relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-3">
              <AriseraLogo variant="symbol" theme="dark" size="lg" />
            </div>

            <h3 className="text-lg font-black tracking-tight">
              {mode === 'signin' && 'Masuk ke Dasbor Arisera'}
              {mode === 'signup' && 'Daftar Akun Baru Arisera'}
              {mode === 'forgot' && 'Pemulihan Kata Sandi'}
            </h3>
            <p className="text-xs text-[#85859A] mt-0.5">
              {mode === 'signin' && 'Kelola seluruh website dan ruang kerja bisnis Anda'}
              {mode === 'signup' && 'Mulai bangun website bisnis profesional tanpa koding'}
              {mode === 'forgot' && 'Masukkan email terdaftar untuk menerima tautan pemulihan'}
            </p>

            {/* Mode Demo / Live Banner */}
            {!isLive ? (
              <div className="mt-3 p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] truncate">
                    Supabase Cloud belum terhubung (Mode Demo).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenConfig) onOpenConfig();
                    else setIsConfigModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
                >
                  Hubungkan
                </button>
              </div>
            ) : (
              <div className="mt-3 py-1 px-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[11px] text-emerald-300 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Terhubung ke Supabase Cloud (RLS Aktif)</span>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
                mode === 'signin'
                  ? 'border-[#6D4AFF] text-[#6D4AFF] bg-white'
                  : 'border-transparent text-[#85859A] hover:text-slate-800'
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
                mode === 'signup'
                  ? 'border-[#6D4AFF] text-[#6D4AFF] bg-white'
                  : 'border-transparent text-[#85859A] hover:text-slate-800'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>

                {showResendOption && (
                  <div className="pt-2 border-t border-red-200/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-red-800">Tautan kedaluwarsa?</span>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isResending}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isResending ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>Kirim Ulang Email</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div className="p-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="leading-relaxed">{successMsg}</span>
                </div>

                {mode === 'signin' && (
                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700">Belum menerima email?</span>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isResending}
                      className="font-semibold text-[#6D4AFF] hover:underline cursor-pointer"
                    >
                      {isResending ? 'Mengirim...' : 'Kirim Ulang'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Sesar Putra"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Kata Sandi</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-[#6D4AFF] hover:underline cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-sm transition-colors disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Masuk ke Akun'}
                    {mode === 'signup' && 'Buat Akun Sekarang'}
                    {mode === 'forgot' && 'Kirim Tautan Pemulihan'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {mode === 'forgot' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Kembali ke Halaman Masuk
                </button>
              </div>
            )}

            {/* Accordion: Petunjuk Konfigurasi URL Supabase Auth */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUrlGuide(!showUrlGuide)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-[#6D4AFF] py-1 cursor-pointer"
              >
                <span>Petunjuk URL Konfirmasi Supabase</span>
                {showUrlGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showUrlGuide && (
                <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px] text-slate-600">
                  <p className="leading-relaxed">
                    Agar tautan email konfirmasi tidak mengarah ke <code className="font-mono bg-red-100 text-red-800 px-1 py-0.2 rounded">localhost:3000</code>, pastikan konfigurasi di Dasbor Supabase telah diperbarui:
                  </p>
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-800 block">
                      1. Site URL (Pengembangan Saat Ini):
                    </span>
                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded border border-slate-200 font-mono text-[10px]">
                      <span className="truncate flex-1 text-slate-700">{currentRedirectUrl}</span>
                      <button
                        type="button"
                        onClick={handleCopyRedirectUrl}
                        className="text-[#6D4AFF] hover:text-[#5835e0] p-1 shrink-0"
                        title="Salin URL"
                      >
                        {copiedUrl ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 pt-1">
                    <span className="font-semibold text-slate-800 block">
                      2. Redirect URLs (Allow list):
                    </span>
                    <div className="bg-white p-1.5 rounded border border-slate-200 font-mono text-[10px] text-slate-700 space-y-0.5">
                      <div>{currentRedirectUrl}/**</div>
                      <div>https://*.vercel.app/**</div>
                      <div>https://arisera.id/**</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#85859A] pt-1">
                    Buka di: <strong>Dasbor Supabase</strong> &rarr; <strong>Authentication</strong> &rarr; <strong>URL Configuration</strong>.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  if (onOpenConfig) onOpenConfig();
                  else setIsConfigModalOpen(true);
                }}
                className="text-[11px] text-slate-500 hover:text-[#6D4AFF] inline-flex items-center gap-1 cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Pengaturan Koneksi Supabase</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </>
  );
};

export default AuthModal;
