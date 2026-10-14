-- =============================================================================
-- ARISERA PLATFORM - MIGRATION 00004: CONTACT SUBMISSIONS & MULTI-PAGE ENHANCEMENTS
-- Migrasi: 00004_contact_submissions_and_multipage.sql
-- Tujuan: Menambahkan tabel `contact_submissions` untuk formulir kontak publik,
--         menambahkan kolom `display_order` dan `status` pada tabel `pages`,
--         dan mengonfigurasi RLS publik & member.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Penambahan Kolom pada Tabel pages
-- -----------------------------------------------------------------------------
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. TABEL: contact_submissions (Pesan masuk dari pengunjung formulir kontak)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' NOT NULL, -- 'unread' | 'read' | 'replied' | 'archived'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indeks performa pencarian pesan per website
CREATE INDEX IF NOT EXISTS idx_contact_submissions_website_id ON public.contact_submissions(website_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);

-- Aktifkan Row Level Security
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. Kebijakan RLS: contact_submissions
-- -----------------------------------------------------------------------------

-- Kebijakan 1: Pengunjung publik dapat mengirimkan formulir kontak ke website yang sudah diterbitkan
DROP POLICY IF EXISTS "Publik dapat mengirim pesan ke website terpublikasi" ON public.contact_submissions;
CREATE POLICY "Publik dapat mengirim pesan ke website terpublikasi"
    ON public.contact_submissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.websites w
            WHERE w.id = contact_submissions.website_id
            AND w.status = 'published'
        )
    );

-- Kebijakan 2: Anggota workspace dapat melihat pesan masuk formulir milik websitenya
DROP POLICY IF EXISTS "Member dapat melihat pesan masuk website miliknya" ON public.contact_submissions;
CREATE POLICY "Member dapat melihat pesan masuk website miliknya"
    ON public.contact_submissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.websites w
            WHERE w.id = contact_submissions.website_id
            AND public.is_workspace_member(w.workspace_id)
        )
    );

-- Kebijakan 3: Anggota workspace dapat memperbarui status pesan (read/archived/replied)
DROP POLICY IF EXISTS "Member dapat memperbarui status pesan formulir" ON public.contact_submissions;
CREATE POLICY "Member dapat memperbarui status pesan formulir"
    ON public.contact_submissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.websites w
            WHERE w.id = contact_submissions.website_id
            AND public.is_workspace_member(w.workspace_id)
        )
    );

-- Kebijakan 4: Anggota workspace dapat menghapus pesan formulir
DROP POLICY IF EXISTS "Member dapat menghapus pesan formulir" ON public.contact_submissions;
CREATE POLICY "Member dapat menghapus pesan formulir"
    ON public.contact_submissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.websites w
            WHERE w.id = contact_submissions.website_id
            AND public.is_workspace_member(w.workspace_id)
        )
    );
