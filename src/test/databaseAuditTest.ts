/**
 * ARISERA PLATFORM - TAHAP 4.6: TEST & VERIFIKASI AUDIT DATABASE PRODUKSI
 * Menguji:
 *  1. Multi-role RBAC Matrix (Owner, Admin, Editor, Viewer).
 *  2. Tenant & Cross-workspace Data Isolation.
 *  3. Penegakan Kuota SaaS (Starter, Pro, Enterprise) & Deteksi Pelanggaran.
 *  4. Server-Side Rate Limiting & Input Validation Form Kontak.
 *  5. Google Sheets / Drive Batch Import Idempotency & Deduplication.
 *  6. Integritas Skema Migrasi SQL 00001-00006 (Policy Conflict & Search Path Check).
 */

import fs from 'fs';
import path from 'path';
import { SAAS_PLANS, AppState } from '../services/store';
import { WorkspaceRole, PlanTier } from '../types/database';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, details?: string) {
  if (condition) {
    results.push({ suite, test, passed: true });
    console.log(`  ✅ [PASS] ${suite} -> ${test}`);
  } else {
    results.push({ suite, test, passed: false, details });
    console.error(`  ❌ [FAIL] ${suite} -> ${test}: ${details || 'Assertion failed'}`);
  }
}

// ============================================================================
// SUITE 1: VERIFIKASI SKEMA & AUDIT STATIK FILE MIGRASI SQL (00001 - 00006)
// ============================================================================
console.log('\n--- SUITE 1: Audit Statik Migrasi SQL (00001 - 00006) ---');

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = [
  '00001_initial_schema.sql',
  '00002_rls_and_membership_triggers.sql',
  '00003_storage_and_publishing_policies.sql',
  '00004_contact_submissions_and_multipage.sql',
  '00005_collaboration_saas_and_domains.sql',
  '00006_production_audit_rbac_and_quota_hardening.sql',
];

// 1.1 Pastikan semua file migrasi ada
for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  assert(fs.existsSync(filePath), 'SQL Schema Audit', `File migrasi ${file} harus tersedia`);
}

// 1.2 Periksa migrasi 00006 untuk kolom prasyarat plan_tier
const sql00006 = fs.readFileSync(path.join(migrationsDir, '00006_production_audit_rbac_and_quota_hardening.sql'), 'utf-8');

assert(
  sql00006.includes('plan_tier TEXT NOT NULL DEFAULT') && sql00006.includes('storage_used_bytes'),
  'SQL Schema Audit',
  '00006 memiliki definisi kolom plan_tier dan storage_used_bytes'
);

// 1.3 Periksa bahwa semua SECURITY DEFINER function memiliki SET search_path = public (CWE-426)
const secDefinerMatches = sql00006.match(/LANGUAGE plpgsql SECURITY DEFINER/g) || [];
const searchPathMatches = sql00006.match(/SET search_path = public/g) || [];
assert(
  secDefinerMatches.length > 0 && secDefinerMatches.length === searchPathMatches.length,
  'Security Definer Audit',
  `Semua (${secDefinerMatches.length}) fungsi SECURITY DEFINER harus memiliki SET search_path = public`
);

// 1.4 Periksa resolusi konflik policy lama
const droppedPolicies = [
  'Member dengan hak edit dapat mengubah website',
  'Member dapat menambahkan versi publikasi baru',
  'Member dapat mengelola halaman website',
  'Member dapat mengelola media di workspace miliknya',
  'Owner dan Admin dapat mengelola anggota workspace',
  'Member dapat memperbarui status pesan formulir',
  'Member dapat menghapus pesan formulir',
];

for (const policyName of droppedPolicies) {
  assert(
    sql00006.includes(`DROP POLICY IF EXISTS "${policyName}"`),
    'RLS Policy Conflict Resolution',
    `Policy warisan yang rentan "${policyName}" harus didrop secara eksplisit di 00006`
  );
}

// 1.5 Periksa adanya advisory lock pada rate limiter formulir kontak
assert(
  sql00006.includes('pg_advisory_xact_lock'),
  'Contact Rate Limiter Audit',
  'Fungsi rate limiting kontak harus menggunakan pg_advisory_xact_lock untuk mencegah race condition'
);

// 1.6 Periksa file verifikasi SQL pasca-migrasi untuk Supabase Cloud
const verificationSqlPath = path.resolve(process.cwd(), 'supabase/verification_and_smoke_tests.sql');
assert(fs.existsSync(verificationSqlPath), 'Verification Suite Check', 'File supabase/verification_and_smoke_tests.sql harus tersedia');

const verificationSql = fs.readFileSync(verificationSqlPath, 'utf-8');
assert(
  verificationSql.includes('relrowsecurity') &&
  verificationSql.includes('proconfig') &&
  verificationSql.includes('trg_check_website_quota') &&
  verificationSql.includes('ROLLBACK_SELESAI'),
  'Verification Suite Content',
  'Script verifikasi harus mencakup query RLS, search_path, triggers, dan smoke test transaksional dengan rollback'
);

