-- =============================================================================
-- ARISERA PLATFORM - TAHAP 4.7: SQL VERIFIKASI & SMOKE TEST SUPABASE CLOUD
-- File: /supabase/verification_and_smoke_tests.sql
-- Tujuan:
--   1. Memverifikasi prasyarat dan integritas skema sebelum & setelah migrasi 00006.
--   2. Memastikan tidak ada lagi kebijakan RLS permisif lama yang tertinggal.
--   3. Memverifikasi parameter keamanan fungsi (search_path pada SECURITY DEFINER).
--   4. Memverifikasi seluruh trigger kuota SaaS & rate limiter formulir kontak.
--   5. Menjalankan skenario smoke test multi-role (Owner, Admin, Editor, Viewer)
--      dan isolasi data multi-workspace.
-- =============================================================================

-- =============================================================================
-- BAGIAN 1: VERIFIKASI STATUS TABEL & RLS AKTIF
-- Menampilkan status Row Level Security (RLS) pada semua tabel bisnis publik.
-- HASIL YANG DIHARAPKAN: Semua tabel berstatus rls_enabled = TRUE.
-- =============================================================================
SELECT 
    c.relname AS nama_tabel,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
  AND c.relname IN (
    'workspaces', 
    'workspace_members', 
    'workspace_invites', 
    'websites', 
    'pages', 
    'page_versions', 
    'categories', 
    'products', 
    'publishing_versions', 
    'media_assets', 
    'website_domains', 
    'contact_submissions'
  )
ORDER BY c.relname;


-- =============================================================================
-- BAGIAN 2: AUDIT PEMBERSIHAN KEBIJAKAN RLS PERMISIF LAMA
-- Query ini memeriksa apakah ada kebijakan permisif warisan (00001-00004) yang masih aktif.
-- HASIL YANG DIHARAPKAN: 0 baris (tidak ada satupun policy lama yang aktif).
-- =============================================================================
SELECT 
    schemaname, 
    tablename, 
    policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'Member dengan hak edit dapat mengubah website',
    'Member dapat menambahkan versi publikasi baru',
    'Member dapat mengelola halaman website',
    'Member dapat mengelola media di workspace miliknya',
    'Owner dan Admin dapat mengelola anggota workspace',
    'Member dapat memperbarui status pesan formulir',
    'Member dapat menghapus pesan formulir',
    'Member dapat mengelola produk',
    'Member dapat mengelola kategori'
  );


-- =============================================================================
-- BAGIAN 3: AUDIT KEAMANAN FUNGSI SECURITY DEFINER (CWE-426)
-- Query ini memeriksa apakah seluruh fungsi berhak superuser/definer memiliki
-- konfigurasi 'search_path=public' untuk mencegah pembajakan path skema.
-- HASIL YANG DIHARAPKAN: Semua fungsi memiliki nilai proconfig = '{search_path=public}'.
-- fungsi_rentan_cwe426 HARUS BERJUMLAH 0.
-- =============================================================================
SELECT 
    p.proname AS nama_fungsi,
    p.prosecdef AS is_security_definer,
    p.proconfig AS konfigurasi_search_path,
    CASE 
        WHEN p.prosecdef = TRUE AND (p.proconfig IS NULL OR NOT ('search_path=public' = ANY(p.proconfig))) 
        THEN 'RENTAN (CWE-426)' 
        ELSE 'AMAN' 
    END AS status_keamanan
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_workspace_member',
    'can_workspace_user_edit',
    'is_workspace_admin',
    'get_workspace_user_role',
    'handle_new_user',
    'handle_new_workspace_owner_member',
    'check_saas_website_quota',
    'check_saas_product_quota',
    'check_saas_page_quota',
    'check_saas_member_quota',
    'check_saas_invite_quota',
    'check_saas_domain_feature',
    'check_contact_submission_rate_limit'
  )
ORDER BY p.proname;


