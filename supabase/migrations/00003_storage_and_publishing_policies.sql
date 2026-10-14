-- =============================================================================
-- ARISERA PLATFORM - MIGRATION 00003: STORAGE BUCKET & PUBLISHING POLICIES
-- Migrasi: 00003_storage_and_publishing_policies.sql
-- Tujuan: Menyiapkan bucket storage media-assets, kebijakan akses storage,
--         kebijakan RLS media_assets, dan kebijakan RLS publishing_versions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Penyiapan Bucket Storage: media-assets
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media-assets',
    'media-assets',
    true,
    5242880, -- 5 MB batas maksimal per file
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];

-- -----------------------------------------------------------------------------
-- 2. Kebijakan Storage Objects (media-assets)
-- -----------------------------------------------------------------------------
-- Publik dapat melihat/mengunduh gambar dari media-assets
DROP POLICY IF EXISTS "Publik dapat melihat aset media di bucket media-assets" ON storage.objects;
CREATE POLICY "Publik dapat melihat aset media di bucket media-assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'media-assets');

-- User terotentikasi dapat mengunggah file ke media-assets
DROP POLICY IF EXISTS "User terotentikasi dapat mengunggah ke media-assets" ON storage.objects;
CREATE POLICY "User terotentikasi dapat mengunggah ke media-assets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'media-assets' AND auth.role() = 'authenticated');

-- User terotentikasi dapat menghapus file miliknya di media-assets
DROP POLICY IF EXISTS "User terotentikasi dapat menghapus file di media-assets" ON storage.objects;
CREATE POLICY "User terotentikasi dapat menghapus file di media-assets"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'media-assets' AND auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 3. Kebijakan RLS untuk Tabel public.media_assets
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Member dapat melihat media di workspace miliknya" ON public.media_assets;
CREATE POLICY "Member dapat melihat media di workspace miliknya"
    ON public.media_assets FOR SELECT
    USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Member dapat mengelola media di workspace miliknya" ON public.media_assets;
CREATE POLICY "Member dapat mengelola media di workspace miliknya"
    ON public.media_assets FOR ALL
    USING (public.is_workspace_member(workspace_id))
    WITH CHECK (public.is_workspace_member(workspace_id));

-- -----------------------------------------------------------------------------
-- 4. Kebijakan RLS untuk Tabel public.publishing_versions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Member dapat melihat riwayat versi website" ON public.publishing_versions;
CREATE POLICY "Member dapat melihat riwayat versi website"
    ON public.publishing_versions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = publishing_versions.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

DROP POLICY IF EXISTS "Member dapat menambahkan versi publikasi baru" ON public.publishing_versions;
CREATE POLICY "Member dapat menambahkan versi publikasi baru"
    ON public.publishing_versions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = publishing_versions.website_id
        AND public.is_workspace_member(w.workspace_id)
    ));

-- Publik dapat melihat snapshot website yang aktif dipublikasikan
DROP POLICY IF EXISTS "Publik dapat melihat versi publikasi aktif" ON public.publishing_versions;
CREATE POLICY "Publik dapat melihat versi publikasi aktif"
    ON public.publishing_versions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.websites w
        WHERE w.id = publishing_versions.website_id
        AND w.status = 'published'
        AND w.published_version_id = publishing_versions.id
    ));
