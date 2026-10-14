-- =============================================================================
-- ARISERA PLATFORM - REFINEMENT MIGRATION: RLS POLICIES & MEMBERSHIP TRIGGERS
-- Migrasi: 00002_rls_and_membership_triggers.sql
-- Tujuan: Memperbaiki alur pembuatan workspace, insert anggota, dan trigger profil pengguna
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Trigger Otomatis: Sinkronisasi auth.users ke public.users
-- -----------------------------------------------------------------------------
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger pada tabel auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. Trigger Otomatis: Otomatis Daftarkan Owner sebagai Member Saat Workspace Dibuat
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_workspace_owner_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, created_at)
    VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created_add_owner ON public.workspaces;
CREATE TRIGGER on_workspace_created_add_owner
    AFTER INSERT ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace_owner_member();

-- -----------------------------------------------------------------------------
-- 3. Kebijakan RLS Lengkap untuk workspace_members (Insert, Update, Delete)
-- -----------------------------------------------------------------------------
-- Izinkan Owner dan Admin workspace untuk mengelola anggota
DROP POLICY IF EXISTS "Owner dan Admin dapat mengelola anggota workspace" ON public.workspace_members;
CREATE POLICY "Owner dan Admin dapat mengelola anggota workspace"
    ON public.workspace_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_members.workspace_id
            AND w.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
        OR EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_members.workspace_id
            AND w.owner_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 4. Perbaikan Kebijakan INSERT pada public.workspaces
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "User dapat membuat workspace baru" ON public.workspaces;
CREATE POLICY "User dapat membuat workspace baru"
    ON public.workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. Perbaikan Kebijakan INSERT/UPDATE pada websites, categories, dan products
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Member dengan hak edit dapat mengubah website" ON public.websites;
CREATE POLICY "Member dengan hak edit dapat mengubah website"
    ON public.websites FOR ALL
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Member dapat mengelola kategori" ON public.categories;
CREATE POLICY "Member dapat mengelola kategori"
    ON public.categories FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = categories.website_id
        AND public.is_workspace_member(w.workspace_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = categories.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

DROP POLICY IF EXISTS "Member dapat mengelola produk" ON public.products;
CREATE POLICY "Member dapat mengelola produk"
    ON public.products FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = products.website_id
        AND public.is_workspace_member(w.workspace_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = products.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));