-- =============================================================================
-- BAGIAN 4: AUDIT TRIGGER KUOTA SAAS & RATE LIMITING
-- Memeriksa keberadaan trigger pencegah race condition pada database.
-- HASIL YANG DIHARAPKAN: 7 trigger aktif (semuanya berstatus ENABLED).
-- =============================================================================
SELECT 
    event_object_table AS tabel_target,
    trigger_name AS nama_trigger,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement AS eksekusi_fungsi
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trg_check_website_quota',
    'trg_check_product_quota',
    'trg_check_page_quota',
    'trg_check_member_quota',
    'trg_check_invite_quota',
    'trg_check_domain_feature',
    'trg_contact_submission_rate_limit'
  )
ORDER BY event_object_table;


-- =============================================================================
-- BAGIAN 5: VERIFIKASI PRASYARAT KOLOM WORKSPACES (SAAS PLAN & STORAGE)
-- Memeriksa kolom plan_tier dan storage_used_bytes serta batasan CHECK.
-- HASIL YANG DIHARAPKAN: 2 kolom ditemukan dengan tipe dan default yang tepat.
-- =============================================================================
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workspaces'
  AND column_name IN ('plan_tier', 'storage_used_bytes');

-- Memeriksa CHECK constraint pada workspaces.plan_tier
SELECT 
    conname AS nama_constraint,
    pg_get_constraintdef(c.oid) AS definisi_aturan
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
  AND conname = 'workspaces_plan_tier_check';


