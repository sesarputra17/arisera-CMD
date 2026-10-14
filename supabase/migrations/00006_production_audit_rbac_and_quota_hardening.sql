-- =============================================================================
-- ARISERA PLATFORM - MIGRATION 00006: PRODUCTION AUDIT, RBAC & QUOTA HARDENING
-- Migrasi: 00006_production_audit_rbac_and_quota_hardening.sql
-- Tujuan:
--   1. Memperbaiki skema kolom prasyarat (plan_tier, storage_used_bytes).
--   2. Memperbaiki search_path pada seluruh fungsi SECURITY DEFINER untuk mencegah CWE-426.
--   3. Menghapus seluruh kebijakan RLS permisif lama (00001-00005) yang tumpang tindih.
--   4. Menegakkan hak akses RBAC ketat (Owner, Admin, Editor, Viewer).
--   5. Menegakkan kuota SaaS anti-race-condition (FOR UPDATE) untuk Starter, Pro, & Enterprise.
--   6. Menerapkan server-side rate limiting, validasi input, dan proteksi DoS pada contact_submissions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. INTEGRITAS SKEMA & PRASYARAT KOLOM (IDEMPOTENT & NON-DESTRUCTIVE)
-- Menjamin kolom dan konstrain siap terlepas dari apakah 00005 sudah/belum dijalankan
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'plan_tier'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'starter';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'storage_used_bytes'
    ) THEN
        ALTER TABLE public.workspaces ADD COLUMN storage_used_bytes BIGINT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Pastikan baris data yang ada tidak bernilai NULL
UPDATE public.workspaces SET plan_tier = 'starter' WHERE plan_tier IS NULL;
UPDATE public.workspaces SET storage_used_bytes = 0 WHERE storage_used_bytes IS NULL;

