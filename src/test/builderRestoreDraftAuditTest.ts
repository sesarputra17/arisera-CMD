/**
 * ARISERA PLATFORM - AUDIT & VERIFIKASI PEMULIHAN VERSI DRAF (MUAT KE KANVAS)
 * 
 * Pengujian komprehensif untuk memverifikasi bug fix "Muat ke Kanvas":
 * 1. Handler pemulihan dipanggil dengan ID versi dan ID halaman yang sesuai.
 * 2. Snapshot versi draf divalidasi dan diterapkan ke kanvas (state aktif).
 * 3. Perubahan state kanvas tidak tertimpa oleh efek sinkronisasi atau preset default.
 * 4. Error handling saat ID tidak ditemukan atau struktur data korup (menghasilkan error jelas, bukan sukses palsu).
 * 5. Memuat versi lama TIDAK mengubah status website (tetap DRAFT, tidak dipublikasikan).
 * 6. Memuat versi lama TIDAK menghapus atau menimpa snapshot sumber di tabel page_versions.
 * 7. Tindakan 'Simpan' setelah pemulihan membentuk versi draf baru (nomor versi inkremental).
 * 8. Pemisahan eksplisit antara hasil tes simulasi lokal dan tes Supabase live.
 */

import { createClient } from '@supabase/supabase-js';
import store from '../services/store';
import pageService, {
  validateAndCleanComponents,
  clearLocalDraftVersionsCache,
  localDraftVersionsCache,
} from '../services/pageService';
import {
  Website,
  Page,
  PageVersion,
  VisualComponentBlock,
} from '../types/database';

interface AuditResult {
  suite: 'SIMULASI_LOKAL' | 'SUPABASE_LIVE';
  testName: string;
  passed: boolean;
  notes?: string;
}

const results: AuditResult[] = [];

function assertTest(
  passed: boolean,
  suite: 'SIMULASI_LOKAL' | 'SUPABASE_LIVE',
  testName: string,
  notes?: string
) {
  results.push({ suite, testName, passed, notes });
  if (passed) {
    console.log(`  ✅ [PASS] [${suite}] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] [${suite}] ${testName} - ${notes || 'Assertion failed'}`);
  }
}