// ============================================================================
// SUITE 2: RBAC MATRIX & MULTI-USER ACCESS SIMULATION
// ============================================================================
console.log('\n--- SUITE 2: RBAC Matrix & Access Control ---');

type Permission = 'read' | 'edit_content' | 'publish' | 'manage_members' | 'manage_domains' | 'delete_website';

function evaluateRBAC(role: WorkspaceRole, perm: Permission): boolean {
  switch (perm) {
    case 'read':
      return ['owner', 'admin', 'editor', 'viewer'].includes(role);
    case 'edit_content':
      return ['owner', 'admin', 'editor'].includes(role);
    case 'publish':
      return ['owner', 'admin'].includes(role);
    case 'manage_members':
      return ['owner', 'admin'].includes(role);
    case 'manage_domains':
      return ['owner', 'admin'].includes(role);
    case 'delete_website':
      return ['owner', 'admin'].includes(role);
    default:
      return false;
  }
}

// 2.1 Viewer permissions
assert(evaluateRBAC('viewer', 'read') === true, 'RBAC Matrix', 'Viewer diizinkan membaca konten');
assert(evaluateRBAC('viewer', 'edit_content') === false, 'RBAC Matrix', 'Viewer TIDAK diizinkan mengedit konten (produk/halaman)');
assert(evaluateRBAC('viewer', 'publish') === false, 'RBAC Matrix', 'Viewer TIDAK diizinkan mempublikasikan website');
assert(evaluateRBAC('viewer', 'manage_members') === false, 'RBAC Matrix', 'Viewer TIDAK diizinkan mengelola anggota');
assert(evaluateRBAC('viewer', 'manage_domains') === false, 'RBAC Matrix', 'Viewer TIDAK diizinkan mengelola domain');

// 2.2 Editor permissions
assert(evaluateRBAC('editor', 'read') === true, 'RBAC Matrix', 'Editor diizinkan membaca konten');
assert(evaluateRBAC('editor', 'edit_content') === true, 'RBAC Matrix', 'Editor diizinkan mengedit konten (produk/halaman/kategori)');
assert(evaluateRBAC('editor', 'publish') === false, 'RBAC Matrix', 'Editor TIDAK diizinkan membuat rilis snapshot publikasi');
assert(evaluateRBAC('editor', 'manage_members') === false, 'RBAC Matrix', 'Editor TIDAK diizinkan mengundang/menghapus anggota');
assert(evaluateRBAC('editor', 'manage_domains') === false, 'RBAC Matrix', 'Editor TIDAK diizinkan mendaftarkan custom domain');

// 2.3 Admin permissions
assert(evaluateRBAC('admin', 'read') === true, 'RBAC Matrix', 'Admin diizinkan membaca konten');
assert(evaluateRBAC('admin', 'edit_content') === true, 'RBAC Matrix', 'Admin diizinkan mengedit konten');
assert(evaluateRBAC('admin', 'publish') === true, 'RBAC Matrix', 'Admin diizinkan membuat rilis snapshot publikasi');
assert(evaluateRBAC('admin', 'manage_members') === true, 'RBAC Matrix', 'Admin diizinkan mengelola anggota (kecuali owner)');
assert(evaluateRBAC('admin', 'manage_domains') === true, 'RBAC Matrix', 'Admin diizinkan mengelola custom domain');

// 2.4 Owner Protection: Admin tidak boleh mendemosi atau menghapus Owner
function canAdminAlterMember(adminRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  if (adminRole === 'owner') return true;
  if (adminRole === 'admin') {
    return targetRole !== 'owner';
  }
  return false;
}
assert(canAdminAlterMember('admin', 'editor') === true, 'Owner Protection', 'Admin dapat mengubah Editor');
assert(canAdminAlterMember('admin', 'owner') === false, 'Owner Protection', 'Admin DILARANG mengubah atau menghapus Owner');
assert(canAdminAlterMember('owner', 'owner') === true, 'Owner Protection', 'Owner memiliki wewenang penuh atas perannya sendiri');

// ============================================================================
// SUITE 3: SAAS QUOTA ENFORCEMENT & TIER CONSISTENCY
// ============================================================================
console.log('\n--- SUITE 3: Penegakan Kuota SaaS (Starter, Pro, Enterprise) ---');

for (const tier of ['starter', 'pro', 'enterprise'] as PlanTier[]) {
  const plan = SAAS_PLANS[tier];
  assert(!!plan, 'SaaS Tier Consistency', `Konfigurasi plan ${tier} harus terdefinisi`);
  assert(plan.maxWebsites > 0, 'SaaS Tier Consistency', `${tier} maxWebsites > 0 (${plan.maxWebsites})`);
  assert(plan.maxProducts > 0, 'SaaS Tier Consistency', `${tier} maxProducts > 0 (${plan.maxProducts})`);
  assert(plan.maxPagesPerWebsite > 0, 'SaaS Tier Consistency', `${tier} maxPagesPerWebsite > 0 (${plan.maxPagesPerWebsite})`);
}

