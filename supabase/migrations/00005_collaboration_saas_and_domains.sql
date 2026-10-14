-- =============================================================================
-- ARISERA PLATFORM - MIGRATION 00005: WORKSPACE COLLABORATION, DOMAINS & SAAS
-- Migrasi: 00005_collaboration_saas_and_domains.sql
-- Tujuan: Menyiapkan tabel `workspace_invites`, fungsi peran RBAC,
--         validasi kuota SaaS, dan kebijakan keamanan domain kustom.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. PERSIAPAN SKEMA WORKSPACES: TIER SAAS & KUOTA
-- -----------------------------------------------------------------------------
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'starter' 
CHECK (plan_tier IN ('starter', 'pro', 'enterprise'));

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0;

-- -----------------------------------------------------------------------------
-- 1. TABEL: workspace_invites (Undangan kolaborasi anggota baru)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON public.workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email ON public.workspace_invites(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON public.workspace_invites(token);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS: RBAC & Hak Akses
-- -----------------------------------------------------------------------------

-- Mengambil peran user saat ini pada ruang kerja tertentu
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Memeriksa apakah user saat ini adalah Owner atau Admin di ruang kerja
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. Kebijakan RLS: workspace_invites
-- -----------------------------------------------------------------------------

-- Member Admin & Owner dapat melihat daftar undangan di workspacenya
DROP POLICY IF EXISTS "Admin dapat melihat undangan workspace" ON public.workspace_invites;
CREATE POLICY "Admin dapat melihat undangan workspace"
    ON public.workspace_invites FOR SELECT
    USING (public.is_workspace_admin(workspace_id));

-- Admin & Owner dapat membuat undangan baru
DROP POLICY IF EXISTS "Admin dapat membuat undangan workspace" ON public.workspace_invites;
CREATE POLICY "Admin dapat membuat undangan workspace"
    ON public.workspace_invites FOR INSERT
    WITH CHECK (public.is_workspace_admin(workspace_id));

-- Admin & Owner dapat membatalkan atau memperbarui status undangan
DROP POLICY IF EXISTS "Admin dapat memperbarui undangan workspace" ON public.workspace_invites;
CREATE POLICY "Admin dapat memperbarui undangan workspace"
    ON public.workspace_invites FOR UPDATE
    USING (public.is_workspace_admin(workspace_id));

-- Admin & Owner dapat menghapus undangan
DROP POLICY IF EXISTS "Admin dapat menghapus undangan workspace" ON public.workspace_invites;
CREATE POLICY "Admin dapat menghapus undangan workspace"
    ON public.workspace_invites FOR DELETE
    USING (public.is_workspace_admin(workspace_id));

-- -----------------------------------------------------------------------------
-- 4. Penguatan RLS untuk workspace_members: Proteksi Peran
-- -----------------------------------------------------------------------------

-- Hanya Admin dan Owner yang dapat menambahkan anggota baru
DROP POLICY IF EXISTS "Admin dapat menambahkan anggota workspace" ON public.workspace_members;
CREATE POLICY "Admin dapat menambahkan anggota workspace"
    ON public.workspace_members FOR INSERT
    WITH CHECK (public.is_workspace_admin(workspace_id));

-- Admin dan Owner dapat mengubah peran (namun Admin tidak dapat menurunkan Owner)
DROP POLICY IF EXISTS "Admin dapat memperbarui peran anggota" ON public.workspace_members;
CREATE POLICY "Admin dapat memperbarui peran anggota"
    ON public.workspace_members FOR UPDATE
    USING (
        public.is_workspace_admin(workspace_id)
        AND (role != 'owner' OR (SELECT role FROM public.workspace_members WHERE workspace_id = workspace_members.workspace_id AND user_id = auth.uid()) = 'owner')
    );

-- Admin dan Owner dapat menghapus anggota (tidak dapat menghapus Owner)
DROP POLICY IF EXISTS "Admin dapat menghapus anggota workspace" ON public.workspace_members;
CREATE POLICY "Admin dapat menghapus anggota workspace"
    ON public.workspace_members FOR DELETE
    USING (
        public.is_workspace_admin(workspace_id)
        AND role != 'owner'
    );

-- -----------------------------------------------------------------------------
-- 5. Kebijakan RLS untuk website_domains: Domain Management
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Member dapat melihat domain websitenya" ON public.website_domains;
CREATE POLICY "Member dapat melihat domain websitenya"
    ON public.website_domains FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = website_domains.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

DROP POLICY IF EXISTS "Admin dapat mengelola domain websitenya" ON public.website_domains;
CREATE POLICY "Admin dapat mengelola domain websitenya"
    ON public.website_domains FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = website_domains.website_id
        AND public.is_workspace_admin(w.workspace_id)
    ));

-- -----------------------------------------------------------------------------
-- 6. Penegakan Kuota Paket SaaS (Starter, Pro, Enterprise)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_saas_website_quota()
RETURNS TRIGGER AS $$
DECLARE
    _plan TEXT;
    _current_count INTEGER;
BEGIN
    SELECT plan_tier INTO _plan FROM public.workspaces WHERE id = NEW.workspace_id;
    SELECT COUNT(*) INTO _current_count FROM public.websites WHERE workspace_id = NEW.workspace_id;

    IF _plan = 'starter' AND _current_count >= 1 THEN
        RAISE EXCEPTION 'Batas kuota tercapai: Paket Starter hanya dapat membuat maksimal 1 website. Silakan tingkatkan ke paket Pro.';
    ELSIF _plan = 'pro' AND _current_count >= 5 THEN
        RAISE EXCEPTION 'Batas kuota tercapai: Paket Pro hanya dapat membuat maksimal 5 website. Silakan tingkatkan ke paket Enterprise.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_website_quota ON public.websites;
CREATE TRIGGER trg_check_website_quota
    BEFORE INSERT ON public.websites
    FOR EACH ROW
    EXECUTE FUNCTION public.check_saas_website_quota();