-- Pasang CHECK constraint jika belum terpasang
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_plan_tier_check'
    ) THEN
        ALTER TABLE public.workspaces 
        ADD CONSTRAINT workspaces_plan_tier_check 
        CHECK (plan_tier IN ('starter', 'pro', 'enterprise'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 1. HARDENING FUNGSI SECURITY DEFINER & SEARCH_PATH (CWE-426 PREVENTION)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = _workspace_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_workspace_user_edit(_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = _workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'editor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = _workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_workspace_user_role(_workspace_id UUID)
RETURNS TEXT AS $$
DECLARE
    _role TEXT;
BEGIN
    SELECT role INTO _role
    FROM public.workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = auth.uid()
    LIMIT 1;
    
    RETURN _role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_workspace_owner_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, created_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------------------------------------
-- 2. RESOLUSI KONFLIK KEBIJAKAN RLS LAMA DAN PENEGAKAN RBAC KETAT
-- -----------------------------------------------------------------------------

-- ==========================================
-- A. TABEL: websites
-- Menghapus izin 'FOR ALL' permisif dari 00001 dan 00002 yang memungkinkan Viewer mengedit/menghapus
-- ==========================================
DROP POLICY IF EXISTS "Member dengan hak edit dapat mengubah website" ON public.websites;
DROP POLICY IF EXISTS "Member dapat melihat website di workspace miliknya" ON public.websites;
DROP POLICY IF EXISTS "Publik dapat melihat website yang sudah diterbitkan" ON public.websites;
DROP POLICY IF EXISTS "Editor dan Admin dapat mengubah website" ON public.websites;
DROP POLICY IF EXISTS "Admin dan Owner dapat membuat website" ON public.websites;
DROP POLICY IF EXISTS "Admin dan Owner dapat menghapus website" ON public.websites;

-- 1. Semua member dapat membaca website dalam workspace miliknya
CREATE POLICY "Member dapat melihat website di workspace miliknya"
    ON public.websites FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- 2. Publik dapat membaca website yang telah diterbitkan
CREATE POLICY "Publik dapat melihat website yang sudah diterbitkan"
    ON public.websites FOR SELECT
    USING (status = 'published');

-- 3. Hanya Owner dan Admin yang dapat membuat website baru
CREATE POLICY "Admin dan Owner dapat membuat website"
    ON public.websites FOR INSERT
    WITH CHECK (public.is_workspace_admin(workspace_id));

-- 4. Editor, Admin, dan Owner dapat memperbarui konfigurasi website
CREATE POLICY "Editor dan Admin dapat mengubah website"
    ON public.websites FOR UPDATE
    USING (public.can_workspace_user_edit(workspace_id))
    WITH CHECK (public.can_workspace_user_edit(workspace_id));

-- 5. Hanya Admin dan Owner yang dapat menghapus website
CREATE POLICY "Admin dan Owner dapat menghapus website"
    ON public.websites FOR DELETE
    USING (public.is_workspace_admin(workspace_id));


-- ==========================================
-- B. TABEL: products
-- ==========================================
DROP POLICY IF EXISTS "Member dapat mengelola produk" ON public.products;
DROP POLICY IF EXISTS "Member dapat membaca produk workspace" ON public.products;
DROP POLICY IF EXISTS "Editor dapat mengelola produk workspace" ON public.products;
DROP POLICY IF EXISTS "Publik dapat melihat produk yang tersedia" ON public.products;

CREATE POLICY "Member dapat membaca produk workspace"
    ON public.products FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = products.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

CREATE POLICY "Publik dapat melihat produk yang tersedia"
    ON public.products FOR SELECT
    USING (is_available = TRUE AND EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = products.website_id AND w.status = 'published'
    ));

CREATE POLICY "Editor dapat mengelola produk workspace"
    ON public.products FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = products.website_id
        AND public.can_workspace_user_edit(w.workspace_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = products.website_id
        AND public.can_workspace_user_edit(w.workspace_id)
    ));


-- ==========================================
-- C. TABEL: pages
-- Menghapus kebijakan dari 00001 ("Member dapat mengelola halaman website") dan 00006
-- ==========================================
DROP POLICY IF EXISTS "Member dapat mengelola halaman website" ON public.pages;
DROP POLICY IF EXISTS "Member dengan hak edit dapat mengelola halaman" ON public.pages;
DROP POLICY IF EXISTS "Member dapat melihat halaman websitenya" ON public.pages;
DROP POLICY IF EXISTS "Editor dapat mengelola halaman websitenya" ON public.pages;
DROP POLICY IF EXISTS "Publik dapat melihat halaman website yang diterbitkan" ON public.pages;

CREATE POLICY "Member dapat melihat halaman websitenya"
    ON public.pages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = pages.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

CREATE POLICY "Publik dapat melihat halaman website yang diterbitkan"
    ON public.pages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = pages.website_id AND w.status = 'published'
    ));

CREATE POLICY "Editor dapat mengelola halaman websitenya"
    ON public.pages FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = pages.website_id
        AND public.can_workspace_user_edit(w.workspace_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = pages.website_id
        AND public.can_workspace_user_edit(w.workspace_id)
    ));


-- ==========================================
-- D. TABEL: page_versions
-- Mengisi celah kebijakan RLS yang sebelumnya kosong pada page_versions
-- ==========================================
DROP POLICY IF EXISTS "Member dapat melihat versi halaman" ON public.page_versions;
CREATE POLICY "Member dapat melihat versi halaman"
    ON public.page_versions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.pages p
        JOIN public.websites w ON w.id = p.website_id
        WHERE p.id = page_versions.page_id
        AND public.is_workspace_member(w.workspace_id)
    ));

DROP POLICY IF EXISTS "Editor dapat membuat versi halaman" ON public.page_versions;
CREATE POLICY "Editor dapat membuat versi halaman"
    ON public.page_versions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.pages p
        JOIN public.websites w ON w.id = p.website_id
        WHERE p.id = page_versions.page_id
        AND public.can_workspace_user_edit(w.workspace_id)
    ));