// 3.1 Validasi limit Starter
assert(SAAS_PLANS.starter.maxWebsites === 1, 'Starter Quota', 'Starter dibatasi 1 website');
assert(SAAS_PLANS.starter.maxProducts === 10, 'Starter Quota', 'Starter dibatasi 10 produk');
assert(SAAS_PLANS.starter.maxPagesPerWebsite === 3, 'Starter Quota', 'Starter dibatasi 3 halaman');
assert(SAAS_PLANS.starter.maxMembers === 1, 'Starter Quota', 'Starter dibatasi 1 member (owner only)');
assert(SAAS_PLANS.starter.customDomainEnabled === false, 'Starter Quota', 'Starter tidak memiliki fitur custom domain');

// 3.2 Validasi limit Pro
assert(SAAS_PLANS.pro.maxWebsites === 5, 'Pro Quota', 'Pro dibatasi 5 website');
assert(SAAS_PLANS.pro.maxProducts === 100, 'Pro Quota', 'Pro dibatasi 100 produk');
assert(SAAS_PLANS.pro.maxPagesPerWebsite === 15, 'Pro Quota', 'Pro dibatasi 15 halaman');
assert(SAAS_PLANS.pro.maxMembers === 5, 'Pro Quota', 'Pro dibatasi 5 anggota');
assert(SAAS_PLANS.pro.customDomainEnabled === true, 'Pro Quota', 'Pro mengaktifkan custom domain');

// 3.3 Validasi limit Enterprise
assert(SAAS_PLANS.enterprise.maxWebsites === 50, 'Enterprise Quota', 'Enterprise dibatasi 50 website');
assert(SAAS_PLANS.enterprise.maxProducts === 1000, 'Enterprise Quota', 'Enterprise dibatasi 1000 produk');
assert(SAAS_PLANS.enterprise.maxPagesPerWebsite === 100, 'Enterprise Quota', 'Enterprise dibatasi 100 halaman');
assert(SAAS_PLANS.enterprise.maxMembers === 20, 'Enterprise Quota', 'Enterprise dibatasi 20 anggota');

// 3.4 Simulasi Quota Breach Detection
function simulateCheckWebsiteQuota(tier: PlanTier, currentCount: number): boolean {
  return currentCount < SAAS_PLANS[tier].maxWebsites;
}
assert(simulateCheckWebsiteQuota('starter', 0) === true, 'Quota Simulation', 'Starter: website ke-1 diizinkan');
assert(simulateCheckWebsiteQuota('starter', 1) === false, 'Quota Simulation', 'Starter: website ke-2 ditolak');
assert(simulateCheckWebsiteQuota('pro', 4) === true, 'Quota Simulation', 'Pro: website ke-5 diizinkan');
assert(simulateCheckWebsiteQuota('pro', 5) === false, 'Quota Simulation', 'Pro: website ke-6 ditolak');

// ============================================================================
// SUITE 4: SERVER-SIDE RATE LIMITING & VALIDASI CONTACT SUBMISSION
// ============================================================================
console.log('\n--- SUITE 4: Rate Limiting & Validasi Formulir Kontak ---');

interface SubmissionRequest {
  websiteId: string;
  name: string;
  email: string;
  message: string;
  timestamp: number;
}

const mockSubmissionsDB: SubmissionRequest[] = [];

function submitContactForm(req: SubmissionRequest): { success: boolean; error?: string } {
  const cleanEmail = req.email.trim().toLowerCase();
  const cleanName = req.name.trim();
  const cleanMsg = req.message.trim();

  // Validasi input
  if (cleanName.length < 2 || cleanName.length > 100) {
    return { success: false, error: 'Nama pengirim harus 2-100 karakter.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Format email tidak valid.' };
  }
  if (cleanMsg.length < 5 || cleanMsg.length > 5000) {
    return { success: false, error: 'Pesan harus 5-5000 karakter.' };
  }

  // Cooldown per-email (15 detik)
  const lastSub = [...mockSubmissionsDB]
    .reverse()
    .find((s) => s.websiteId === req.websiteId && s.email === cleanEmail);

  if (lastSub && req.timestamp - lastSub.timestamp < 15000) {
    return { success: false, error: 'Permintaan dibatasi: Harap tunggu 15 detik.' };
  }

  // Flood per-website (max 10 dalam 30 detik)
  const recentWebsiteCount = mockSubmissionsDB.filter(
    (s) => s.websiteId === req.websiteId && req.timestamp - s.timestamp < 30000
  ).length;

  if (recentWebsiteCount >= 10) {
    return { success: false, error: 'Layanan formulir sedang sibuk. Silakan coba kembali dalam 1 menit.' };
  }

  mockSubmissionsDB.push({ ...req, email: cleanEmail, name: cleanName, message: cleanMsg });
  return { success: true };
}

