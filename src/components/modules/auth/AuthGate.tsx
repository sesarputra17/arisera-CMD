import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import AriseraLogo from '../../../assets/logo/AriseraLogo';
import store from '../../../services/store';

interface AuthGateProps {
  onSuccess?: () => void;
  onExploreDemo?: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess, onExploreDemo }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim() || !email.trim() || !password) {
          setErrorMsg('Semua kolom formulir wajib diisi.');
          setIsLoading(false);
          return;
        }

        const res = await store.signUpAsync(email, password, fullName);
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal mendaftar akun baru.');
        } else if (res.requiresEmailConfirmation) {
          setSuccessMsg(
            'Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan verifikasi email Anda sebelum masuk.'
          );
          setMode('signin');
        } else {
          setSuccessMsg('Pendaftaran berhasil! Mengalihkan ke Ruang Kerja Arisera...');
          setTimeout(() => {
            onSuccess?.();
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
          setSuccessMsg('Berhasil masuk! Memuat ruang kerja...');
          setTimeout(() => {
            onSuccess?.();
          }, 1000);
        }
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setErrorMsg('Harap masukkan alamat email terdaftar.');
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

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-[500px]">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#11111B] p-6 text-white text-center relative">
          <div className="flex justify-center mb-3">
            <AriseraLogo variant="symbol" theme="dark" size="lg" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            {mode === 'signin' && 'Masuk ke Dasbor Arisera'}
            {mode === 'signup' && 'Daftar Akun Bisnis Baru'}
            {mode === 'forgot' && 'Pemulihan Kata Sandi'}
          </h2>
          <p className="text-xs text-[#85859A] mt-1">
            {mode === 'signin' && 'Autentikasi aman untuk mengakses ruang kerja, builder, dan CMS.'}
            {mode === 'signup' && 'Bangun dan kelola website bisnis tanpa koding dalam hitungan menit.'}
            {mode === 'forgot' && 'Masukkan alamat email Anda untuk menerima tautan pemulihan kata sandi.'}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] text-slate-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#9B7BFF]" />
            <span>Terlindungi Row Level Security (RLS)</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
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
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              mode === 'signup'
                ? 'border-[#6D4AFF] text-[#6D4AFF] bg-white'
                : 'border-transparent text-[#85859A] hover:text-slate-800'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
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
                    className="text-[11px] text-[#6D4AFF] hover:underline"
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
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-sm transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Masuk ke Dasbor'}
                  {mode === 'signup' && 'Buat Akun Bisnis'}
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
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                ← Kembali ke Halaman Masuk
              </button>
            </div>
          )}
        </form>

        {onExploreDemo && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onExploreDemo}
              className="text-xs text-[#6D4AFF] hover:underline font-medium inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Jelajahi Panduan & Templat Publik</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthGate;