-- ==========================================
-- E. TABEL: categories
-- ==========================================
DROP POLICY IF EXISTS "Member dapat mengelola kategori" ON public.categories;
DROP POLICY IF EXISTS "Member dapat melihat kategori" ON public.categories;
DROP POLICY IF EXISTS "Editor dapat mengelola kategori" ON public.categories;
DROP POLICY IF EXISTS "Publik dapat melihat kategori website terpublikasi" ON public.categories;

CREATE POLICY "Member dapat melihat kategori"
    ON public.categories FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = categories.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

CREATE POLICY "Publik dapat melihat kategori website terpublikasi"
    ON public.categories FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = categories.website_id AND w.status = 'published'
    ));

CREATE POLICY "Editor dapat mengelola kategori"
    ON public.categories FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = categories.website_id
        AND public.can_workspace_user_edit(w.workspace_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = categories.website_id
        AND public.can_workspace_user_edit(w.workspace_id)
    ));


-- ==========================================
-- F. TABEL: publishing_versions
-- RESOLUSI KRITIS: Hapus kebijakan lama 00003 yang mengizinkan semua member rilis publikasi
-- ==========================================
DROP POLICY IF EXISTS "Member dapat menambahkan versi publikasi baru" ON public.publishing_versions;
DROP POLICY IF EXISTS "Member dapat melihat riwayat versi website" ON public.publishing_versions;
DROP POLICY IF EXISTS "Publik dapat melihat versi publikasi aktif" ON public.publishing_versions;
DROP POLICY IF EXISTS "Hanya Admin dan Owner yang dapat membuat rilis publikasi" ON public.publishing_versions;

CREATE POLICY "Member dapat melihat riwayat versi website"
    ON public.publishing_versions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = publishing_versions.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

CREATE POLICY "Publik dapat melihat versi publikasi aktif"
    ON public.publishing_versions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = publishing_versions.website_id
        AND w.status = 'published'
        AND w.published_version_id = publishing_versions.id
    ));

CREATE POLICY "Hanya Admin dan Owner yang dapat membuat rilis publikasi"
    ON public.publishing_versions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = publishing_versions.website_id
        AND public.is_workspace_admin(w.workspace_id)
    ));


-- ==========================================
-- G. TABEL: media_assets
-- Membatasi hak modifikasi aset media (hanya Editor, Admin, Owner)
-- ==========================================
DROP POLICY IF EXISTS "Member dapat mengelola media di workspace miliknya" ON public.media_assets;
DROP POLICY IF EXISTS "Member dapat melihat media di workspace miliknya" ON public.media_assets;
DROP POLICY IF EXISTS "Editor dapat mengelola media workspace" ON public.media_assets;

CREATE POLICY "Member dapat melihat media di workspace miliknya"
    ON public.media_assets FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Editor dapat mengelola media workspace"
    ON public.media_assets FOR ALL
    USING (public.can_workspace_user_edit(workspace_id))
    WITH CHECK (public.can_workspace_user_edit(workspace_id));


-- ==========================================
-- H. TABEL: workspace_members
-- RESOLUSI KRITIS: Hapus kebijakan 00002 yang mengizinkan Admin mengubah Owner
-- ==========================================
DROP POLICY IF EXISTS "Owner dan Admin dapat mengelola anggota workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Member dapat melihat daftar anggota tim workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Admin dapat menambahkan anggota workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Admin dapat memperbarui peran anggota" ON public.workspace_members;
DROP POLICY IF EXISTS "Admin dapat menghapus anggota workspace" ON public.workspace_members;

CREATE POLICY "Member dapat melihat daftar anggota tim workspace"
    ON public.workspace_members FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admin dapat menambahkan anggota workspace"
    ON public.workspace_members FOR INSERT
    WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admin dapat memperbarui peran anggota"
    ON public.workspace_members FOR UPDATE
    USING (
        public.is_workspace_admin(workspace_id)
        AND (
            role != 'owner' 
            OR (SELECT role FROM public.workspace_members WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid()) = 'owner'
        )
    );

CREATE POLICY "Admin dapat menghapus anggota workspace"
    ON public.workspace_members FOR DELETE
    USING (
        public.is_workspace_admin(workspace_id)
        AND role != 'owner'
    );