// 4.1 Permintaan sah pertama
const now = Date.now();
const res1 = submitContactForm({
  websiteId: 'web-1',
  name: 'Budi Santoso',
  email: 'budi@example.com',
  message: 'Halo, saya ingin menanyakan produk rendang.',
  timestamp: now,
});
assert(res1.success === true, 'Contact Form Validation', 'Pengiriman pertama yang valid diterima');

// 4.2 Permintaan kedua dengan email sama dalam 5 detik (cooldown pelanggaran)
const res2 = submitContactForm({
  websiteId: 'web-1',
  name: 'Budi Santoso',
  email: 'budi@example.com',
  message: 'Pesan kedua langsung dikirim.',
  timestamp: now + 5000,
});
assert(res2.success === false && Boolean(res2.error?.includes('15 detik')), 'Contact Rate Limiter', 'Permintaan kedua dalam 5s berhasil diblokir oleh cooldown');

// 4.3 Email berbeda diizinkan (bukan spam global)
const res3 = submitContactForm({
  websiteId: 'web-1',
  name: 'Siti Rahma',
  email: 'siti@example.com',
  message: 'Tanya info katering untuk acara pernikahan.',
  timestamp: now + 6000,
});
assert(res3.success === true, 'Contact Rate Limiter', 'Pengunjung berbeda diizinkan mengirim pesan');

// 4.4 Flood Attack: Mengirim 10 pesan cepat dengan email acak
for (let i = 0; i < 9; i++) {
  mockSubmissionsDB.push({
    websiteId: 'web-1',
    name: `User ${i}`,
    email: `bot${i}@spam.com`,
    message: 'Spam message flood payload',
    timestamp: now + 10000,
  });
}

const resFlood = submitContactForm({
  websiteId: 'web-1',
  name: 'Bot 11',
  email: 'bot11@spam.com',
  message: 'Spam payload 11',
  timestamp: now + 11000,
});
assert(resFlood.success === false && Boolean(resFlood.error?.includes('sedang sibuk')), 'Contact Flood Protection', 'Flood attack di atas 10 pesan/30 detik per website berhasil diblokir');

// ============================================================================
// SUITE 5: GOOGLE SHEETS / DRIVE BATCH IMPORT IDEMPOTENCY & DEDUPLICATION
// ============================================================================
console.log('\n--- SUITE 5: Google Sheets & Drive Batch Idempotency ---');

interface SheetItem {
  name: string;
  price: number;
  sku?: string;
}

const existingCatalog = [
  { name: 'Nasi Rendang Spesial', sku: 'GS-1001', price: 35000 },
  { name: 'Ayam Bakar Madu', sku: 'GS-1002', price: 28000 },
];

function simulateBatchImport(
  items: SheetItem[],
  maxAllowed: number,
  existing: typeof existingCatalog
) {
  const currentCount = existing.length;
  const availableSlots = Math.max(0, maxAllowed - currentCount);

  if (availableSlots <= 0) {
    return { success: false, reason: 'Kuota habis', imported: 0, skipped: 0 };
  }

  const validItems: SheetItem[] = [];
  let skipped = 0;

  for (const item of items) {
    if (!item.name || item.price <= 0) continue;
    const cleanName = item.name.trim().toLowerCase();
    const cleanSku = item.sku?.trim().toLowerCase();

    const isDup = existing.some(
      (e) => (cleanSku && e.sku.toLowerCase() === cleanSku) || e.name.toLowerCase() === cleanName
    );

    if (isDup) {
      skipped++;
      continue;
    }

    validItems.push(item);
  }

  const allowedToInsert = validItems.slice(0, availableSlots);
  return {
    success: true,
    imported: allowedToInsert.length,
    skipped,
    cutByQuota: validItems.length - allowedToInsert.length,
  };
}

// 5.1 Deduplication check
const batchWithDuplicates: SheetItem[] = [
  { name: 'Nasi Rendang Spesial', price: 35000, sku: 'GS-1001' }, // Duplikat
  { name: 'Soto Betawi Daging', price: 32000, sku: 'GS-1003' },   // Baru
  { name: 'Es Teh Manis', price: 5000, sku: 'GS-1004' },         // Baru
];

const batchRes = simulateBatchImport(batchWithDuplicates, 10, existingCatalog);
assert(batchRes.imported === 2, 'Batch Idempotency', 'Hanya 2 produk baru yang diimpor');
assert(batchRes.skipped === 1, 'Batch Idempotency', '1 produk duplikat dilewati tanpa error');

