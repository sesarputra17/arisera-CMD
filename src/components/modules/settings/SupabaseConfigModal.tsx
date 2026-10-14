import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Server,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import {
  testSupabaseConnection,
  configureSupabase,
  disconnectSupabase,
  getSupabaseStatus,
  SupabaseConnectionStatus,
  isSupabaseLive,
} from '../../../services/supabase';
import env, { validateSupabaseCredentials } from '../../../config/env';
import store from '../../../services/store';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SupabaseConnectionStatus>(getSupabaseStatus());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getSupabaseStatus();
      setStatus(current);
      setUrl(env.supabaseUrl || '');
      setAnonKey(env.supabaseAnonKey || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const validation = validateSupabaseCredentials(url, anonKey);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Kredensial tidak valid.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await configureSupabase(url, anonKey);
      setStatus(res);

      if (res.isLive) {
        setSuccessMsg(
          `Berhasil terhubung ke Supabase Cloud! Latensi: ${res.latencyMs || '<100'}ms. Menyinkronkan data...`
        );
        await store.reinitializeDatabaseConnection();
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(
          res.errorMessage ||
            'Gagal menghubungi database Supabase. Periksa kembali URL dan Anon Key Anda.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menguji koneksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    disconnectSupabase();
    await store.reinitializeDatabaseConnection();
    const updated = getSupabaseStatus();
    setStatus(updated);
    setUrl('');
    setAnonKey('');
    setSuccessMsg('Telah beralih ke Mode Demo Lokal.');
    setErrorMsg(null);
  };

  const handleTestOnly = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await testSupabaseConnection();
      setStatus(res);
      if (res.isLive) {
        setSuccessMsg(`Koneksi aktif dan responsif! Latensi: ${res.latencyMs || 0} ms`);
      } else {
        setErrorMsg(res.errorMessage || 'Koneksi gagal.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLive = isSupabaseLive();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header Modal */}
        <div className="bg-[#11111B] p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#6D4AFF]/20 border border-[#6D4AFF]/30 flex items-center justify-center text-[#9B7BFF]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Konfigurasi Database Supabase Cloud
              </h3>
              <p className="text-xs text-[#85859A]">
                PostgreSQL, Supabase Auth, dan Row Level Security (RLS)
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300 font-medium">
                Status:{' '}
                <strong className={isLive ? 'text-emerald-400' : 'text-amber-300'}>
                  {isLive ? 'Supabase Cloud Terhubung' : 'Mode Demo Lokal'}
                </strong>
              </span>
            </div>
            {status.source && status.source !== 'none' && (
              <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                Sumber: {status.source === 'env' ? 'Secrets / .env' : 'Browser Storage'}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">Koneksi Belum Berhasil</p>
                <p className="text-[11px] mt-0.5 text-red-600 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold">Berhasil</p>
                <p className="text-[11px] mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Panel Diagnostik Aman */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700 font-semibold border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#6D4AFF]" />
                <span>Diagnostik Sistem</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  status.code === 'CONNECTED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status.code === 'EMPTY_CONFIG'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {status.code}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400 block">Host (Masked):</span>
                <span className="font-mono text-slate-800 truncate block">
                  {status.maskedUrl || '(belum diisi)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Key (Masked):</span>
                <span className="font-mono text-slate-800 truncate block">
                  {status.maskedKey || '(belum diisi)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Latensi Respon:</span>
                <span className="font-medium text-slate-800">
                  {status.latencyMs !== undefined ? `${status.latencyMs} ms` : '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Status Kueri:</span>
                <span className="font-medium text-slate-800">
                  {status.isLive ? 'Aktif (templates OK)' : 'Nonaktif / Demo'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Kredensial */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Project URL (<code className="font-mono text-[#6D4AFF]">VITE_SUPABASE_URL</code>)
              </label>
              <div className="relative">
                <Server className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-[#85859A] mt-1">
                Dapatkan dari Dasbor Supabase &rarr; <em>Project Settings</em> &rarr; <em>API</em> &rarr; <em>Project URL</em>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supabase Anon / Public Key (<code className="font-mono text-[#6D4AFF]">VITE_SUPABASE_ANON_KEY</code>)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-[#85859A] mt-1">
                Gunakan kunci <strong>anon / public</strong>. Jangan pernah gunakan <code className="font-mono text-red-600 font-semibold">service_role</code> di antarmuka web.
              </p>
            </div>

            {/* Peringatan Keamanan & Isolasi */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-[#6D4AFF]" />
                <span>Keamanan Kredensial & Secrets</span>
              </div>
              <p className="leading-relaxed">
                Kredensial disimpan secara aman di peramban Anda (<code className="font-mono">localStorage</code>) atau dibaca dari Secrets Google AI Studio / Vercel. Kunci Anda tidak pernah diekspos ke publik.
              </p>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Uji & Hubungkan Supabase</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestOnly}
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                title="Uji koneksi saat ini tanpa menyimpan ulang kredensial"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span className="sm:hidden">Uji Saja</span>
              </button>
            </div>
          </form>

          {/* Reset ke Demo Mode jika ingin memutuskan */}
          {isLive && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Ingin kembali ke mode simulasi lokal?</span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                Putuskan & Kembali ke Demo
              </button>
            </div>
          )}

          {/* Panduan Migrasi DDL */}
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#6D4AFF]" />
              <span>Status Skema Database ARISERA</span>
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Jika tabel belum dibuat, jalankan berkas migrasi{' '}
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">00001</code> sampai{' '}
              <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">00006</code> di tab{' '}
              <strong>SQL Editor</strong> Supabase Cloud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseConfigModal;