-- ==========================================
-- I. TABEL: contact_submissions
-- Membatasi pembaruan dan penghapusan pesan hanya untuk Editor, Admin, Owner (Viewer hanya baca)
-- ==========================================
DROP POLICY IF EXISTS "Publik dapat mengirim pesan ke website terpublikasi" ON public.contact_submissions;
DROP POLICY IF EXISTS "Member dapat melihat pesan masuk website miliknya" ON public.contact_submissions;
DROP POLICY IF EXISTS "Member dapat memperbarui status pesan formulir" ON public.contact_submissions;
DROP POLICY IF EXISTS "Member dapat menghapus pesan formulir" ON public.contact_submissions;
DROP POLICY IF EXISTS "Editor dan Admin dapat memperbarui status pesan formulir" ON public.contact_submissions;
DROP POLICY IF EXISTS "Editor dan Admin dapat menghapus pesan formulir" ON public.contact_submissions;

CREATE POLICY "Publik dapat mengirim pesan ke website terpublikasi"
    ON public.contact_submissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.websites w
            WHERE w.id = contact_submissions.website_id
            AND w.status = 'published'
        )
    );

CREATE POLICY "Member dapat melihat pesan masuk website miliknya"
    ON public.contact_submissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.websites w
            WHERE w.id = contact_submissions.website_id
            AND public.is_workspace_member(w.workspace_id)
        )
    );

CREATE POLICY "Editor dan Admin dapat memperbarui status pesan formulir"
    ON public.contact_submissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.websites w
            WHERE w.id = contact_submissions.website_id
            AND public.can_workspace_user_edit(w.workspace_id)
        )
    );

CREATE POLICY "Editor dan Admin dapat menghapus pesan formulir"
    ON public.contact_submissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.websites w
            WHERE w.id = contact_submissions.website_id
            AND public.can_workspace_user_edit(w.workspace_id)
        )
    );


-- ==========================================
-- J. TABEL: workspace_invites
-- Perlindungan ketat: Hanya Admin dan Owner yang dapat melihat & mengelola undangan
-- ==========================================
DROP POLICY IF EXISTS "Admin dapat melihat undangan workspace" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admin dapat membuat undangan workspace" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admin dapat memperbarui undangan workspace" ON public.workspace_invites;
DROP POLICY IF EXISTS "Admin dapat menghapus undangan workspace" ON public.workspace_invites;

CREATE POLICY "Admin dapat melihat undangan workspace"
    ON public.workspace_invites FOR SELECT
    USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admin dapat membuat undangan workspace"
    ON public.workspace_invites FOR INSERT
    WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admin dapat memperbarui undangan workspace"
    ON public.workspace_invites FOR UPDATE
    USING (public.is_workspace_admin(workspace_id))
    WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admin dapat menghapus undangan workspace"
    ON public.workspace_invites FOR DELETE
    USING (public.is_workspace_admin(workspace_id));


-- ==========================================
-- K. TABEL: website_domains
-- Perlindungan ketat: Member dapat melihat domain, hanya Admin/Owner yang dapat menambah/menghapus
-- ==========================================
DROP POLICY IF EXISTS "Member dapat melihat domain websitenya" ON public.website_domains;
DROP POLICY IF EXISTS "Admin dapat mengelola domain websitenya" ON public.website_domains;

CREATE POLICY "Member dapat melihat domain websitenya"
    ON public.website_domains FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = website_domains.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

CREATE POLICY "Admin dapat mengelola domain websitenya"
    ON public.website_domains FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = website_domains.website_id
        AND public.is_workspace_admin(w.workspace_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = website_domains.website_id
        AND public.is_workspace_admin(w.workspace_id)
    ));


-- -----------------------------------------------------------------------------
-- 3. PENEGAKAN KUOTA SAAS LENGKAP & ANTI-RACE-CONDITION (ROW LOCK FOR UPDATE)
-- Starter: 1 Website, 10 Produk, 3 Halaman, 1 Anggota, 0 Domain Kustom
-- Pro: 5 Website, 100 Produk, 15 Halaman, 5 Anggota, 3 Domain Kustom
-- Enterprise: 25 Website, 1000 Produk, 50 Halaman, 20 Anggota, 10 Domain Kustom
-- -----------------------------------------------------------------------------