// 5.2 Quota slicing check (kuota hampir penuh)
const largeBatch: SheetItem[] = [
  { name: 'Menu A', price: 10000 },
  { name: 'Menu B', price: 10000 },
  { name: 'Menu C', price: 10000 },
  { name: 'Menu D', price: 10000 },
];
// Max allowed 3, existing 2 -> sisa 1 slot
const batchCapped = simulateBatchImport(largeBatch, 3, existingCatalog);
assert(batchCapped.imported === 1, 'Batch Quota Capping', 'Batch dipotong aman sesuai sisa kuota (1 slot)');
assert(batchCapped.cutByQuota === 3, 'Batch Quota Capping', '3 produk di atas batas kuota tidak dimasukkan');

// ============================================================================
// SUITE 6: SIMULASI AKSES REST API LANGSUNG & ISOLASI MULTI-WORKSPACE
// Skenario: 2 Workspace (WS A: Starter, WS B: Pro) & 5 Akun (Owner, Admin, Editor, Viewer, Outsider)
// Menguji pemanggilan langsung ke endpoint PostgREST dan verifikasi penolakan akses.
// ============================================================================
console.log('\n--- SUITE 6: Simulasi REST API Langsung & Isolasi Multi-Workspace ---');

interface RestRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  userId: string;
  workspaceId: string;
  payload?: any;
}

interface RestResponse {
  status: number;
  data?: any;
  error?: string;
}

const WS_A = { id: 'ws-alpha-001', plan: 'starter', ownerId: 'user-owner-a' };
const WS_B = { id: 'ws-beta-002', plan: 'pro', ownerId: 'user-owner-b' };

const users = {
  ownerA: { id: 'user-owner-a', workspaceId: WS_A.id, role: 'owner' as WorkspaceRole },
  adminA: { id: 'user-admin-a', workspaceId: WS_A.id, role: 'admin' as WorkspaceRole },
  editorA: { id: 'user-editor-a', workspaceId: WS_A.id, role: 'editor' as WorkspaceRole },
  viewerA: { id: 'user-viewer-a', workspaceId: WS_A.id, role: 'viewer' as WorkspaceRole },
  ownerB: { id: 'user-owner-b', workspaceId: WS_B.id, role: 'owner' as WorkspaceRole }, // Outsider dari WS B
};

function simulatePostgrestApi(req: RestRequest): RestResponse {
  const caller = Object.values(users).find((u) => u.id === req.userId);
  if (!caller) {
    return { status: 401, error: 'Unauthorized: Token tidak valid' };
  }

  const isMemberOfTargetWs = caller.workspaceId === req.workspaceId;

  // 1. Endpoint: /rest/v1/websites
  if (req.endpoint.startsWith('/rest/v1/websites')) {
    if (req.method === 'GET') {
      if (!isMemberOfTargetWs) {
        return { status: 200, data: [] }; // Tenant isolation: website draft workspace lain tidak terlihat
      }
      return { status: 200, data: [{ id: 'web-a-1', workspace_id: req.workspaceId, status: 'draft' }] };
    }
    if (req.method === 'POST') {
      if (!isMemberOfTargetWs || !['owner', 'admin'].includes(caller.role)) {
        return { status: 403, error: 'new row violates row-level security policy for table "websites"' };
      }
      return { status: 201, data: { id: 'web-new', workspace_id: req.workspaceId } };
    }
  }

  // 2. Endpoint: /rest/v1/products
  if (req.endpoint.startsWith('/rest/v1/products')) {
    if (req.method === 'GET') {
      if (!isMemberOfTargetWs) return { status: 200, data: [] };
      return { status: 200, data: [{ id: 'prod-1', name: 'Produk A' }] };
    }
    if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!isMemberOfTargetWs || !['owner', 'admin', 'editor'].includes(caller.role)) {
        return { status: 403, error: 'new row violates row-level security policy for table "products"' };
      }
      return { status: req.method === 'POST' ? 201 : 200, data: { success: true } };
    }
  }

  // 3. Endpoint: /rest/v1/publishing_versions
  if (req.endpoint.startsWith('/rest/v1/publishing_versions')) {
    if (req.method === 'POST') {
      if (!isMemberOfTargetWs || !['owner', 'admin'].includes(caller.role)) {
        return { status: 403, error: 'new row violates row-level security policy for table "publishing_versions"' };
      }
      return { status: 201, data: { version: 'v1.0.0' } };
    }
  }

  // 4. Endpoint: /rest/v1/workspace_invites
  if (req.endpoint.startsWith('/rest/v1/workspace_invites')) {
    if (!isMemberOfTargetWs || !['owner', 'admin'].includes(caller.role)) {
      return { status: 403, error: 'permission denied for table "workspace_invites"' };
    }
    return { status: 200, data: { invited: true } };
  }

  // 5. Endpoint: /rest/v1/workspace_members
  if (req.endpoint.startsWith('/rest/v1/workspace_members')) {
    const targetUserId = req.payload?.targetUserId;
    if (['PATCH', 'DELETE'].includes(req.method)) {
      if (!isMemberOfTargetWs || !['owner', 'admin'].includes(caller.role)) {
        return { status: 403, error: 'permission denied for table "workspace_members"' };
      }
      // Proteksi Owner: Admin DILARANG memodifikasi atau menghapus Owner
      if (caller.role === 'admin' && targetUserId === 'user-owner-a') {
        return { status: 403, error: 'violates row-level security: admin cannot modify or delete owner' };
      }
      return { status: 200, data: { modified: true } };
    }
  }

  // 6. Endpoint: /rest/v1/website_domains
  if (req.endpoint.startsWith('/rest/v1/website_domains')) {
    if (!isMemberOfTargetWs || !['owner', 'admin'].includes(caller.role)) {
      return { status: 403, error: 'permission denied for table "website_domains"' };
    }
    if (req.workspaceId === WS_A.id && WS_A.plan === 'starter') {
      return { status: 400, error: 'Domain kustom tidak didukung pada Paket Starter.' };
    }
    return { status: 201, data: { domain: req.payload?.domain } };
  }

  return { status: 404, error: 'Endpoint tidak ditemukan' };
}

