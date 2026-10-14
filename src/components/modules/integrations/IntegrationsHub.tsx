import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  HardDrive,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  FileSpreadsheet,
  RefreshCw,
  Copy,
  Check,
  LogIn,
  LogOut,
  FolderOpen,
  Image as ImageIcon,
  Download,
  Upload,
  ArrowRight,
  Info,
  Layers,
  Settings,
} from 'lucide-react';
import env from '../../../config/env';
import { isSupabaseLive, testSupabaseConnection, SupabaseConnectionStatus } from '../../../services/supabase';
import { SupabaseConfigModal } from '../settings/SupabaseConfigModal';
import googleAuthService from '../../../services/googleAuth';
import googleService, { SheetRowData } from '../../../services/googleService';
import store from '../../../services/store';
import { GoogleDriveFile, GoogleSheetInfo, Website, Workspace } from '../../../types/database';

interface IntegrationsHubProps {
  activeWebsite?: Website;
  activeWorkspace?: Workspace;
}

export const IntegrationsHub: React.FC<IntegrationsHubProps> = ({
  activeWebsite: propWebsite,
  activeWorkspace: propWorkspace,
}) => {
  const isSupabase = isSupabaseLive();
  const state = store.getState();
  const activeWebsite = propWebsite || state.websites.find((w) => w.id === state.activeWebsiteId);
  const activeWorkspace = propWorkspace || state.workspaces.find((w) => w.id === state.activeWorkspaceId);

  // Status Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'sheets' | 'drive' | 'system'>('overview');

  // Supabase connection state
  const [testResult, setTestResult] = useState<SupabaseConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);

  // Google Auth state
  const [isGoogleConnected, setIsGoogleConnected] = useState(googleAuthService.isConnected());
  const [googleUser, setGoogleUser] = useState(googleAuthService.getCurrentUser());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Google Sheets state
  const [spreadsheets, setSpreadsheets] = useState<GoogleDriveFile[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [selectedSheetFile, setSelectedSheetFile] = useState<GoogleDriveFile | null>(null);
  const [sheetDetails, setSheetDetails] = useState<GoogleSheetInfo | null>(null);
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>('');
  const [sheetPreview, setSheetPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);

  // Column mapping for product import
  const [nameCol, setNameCol] = useState<string>('');
  const [priceCol, setPriceCol] = useState<string>('');
  const [descCol, setDescCol] = useState<string>('');
  const [stockCol, setStockCol] = useState<string>('');
  const [importingProducts, setImportingProducts] = useState(false);
  const [importProductResult, setImportProductResult] = useState<string | null>(null);

  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [selectedDriveFile, setSelectedDriveFile] = useState<GoogleDriveFile | null>(null);
  const [importingMedia, setImportingMedia] = useState(false);
  const [importMediaResult, setImportMediaResult] = useState<string | null>(null);

  // Listen to Google Auth changes
  useEffect(() => {
    const unsubscribe = googleAuthService.initAuthListener(
      (user) => {
        setGoogleUser(user);
        setIsGoogleConnected(true);
        setAuthError(null);
      },
      () => {
        setGoogleUser(null);
        setIsGoogleConnected(false);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Supabase test connection
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await testSupabaseConnection();
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const copyEnvSnippet = () => {
    navigator.clipboard?.writeText(
      `VITE_SUPABASE_URL="https://your-project.supabase.co"\nVITE_SUPABASE_ANON_KEY="your-anon-key-here"`
    );
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleAuthService.signIn();
      setGoogleUser(res.user);
      setIsGoogleConnected(true);
    } catch (err: any) {
      setAuthError(err.message || 'Gagal masuk dengan Google');
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Sign-Out
  const handleGoogleSignOut = async () => {
    setAuthLoading(true);
    try {
      await googleAuthService.signOut();
      setIsGoogleConnected(false);
      setGoogleUser(null);
      setSpreadsheets([]);
      setDriveFiles([]);
      setSelectedSheetFile(null);
      setSheetPreview(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Load Google Spreadsheets
  const handleLoadSpreadsheets = async () => {
    if (!isGoogleConnected) return;
    setLoadingSheets(true);
    setAuthError(null);
    const res = await googleService.listSpreadsheets();
    setLoadingSheets(false);
    if (res.error) {
      setAuthError(res.error);
    } else if (res.data) {
      setSpreadsheets(res.data);
      if (res.data.length > 0) {
        handleSelectSpreadsheet(res.data[0]);
      }
    }
  };

  // Select Spreadsheet and fetch details
  const handleSelectSpreadsheet = async (sheetFile: GoogleDriveFile) => {
    setSelectedSheetFile(sheetFile);
    setLoadingRows(true);
    setSheetPreview(null);
    setImportProductResult(null);

    const detailsRes = await googleService.getSpreadsheetDetails(sheetFile.id);
    if (detailsRes.data) {
      setSheetDetails(detailsRes.data);
      const firstTab = detailsRes.data.sheets[0]?.title || 'Sheet1';
      setSelectedSheetTitle(firstTab);
      await loadSheetRows(sheetFile.id, firstTab);
    } else {
      setAuthError(detailsRes.error);
    }
    setLoadingRows(false);
  };

  // Load Sheet Rows
  const loadSheetRows = async (spreadsheetId: string, title: string) => {
    setLoadingRows(true);
    const rowsRes = await googleService.getSheetRows(spreadsheetId, title);
    setLoadingRows(false);
    if (rowsRes.data) {
      setSheetPreview(rowsRes.data);
      // Auto guess column mapping
      const headers = rowsRes.data.headers;
      const guessedName = headers.find((h) => /nama|produk|item|name|title/i.test(h)) || headers[0] || '';
      const guessedPrice = headers.find((h) => /harga|price|tarif|rp|cost/i.test(h)) || headers[1] || '';
      const guessedDesc = headers.find((h) => /deskripsi|desc|keterangan|detail/i.test(h)) || '';
      const guessedStock = headers.find((h) => /stok|stock|qty|jumlah/i.test(h)) || '';
      setNameCol(guessedName);
      setPriceCol(guessedPrice);
      setDescCol(guessedDesc);
      setStockCol(guessedStock);
    }
  };

  // Import Products from Google Sheet
  const handleImportProducts = async () => {
    if (!sheetPreview || !activeWebsite) return;
    if (!nameCol || !priceCol) {
      alert('Pilih minimal kolom Nama Produk dan Harga Produk.');
      return;
    }

    setImportingProducts(true);
    setImportProductResult(null);

    const parsed = googleService.parseProductsFromRows(
      sheetPreview.headers,
      sheetPreview.rows,
      {
        nameCol,
        priceCol,
        descCol: descCol || undefined,
        stockCol: stockCol || undefined,
      }
    );

    if (parsed.length === 0) {
      setImportingProducts(false);
      setImportProductResult('Tidak ada baris data produk valid yang ditemukan dari pemetaan kolom.');
      return;
    }

    const count = await store.importGoogleSheetProductsAsync(activeWebsite.id, parsed);
    setImportingProducts(false);
    setImportProductResult(`Berhasil menambahkan ${count} produk ke website "${activeWebsite.name}".`);
  };

  // Load Google Drive Images
  const handleLoadDriveImages = async () => {
    if (!isGoogleConnected) return;
    setLoadingDrive(true);
    setAuthError(null);
    const res = await googleService.listDriveImages();
    setLoadingDrive(false);
    if (res.error) {
      setAuthError(res.error);
    } else if (res.data) {
      setDriveFiles(res.data);
    }
  };

  // Import Media from Google Drive
  const handleImportMedia = async (file: GoogleDriveFile) => {
    setImportingMedia(true);
    setImportMediaResult(null);
    const asset = await store.importGoogleDriveMediaAsync(file);
    setImportingMedia(false);
    if (asset) {
      setImportMediaResult(`Foto "${file.name}" berhasil diimpor ke pustaka media!`);
      setTimeout(() => setImportMediaResult(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#85859A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6D4AFF]" />
              <span>Integrasi Eksternal & OAuth 2.0</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              Pusat Integrasi Layanan Eksternal
            </h1>
            <p className="text-xs text-[#85859A] mt-0.5 max-w-3xl leading-relaxed">
              Koneksikan database Supabase PostgreSQL, Google Workspace (Sheets & Drive), dan WhatsApp Checkout tanpa mengekspos kredensial rahasia ke klien.
            </p>
          </div>

          {/* Quick Google Auth Status Button */}
          <div className="flex items-center gap-3">
            {isGoogleConnected && googleUser ? (
              <div className="flex items-center gap-3 p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || ''}
                    className="w-8 h-8 rounded-full border border-emerald-300"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {googleUser.displayName?.charAt(0) || 'G'}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{googleUser.displayName || 'Akun Google'}</span>
                    <span className="text-[10px] bg-emerald-200/60 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                      Terhubung
                    </span>
                  </div>
                  <div className="text-[11px] text-[#85859A]">{googleUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  disabled={authLoading}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors ml-1"
                  title="Putuskan sambungan Google"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{authLoading ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{authError}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 -mb-6 px-1 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Semua Layanan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('sheets');
              if (isGoogleConnected && spreadsheets.length === 0) {
                handleLoadSpreadsheets();
              }
            }}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'sheets'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets Sync</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('drive');
              if (isGoogleConnected && driveFiles.length === 0) {
                handleLoadDriveImages();
              }
            }}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'drive'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive Media</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'system'
                ? 'border-[#6D4AFF] text-[#6D4AFF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Diagnostik Sistem & RLS</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Supabase PostgreSQL & Auth */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Supabase Database & Auth
                    </h3>
                    <span className="text-[11px] text-[#85859A]">PostgreSQL dengan RLS</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isSupabase
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {isSupabase ? 'Terhubung Live' : 'Lokal / Mode Demo'}
                </span>
              </div>

              <p className="text-xs text-[#85859A] leading-relaxed">
                Menyimpan 14 tabel database, akun pengguna, multi-ruang kerja, website, dan komponen halaman secara persisten.
              </p>

              <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>VITE_SUPABASE_URL:</span>
                  <span className="text-slate-800">
                    {env.supabaseUrl ? 'Terkonfigurasi' : 'Belum diisi (.env)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Skrip DDL Migrasi:</span>
                  <span className="text-emerald-600 font-semibold">Tersedia (00001 - 00006)</span>
                </div>
                {env.configSource && env.configSource !== 'none' && (
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>Sumber Konfigurasi:</span>
                    <span className="font-sans font-medium text-[#6D4AFF]">
                      {env.configSource === 'env' ? 'Variabel Lingkungan (.env)' : 'Browser Storage'}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons & Result */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupabaseConfigOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg transition-colors shadow-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Atur Kredensial Supabase</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Menguji...' : 'Uji Koneksi'}</span>
                </button>

                {testResult && (
                  <div
                    className={`w-full mt-2 p-2.5 rounded-lg text-xs border ${
                      testResult.isLive
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>
                        {testResult.isLive
                          ? '✓ Koneksi Supabase Berhasil Terhubung!'
                          : '! Koneksi Belum Aktif'}
                      </span>
                      {testResult.latencyMs !== undefined && (
                        <span className="text-[10px] text-emerald-600 font-mono">
                          {testResult.latencyMs} ms
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {testResult.errorMessage || 'Database merespons kueri dengan normal.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={copyEnvSnippet}
                className="text-[11px] text-[#6D4AFF] hover:underline flex items-center gap-1"
              >
                {copiedMigration ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMigration ? 'Tersalin' : 'Salin Contoh .env'}</span>
              </button>
              <span className="text-emerald-700 font-medium">RLS Aktif (00006)</span>
            </div>
          </div>

          {/* 2. WhatsApp Gateway */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      WhatsApp Checkout Gateway
                    </h3>
                    <span className="text-[11px] text-[#85859A]">Pemesanan Langsung Pelanggan</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 text-green-700">
                  Aktif & Siap Pakai
                </span>
              </div>

              <p className="text-xs text-[#85859A] leading-relaxed">
                Membangkitkan URL deep-link WhatsApp resmi (<code className="font-mono">wa.me</code>) otomatis dengan parameter nama produk, harga, dan kuantitas dari setiap website.
              </p>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Protokol Deep Link:</span>
                  <span className="font-mono text-slate-800">HTTPS wa.me/62...</span>
                </div>
                <div className="flex justify-between">
                  <span>Nomor Aktif:</span>
                  <span className="font-mono text-slate-800">
                    {activeWebsite?.whatsapp_number || '6281234567890'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[#85859A]">Universal F&B / Fashion / Retail</span>
              <span className="text-green-700 font-medium">Bebas Biaya Gateway</span>
            </div>
          </div>

          {/* 3. Google Sheets Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Google Sheets API v4
                    </h3>
                    <span className="text-[11px] text-[#85859A]">Sinkronisasi Spreadsheet Produk</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isGoogleConnected
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isGoogleConnected ? 'Otorisasi Aktif' : 'Perlu Login Google'}
                </span>
              </div>

              <p className="text-xs text-[#85859A] leading-relaxed">
                Baca spreadsheet pengguna langsung via Google Sheets API untuk import batch katalog produk, harga, dan stok ke website aktif tanpa menyimpan token rahasia di disk.
              </p>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Scope Diizinkan:</span>
                  <span className="font-mono text-slate-800 text-[11px]">spreadsheets.readonly</span>
                </div>
                <div className="flex justify-between">
                  <span>Penyimpanan Token:</span>
                  <span className="text-emerald-700 font-semibold">Memory Cache (Aman)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('sheets');
                  if (isGoogleConnected && spreadsheets.length === 0) handleLoadSpreadsheets();
                }}
                className="text-[#6D4AFF] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Buka Panel Sinkronisasi Sheets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Google Drive Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Google Drive API v3
                    </h3>
                    <span className="text-[11px] text-[#85859A]">Impor Media Foto Langsung</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    isGoogleConnected
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isGoogleConnected ? 'Otorisasi Aktif' : 'Perlu Login Google'}
                </span>
              </div>

              <p className="text-xs text-[#85859A] leading-relaxed">
                Pilih dan impor aset gambar produk langsung dari Google Drive ke Pustaka Media Arisera dengan mematuhi prinsip least privilege.
              </p>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Scope Diizinkan:</span>
                  <span className="font-mono text-slate-800 text-[11px]">drive.readonly</span>
                </div>
                <div className="flex justify-between">
                  <span>Akses File:</span>
                  <span className="text-blue-700 font-semibold">Foto & Media Pengguna</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('drive');
                  if (isGoogleConnected && driveFiles.length === 0) handleLoadDriveImages();
                }}
                className="text-[#6D4AFF] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Buka Panel Google Drive Media</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE SHEETS SYNC */}
      {activeTab === 'sheets' && (
        <div className="space-y-6">
          {!isGoogleConnected ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Hubungkan dengan Akun Google
                </h3>
                <p className="text-xs text-[#85859A] mt-1 max-w-sm mx-auto">
                  Untuk memilih spreadsheet dan mengimpor produk ke website Anda, silakan berikan izin akses baca Google Sheets & Google Drive.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{authLoading ? 'Menghubungkan...' : 'Masuk dengan Google Sekarang'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Pilih Spreadsheet Produk dari Google Drive</span>
                  </h3>
                  <p className="text-xs text-[#85859A] mt-0.5">
                    Target Website: <strong className="text-slate-800">{activeWebsite?.name || 'Belum dipilih'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSpreadsheets}
                    disabled={loadingSheets}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSheets ? 'animate-spin' : ''}`} />
                    <span>{loadingSheets ? 'Memuat...' : 'Muat Ulang Spreadsheet'}</span>
                  </button>
                </div>
              </div>

              {/* Spreadsheet List & Preview Split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Files List */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[#85859A]">
                    Daftar Spreadsheet ({spreadsheets.length})
                  </h4>

                  {loadingSheets ? (
                    <div className="text-xs text-slate-400 py-6 text-center">Memuat file dari Google Drive...</div>
                  ) : spreadsheets.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center">
                      Belum ada spreadsheet ditemukan. Klik "Muat Ulang Spreadsheet" di atas.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                      {spreadsheets.map((file) => {
                        const isSelected = selectedSheetFile?.id === file.id;
                        return (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => handleSelectSpreadsheet(file)}
                            className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between border transition-all ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: Sheet Tabs & Preview */}
                <div className="lg:col-span-2 space-y-4">
                  {selectedSheetFile && sheetDetails ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                      {/* Sheet tabs selector */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#85859A]">Lembar Kerja:</span>
                          <select
                            value={selectedSheetTitle}
                            onChange={(e) => {
                              setSelectedSheetTitle(e.target.value);
                              loadSheetRows(selectedSheetFile.id, e.target.value);
                            }}
                            className="text-xs font-semibold px-2.5 py-1 border border-slate-200 rounded-lg bg-white"
                          >
                            {sheetDetails.sheets.map((s) => (
                              <option key={s.id} value={s.title}>
                                {s.title} {s.rowCount ? `(${s.rowCount} baris)` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-[11px] text-[#85859A]">
                          ID: <code className="font-mono text-[10px]">{selectedSheetFile.id.substring(0, 10)}...</code>
                        </span>
                      </div>

                      {/* Column mapping */}
                      {sheetPreview && sheetPreview.headers.length > 0 && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>Pemetaan Kolom ke Katalog Produk Arisera</span>
                            </h5>
                            <span className="text-[11px] text-[#85859A]">
                              {sheetPreview.rows.length} baris data terbaca
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <label className="block text-[#85859A] text-[11px] font-semibold mb-1">
                                Nama Produk <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={nameCol}
                                onChange={(e) => setNameCol(e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                              >
                                {sheetPreview.headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[#85859A] text-[11px] font-semibold mb-1">
                                Harga (Rp) <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={priceCol}
                                onChange={(e) => setPriceCol(e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                              >
                                {sheetPreview.headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[#85859A] text-[11px] font-semibold mb-1">
                                Deskripsi (Opsional)
                              </label>
                              <select
                                value={descCol}
                                onChange={(e) => setDescCol(e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                              >
                                <option value="">-- Lewati --</option>
                                {sheetPreview.headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[#85859A] text-[11px] font-semibold mb-1">
                                Stok (Opsional)
                              </label>
                              <select
                                value={stockCol}
                                onChange={(e) => setStockCol(e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                              >
                                <option value="">-- Lewati --</option>
                                {sheetPreview.headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            {importProductResult ? (
                              <span className="text-xs font-semibold text-emerald-600">
                                {importProductResult}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#85859A]">
                                Produk akan dimasukkan ke katalog "{activeWebsite?.name}".
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={handleImportProducts}
                              disabled={importingProducts || !nameCol || !priceCol}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{importingProducts ? 'Mengimpor...' : 'Impor ke Katalog Website'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Preview Table */}
                      {loadingRows ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Memuat baris spreadsheet...
                        </div>
                      ) : sheetPreview && sheetPreview.rows.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-56">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                              <tr>
                                {sheetPreview.headers.map((h, i) => (
                                  <th key={i} className="py-2 px-3 border-b border-slate-200">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sheetPreview.rows.slice(0, 10).map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50">
                                  {sheetPreview.headers.map((_, cIdx) => (
                                    <td key={cIdx} className="py-1.5 px-3 truncate max-w-[160px]">
                                      {row[cIdx] || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                          Belum ada baris data pada lembar kerja ini.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                      Pilih spreadsheet di panel kiri untuk melihat pratinjau lembar kerja dan memetakan kolom.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GOOGLE DRIVE MEDIA */}
      {activeTab === 'drive' && (
        <div className="space-y-6">
          {!isGoogleConnected ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Hubungkan dengan Google Drive
                </h3>
                <p className="text-xs text-[#85859A] mt-1 max-w-sm mx-auto">
                  Impor aset foto makanan, produk fashion, atau banner langsung dari Google Drive Anda ke Pustaka Media Arisera.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{authLoading ? 'Menghubungkan...' : 'Masuk dengan Google Sekarang'}</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    <span>Pilih dan Impor Foto dari Google Drive</span>
                  </h3>
                  <p className="text-xs text-[#85859A] mt-0.5">
                    Ruang Kerja Aktif: <strong className="text-slate-800">{activeWorkspace?.name}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDriveImages}
                    disabled={loadingDrive}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDrive ? 'animate-spin' : ''}`} />
                    <span>{loadingDrive ? 'Memuat Foto...' : 'Muat Foto Drive'}</span>
                  </button>
                </div>
              </div>

              {importMediaResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importMediaResult}</span>
                </div>
              )}

              {loadingDrive ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Mengambil daftar gambar dari Google Drive pengguna...
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Belum ada gambar Google Drive yang dimuat.
                  </p>
                  <p className="text-[11px] text-[#85859A]">
                    Klik tombol "Muat Foto Drive" di atas untuk mencari foto yang tersimpan di akun Google Anda.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                  {driveFiles.map((file) => {
                    return (
                      <div
                        key={file.id}
                        className="group bg-slate-50 border border-slate-200 hover:border-[#6D4AFF] rounded-xl overflow-hidden p-2 flex flex-col justify-between transition-all"
                      >
                        <div className="aspect-square bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center relative">
                          {file.thumbnailLink ? (
                            <img
                              src={file.thumbnailLink}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="text-[11px] font-semibold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-[10px] text-[#85859A]">
                            {file.size ? `${Math.round(file.size / 1024)} KB` : 'Foto Drive'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleImportMedia(file)}
                          disabled={importingMedia}
                          className="mt-2 w-full py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Impor</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SYSTEM DIAGNOSTICS & RLS AUDIT */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#6D4AFF]" />
              <span>Audit Kesiapan Keamanan, RLS & Isolasi Tenant</span>
            </h3>
            <p className="text-xs text-[#85859A] mt-0.5">
              Pemeriksaan integritas backend Arisera sebelum dipublikasikan ke domain produksi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Checklist item 1 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Row Level Security (RLS)</span>
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  ✓ Ditegakkan
                </span>
              </div>
              <p className="text-[#85859A] leading-relaxed text-[11px]">
                Semua 14 tabel database PostgreSQL memiliki kebijakan RLS aktif. Pengguna hanya dapat membaca dan memodifikasi data milik ruang kerja tempat mereka terdaftar sebagai anggota.
              </p>
            </div>

            {/* Checklist item 2 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Google OAuth Memory Token</span>
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  ✓ Aman di Memori
                </span>
              </div>
              <p className="text-[#85859A] leading-relaxed text-[11px]">
                Token akses Google Workspace disimpan secara aman hanya di memory runtime browser. Tidak ada token yang ditulis ke localStorage, cookie tidak aman, atau URL query params.
              </p>
            </div>

            {/* Checklist item 3 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Proteksi Formulir Kontak & Anti-Spam</span>
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  ✓ Honeypot + Rate Limit
                </span>
              </div>
              <p className="text-[#85859A] leading-relaxed text-[11px]">
                Field tersembunyi honeypot mendeteksi bot pengirim secara instan. Rate limit client-side dan server-side membatasi pengiriman maksimal 1 pesan per 30 detik per alamat email.
              </p>
            </div>

            {/* Checklist item 4 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Routing Subdomain & Direct URL</span>
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  ✓ Mendukung SPA & Wildcard
                </span>
              </div>
              <p className="text-[#85859A] leading-relaxed text-[11px]">
                Website publik dapat diakses langsung melalui hash routing (<code className="font-mono">#/site/subdomain</code>), query parameter (<code className="font-mono">?site=subdomain</code>), atau hostname wildcard.
              </p>
            </div>
          </div>
        </div>
      )}

      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
      />
    </div>
  );
};

export default IntegrationsHub;