-- A. Kuota Website
CREATE OR REPLACE FUNCTION public.check_saas_website_quota()
RETURNS TRIGGER AS $$
DECLARE
    _plan TEXT;
    _current_count INTEGER;
BEGIN
    SELECT plan_tier INTO _plan 
    FROM public.workspaces 
    WHERE id = NEW.workspace_id 
    FOR UPDATE;
    _plan := COALESCE(_plan, 'starter');

    SELECT COUNT(*) INTO _current_count 
    FROM public.websites 
    WHERE workspace_id = NEW.workspace_id;

    IF _plan = 'starter' AND _current_count >= 1 THEN
        RAISE EXCEPTION 'Batas kuota tercapai: Paket Starter hanya dapat membuat maksimal 1 website.';
    ELSIF _plan = 'pro' AND _current_count >= 5 THEN
        RAISE EXCEPTION 'Batas kuota tercapai: Paket Pro hanya dapat membuat maksimal 5 website.';
    ELSIF _plan = 'enterprise' AND _current_count >= 50 THEN
        RAISE EXCEPTION 'Batas kuota tercapai: Paket Enterprise hanya dapat membuat maksimal 50 website.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_website_quota ON public.websites;
CREATE TRIGGER trg_check_website_quota
    BEFORE INSERT ON public.websites
    FOR EACH ROW
    EXECUTE FUNCTION public.check_saas_website_quota();


-- B. Kuota Produk
CREATE OR REPLACE FUNCTION public.check_saas_product_quota()
RETURNS TRIGGER AS $$
DECLARE
    _ws_id UUID;
    _plan TEXT;
    _current_count INTEGER;
BEGIN
    SELECT workspace_id INTO _ws_id FROM public.websites WHERE id = NEW.website_id;
    
    SELECT plan_tier INTO _plan 
    FROM public.workspaces 
    WHERE id = _ws_id 
    FOR UPDATE;
    _plan := COALESCE(_plan, 'starter');

    SELECT COUNT(*) INTO _current_count 
    FROM public.products 
    WHERE website_id = NEW.website_id;

    IF _plan = 'starter' AND _current_count >= 10 THEN
        RAISE EXCEPTION 'Batas kuota produk tercapai: Paket Starter maksimal 10 produk per website.';
    ELSIF _plan = 'pro' AND _current_count >= 100 THEN
        RAISE EXCEPTION 'Batas kuota produk tercapai: Paket Pro maksimal 100 produk per website.';
    ELSIF _plan = 'enterprise' AND _current_count >= 1000 THEN
        RAISE EXCEPTION 'Batas kuota produk tercapai: Paket Enterprise maksimal 1000 produk per website.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_product_quota ON public.products;
CREATE TRIGGER trg_check_product_quota
    BEFORE INSERT ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.check_saas_product_quota();


-- C. Kuota Halaman per Website
CREATE OR REPLACE FUNCTION public.check_saas_page_quota()
RETURNS TRIGGER AS $$
DECLARE
    _ws_id UUID;
    _plan TEXT;
    _current_count INTEGER;
BEGIN
    SELECT workspace_id INTO _ws_id FROM public.websites WHERE id = NEW.website_id;
    
    SELECT plan_tier INTO _plan 
    FROM public.workspaces 
    WHERE id = _ws_id 
    FOR UPDATE;
    _plan := COALESCE(_plan, 'starter');

    SELECT COUNT(*) INTO _current_count 
    FROM public.pages 
    WHERE website_id = NEW.website_id;

    IF _plan = 'starter' AND _current_count >= 3 THEN
        RAISE EXCEPTION 'Batas kuota halaman tercapai: Paket Starter maksimal 3 halaman per website.';
    ELSIF _plan = 'pro' AND _current_count >= 15 THEN
        RAISE EXCEPTION 'Batas kuota halaman tercapai: Paket Pro maksimal 15 halaman per website.';
    ELSIF _plan = 'enterprise' AND _current_count >= 100 THEN
        RAISE EXCEPTION 'Batas kuota halaman tercapai: Paket Enterprise maksimal 100 halaman per website.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_page_quota ON public.pages;