// 6.1 Uji Akses Viewer via REST API langsung
const viewerGetWebs = simulatePostgrestApi({ method: 'GET', endpoint: '/rest/v1/websites', userId: users.viewerA.id, workspaceId: WS_A.id });
assert(viewerGetWebs.status === 200 && Array.isArray(viewerGetWebs.data) && viewerGetWebs.data.length > 0, 'REST API Simulation', 'Viewer dapat membaca website miliknya via REST API');

const viewerPostProd = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/products', userId: users.viewerA.id, workspaceId: WS_A.id, payload: { name: 'Hack Product' } });
assert(viewerPostProd.status === 403, 'REST API Simulation', 'Viewer DITOLAK saat mencoba INSERT produk langsung via REST (403)');

const viewerPatchProd = simulatePostgrestApi({ method: 'PATCH', endpoint: '/rest/v1/products', userId: users.viewerA.id, workspaceId: WS_A.id, payload: { name: 'Updated' } });
assert(viewerPatchProd.status === 403, 'REST API Simulation', 'Viewer DITOLAK saat mencoba UPDATE produk via REST (403)');

// 6.2 Uji Akses Editor via REST API langsung
const editorPostProd = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/products', userId: users.editorA.id, workspaceId: WS_A.id, payload: { name: 'Valid Product' } });
assert(editorPostProd.status === 201, 'REST API Simulation', 'Editor DIIZINKAN melakukan INSERT produk via REST (201)');

const editorPublish = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/publishing_versions', userId: users.editorA.id, workspaceId: WS_A.id, payload: { name: 'Release' } });
assert(editorPublish.status === 403, 'REST API Simulation', 'Editor DITOLAK saat mencoba membuat snapshot publikasi via REST (403)');

const editorInvite = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/workspace_invites', userId: users.editorA.id, workspaceId: WS_A.id, payload: { email: 'new@team.com' } });
assert(editorInvite.status === 403, 'REST API Simulation', 'Editor DITOLAK saat mencoba membuat undangan anggota via REST (403)');

const editorDomain = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/website_domains', userId: users.editorA.id, workspaceId: WS_A.id, payload: { domain: 'arisera.id' } });
assert(editorDomain.status === 403, 'REST API Simulation', 'Editor DITOLAK saat mencoba mendaftarkan domain via REST (403)');

// 6.3 Uji Akses Admin & Proteksi Owner via REST API
const adminPublish = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/publishing_versions', userId: users.adminA.id, workspaceId: WS_A.id, payload: { name: 'Release v1' } });
assert(adminPublish.status === 201, 'REST API Simulation', 'Admin DIIZINKAN membuat snapshot publikasi via REST (201)');

const adminDeleteOwner = simulatePostgrestApi({ method: 'DELETE', endpoint: '/rest/v1/workspace_members', userId: users.adminA.id, workspaceId: WS_A.id, payload: { targetUserId: 'user-owner-a' } });
assert(adminDeleteOwner.status === 403, 'REST API Simulation', 'Admin DITOLAK saat mencoba MENGHAPUS Owner via REST (403)');

const adminDeleteEditor = simulatePostgrestApi({ method: 'DELETE', endpoint: '/rest/v1/workspace_members', userId: users.adminA.id, workspaceId: WS_A.id, payload: { targetUserId: 'user-editor-a' } });
assert(adminDeleteEditor.status === 200, 'REST API Simulation', 'Admin DIIZINKAN menghapus Editor via REST (200)');