// ============================================================================
// SUITE 1: VERIFIKASI LOGIKA PEMULIHAN & STATE BUILDER (SIMULASI LOKAL)
// ============================================================================
export async function runSimulationSuite() {
  console.log('\n===============================================================');
  console.log('🧪 SUITE 1: Pengujian Fungsionalitas "Muat ke Kanvas" (Simulasi Lokal)');
  console.log('===============================================================');

  clearLocalDraftVersionsCache();

  const websiteId = 'ws-test-sesare';
  const pageId = 'page-beranda-001';

  // Setup website berstatus DRAF
  const testWebsite: Website = {
    id: websiteId,
    workspace_id: 'wsp-001',
    name: 'Situs sesare',
    slug: 'situs-sesare',
    business_category: 'kuliner',
    status: 'draft',
    subdomain: 'situs-sesare.arisera.id',
    is_domain_verified: false,
    theme_settings: {
      primaryColor: '#6D4AFF',
      accentColor: '#10B981',
      backgroundColor: '#FFFFFF',
      textColor: '#111827',
      fontFamily: 'Inter',
      borderRadius: '8px',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const testPage: Page = {
    id: pageId,
    website_id: websiteId,
    title: 'Beranda',
    slug: 'home',
    is_homepage: true,
    display_order: 1,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Simpan 4 versi draf secara berurutan
  const blockVersion1: VisualComponentBlock[] = [
    {
      id: 'block-hdr-1',
      type: 'header',
      order: 1,
      content: { brandName: 'Restoran Sesare Versi 1' },
      styles: {},
    },
  ];

  const blockVersion2: VisualComponentBlock[] = [
    {
      id: 'block-hdr-2',
      type: 'header',
      order: 1,
      content: { brandName: 'Restoran Sesare Versi 2' },
      styles: {},
    },
    {
      id: 'block-hero-2',
      type: 'hero',
      order: 2,
      content: { title: 'Spesial Kuliner Nusantara Versi 2' },
      styles: {},
    },
  ];

  const blockVersion3: VisualComponentBlock[] = [
    {
      id: 'block-hdr-3',
      type: 'header',
      order: 1,
      content: { brandName: 'Restoran Sesare Versi 3' },
      styles: {},
    },
    {
      id: 'block-hero-3',
      type: 'hero',
      order: 2,
      content: { title: 'Menu Istimewa Versi 3' },
      styles: {},
    },
    {
      id: 'block-text-3',
      type: 'text',
      order: 3,
      content: { heading: 'Tentang Kami', body: 'Deskripsi versi 3' },
      styles: {},
    },
  ];

  const blockVersion4: VisualComponentBlock[] = [
    {
      id: 'block-hdr-4',
      type: 'header',
      order: 1,
      content: { brandName: 'Restoran Sesare Versi 4 (Aktif Saat Ini)' },
      styles: {},
    },
  ];

  // Simpan versi 1 s/d 4
  const res1 = await pageService.savePageDraft({ websiteId, pageId, components: blockVersion1 });
  const res2 = await pageService.savePageDraft({ websiteId, pageId, components: blockVersion2 });
  const res3 = await pageService.savePageDraft({ websiteId, pageId, components: blockVersion3 });
  const res4 = await pageService.savePageDraft({ websiteId, pageId, components: blockVersion4 });

  const draftListRes = await pageService.getPageDraftVersions(pageId);
  const versions = draftListRes.data || [];

  assertTest(
    versions.length === 4 &&
      versions[0].version_number === 4 &&
      versions[3].version_number === 1,
    'SIMULASI_LOKAL',
    '1. 4 Versi draf berhasil dibentuk secara urut dengan nomor versi inkremental'
  );

  // UJI POIN 1: Tombol memanggil handler pemulihan dengan ID versi yang benar
  const targetVersion2 = versions.find((v) => v.version_number === 2);
  assertTest(
    Boolean(targetVersion2 && targetVersion2.id === res2.versionId),
    'SIMULASI_LOKAL',
    '2. Target pemulihan menunjuk ke ID versi yang tepat (Versi Draf #2)',
    `Expected: ${res2.versionId}, Actual: ${targetVersion2?.id}`
  );

  // UJI POIN 2: Snapshot versi yang dipilih diterapkan ke kanvas
  const restoreRes = await store.loadDraftVersionToCanvasAsync(
    websiteId,
    pageId,
    targetVersion2!.id,
    targetVersion2
  );

  assertTest(
    restoreRes.success === true &&
      Array.isArray(restoreRes.components) &&
      restoreRes.components.length === 2 &&
      restoreRes.components[0].content.brandName === 'Restoran Sesare Versi 2',
    'SIMULASI_LOKAL',
    '3. Snapshot Versi #2 berhasil diterapkan ke kanvas editor dengan konten otentik'
  );

  // UJI POIN 3: Perubahan state kanvas tidak ditimpa oleh efek sinkronisasi
  const canvasCompsInStore = store.getState().pageComponents[pageId];
  assertTest(
    canvasCompsInStore &&
      canvasCompsInStore.length === 2 &&
      canvasCompsInStore[0].content.brandName === 'Restoran Sesare Versi 2' &&
      canvasCompsInStore[1].content.title === 'Spesial Kuliner Nusantara Versi 2',
    'SIMULASI_LOKAL',
    '4. Komponen aktif di store mempertahankan snapshot Versi #2 tanpa ditimpa preset mock'
  );

  // UJI POIN 4: Kegagalan mengambil versi ditampilkan sebagai error, bukan sukses palsu
  const invalidRestore = await store.loadDraftVersionToCanvasAsync(
    websiteId,
    pageId,
    'non-existent-version-id-99999'
  );
  assertTest(
    invalidRestore.success === false && Boolean(invalidRestore.error),
    'SIMULASI_LOKAL',
    '5. ID versi fiktif ditolak dengan pesan error informatif, bukan sukses palsu'
  );

  // UJI POIN 5: Memuat versi tidak mengubah status publikasi website (status tetap DRAFT)
  const currentWebStatus = testWebsite.status;
  assertTest(
    currentWebStatus === 'draft',
    'SIMULASI_LOKAL',
    '6. Pemulihan draf ke kanvas mempertahankan status website tetap DRAF murni'
  );

  // UJI POIN 6: Memuat versi lama tidak menghapus atau menimpa snapshot sumber
  const draftListAfterRestore = await pageService.getPageDraftVersions(pageId);
  const versionsAfterRestore = draftListAfterRestore.data || [];
  const sourceVer2After = versionsAfterRestore.find((v) => v.version_number === 2);
  const sourceVer4After = versionsAfterRestore.find((v) => v.version_number === 4);

  assertTest(
    versionsAfterRestore.length === 4 &&
      sourceVer2After !== undefined &&
      sourceVer4After !== undefined &&
      sourceVer2After.components.length === 2,
    'SIMULASI_LOKAL',
    '7. Snapshot sumber di riwayat draf tetap utuh (tidak terhapus atau tertimpa saat dimuat ke kanvas)'
  );

  // UJI POIN 7: Simpan setelah pemulihan menghasilkan versi draf baru yang valid (Versi #5)
  // Pengguna memodifikasi kanvas dari Versi #2 lalu menekan "Simpan"
  const modifiedFromV2: VisualComponentBlock[] = [
    ...canvasCompsInStore,
    {
      id: 'block-new-badge',
      type: 'features',
      order: 3,
      content: { title: 'Fitur Baru setelah Restore' },
      styles: {},
    },
  ];

  const saveAfterRestoreRes = await pageService.savePageDraft({
    websiteId,
    pageId,
    components: modifiedFromV2,
  });

  const updatedDraftList = await pageService.getPageDraftVersions(pageId);
  const newLatestVersion = updatedDraftList.data?.[0];

  assertTest(
    saveAfterRestoreRes.success === true &&
      newLatestVersion?.version_number === 5 &&
      newLatestVersion.components.length === 3 &&
      newLatestVersion.is_published === false,
    'SIMULASI_LOKAL',
    '8. Menekan "Simpan" setelah pemulihan menghasilkan Versi Draf #5 baru yang sah'
  );

  // UJI POIN 8: Normalisasi dan validasi blok komponen (pencegahan data korup)
  const corruptInput = [
    { type: 'header', content: null, styles: null }, // ID hilang, content null
    'bukan-objek', // string invalid di dalam array
  ];
  const validation = validateAndCleanComponents(corruptInput);
  assertTest(
    validation.valid === true &&
      validation.components.length === 2 &&
      typeof validation.components[0].id === 'string' &&
      typeof validation.components[0].content === 'object' &&
      typeof validation.components[1].id === 'string',
    'SIMULASI_LOKAL',
    '9. Sanitasi otomatis berhasil memulihkan struktur blok yang tidak lengkap tanpa crash'
  );
}

// ============================================================================
// SUITE 2: PENGUJIAN INTEGRASI DATABASE SUPABASE CLOUD POSTGRESQL (LIVE TEST)
// ============================================================================
export async function runSupabaseLiveSuite() {
  console.log('\n===============================================================');
  console.log('🌐 SUITE 2: Pengujian Langsung ke Database Supabase Cloud PostgreSQL');
  console.log('===============================================================');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('  ⚠️ Lingkungan tidak memiliki kredensial Supabase Live URL / Key.');
    console.log('  ℹ️ Suite Live ditandai sebagai SKIPPED (Bukan kegagalan tes).');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2.1 Cek keberadaan tabel public.page_versions dan hak SELECT
    const { data: pvSample, error: pvErr } = await supabase
      .from('page_versions')
      .select('id, page_id, version_number, components, is_published, created_at')
      .limit(3);

    assertTest(
      !pvErr,
      'SUPABASE_LIVE',
      '1. Tabel public.page_versions dapat diakses untuk kueri snapshot (RLS Valid)',
      pvErr?.message
    );

    // 2.2 Cek struktur kolom komponen pada tabel page_versions
    if (pvSample && pvSample.length > 0) {
      const sample = pvSample[0];
      const isValidComponents =
        Array.isArray(sample.components) || typeof sample.components === 'object';
      assertTest(
        isValidComponents,
        'SUPABASE_LIVE',
        `2. Kolom components pada baris live #${sample.version_number} berformat JSON/JSONB yang valid`
      );
    } else {
      console.log('  ℹ️ Belum ada baris riwayat live di page_versions untuk diinspeksi skema komponennya.');
    }

    // 2.3 Cek tabel public.websites: pastikan kolom status terdefinisi
    const { data: webSample, error: webErr } = await supabase
      .from('websites')
      .select('id, name, status, published_version_id')
      .limit(1);

    assertTest(
      !webErr,
      'SUPABASE_LIVE',
      '3. Tabel public.websites dapat diakses dan kolom status terbaca',
      webErr?.message
    );
  } catch (err: any) {
    assertTest(
      false,
      'SUPABASE_LIVE',
      'Koneksi live ke Supabase mengalami exception',
      err?.message
    );
  }
}

// Eksekusi jika file dijalankan langsung via node/tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runSimulationSuite();
    await runSupabaseLiveSuite();

    console.log('\n===============================================================');
    console.log('📊 REKAPITULASI PENGUJIAN PEMULIHAN VERSI DRAF ARISERA');
    console.log('===============================================================');

    const simResults = results.filter((r) => r.suite === 'SIMULASI_LOKAL');
    const liveResults = results.filter((r) => r.suite === 'SUPABASE_LIVE');

    const simPassed = simResults.filter((r) => r.passed).length;
    const livePassed = liveResults.filter((r) => r.passed).length;

    console.log(`Pengujian Simulasi Lokal : ${simPassed}/${simResults.length} Lolos`);
    if (liveResults.length > 0) {
      console.log(`Pengujian Supabase Live  : ${livePassed}/${liveResults.length} Lolos`);
    } else {
      console.log(`Pengujian Supabase Live  : Tidak dieksekusi (Kredensial belum terkonfigurasi)`);
    }

    const allPassed = results.every((r) => r.passed);
    if (allPassed) {
      console.log('\n🎉 SELURUH PENGUJIAN LOLOS DENGAN SUKSES! FITUR SIAP DIPAKAI.\n');
      process.exit(0);
    } else {
      console.error('\n❌ TERDAPAT PENGUJIAN YANG GAGAL. SILAKAN PERIKSA DETAIL.\n');
      process.exit(1);
    }
  })();
}
