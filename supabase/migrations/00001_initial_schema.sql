-- =============================================================================
-- ARISERA PLATFORM - INITIAL DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Migrasi: 00001_initial_schema.sql
-- Kompatibel dengan: Supabase PostgreSQL (pgcrypto & uuid-ossp)
-- =============================================================================

-- Pastikan extension UUID tersedia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABEL: users (Ekstensi profil dari auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. TABEL: workspaces (Multi-workspace untuk isolasi proyek bisnis)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. TABEL: workspace_members (Hak akses anggota tim: owner, admin, editor, viewer)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    invited_email TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (workspace_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 4. TABEL: websites (Situs bisnis: kuliner, fashion, kosmetik, elektronik, dll.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.websites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    business_category TEXT NOT NULL CHECK (business_category IN ('kuliner', 'fashion', 'kosmetik', 'elektronik', 'jasa', 'retail', 'portofolio', 'lainnya')),
    description TEXT,
    whatsapp_number TEXT,
    whatsapp_message_template TEXT DEFAULT 'Halo kak, saya tertarik dengan produk {product_name}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    theme_settings JSONB DEFAULT '{
        "primaryColor": "#6D4AFF",
        "accentColor": "#9B7BFF",
        "backgroundColor": "#FFFFFF",
        "textColor": "#11111B",
        "fontFamily": "Plus Jakarta Sans",
        "borderRadius": "8px"
    }'::jsonb NOT NULL,
    custom_domain TEXT UNIQUE,
    subdomain TEXT NOT NULL UNIQUE,
    is_domain_verified BOOLEAN DEFAULT FALSE NOT NULL,
    published_version_id UUID,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (workspace_id, slug)
);

-- -----------------------------------------------------------------------------
-- 5. TABEL: website_domains (Domain kustom & pencatatan verifikasi DNS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    verification_token TEXT NOT NULL,
    dns_records JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 6. TABEL: pages (Halaman website: beranda, produk, tentang, kontak, dll.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    is_homepage BOOLEAN DEFAULT FALSE NOT NULL,
    seo_title TEXT,
    seo_description TEXT,
    og_image TEXT,
    current_draft_version_id UUID,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (website_id, slug)
);

-- -----------------------------------------------------------------------------
-- 7. TABEL: page_versions (Riwayat versi dan snapshot komponen halaman)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN DEFAULT FALSE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 8. TABEL: templates (Koleksi templat website visual siap pakai)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail_url TEXT,
    preset_pages JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_theme JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_official BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 9. TABEL: categories (Kategori produk CMS untuk e-commerce/katalog)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (website_id, slug)
);

-- -----------------------------------------------------------------------------
-- 10. TABEL: products (Katalog produk CMS dengan dukungan WhatsApp checkout)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    sku TEXT,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(15, 2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    images JSONB DEFAULT '[]'::jsonb NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (website_id, slug)
);

-- -----------------------------------------------------------------------------
-- 11. TABEL: media_assets (Penyimpanan aset media, Supabase Storage & Google Drive)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    website_id UUID REFERENCES public.websites(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('local_storage', 'supabase_storage', 'google_drive')),
    external_id TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 12. TABEL: publishing_versions (Snapshot rilis website untuk publikasi)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publishing_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    version_tag TEXT NOT NULL,
    notes TEXT,
    published_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 13. TABEL: activity_logs (Audit trail dan log aktivitas tim)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant isolation: Anggota hanya dapat mengakses data ruang kerja miliknya.
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publishing_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Memeriksa apakah user adalah member dari workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = _workspace_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kebijakan Users
CREATE POLICY "Users dapat melihat profil mereka sendiri"
    ON public.users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users dapat memperbarui profil mereka sendiri"
    ON public.users FOR UPDATE
    USING (id = auth.uid());

-- Kebijakan Workspaces
CREATE POLICY "Member dapat melihat workspace miliknya"
    ON public.workspaces FOR SELECT
    USING (public.is_workspace_member(id) OR owner_id = auth.uid());

CREATE POLICY "Owner/Admin dapat mengelola workspace"
    ON public.workspaces FOR ALL
    USING (owner_id = auth.uid());

-- Kebijakan Workspace Members
CREATE POLICY "Member dapat melihat daftar anggota tim workspace"
    ON public.workspace_members FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Kebijakan Websites
CREATE POLICY "Member dapat melihat website di workspace miliknya"
    ON public.websites FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Member dengan hak edit dapat mengubah website"
    ON public.websites FOR ALL
    USING (public.is_workspace_member(workspace_id));

-- Website Publik: Siapa pun (termasuk anonim) dapat melihat website yang statusnya 'published'
CREATE POLICY "Publik dapat melihat website yang sudah diterbitkan"
    ON public.websites FOR SELECT
    USING (status = 'published');

-- Kebijakan Pages, Categories, Products (Publik dan Member)
CREATE POLICY "Member dapat mengelola halaman website"
    ON public.pages FOR ALL
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

CREATE POLICY "Member dapat mengelola produk"
    ON public.products FOR ALL
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

-- Kebijakan Templates: Publik dapat membaca semua template resmi
CREATE POLICY "Semua user dapat melihat katalog template"
    ON public.templates FOR SELECT
    USING (true);

-- =============================================================================
-- SEED DATA TEMPLAT ARISERA
-- =============================================================================
INSERT INTO public.templates (name, category, description, default_theme)
VALUES 
(
    'Nusantara Kuliner',
    'kuliner',
    'Templat khusus restoran, kafe, dan katering dengan tata letak menu terstruktur dan pemesanan WhatsApp langsung.',
    '{"primaryColor": "#6D4AFF", "accentColor": "#9B7BFF", "backgroundColor": "#FFFFFF", "textColor": "#11111B", "fontFamily": "Plus Jakarta Sans", "borderRadius": "12px"}'
),
(
    'Velvet Fashion Studio',
    'fashion',
    'Desain elegan untuk butik, pakaian distro, dan brand busana dengan showcase lookbook minimalis.',
    '{"primaryColor": "#11111B", "accentColor": "#6D4AFF", "backgroundColor": "#F8F8FC", "textColor": "#11111B", "fontFamily": "Plus Jakarta Sans", "borderRadius": "4px"}'
),
(
    'Aura Botanica Kosmetik',
    'kosmetik',
    'Nuansa bersih dan segar untuk produk kecantikan, perawatan kulit, dan spa.',
    '{"primaryColor": "#6D4AFF", "accentColor": "#C026D3", "backgroundColor": "#FFFFFF", "textColor": "#11111B", "fontFamily": "Plus Jakarta Sans", "borderRadius": "16px"}'
),
(
    'Apex Gadget & Elektronik',
    'elektronik',
    'Tampilan teknologi modern berfokus pada spesifikasi teknis dan komparasi fitur produk elektronik.',
    '{"primaryColor": "#4F46E5", "accentColor": "#06B6D4", "backgroundColor": "#FFFFFF", "textColor": "#0F172A", "fontFamily": "Plus Jakarta Sans", "borderRadius": "8px"}'
),
(
    'Solusi Prima Konsultan & Jasa',
    'jasa',
    'Tata letak profesional untuk agensi, konsultan, jasa hukum, dan penyedia layanan bisnis.',
    '{"primaryColor": "#6D4AFF", "accentColor": "#9B7BFF", "backgroundColor": "#FFFFFF", "textColor": "#11111B", "fontFamily": "Plus Jakarta Sans", "borderRadius": "8px"}'
)
ON CONFLICT DO NOTHING;