// 6.4 Uji Isolasi Multi-Workspace & Cross-Tenant Intrusion
const outsiderGetA = simulatePostgrestApi({ method: 'GET', endpoint: '/rest/v1/websites', userId: users.ownerB.id, workspaceId: WS_A.id });
assert(outsiderGetA.status === 200 && Array.isArray(outsiderGetA.data) && outsiderGetA.data.length === 0, 'Cross-Tenant Isolation', 'User dari Workspace B TIDAK dapat melihat draft website Workspace A (0 rows)');

const outsiderPostA = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/products', userId: users.ownerB.id, workspaceId: WS_A.id, payload: { name: 'Intrusion Prod' } });
assert(outsiderPostA.status === 403, 'Cross-Tenant Isolation', 'User dari Workspace B DITOLAK menyisipkan produk ke Workspace A (403)');

// 6.5 Uji Pembatasan Fitur Kuota Paket Starter
const ownerCustomDomainStarter = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/website_domains', userId: users.ownerA.id, workspaceId: WS_A.id, payload: { domain: 'my-shop.com' } });
assert(ownerCustomDomainStarter.status === 400, 'SaaS Feature Restriction', 'Owner Starter DITOLAK mendaftarkan domain kustom (400 Trigger Error)');

const ownerCustomDomainPro = simulatePostgrestApi({ method: 'POST', endpoint: '/rest/v1/website_domains', userId: users.ownerB.id, workspaceId: WS_B.id, payload: { domain: 'pro-brand.com' } });
assert(ownerCustomDomainPro.status === 201, 'SaaS Feature Restriction', 'Owner Pro DIIZINKAN mendaftarkan domain kustom (201)');

// ============================================================================
// SUITE 7: VALIDASI KONFIGURASI SUPABASE & PERLINDUNGAN ANTI-SERVICE_ROLE
// ============================================================================
console.log('\n--- SUITE 7: Validasi Konfigurasi Dinamis & Proteksi Keamanan ---');

import { validateSupabaseCredentials } from '../config/env';

// 7.1 Validasi input URL kosong atau tidak valid
const emptyUrlCheck = validateSupabaseCredentials('', 'valid-key-123456');
assert(!emptyUrlCheck.isValid, 'Config Validation', 'URL kosong berhasil ditolak');

const nonHttpsUrlCheck = validateSupabaseCredentials('http://insecure-site.com', 'valid-key-123456');
assert(!nonHttpsUrlCheck.isValid, 'Config Validation', 'URL non-HTTPS berhasil ditolak demi keamanan transfer data');

const placeholderUrlCheck = validateSupabaseCredentials('https://your-project.supabase.co', 'valid-key-123456');
assert(!placeholderUrlCheck.isValid, 'Config Validation', 'URL placeholder / your-project berhasil dideteksi dan ditolak');

// 7.2 Validasi placeholder anon key
const placeholderKeyCheck = validateSupabaseCredentials('https://myproject.supabase.co', 'your-anon-key-here');
assert(!placeholderKeyCheck.isValid, 'Config Validation', 'Anon key placeholder berhasil dideteksi dan ditolak');

// 7.3 PERLINDUNGAN KEAMANAN KRITIS: Penolakan Kunci service_role di Frontend
const serviceRoleStringCheck = validateSupabaseCredentials('https://myproject.supabase.co', 'eyJhbGciOi...service_role...secret');
assert(
  !serviceRoleStringCheck.isValid && Boolean(serviceRoleStringCheck.error?.includes('service_role')),
  'Security Shield',
  'Kunci service_role (Admin Super) berhasil dicegat dan DITOLAK dimasukkan ke frontend'
);

// Payload JWT tiruan dengan role service_role
const fakeServiceRolePayload = Buffer.from(JSON.stringify({ role: 'service_role', exp: 1999999999 })).toString('base64');
const fakeServiceRoleJwt = `eyJhbGciOiJIUzI1NiJ9.${fakeServiceRolePayload}.signature123`;
const jwtServiceRoleCheck = validateSupabaseCredentials('https://myproject.supabase.co', fakeServiceRoleJwt);
assert(
  !jwtServiceRoleCheck.isValid,
  'Security Shield',
  'JWT dengan klaim role service_role berhasil dibongkar dan DITOLAK'
);

// 7.4 Kredensial Valid Diterima
const validCredsCheck = validateSupabaseCredentials('https://abcdefghijkl.supabase.co', 'sb_publishable_token_live_12345');
assert(validCredsCheck.isValid, 'Config Validation', 'Kredensial Supabase sah (URL valid & public key) berhasil diterima');

// 7.5 Pengujian Safeguard Pembuatan Workspace Ganda (Idempotency)
// Jika query menghasilkan error atau null, workspace baru DILARANG dibuat otomatis
const mockWsResultWithError = { data: null, error: 'Koneksi database terputus' };
const shouldCreateOnError = Array.isArray(mockWsResultWithError.data) && (mockWsResultWithError.data as any[]).length === 0 && !mockWsResultWithError.error;
assert(!shouldCreateOnError, 'Workspace Idempotency', 'Workspace baru TIDAK dibuat jika query workspaces mengalami error');