CREATE TRIGGER trg_check_page_quota
    BEFORE INSERT ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION public.check_saas_page_quota();


-- D. Kuota Anggota Tim Workspace
CREATE OR REPLACE FUNCTION public.check_saas_member_quota()
RETURNS TRIGGER AS $$
DECLARE
    _plan TEXT;
    _current_count INTEGER;
BEGIN
    SELECT plan_tier INTO _plan 
    FROM public.workspaces 
    WHERE id = NEW.workspace_id 
    FOR UPDATE;
    _plan := COALESCE(_plan, 'starter');

    SELECT COUNT(*) INTO _current_count 
    FROM public.workspace_members 
    WHERE workspace_id = NEW.workspace_id;

    IF _plan = 'starter' AND _current_count >= 1 THEN
        RAISE EXCEPTION 'Batas kuota anggota tercapai: Paket Starter hanya mengizinkan 1 pengguna (Owner).';
    ELSIF _plan = 'pro' AND _current_count >= 5 THEN
        RAISE EXCEPTION 'Batas kuota anggota tercapai: Paket Pro maksimal 5 pengguna.';
    ELSIF _plan = 'enterprise' AND _current_count >= 20 THEN
        RAISE EXCEPTION 'Batas kuota anggota tercapai: Paket Enterprise maksimal 20 pengguna.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_member_quota ON public.workspace_members;
CREATE TRIGGER trg_check_member_quota
    BEFORE INSERT ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.check_saas_member_quota();


-- E. Kuota Undangan Kolaborator (Mencegah Over-invitation)
CREATE OR REPLACE FUNCTION public.check_saas_invite_quota()
RETURNS TRIGGER AS $$
DECLARE
    _plan TEXT;
    _current_members INTEGER;
    _pending_invites INTEGER;
BEGIN
    SELECT plan_tier INTO _plan 
    FROM public.workspaces 
    WHERE id = NEW.workspace_id 
    FOR UPDATE;
    _plan := COALESCE(_plan, 'starter');

    SELECT COUNT(*) INTO _current_members 
    FROM public.workspace_members 
    WHERE workspace_id = NEW.workspace_id;

    SELECT COUNT(*) INTO _pending_invites 
    FROM public.workspace_invites 
    WHERE workspace_id = NEW.workspace_id AND status = 'pending';

    IF _plan = 'starter' AND (_current_members + _pending_invites) >= 1 THEN
        RAISE EXCEPTION 'Paket Starter tidak mendukung penambahan kolaborator. Silakan upgrade ke Paket Pro.';
    ELSIF _plan = 'pro' AND (_current_members + _pending_invites) >= 5 THEN
        RAISE EXCEPTION 'Batas maksimal 5 anggota (termasuk undangan tertunda) telah tercapai pada Paket Pro.';
    ELSIF _plan = 'enterprise' AND (_current_members + _pending_invites) >= 20 THEN
        RAISE EXCEPTION 'Batas maksimal 20 anggota (termasuk undangan tertunda) telah tercapai pada Paket Enterprise.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_invite_quota ON public.workspace_invites;
CREATE TRIGGER trg_check_invite_quota
    BEFORE INSERT ON public.workspace_invites
    FOR EACH ROW
    EXECUTE FUNCTION public.check_saas_invite_quota();


-- F. Penegakan Fitur & Kuota Domain Kustom
CREATE OR REPLACE FUNCTION public.check_saas_domain_feature()
RETURNS TRIGGER AS $$
DECLARE
    _ws_id UUID;
    _plan TEXT;
    _domain_count INTEGER;