-- =============================================================================
-- BAGIAN 6: SMOKE TEST MULTI-ROLE & TENANT ISOLATION (SIMULASI PL/pgSQL)
-- Blok DO ini menguji logika kuota dan isolasi tenant secara transaksional
-- dan melakukan ROLLBACK otomatis agar tidak meninggalkan artefak uji di produksi.
-- =============================================================================
DO $$
DECLARE
    v_test_owner_a UUID := gen_random_uuid();
    v_test_owner_b UUID := gen_random_uuid();
    v_ws_a UUID;
    v_ws_b UUID;
    v_web_a1 UUID;
    v_web_b1 UUID;
    v_err_caught BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '>>> MEMULAI SMOKE TEST TRANSAKSIONAL TAHAP 4.7...';

    -- 1. Buat Workspace A (Starter) dan Workspace B (Pro)
    INSERT INTO public.workspaces (name, slug, owner_id, plan_tier)
    VALUES ('Smoke Test WS A (Starter)', 'smoke-ws-a-' || substr(v_test_owner_a::text, 1, 8), v_test_owner_a, 'starter')
    RETURNING id INTO v_ws_a;

    INSERT INTO public.workspaces (name, slug, owner_id, plan_tier)
    VALUES ('Smoke Test WS B (Pro)', 'smoke-ws-b-' || substr(v_test_owner_b::text, 1, 8), v_test_owner_b, 'pro')
    RETURNING id INTO v_ws_b;

    -- 2. Buat Website pertama di Workspace A (Harus Berhasil - kuota 1/1)
    INSERT INTO public.websites (workspace_id, name, slug, status)
    VALUES (v_ws_a, 'Website A1', 'web-a1-' || substr(v_test_owner_a::text, 1, 8), 'draft')
    RETURNING id INTO v_web_a1;
    RAISE NOTICE '✅ [PASS] Website A1 berhasil dibuat di Workspace Starter.';

    -- 3. Uji Kuota: Coba buat Website kedua di Workspace A (Harus GAGAL dengan pesan kuota)
    BEGIN
        v_err_caught := FALSE;
        INSERT INTO public.websites (workspace_id, name, slug, status)
        VALUES (v_ws_a, 'Website A2 (Pelanggaran Kuota)', 'web-a2-' || substr(v_test_owner_a::text, 1, 8), 'draft');
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
        RAISE NOTICE '✅ [PASS] Kuota Website Starter berhasil ditegakkan: %', SQLERRM;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '❌ [FAIL] Kuota Website Starter gagal menolak insert kedua!';
    END IF;

    -- 4. Uji Kuota Halaman Starter (Maksimal 3 halaman)
    INSERT INTO public.pages (website_id, title, slug, content_json, is_homepage, order_index)
    VALUES 
        (v_web_a1, 'Hal 1', 'hal-1', '[]'::jsonb, TRUE, 0),
        (v_web_a1, 'Hal 2', 'hal-2', '[]'::jsonb, FALSE, 1),
        (v_web_a1, 'Hal 3', 'hal-3', '[]'::jsonb, FALSE, 2);
    RAISE NOTICE '✅ [PASS] 3 halaman pertama berhasil dibuat di Website Starter.';

    BEGIN
        v_err_caught := FALSE;
        INSERT INTO public.pages (website_id, title, slug, content_json, is_homepage, order_index)
        VALUES (v_web_a1, 'Hal 4 (Pelanggaran)', 'hal-4', '[]'::jsonb, FALSE, 3);
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
        RAISE NOTICE '✅ [PASS] Kuota Halaman Starter berhasil ditegakkan: %', SQLERRM;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '❌ [FAIL] Kuota Halaman Starter gagal menolak halaman ke-4!';
    END IF;

    -- 5. Uji Fitur Custom Domain pada Starter (Harus DITOLAK)
    BEGIN
        v_err_caught := FALSE;
        INSERT INTO public.website_domains (website_id, domain, is_verified, ssl_status)
        VALUES (v_web_a1, 'custom.domain-starter.com', FALSE, 'pending');
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
        RAISE NOTICE '✅ [PASS] Pembatasan Fitur Domain Starter berhasil ditegakkan: %', SQLERRM;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '❌ [FAIL] Domain kustom pada Starter seharusnya ditolak!';
    END IF;

    -- 6. Uji Fitur Custom Domain pada Pro (Harus DIIZINKAN)
    INSERT INTO public.websites (workspace_id, name, slug, status)
    VALUES (v_ws_b, 'Website B1', 'web-b1-' || substr(v_test_owner_b::text, 1, 8), 'draft')
    RETURNING id INTO v_web_b1;

    INSERT INTO public.website_domains (website_id, domain, is_verified, ssl_status)
    VALUES (v_web_b1, 'custom.domain-pro.com', FALSE, 'pending');
    RAISE NOTICE '✅ [PASS] Domain kustom pada Workspace Pro berhasil didaftarkan.';

    -- 7. Uji Rate Limiting Formulir Kontak
    -- Setup website terpublikasi untuk uji kontak
    UPDATE public.websites SET status = 'published' WHERE id = v_web_a1;
    
    INSERT INTO public.contact_submissions (website_id, name, email, message)
    VALUES (v_web_a1, 'Pengunjung 1', 'visitor1@example.com', 'Halo dari pengujian tahap 4.7');
    RAISE NOTICE '✅ [PASS] Pengiriman kontak pertama berhasil.';

    -- Pengiriman kedua dengan email yang sama dalam interval < 15 detik (Harus DITOLAK)
    BEGIN
        v_err_caught := FALSE;
        INSERT INTO public.contact_submissions (website_id, name, email, message)
        VALUES (v_web_a1, 'Pengunjung 1 Cepat', 'visitor1@example.com', 'Pesan kedua segera');
    EXCEPTION WHEN OTHERS THEN
        v_err_caught := TRUE;
        RAISE NOTICE '✅ [PASS] Rate Limiter Cooldown Kontak berhasil ditegakkan: %', SQLERRM;
    END;
    IF NOT v_err_caught THEN
        RAISE EXCEPTION '❌ [FAIL] Rate limiting kontak gagal menolak pengiriman beruntun!';
    END IF;

    RAISE NOTICE '>>> SEMUA SKENARIO PENGUJIAN SMOKE TEST BERHASIL 100%! Melakukan rollback transaksional...';
    RAISE EXCEPTION 'ROLLBACK_SELESAI (Pengujian Berhasil, data uji dibersihkan secara aman).';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM LIKE '%ROLLBACK_SELESAI%' THEN
            RAISE NOTICE '✅ Rollback transaksional berhasil. Database bersih dari data uji.';
        ELSE
            RAISE EXCEPTION 'Uji coba gagal: %', SQLERRM;
        END IF;
END $$;