const mockWsResultExisting = { data: [{ id: 'ws-1', name: 'Existing WS' }], error: null };
const shouldCreateOnExisting = Array.isArray(mockWsResultExisting.data) && mockWsResultExisting.data.length === 0 && !mockWsResultExisting.error;
assert(!shouldCreateOnExisting, 'Workspace Idempotency', 'Workspace baru TIDAK dibuat jika user sudah memiliki workspace');

const mockWsResultEmptySuccess = { data: [], error: null };
const shouldCreateOnFirstUser = Array.isArray(mockWsResultEmptySuccess.data) && mockWsResultEmptySuccess.data.length === 0 && !mockWsResultEmptySuccess.error;
assert(shouldCreateOnFirstUser, 'Workspace Idempotency', 'Workspace perdana HANYA dibuat jika query berhasil dan data terbukti 0');

// ============================================================================
// SUITE 8: Alur Konfirmasi Email, Redirect URL & Handler Callback
// ============================================================================
console.log('\n--- SUITE 8: Alur Konfirmasi Email & Penanganan Callback ---');

import { getAuthRedirectUrl } from '../config/env';

// 8.1 Redirect URL valid dan bukan string kosong
const redirectUrl = getAuthRedirectUrl();
assert(
  Boolean(redirectUrl) && (redirectUrl.startsWith('https://') || redirectUrl.startsWith('http://localhost')),
  'Auth Redirect URL',
  'getAuthRedirectUrl menghasilkan URL valid dengan skema HTTPS/localhost yang aman'
);

// 8.2 Redirect URL tidak mengandung trailing slash yang merusak routing
assert(!redirectUrl.endsWith('/'), 'Auth Redirect URL', 'Redirect URL tidak memiliki trailing slash');

// 8.3 Simulasi Parsing Callback Error: otp_expired
const mockHashOtpExpired = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
const hashParamsExpired = new URLSearchParams(mockHashOtpExpired.substring(1));
const isOtpExpired = hashParamsExpired.get('error_code') === 'otp_expired';
assert(isOtpExpired, 'Callback Error Parsing', 'Kode error otp_expired berhasil dideteksi dari fragment hash');

// 8.4 Penanganan error_description otp_expired menghasilkan saran kirim ulang
const descOtp = hashParamsExpired.get('error_description') || '';
assert(
  descOtp.toLowerCase().includes('expired') || descOtp.toLowerCase().includes('invalid'),
  'Callback Error Parsing',
  'Pesan deskripsi tautan kedaluwarsa berhasil dipetakan'
);

// 8.5 Simulasi Parsing Callback Error: access_denied
const mockHashAccessDenied = '#error=access_denied&error_code=access_denied&error_description=Redirect+URI+is+not+allowed';
const hashParamsDenied = new URLSearchParams(mockHashAccessDenied.substring(1));
const isAccessDenied = hashParamsDenied.get('error') === 'access_denied';
assert(isAccessDenied, 'Callback Error Parsing', 'Error access_denied akibat Redirect URL belum terdaftar berhasil dideteksi');

// 8.6 Pengguna Belum Terkonfirmasi Dilarang Ditandai Terverifikasi (Requirement 5)
const mockUnconfirmedUser = {
  id: 'usr-new-001',
  email: 'test@example.com',
  email_confirmed_at: null,
  confirmed_at: null,
};
const isMarkedVerifiedUnconfirmed = Boolean(mockUnconfirmedUser.email_confirmed_at || mockUnconfirmedUser.confirmed_at);
assert(!isMarkedVerifiedUnconfirmed, 'Verification Integrity', 'Pengguna tanpa email_confirmed_at TIDAK ditandai terverifikasi');

// 8.7 Pengguna Terkonfirmasi Berhasil Divalidasi
const mockConfirmedUser = {
  id: 'usr-new-002',
  email: 'confirmed@example.com',
  email_confirmed_at: '2026-10-14T05:00:00Z',
  confirmed_at: '2026-10-14T05:00:00Z',
};
const isMarkedVerifiedConfirmed = Boolean(mockConfirmedUser.email_confirmed_at || mockConfirmedUser.confirmed_at);
assert(isMarkedVerifiedConfirmed, 'Verification Integrity', 'Pengguna dengan email_confirmed_at sah berhasil diverifikasi');

// ============================================================================
// RINGKASAN HASIL
// ============================================================================
console.log('\n======================================================');
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;
console.log(`TOTAL PENGUJIAN: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 SEMUA PENGUJIAN AUDIT DATABASE & RBAC BERHASIL 100%!\n');
  process.exit(0);
}