BEGIN
    SELECT workspace_id INTO _ws_id FROM public.websites WHERE id = NEW.website_id;
    
    SELECT plan_tier INTO _plan 
    FROM public.workspaces 
    WHERE id = _ws_id 
    FOR UPDATE;
    _plan := COALESCE(_plan, 'starter');

    IF _plan = 'starter' THEN
        RAISE EXCEPTION 'Domain kustom tidak didukung pada Paket Starter. Silakan tingkatkan ke Paket Pro.';
    END IF;

    SELECT COUNT(*) INTO _domain_count
    FROM public.website_domains wd
    JOIN public.websites w ON w.id = wd.website_id
    WHERE w.workspace_id = _ws_id;

    IF _plan = 'pro' AND _domain_count >= 3 THEN
        RAISE EXCEPTION 'Batas kuota domain kustom tercapai: Paket Pro maksimal 3 domain.';
    ELSIF _plan = 'enterprise' AND _domain_count >= 10 THEN
        RAISE EXCEPTION 'Batas kuota domain kustom tercapai: Paket Enterprise maksimal 10 domain.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_domain_feature ON public.website_domains;
CREATE TRIGGER trg_check_domain_feature
    BEFORE INSERT ON public.website_domains
    FOR EACH ROW
    EXECUTE FUNCTION public.check_saas_domain_feature();


-- -----------------------------------------------------------------------------
-- 4. HARDENED SERVER-SIDE RATE LIMITING & SANITIZATION: FORMULIR KONTAK
-- Menangani race condition via advisory lock, per-email cooldown, per-website flood,
-- normalisasi email, dan validasi panjang teks.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_contact_submission_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    _clean_email TEXT;
    _last_submitted TIMESTAMPTZ;
    _recent_count INTEGER;
BEGIN
    -- 1. Normalisasi dan validasi input
    _clean_email := LOWER(TRIM(NEW.email));
    NEW.email := _clean_email;
    NEW.name := TRIM(NEW.name);
    NEW.message := TRIM(NEW.message);
    NEW.created_at := TIMEZONE('utc'::text, NOW()); -- Timestamp server otoritatif

    IF LENGTH(NEW.name) < 2 OR LENGTH(NEW.name) > 100 THEN
        RAISE EXCEPTION 'Nama pengirim harus terdiri dari 2 hingga 100 karakter.';
    END IF;

    IF NOT (_clean_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        RAISE EXCEPTION 'Format email tidak valid.';
    END IF;

    IF LENGTH(NEW.message) < 5 OR LENGTH(NEW.message) > 5000 THEN
        RAISE EXCEPTION 'Pesan formulir harus terdiri dari 5 hingga 5000 karakter.';
    END IF;

    -- 2. Transaksi Lock per (website_id, email) untuk mencegah race condition konkuren
    PERFORM pg_advisory_xact_lock(hashtext(NEW.website_id::text || ':' || _clean_email));

    -- 3. Pemeriksaan Cooldown per-email (15 detik)
    SELECT created_at INTO _last_submitted
    FROM public.contact_submissions
    WHERE website_id = NEW.website_id
    AND email = _clean_email
    ORDER BY created_at DESC
    LIMIT 1;

    IF _last_submitted IS NOT NULL AND (NOW() - _last_submitted) < INTERVAL '15 seconds' THEN
        RAISE EXCEPTION 'Permintaan dibatasi: Harap tunggu 15 detik sebelum mengirim pesan kembali.';
    END IF;

    -- 4. Perlindungan Flood Attack per-website (Maksimal 10 pengiriman per 30 detik untuk website yang sama)
    SELECT COUNT(*) INTO _recent_count
    FROM public.contact_submissions
    WHERE website_id = NEW.website_id
    AND created_at >= (NOW() - INTERVAL '30 seconds');

    IF _recent_count >= 10 THEN
        RAISE EXCEPTION 'Layanan formulir sedang sibuk menerima banyak pesan. Silakan coba kembali dalam 1 menit.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_contact_submission_rate_limit ON public.contact_submissions;
CREATE TRIGGER trg_contact_submission_rate_limit
    BEFORE INSERT ON public.contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_contact_submission_rate_limit();
