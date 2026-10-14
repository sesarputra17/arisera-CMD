/**
 * ARISERA Platform - Pusat Penyimpanan & Manajemen State
 * Mengelola state multi-workspace, website, produk CMS, dan halaman visual builder.
 * Terintegrasi penuh dengan Supabase Data Services dengan penanganan error dan isolasi tenant.
 */

import {
  Workspace,
  Website,
  Product,
  ProductCategory,
  Page,
  PageVersion,
  VisualComponentBlock,
  WebsiteTemplate,
  MediaAsset,
  ActivityLog,
  UserProfile,
  ContactSubmission,
  WorkspaceMember,
  WorkspaceInvite,
  WebsiteDomain,
  SaaSPlanLimits,
  PlanTier,
  WorkspaceRole,
  GoogleDriveFile,
} from '../types/database';
import env from '../config/env';
import { isSupabaseLive, testSupabaseConnection } from './supabase';
import workspaceService from './workspaceService';
import websiteService from './websiteService';
import productService from './productService';
import authService from './authService';
import mediaService from './mediaService';
import publishingService from './publishingService';
import pageService, { createDefaultPageBlocks, validateAndCleanComponents } from './pageService';
import contactService, { ContactFormData } from './contactService';
import { SheetRowData } from './googleService';

export const SAAS_PLANS: Record<PlanTier, SaaSPlanLimits> = {
  starter: {
    tier: 'starter',
    name: 'Paket Starter',
    maxWebsites: 1,
    maxPagesPerWebsite: 3,
    maxProducts: 10,
    maxStorageMB: 100,
    maxMembers: 1,
    customDomainEnabled: false,
    googleSyncEnabled: false,
  },
  pro: {
    tier: 'pro',
    name: 'Paket Pro',
    maxWebsites: 5,
    maxPagesPerWebsite: 15,
    maxProducts: 100,
    maxStorageMB: 2000,
    maxMembers: 5,
    customDomainEnabled: true,
    googleSyncEnabled: true,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Paket Enterprise',
    maxWebsites: 50,
    maxPagesPerWebsite: 100,
    maxProducts: 1000,
    maxStorageMB: 20000,
    maxMembers: 20,
    customDomainEnabled: true,
    googleSyncEnabled: true,
  },
};

export interface AppState {
  currentUser: UserProfile;
  isAuthenticated: boolean;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  workspaceMembers: WorkspaceMember[];
  workspaceInvites: WorkspaceInvite[];
  websites: Website[];
  activeWebsiteId: string;
  websiteDomains: WebsiteDomain[];
  categories: ProductCategory[];
  products: Product[];
  pages: Page[];
  pageComponents: Record<string, VisualComponentBlock[]>;
  templates: WebsiteTemplate[];
  mediaAssets: MediaAsset[];
  activityLogs: ActivityLog[];
  contactSubmissions: ContactSubmission[];
  // Status koneksi & penyimpanan
  storageMode: 'supabase_live' | 'local_demo';
  isLoading: boolean;
  lastErrorMessage: string | null;
  lastSuccessMessage: string | null;
}

// Data awal (Seed Data) resmi Arisera untuk pengujian offline / demonstrasi
const INITIAL_USER: UserProfile = {
  id: 'usr-arisera-01',
  email: 'pemilik@arisera.id',
  full_name: 'Sesar Arisera',
  avatar_url: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws-kuliner-01',
    name: 'Nusantara Boga Rasa',
    slug: 'nusantara-boga',
    owner_id: 'usr-arisera-01',
    plan_tier: 'pro',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'ws-fashion-02',
    name: 'Urban Thread Studio',
    slug: 'urban-thread',
    owner_id: 'usr-arisera-01',
    plan_tier: 'starter',
    created_at: '2026-03-05T14:30:00Z',
    updated_at: '2026-03-05T14:30:00Z',
  },
];

const INITIAL_MEMBERS: WorkspaceMember[] = [
  {
    id: 'mem-01',
    workspace_id: 'ws-kuliner-01',
    user_id: 'usr-arisera-01',
    role: 'owner',
    created_at: '2026-03-01T10:00:00Z',
    user: INITIAL_USER,
  },
  {
    id: 'mem-02',
    workspace_id: 'ws-kuliner-01',
    user_id: 'usr-arisera-02',
    role: 'editor',
    invited_email: 'chef.budi@aromanusantara.id',
    created_at: '2026-03-04T12:00:00Z',
    user: {
      id: 'usr-arisera-02',
      email: 'chef.budi@aromanusantara.id',
      full_name: 'Budi Santoso (Head Chef)',
      created_at: '2026-03-04T12:00:00Z',
      updated_at: '2026-03-04T12:00:00Z',
    },
  },
  {
    id: 'mem-03',
    workspace_id: 'ws-fashion-02',
    user_id: 'usr-arisera-01',
    role: 'owner',
    created_at: '2026-03-05T14:30:00Z',
    user: INITIAL_USER,
  },
];

const INITIAL_INVITES: WorkspaceInvite[] = [
  {
    id: 'inv-01',
    workspace_id: 'ws-kuliner-01',
    email: 'marketing@aromanusantara.id',
    role: 'admin',
    status: 'pending',
    token: 'inv-tok-987123',
    created_at: '2026-03-10T08:00:00Z',
    expires_at: '2026-03-24T08:00:00Z',
  },
];

const INITIAL_DOMAINS: WebsiteDomain[] = [
  {
    id: 'dom-01',
    website_id: 'web-restoran-01',
    domain: 'aromanusantara.id',
    is_primary: true,
    is_verified: true,
    verification_token: 'arisera-verify-an998822',
    dns_records: [
      {
        type: 'CNAME',
        name: '@',
        value: 'cname.arisera.id',
        status: 'verified',
      },
      {
        type: 'TXT',
        name: '_arisera-challenge',
        value: 'arisera-verification=arisera-verify-an998822',
        status: 'verified',
      },
    ],
    created_at: '2026-03-05T12:00:00Z',
  },
];

const INITIAL_WEBSITES: Website[] = [
  {
    id: 'web-restoran-01',
    workspace_id: 'ws-kuliner-01',
    name: 'Resto Aroma Nusantara',
    slug: 'aroma-nusantara',
    business_category: 'kuliner',
    description: 'Sajian kuliner otentik rempah nusantara dengan cita rasa legendaris.',
    whatsapp_number: '6281234567890',
    whatsapp_message_template: 'Halo Resto Aroma Nusantara, saya ingin memesan menu {product_name} sejumlah {quantity}.',
    status: 'published',
    subdomain: 'aroma-nusantara.arisera.id',
    custom_domain: 'www.aromanusantara.id',
    is_domain_verified: true,
    theme_settings: {
      primaryColor: '#6D4AFF',
      accentColor: '#9B7BFF',
      backgroundColor: '#FFFFFF',
      textColor: '#11111B',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '12px',
    },
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-10T12:00:00Z',
  },
  {
    id: 'web-kopi-02',
    workspace_id: 'ws-kuliner-01',
    name: 'Kopi Seduh Senja',
    slug: 'seduh-senja',
    business_category: 'kuliner',
    description: 'Artisan coffee bean dan sajian manual brew berkualitas tinggi.',
    whatsapp_number: '6281298765432',
    whatsapp_message_template: 'Halo Seduh Senja, mau tanya ketersediaan {product_name}',
    status: 'draft',
    subdomain: 'seduh-senja.arisera.id',
    is_domain_verified: false,
    theme_settings: {
      primaryColor: '#9333EA',
      accentColor: '#C026D3',
      backgroundColor: '#F8F8FC',
      textColor: '#11111B',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '8px',
    },
    created_at: '2026-03-08T09:00:00Z',
    updated_at: '2026-03-08T09:00:00Z',
  },
  {
    id: 'web-fashion-03',
    workspace_id: 'ws-fashion-02',
    name: 'Aethel Streetwear',
    slug: 'aethel-streetwear',
    business_category: 'fashion',
    description: 'Pakaian pria & wanita bergaya modern urban minimalis.',
    whatsapp_number: '6281311223344',
    whatsapp_message_template: 'Halo Aethel, saya ingin order {product_name} ukuran L.',
    status: 'published',
    subdomain: 'aethel.arisera.id',
    is_domain_verified: false,
    theme_settings: {
      primaryColor: '#11111B',
      accentColor: '#6D4AFF',
      backgroundColor: '#FFFFFF',
      textColor: '#11111B',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '4px',
    },
    created_at: '2026-03-06T11:00:00Z',
    updated_at: '2026-03-09T16:00:00Z',
  },
];

const INITIAL_CATEGORIES: ProductCategory[] = [
  {
    id: 'cat-01',
    website_id: 'web-restoran-01',
    name: 'Menu Utama',
    slug: 'menu-utama',
    description: 'Hidangan khas nusantara dengan bumbu rempah pilihan',
    display_order: 1,
    created_at: '2026-03-02T08:00:00Z',
  },
  {
    id: 'cat-02',
    website_id: 'web-restoran-01',
    name: 'Minuman Segar',
    slug: 'minuman-segar',
    description: 'Minuman tradisional dan sari buah segar',
    display_order: 2,
    created_at: '2026-03-02T08:00:00Z',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    website_id: 'web-restoran-01',
    category_id: 'cat-01',
    name: 'Ayam Bakar Madu Rempah',
    slug: 'ayam-bakar-madu-rempah',
    sku: 'ABM-001',
    description: 'Ayam kampung bakar empuk berlumur madu alami dan 12 rempah pilihan, disajikan dengan sambal terasi matang.',
    price: 45000,
    sale_price: 39000,
    stock_quantity: 40,
    is_available: true,
    images: [],
    attributes: { porsi: '1 Orang', pedas: 'Level Sedang' },
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
  {
    id: 'prod-02',
    website_id: 'web-restoran-01',
    category_id: 'cat-01',
    name: 'Rendang Sapi Daging Pilihan',
    slug: 'rendang-sapi-daging-pilihan',
    sku: 'RND-002',
    description: 'Daging sapi has dalam yang dimasak perlahan selama 8 jam dengan santan kental dan kelapa sangrai.',
    price: 65000,
    stock_quantity: 25,
    is_available: true,
    images: [],
    attributes: { porsi: '200 gram', pedas: 'Gurih Pedas' },
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
  {
    id: 'prod-03',
    website_id: 'web-restoran-01',
    category_id: 'cat-02',
    name: 'Es Kelapa Jeruk Selasih',
    slug: 'es-kelapa-jeruk-selasih',
    sku: 'EKJ-003',
    description: 'Air kelapa muda segar berpadu perasan jeruk murni dan butiran selasih penyejuk dahaga.',
    price: 18000,
    stock_quantity: 50,
    is_available: true,
    images: [],
    attributes: { dingin: 'Dengan Es', gula: 'Gula Tebu Alami' },
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
];

const INITIAL_PAGES: Page[] = [
  {
    id: 'page-home-01',
    website_id: 'web-restoran-01',
    title: 'Beranda',
    slug: 'home',
    is_homepage: true,
    display_order: 1,
    status: 'published',
    seo_title: 'Resto Aroma Nusantara - Cita Rasa Masakan Khas Indonesia',
    seo_description: 'Nikmati masakan tradisional nusantara berkualitas premium. Pesan mudah langsung via WhatsApp.',
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
  {
    id: 'page-menu-01',
    website_id: 'web-restoran-01',
    title: 'Menu & Katalog',
    slug: 'menu',
    is_homepage: false,
    display_order: 2,
    status: 'published',
    seo_title: 'Katalog Menu & Harga - Resto Aroma Nusantara',
    seo_description: 'Daftar menu masakan nusantara pilihan dengan harga bersahabat dan porsi memuaskan.',
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
  {
    id: 'page-about-01',
    website_id: 'web-restoran-01',
    title: 'Tentang Kami',
    slug: 'tentang',
    is_homepage: false,
    display_order: 3,
    status: 'published',
    seo_title: 'Kisah & Warisan Kuliner - Resto Aroma Nusantara',
    seo_description: 'Sejarah dedikasi kami menyajikan warisan resep otentik rempah nusantara sejak 2018.',
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
  {
    id: 'page-contact-01',
    website_id: 'web-restoran-01',
    title: 'Kontak & Reservasi',
    slug: 'kontak',
    is_homepage: false,
    display_order: 4,
    status: 'published',
    seo_title: 'Hubungi Resto Aroma Nusantara - Reservasi & Katering',
    seo_description: 'Alamat resto, jam buka, dan formulir pemesanan langsung terhubung ke customer service.',
    created_at: '2026-03-02T08:00:00Z',
    updated_at: '2026-03-02T08:00:00Z',
  },
];

const INITIAL_COMPONENTS: VisualComponentBlock[] = [
  {
    id: 'comp-header-01',
    type: 'header',
    order: 1,
    content: {
      brandName: 'Resto Aroma Nusantara',
      navLinks: [
        { label: 'Beranda', href: '#beranda' },
        { label: 'Menu Andalan', href: '#menu' },
        { label: 'Tentang Kami', href: '#tentang' },
        { label: 'Kontak', href: '#kontak' },
      ],
      ctaText: 'Pesan Sekarang',
    },
    styles: {
      bgColor: '#FFFFFF',
      textColor: '#11111B',
      isSticky: true,
    },
  },
  {
    id: 'comp-hero-02',
    type: 'hero',
    order: 2,
    content: {
      headline: 'Kehangatan Cita Rasa Otentik Rempah Indonesia',
      subheadline: 'Dibuat dari bahan segar pilihan, diolah dengan resep warisan leluhur untuk pengalaman kuliner tak terlupakan.',
      primaryButtonText: 'Lihat Menu Lengkap',
      whatsappButtonText: 'Chat WhatsApp Kami',
      badgeText: 'Pilihan Kuliner Terbaik 2026',
    },
    styles: {
      bgColor: '#F8F8FC',
      accentColor: '#6D4AFF',
      alignment: 'center',
    },
  },
  {
    id: 'comp-product-grid-03',
    type: 'product_grid',
    order: 3,
    content: {
      sectionTitle: 'Menu Andalan Terfavorit',
      sectionSubtitle: 'Pilihan terlaris pengunjung minggu ini, siap diantar hangat ke meja atau pintu rumah Anda.',
      displayCount: 4,
      showPrice: true,
      showWhatsappOrderButton: true,
    },
    styles: {
      columns: 3,
      cardBorderRadius: '12px',
    },
  },
  {
    id: 'comp-whatsapp-cta-04',
    type: 'whatsapp_cta',
    order: 4,
    content: {
      title: 'Butuh Katering Acara atau Reservasi Tempat?',
      description: 'Hubungi tim kami langsung melalui WhatsApp untuk konsultasi paket menu acara kantor, pernikahan, dan syukuran keluarga.',
      whatsappNumber: '6281234567890',
      buttonText: 'Hubungi WhatsApp Sekarang',
    },
    styles: {
      bgColor: '#11111B',
      textColor: '#FFFFFF',
      accentColor: '#25D366',
    },
  },
  {
    id: 'comp-footer-05',
    type: 'footer',
    order: 5,
    content: {
      copyrightText: '© 2026 Resto Aroma Nusantara. Diberdayakan oleh Arisera.',
      address: 'Jl. Merdeka Raya No. 45, Kebayoran Baru, Jakarta Selatan',
    },
    styles: {
      bgColor: '#F8F8FC',
      textColor: '#85859A',
    },
  },
];

const SHARED_NAV_LINKS = [
  { label: 'Beranda', href: '#beranda', pageSlug: 'home' },
  { label: 'Menu Andalan', href: '#menu', pageSlug: 'menu' },
  { label: 'Tentang Kami', href: '#tentang', pageSlug: 'tentang' },
  { label: 'Kontak & Reservasi', href: '#kontak', pageSlug: 'kontak' },
];

const INITIAL_MENU_COMPONENTS: VisualComponentBlock[] = [
  {
    id: 'comp-menu-header',
    type: 'header',
    order: 1,
    content: {
      brandName: 'Resto Aroma Nusantara',
      navLinks: SHARED_NAV_LINKS,
      ctaText: 'Pesan Sekarang',
    },
    styles: { bgColor: '#FFFFFF', textColor: '#11111B', isSticky: true },
  },
  {
    id: 'comp-menu-hero',
    type: 'hero',
    order: 2,
    content: {
      headline: 'Daftar Menu & Sajian Istimewa',
      subheadline: 'Koleksi hidangan masakan nusantara dengan resep asli rempah pilihan dan porsi memuaskan.',
      primaryButtonText: 'Pesan via WhatsApp',
      whatsappButtonText: 'Chat Langsung',
      badgeText: 'Katalog Kuliner 2026',
    },
    styles: { bgColor: '#F8F8FC', alignment: 'center' },
  },
  {
    id: 'comp-menu-grid',
    type: 'product_grid',
    order: 3,
    content: {
      sectionTitle: 'Seluruh Pilihan Menu Tersedia',
      sectionSubtitle: 'Klik pesan untuk langsung terhubung ke WhatsApp kami.',
    },
    styles: { columns: 3 },
  },
  {
    id: 'comp-menu-cta',
    type: 'whatsapp_cta',
    order: 4,
    content: {
      title: 'Pesan Antar Sekarang Juga',
      description: 'Layanan antar makanan cepat dan aman langsung ke tempat Anda.',
      buttonText: 'Chat WhatsApp Kami',
    },
    styles: { bgColor: '#11111B', textColor: '#FFFFFF' },
  },
  {
    id: 'comp-menu-footer',
    type: 'footer',
    order: 5,
    content: {
      copyrightText: '© 2026 Resto Aroma Nusantara. Diberdayakan oleh Arisera.',
    },
    styles: { bgColor: '#F8F8FC', textColor: '#85859A' },
  },
];

const INITIAL_ABOUT_COMPONENTS: VisualComponentBlock[] = [
  {
    id: 'comp-about-header',
    type: 'header',
    order: 1,
    content: {
      brandName: 'Resto Aroma Nusantara',
      navLinks: SHARED_NAV_LINKS,
      ctaText: 'Pesan Sekarang',
    },
    styles: { bgColor: '#FFFFFF', textColor: '#11111B', isSticky: true },
  },
  {
    id: 'comp-about-hero',
    type: 'hero',
    order: 2,
    content: {
      headline: 'Kisah Perjalanan & Dedikasi Kuliner',
      subheadline: 'Menghadirkan kehangatan tradisi Indonesia dari dapur keluarga ke meja makan Anda.',
      badgeText: 'Tentang Kami',
    },
    styles: { bgColor: '#F8F8FC', alignment: 'center' },
  },
  {
    id: 'comp-about-text',
    type: 'text',
    order: 3,
    content: {
      heading: 'Warisan Resep Otentik Sejak 2018',
      body: 'Resto Aroma Nusantara didirikan dengan satu komitmen sederhana: melestarikan kekayaan rasa rempah asli nusantara. Kami percaya bahwa setiap masakan adalah cerita tentang tanah air, kebersamaan keluarga, dan kehangatan persaudaraan. Setiap bahan baku kami peroleh langsung dari petani lokal di seluruh kepulauan Indonesia.',
    },
    styles: { bgColor: '#FFFFFF', textColor: '#11111B' },
  },
  {
    id: 'comp-about-features',
    type: 'features',
    order: 4,
    content: {
      title: 'Nilai Pokok Restoran Kami',
      subtitle: 'Standar kualitas terbaik yang kami jaga tanpa kompromi.',
      items: [
        { title: '100% Rempah Segar', description: 'Tanpa perasa buatan atau pengawet kimia.', icon: 'award' },
        { title: 'Halal & Higienis', description: 'Dapur bersertifikasi dengan standar kebersihan tertinggi.', icon: 'shield' },
        { title: 'Koki Berpengalaman', description: 'Diolah oleh juru masak master tradisi kuliner daerah.', icon: 'zap' },
      ],
    },
    styles: { bgColor: '#F8F8FC', textColor: '#11111B' },
  },
  {
    id: 'comp-about-testimonials',
    type: 'testimonials',
    order: 5,
    content: {
      title: 'Penghargaan & Pengakuan Pelanggan',
      subtitle: 'Cerita nyata dari mereka yang telah mencicipi sajian kami.',
    },
    styles: { bgColor: '#FFFFFF' },
  },
  {
    id: 'comp-about-footer',
    type: 'footer',
    order: 6,
    content: {
      copyrightText: '© 2026 Resto Aroma Nusantara. Diberdayakan oleh Arisera.',
    },
    styles: { bgColor: '#F8F8FC', textColor: '#85859A' },
  },
];

const INITIAL_CONTACT_COMPONENTS: VisualComponentBlock[] = [
  {
    id: 'comp-contact-header',
    type: 'header',
    order: 1,
    content: {
      brandName: 'Resto Aroma Nusantara',
      navLinks: SHARED_NAV_LINKS,
      ctaText: 'Chat WhatsApp',
    },
    styles: { bgColor: '#FFFFFF', textColor: '#11111B', isSticky: true },
  },
  {
    id: 'comp-contact-hero',
    type: 'hero',
    order: 2,
    content: {
      headline: 'Hubungi Kami & Buat Reservasi',
      subheadline: 'Kirimkan pesan katering acara, pertanyaan menu khusus, atau reservasi meja dengan mudah.',
      badgeText: 'Layanan Pengunjung',
    },
    styles: { bgColor: '#F8F8FC', alignment: 'center' },
  },
  {
    id: 'comp-contact-body',
    type: 'contact',
    order: 3,
    content: {
      title: 'Kirimkan Pesan Anda',
      subtitle: 'Tim kami akan membalas pesan Anda dalam kurun waktu kurang dari 1 jam kerja.',
      email: 'reservasi@aromanusantara.id',
      location: 'Jl. Merdeka Raya No. 45, Kebayoran Baru, Jakarta Selatan',
    },
    styles: { bgColor: '#FFFFFF', textColor: '#11111B' },
  },
  {
    id: 'comp-contact-footer',
    type: 'footer',
    order: 4,
    content: {
      copyrightText: '© 2026 Resto Aroma Nusantara. Diberdayakan oleh Arisera.',
    },
    styles: { bgColor: '#F8F8FC', textColor: '#85859A' },
  },
];

const INITIAL_TEMPLATES: WebsiteTemplate[] = [
  {
    id: 'tpl-kuliner',
    name: 'Nusantara Gourmet',
    category: 'kuliner',
    description: 'Templat khusus restoran, kafe, dan katering dengan tata letak menu terstruktur dan pemesanan WhatsApp langsung.',
    thumbnail_url: '',
    preset_pages: [],
    default_theme: {
      primaryColor: '#6D4AFF',
      accentColor: '#9B7BFF',
      backgroundColor: '#FFFFFF',
      textColor: '#11111B',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '12px',
    },
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'tpl-fashion',
    name: 'Velvet Mode Studio',
    category: 'fashion',
    description: 'Showcase pakaian, sepatu, dan aksesoris bergaya editorial minimalis.',
    thumbnail_url: '',
    preset_pages: [],
    default_theme: {
      primaryColor: '#11111B',
      accentColor: '#6D4AFF',
      backgroundColor: '#F8F8FC',
      textColor: '#11111B',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '4px',
    },
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'tpl-kosmetik',
    name: 'Lumina Skincare & Spa',
    category: 'kosmetik',
    description: 'Desain organik lembut untuk brand kecantikan, skincare, dan klinik perawatan.',
    thumbnail_url: '',
    preset_pages: [],
    default_theme: {
      primaryColor: '#6D4AFF',
      accentColor: '#C026D3',
      backgroundColor: '#FFFFFF',
      textColor: '#11111B',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '16px',
    },
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'tpl-elektronik',
    name: 'TeknoPulse Hardware',
    category: 'elektronik',
    description: 'Katalog spesifikasi gadget, perangkat keras, smartphone, dan audio.',
    thumbnail_url: '',
    preset_pages: [],
    default_theme: {
      primaryColor: '#4F46E5',
      accentColor: '#06B6D4',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '8px',
    },
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'tpl-jasa',
    name: 'Solusi Cendikia Konsultan',
    category: 'jasa',
    description: 'Halaman profil profesional untuk agensi, konsultan, dan penyedia jasa kreatif.',
    thumbnail_url: '',
    preset_pages: [],
    default_theme: {
      primaryColor: '#6D4AFF',
      accentColor: '#9B7BFF',
      backgroundColor: '#FFFFFF',
      textColor: '#11111B',
      fontFamily: 'Plus Jakarta Sans',
      borderRadius: '8px',
    },
    created_at: '2026-03-01T00:00:00Z',
  },
];

const INITIAL_MEDIA: MediaAsset[] = [
  {
    id: 'med-01',
    workspace_id: 'ws-kuliner-01',
    file_name: 'ayam_bakar_rempah.jpg',
    file_size: 245000,
    mime_type: 'image/jpeg',
    url: '/assets/sample-dish-1.jpg',
    source: 'supabase_storage',
    created_at: '2026-03-02T10:00:00Z',
  },
];

const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log-01',
    workspace_id: 'ws-kuliner-01',
    user_id: 'usr-arisera-01',
    action: 'Inisialisasi sistem Arisera',
    target_type: 'workspace',
    target_id: 'ws-kuliner-01',
    created_at: new Date().toISOString(),
  },
];

class AriseraStore {
  private state: AppState;
  private listeners: Set<() => void> = new Set();
  private isInitialized: boolean = false;
  private isSyncingSession: boolean = false;
  private lastSyncedUserId: string | null = null;
  private hasCreatedInitialWorkspace: boolean = false;

  constructor() {
    this.state = {
      currentUser: INITIAL_USER,
      isAuthenticated: !isSupabaseLive(), // default true hanya jika mode demo lokal
      workspaces: INITIAL_WORKSPACES,
      activeWorkspaceId: INITIAL_WORKSPACES[0].id,
      websites: INITIAL_WEBSITES,
      activeWebsiteId: INITIAL_WEBSITES[0].id,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      pages: INITIAL_PAGES,
      pageComponents: {
        'page-home-01': INITIAL_COMPONENTS,
        'page-menu-01': INITIAL_MENU_COMPONENTS,
        'page-about-01': INITIAL_ABOUT_COMPONENTS,
        'page-contact-01': INITIAL_CONTACT_COMPONENTS,
      },
      templates: INITIAL_TEMPLATES,
      mediaAssets: INITIAL_MEDIA,
      activityLogs: INITIAL_ACTIVITY_LOGS,
      contactSubmissions: [],
      workspaceMembers: INITIAL_MEMBERS,
      workspaceInvites: INITIAL_INVITES,
      websiteDomains: INITIAL_DOMAINS,
      storageMode: isSupabaseLive() ? 'supabase_live' : 'local_demo',
      isLoading: false,
      lastErrorMessage: null,
      lastSuccessMessage: null,
    };
  }

  public getState(): AppState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public clearMessages() {
    this.state.lastErrorMessage = null;
    this.state.lastSuccessMessage = null;
    this.notify();
  }

  public setSuccessMessage(msg: string) {
    this.state.lastSuccessMessage = msg;
    this.state.lastErrorMessage = null;
    this.notify();
  }

  public setErrorMessage(msg: string) {
    this.state.lastErrorMessage = msg;
    this.state.lastSuccessMessage = null;
    this.notify();
  }

  /**
   * Inisialisasi data dari Supabase saat aplikasi dimulai.
   * Memulihkan sesi pengguna nyata jika tersedia.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Jika kredensial Supabase sama sekali belum dikonfigurasi (Mode Demo)
    if (!env.isSupabaseConfigured) {
      this.state.storageMode = 'local_demo';
      this.state.isAuthenticated = true;
      this.notify();
      return;
    }

    this.state.isLoading = true;
    this.notify();

    try {
      // Uji koneksi ringan ke database Supabase Cloud
      const conn = await testSupabaseConnection();
      if (!conn.isLive) {
        this.state.storageMode = 'local_demo';
        this.state.isAuthenticated = true;
        this.state.lastErrorMessage = conn.errorMessage || 'Supabase belum dapat diakses.';
        this.state.isLoading = false;
        this.notify();
        return;
      }

      this.state.storageMode = 'supabase_live';

      // Pasang listener auth state change dari Supabase
      authService.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            await this.handleSessionSync(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          this.isSyncingSession = false;
          this.lastSyncedUserId = null;
          this.state.isAuthenticated = false;
          this.state.currentUser = INITIAL_USER;
          this.state.workspaces = INITIAL_WORKSPACES;
          this.state.activeWorkspaceId = INITIAL_WORKSPACES[0].id;
          this.state.websites = INITIAL_WEBSITES;
          this.state.activeWebsiteId = INITIAL_WEBSITES[0].id;
          this.state.products = INITIAL_PRODUCTS;
          this.state.categories = INITIAL_CATEGORIES;
          this.state.mediaAssets = INITIAL_MEDIA;
          this.notify();
        }
      });

      // Pulihkan sesi autentikasi pengguna nyata
      const session = await authService.getSession();
      if (session?.user) {
        await this.handleSessionSync(session.user);
      } else {
        // Belum login di Supabase
        this.state.isAuthenticated = false;
        // Muat workspace default atau biarkan user melakukan sign in
        const wsResult = await workspaceService.getWorkspaces();
        if (wsResult.data && wsResult.data.length > 0) {
          this.state.workspaces = wsResult.data;
          this.state.activeWorkspaceId = wsResult.data[0].id;
          await this.loadWorkspaceDataAsync(this.state.activeWorkspaceId);
        }
      }
    } catch (err: any) {
      console.warn('[ARISERA Store] Inisialisasi database:', err);
      this.state.lastErrorMessage = err?.message || 'Gagal memuat data dari Supabase';
    } finally {
      this.state.isLoading = false;
      this.notify();
    }
  }

  /**
   * Sinkronisasi profil pengguna dan data workspace saat sesi login aktif.
   */
  public async handleSessionSync(user: any): Promise<void> {
    if (!user?.id) return;

    // Hindari eksekusi bersamaan (race condition) antara getSession awal dan listener auth
    if (this.isSyncingSession) return;
    if (this.lastSyncedUserId === user.id && this.state.workspaces.length > 0) return;

    this.isSyncingSession = true;
    this.lastSyncedUserId = user.id;
    this.state.isAuthenticated = true;

    try {
      // Ambil profil dari tabel users atau fallback dari metadata
      const profile = await authService.getUserProfile(user.id);
      if (profile) {
        this.state.currentUser = profile;
      } else {
        this.state.currentUser = {
          id: user.id,
          email: user.email || '',
          full_name:
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'Pengguna Arisera',
          avatar_url: user.user_metadata?.avatar_url || '',
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      // Ambil daftar ruang kerja pengguna
      const wsResult = await workspaceService.getWorkspaces();
      if (wsResult.data && wsResult.data.length > 0) {
        this.state.workspaces = wsResult.data;
        if (!wsResult.data.some((w) => w.id === this.state.activeWorkspaceId)) {
          this.state.activeWorkspaceId = wsResult.data[0].id;
        }
      } else if (Array.isArray(wsResult.data) && wsResult.data.length === 0 && !wsResult.error) {
        // HANYA jika query berhasil dan data terbukti kosong (user baru pertama kali):
        // Hindari pembuatan ganda berulang kali setiap kali halaman dimuat
        if (!this.hasCreatedInitialWorkspace) {
          this.hasCreatedInitialWorkspace = true;
          const cleanName = this.state.currentUser.full_name || 'Bisnis';
          const wsName = `Ruang Kerja ${cleanName}`;
          const newWs = await workspaceService.createWorkspace(wsName, user.id);
          if (newWs.data) {
            this.state.workspaces = [newWs.data];
            this.state.activeWorkspaceId = newWs.data.id;

            // Buatkan website perdana untuk kemudahan pengguna
            const initialWeb = await websiteService.createWebsite({
              workspace_id: newWs.data.id,
              name: `Situs ${cleanName}`,
              business_category: 'kuliner',
              description: 'Situs web bisnis dibuat dengan Arisera Visual Builder.',
            });
            if (initialWeb.data) {
              this.state.websites = [initialWeb.data];
              this.state.activeWebsiteId = initialWeb.data.id;
            }
          }
        }
      } else if (wsResult.error) {
        console.warn('[ARISERA Store] Query workspaces mengembalikan kesalahan:', wsResult.error);
        // Jangan membuat workspace baru jika terjadi error kueri/izin RLS
      }

      if (this.state.activeWorkspaceId) {
        await this.loadWorkspaceDataAsync(this.state.activeWorkspaceId);
      }
    } finally {
      this.isSyncingSession = false;
      this.notify();
    }
  }

  /**
   * Reinisialisasi koneksi database setelah konfigurasi Supabase diperbarui di runtime.
   */
  public async reinitializeDatabaseConnection(): Promise<void> {
    this.isInitialized = false;
    this.isSyncingSession = false;
    this.lastSyncedUserId = null;
    this.hasCreatedInitialWorkspace = false;
    await this.initialize();
  }

  /**
   * Mengambil data websites, products, categories, dan media assets untuk workspace tertentu.
   */
  public async loadWorkspaceDataAsync(workspaceId: string): Promise<void> {
    if (this.state.storageMode !== 'supabase_live') return;

    try {
      // 1. Ambil data Website
      const webResult = await websiteService.getWebsites(workspaceId);
      if (webResult.data && webResult.data.length > 0) {
        this.state.websites = webResult.data;
        if (!webResult.data.some((w) => w.id === this.state.activeWebsiteId)) {
          this.state.activeWebsiteId = webResult.data[0].id;
        }

        const activeWeb =
          webResult.data.find((w) => w.id === this.state.activeWebsiteId) || webResult.data[0];

        // Ambil Produk, Kategori, dan Halaman Beserta Draf Komponen Visual dari Supabase
        const [prodRes, catRes, pageRes] = await Promise.all([
          productService.getProducts(this.state.activeWebsiteId),
          productService.getCategories(this.state.activeWebsiteId),
          pageService.getPagesWithDrafts({ id: activeWeb.id, name: activeWeb.name }),
        ]);
        if (prodRes.data) this.state.products = prodRes.data;
        if (catRes.data) this.state.categories = catRes.data;
        if (pageRes.pages && pageRes.pages.length > 0) {
          const otherPages = this.state.pages.filter(
            (p) => p.website_id !== this.state.activeWebsiteId
          );
          this.state.pages = [...otherPages, ...pageRes.pages];
          this.state.pageComponents = {
            ...this.state.pageComponents,
            ...pageRes.pageComponents,
          };
        }
      } else {
        this.state.websites = [];
        this.state.products = [];
        this.state.categories = [];
      }

      // 2. Ambil Media Assets dari bucket / tabel media_assets
      const mediaRes = await mediaService.getMediaAssets(workspaceId);
      if (mediaRes.data) {
        this.state.mediaAssets = mediaRes.data;
      }
    } catch (err: any) {
      console.warn('[ARISERA Store] loadWorkspaceDataAsync error:', err);
    }
  }

  // =========================================================================
  // AUTHENTICATION ACTIONS
  // =========================================================================
  public async signInAsync(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    const res = await authService.signIn(email, password);
    this.state.isLoading = false;

    if (res.error || !res.data) {
      this.state.lastErrorMessage = res.error || 'Gagal masuk ke akun.';
      this.notify();
      return { success: false, error: this.state.lastErrorMessage };
    }

    await this.handleSessionSync(res.data.user);
    this.state.lastSuccessMessage = `Selamat datang kembali, ${this.state.currentUser.full_name}!`;
    this.logActivity('Masuk ke sistem', 'workspace', this.state.activeWorkspaceId);
    this.notify();
    return { success: true };
  }

  public async signUpAsync(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean }> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    const res = await authService.signUp(email, password, fullName);
    this.state.isLoading = false;

    if (res.error) {
      this.state.lastErrorMessage = res.error;
      this.notify();
      return { success: false, error: res.error };
    }

    if (res.requiresEmailConfirmation) {
      this.state.lastSuccessMessage = 'Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan verifikasi email Anda sebelum masuk.';
      this.notify();
      return {
        success: true,
        requiresEmailConfirmation: true,
      };
    }

    if (res.data?.user && res.data?.session) {
      await this.handleSessionSync(res.data.user);
    }
    this.state.lastSuccessMessage = 'Pendaftaran berhasil! Akun Anda siap digunakan.';
    this.notify();
    return { success: true };
  }

  public async resendConfirmationEmailAsync(email: string): Promise<{ success: boolean; error?: string }> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    const res = await authService.resendConfirmationEmail(email);
    this.state.isLoading = false;

    if (res.error) {
      this.state.lastErrorMessage = res.error;
      this.notify();
      return { success: false, error: res.error };
    }

    this.state.lastSuccessMessage = 'Email konfirmasi baru telah dikirimkan. Silakan periksa kotak masuk atau spam email Anda.';
    this.notify();
    return { success: true };
  }

  public async signOutAsync(): Promise<void> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    await authService.signOut();
    this.state.isAuthenticated = false;
    this.state.isLoading = false;
    this.state.lastSuccessMessage = 'Anda telah berhasil keluar dari akun.';
    this.notify();
  }

  public async resetPasswordAsync(email: string): Promise<{ success: boolean; error?: string }> {
    this.clearMessages();
    const res = await authService.resetPassword(email);
    if (res.error) {
      this.state.lastErrorMessage = res.error;
      this.notify();
      return { success: false, error: res.error };
    }
    this.state.lastSuccessMessage = 'Tautan pemulihan kata sandi telah dikirim ke email Anda.';
    this.notify();
    return { success: true };
  }

  // =========================================================================
  // WORKSPACE ACTIONS
  // =========================================================================
  public async setActiveWorkspace(workspaceId: string): Promise<void> {
    if (this.state.activeWorkspaceId === workspaceId) return;

    this.state.activeWorkspaceId = workspaceId;
    this.state.isLoading = true;
    this.notify();

    if (this.state.storageMode === 'supabase_live') {
      await this.loadWorkspaceDataAsync(workspaceId);
    } else {
      const firstWeb = this.state.websites.find((w) => w.workspace_id === workspaceId);
      if (firstWeb) {
        this.state.activeWebsiteId = firstWeb.id;
      }
    }

    this.state.isLoading = false;
    this.notify();
  }

  public async createWorkspaceAsync(name: string): Promise<Workspace | null> {
    this.state.isLoading = true;
    this.clearMessages();
    this.notify();

    if (this.state.storageMode === 'supabase_live') {
      const result = await workspaceService.createWorkspace(name, this.state.currentUser.id);
      this.state.isLoading = false;

      if (result.error || !result.data) {
        this.state.lastErrorMessage = `Gagal membuat ruang kerja di database: ${result.error}`;
        this.notify();
        return null;
      }

      this.state.workspaces = [result.data, ...this.state.workspaces];
      this.state.activeWorkspaceId = result.data.id;
      this.state.lastSuccessMessage = `Ruang kerja "${name}" berhasil dibuat secara permanen di database.`;
      this.logActivity(`Membuat ruang kerja baru: ${name}`, 'workspace', result.data.id);
      this.notify();
      return result.data;
    }

    // Fallback Lokal (Demo Mode)
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      slug: slug || `ruang-kerja-${Date.now()}`,
      owner_id: this.state.currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.state.workspaces = [newWorkspace, ...this.state.workspaces];
    this.state.activeWorkspaceId = newWorkspace.id;
    this.state.isLoading = false;
    this.state.lastSuccessMessage = `Ruang kerja "${name}" dibuat (Mode Demo Lokal).`;
    this.logActivity(`Membuat ruang kerja baru: ${name}`, 'workspace', newWorkspace.id);
    this.notify();
    return newWorkspace;
  }

  // =========================================================================
  // WEBSITE ACTIONS
  // =========================================================================
  public async setActiveWebsite(websiteId: string): Promise<void> {
    this.state.activeWebsiteId = websiteId;
    this.notify();

    if (this.state.storageMode === 'supabase_live') {
      this.state.isLoading = true;
      this.notify();

      const activeWeb = this.state.websites.find((w) => w.id === websiteId);
      const [prodRes, catRes, pageRes] = await Promise.all([
        productService.getProducts(websiteId),
        productService.getCategories(websiteId),
        activeWeb
          ? pageService.getPagesWithDrafts({ id: activeWeb.id, name: activeWeb.name })
          : Promise.resolve({ pages: [], pageComponents: {}, error: null }),
      ]);
      if (prodRes.data) this.state.products = prodRes.data;
      if (catRes.data) this.state.categories = catRes.data;
      if (pageRes && pageRes.pages && pageRes.pages.length > 0) {
        const otherPages = this.state.pages.filter((p) => p.website_id !== websiteId);
        this.state.pages = [...otherPages, ...pageRes.pages];
        this.state.pageComponents = {
          ...this.state.pageComponents,
          ...pageRes.pageComponents,
        };
      }
      this.state.isLoading = false;
      this.notify();
    }
  }

  public async createWebsiteAsync(
    name: string,
    category: Website['business_category'],
    templateId?: string
  ): Promise<Website | null> {
    this.state.isLoading = true;
    this.clearMessages();

    // Penegakan kuota SaaS untuk pembuatan website
    const quota = this.checkQuota('create_website');
    if (!quota.allowed) {
      this.state.isLoading = false;
      this.state.lastErrorMessage = quota.reason || 'Batas kuota website telah tercapai.';
      this.notify();
      return null;
    }

    this.notify();

    const template = this.state.templates.find((t) => t.id === templateId);

    if (this.state.storageMode === 'supabase_live') {
      const result = await websiteService.createWebsite({
        workspace_id: this.state.activeWorkspaceId,
        name,
        business_category: category,
        description: `Website bisnis ${category} modern dengan Arisera.`,
        theme_settings: template ? template.default_theme : undefined,
      });

      this.state.isLoading = false;

      if (result.error || !result.data) {
        this.state.lastErrorMessage = `Gagal menyimpan website ke database: ${result.error}`;
        this.notify();
        return null;
      }

      const createdWeb = result.data;
      this.state.websites = [createdWeb, ...this.state.websites];
      this.state.activeWebsiteId = createdWeb.id;

      // Inisialisasi halaman Beranda dan draf awal di Supabase
      const pageRes = await pageService.getPagesWithDrafts({
        id: createdWeb.id,
        name: createdWeb.name,
      });
      if (pageRes.pages && pageRes.pages.length > 0) {
        const otherPages = this.state.pages.filter((p) => p.website_id !== createdWeb.id);
        this.state.pages = [...otherPages, ...pageRes.pages];
        this.state.pageComponents = {
          ...this.state.pageComponents,
          ...pageRes.pageComponents,
        };
      }

      this.state.lastSuccessMessage = `Website "${name}" berhasil dibuat secara permanen di Supabase.`;
      this.logActivity(`Membuat website baru: ${name}`, 'website', result.data.id);
      this.notify();
      return result.data;
    }

    // Fallback Lokal (Demo Mode)
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newWebsite: Website = {
      id: `web-${Date.now()}`,
      workspace_id: this.state.activeWorkspaceId,
      name,
      slug: slug || `situs-${Date.now()}`,
      business_category: category,
      description: `Website bisnis ${category} modern dengan Arisera.`,
      whatsapp_number: '6281200000000',
      whatsapp_message_template: 'Halo, saya tertarik dengan produk {product_name}',
      status: 'draft',
      subdomain: `${slug || 'situs'}.arisera.id`,
      is_domain_verified: false,
      theme_settings: template
        ? template.default_theme
        : {
            primaryColor: '#6D4AFF',
            accentColor: '#9B7BFF',
            backgroundColor: '#FFFFFF',
            textColor: '#11111B',
            fontFamily: 'Plus Jakarta Sans',
            borderRadius: '8px',
          },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.state.websites = [newWebsite, ...this.state.websites];
    this.state.activeWebsiteId = newWebsite.id;
    this.state.isLoading = false;
    this.state.lastSuccessMessage = `Website "${name}" dibuat (Mode Demo Lokal).`;
    this.logActivity(`Membuat website baru: ${name}`, 'website', newWebsite.id);
    this.notify();
    return newWebsite;
  }

  public async updateWebsiteStatusAsync(
    websiteId: string,
    status: Website['status']
  ): Promise<boolean> {
    this.clearMessages();

    if (this.state.storageMode === 'supabase_live') {
      const res = await websiteService.updateWebsiteStatus(websiteId, status);
      if (res.error || !res.data) {
        this.state.lastErrorMessage = `Gagal memperbarui status website di database: ${res.error}`;
        this.notify();
        return false;
      }
    }

    this.state.websites = this.state.websites.map((w) =>
      w.id === websiteId ? { ...w, status, updated_at: new Date().toISOString() } : w
    );
    this.state.lastSuccessMessage = `Status website diperbarui menjadi "${status}".`;
    this.logActivity(`Memperbarui status website menjadi "${status}"`, 'website', websiteId);
    this.notify();
    return true;
  }

  public async updateWebsiteInfoAsync(
    websiteId: string,
    updates: Partial<Website>
  ): Promise<boolean> {
    this.clearMessages();

    if (this.state.storageMode === 'supabase_live') {
      const res = await websiteService.updateWebsite(websiteId, updates);
      if (res.error || !res.data) {
        this.state.lastErrorMessage = `Gagal menyimpan pengaturan website ke database: ${res.error}`;
        this.notify();
        return false;
      }
    }

    this.state.websites = this.state.websites.map((w) =>
      w.id === websiteId ? { ...w, ...updates, updated_at: new Date().toISOString() } : w
    );
    this.state.lastSuccessMessage = 'Pengaturan website berhasil disimpan.';
    this.notify();
    return true;
  }

  public async deleteWebsiteAsync(websiteId: string): Promise<boolean> {
    this.clearMessages();

    if (this.state.storageMode === 'supabase_live') {
      const res = await websiteService.deleteWebsite(websiteId);
      if (res.error) {
        this.state.lastErrorMessage = `Gagal menghapus website di database: ${res.error}`;
        this.notify();
        return false;
      }
    }

    this.state.websites = this.state.websites.filter((w) => w.id !== websiteId);
    if (this.state.activeWebsiteId === websiteId) {
      const nextWeb = this.state.websites.find(
        (w) => w.workspace_id === this.state.activeWorkspaceId
      );
      this.state.activeWebsiteId = nextWeb?.id || '';
    }
    this.state.lastSuccessMessage = 'Website berhasil dihapus.';
    this.notify();
    return true;
  }

  // =========================================================================
  // PRODUCT ACTIONS
  // =========================================================================
  public async createProductAsync(
    data: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Product | null> {
    this.state.isLoading = true;
    this.clearMessages();

    // Penegakan kuota SaaS untuk produk katalog
    const quota = this.checkQuota('create_product');
    if (!quota.allowed) {
      this.state.isLoading = false;
      this.state.lastErrorMessage = quota.reason || 'Batas kuota katalog produk telah tercapai.';
      this.notify();
      return null;
    }

    this.notify();

    if (this.state.storageMode === 'supabase_live') {
      const res = await productService.createProduct(data);
      this.state.isLoading = false;

      if (res.error || !res.data) {
        this.state.lastErrorMessage = `Gagal menambahkan produk ke database: ${res.error}`;
        this.notify();
        return null;
      }

      this.state.products = [res.data, ...this.state.products];
      this.state.lastSuccessMessage = `Produk "${res.data.name}" berhasil disimpan permanen di database.`;
      this.logActivity(`Menambahkan produk baru "${res.data.name}"`, 'product', res.data.id);
      this.notify();
      return res.data;
    }

    // Fallback Lokal (Demo Mode)
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.products = [newProduct, ...this.state.products];
    this.state.isLoading = false;
    this.state.lastSuccessMessage = `Produk "${newProduct.name}" ditambahkan (Mode Demo Lokal).`;
    this.logActivity(`Menambahkan produk baru "${newProduct.name}"`, 'product', newProduct.id);
    this.notify();
    return newProduct;
  }

  public async updateProductAsync(
    id: string,
    updates: Partial<Omit<Product, 'id' | 'created_at'>>
  ): Promise<boolean> {
    this.clearMessages();

    if (this.state.storageMode === 'supabase_live') {
      const res = await productService.updateProduct(id, updates);
      if (res.error || !res.data) {
        this.state.lastErrorMessage = `Gagal memperbarui produk di database: ${res.error}`;
        this.notify();
        return false;
      }
    }

    this.state.products = this.state.products.map((p) =>
      p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
    );
    this.state.lastSuccessMessage = 'Produk berhasil diperbarui.';
    this.logActivity(`Memperbarui produk ID: ${id}`, 'product', id);
    this.notify();
    return true;
  }

  public async deleteProductAsync(id: string): Promise<boolean> {
    this.clearMessages();

    if (this.state.storageMode === 'supabase_live') {
      const res = await productService.deleteProduct(id);
      if (res.error) {
        this.state.lastErrorMessage = `Gagal menghapus produk di database: ${res.error}`;
        this.notify();
        return false;
      }
    }

    const prod = this.state.products.find((p) => p.id === id);
    this.state.products = this.state.products.filter((p) => p.id !== id);
    if (prod) {
      this.logActivity(`Menghapus produk "${prod.name}"`, 'product', id);
    }
    this.state.lastSuccessMessage = 'Produk berhasil dihapus.';
    this.notify();
    return true;
  }

  public updateComponents(pageId: string, components: VisualComponentBlock[]) {
    this.state.pageComponents[pageId] = components;
    this.notify();
  }

  /**
   * Menyimpan draf komponen halaman ke Supabase (tabel public.page_versions)
   * dan memperbarui pointer current_draft_version_id pada public.pages.
   * Status website tetap DRAFT (tidak dipublikasikan).
   */
  public async savePageDraftAsync(
    websiteId: string,
    pageId: string,
    components: VisualComponentBlock[]
  ): Promise<{ success: boolean; pageId: string; versionId?: string; error?: string }> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    try {
      // 1. Simpan ke state in-memory lokal segera
      this.state.pageComponents[pageId] = components;

      // 2. Jika Supabase live aktif, simpan ke database PostgreSQL
      if (this.state.storageMode === 'supabase_live') {
        const targetPage = this.state.pages.find((p) => p.id === pageId);

        const res = await pageService.savePageDraft({
          websiteId,
          pageId,
          components,
          title: targetPage?.title || 'Beranda',
        });

        this.state.isLoading = false;

        if (!res.success || res.error) {
          this.state.lastErrorMessage = res.error || 'Gagal menyimpan draf ke database Supabase.';
          this.notify();
          return { success: false, pageId, error: this.state.lastErrorMessage };
        }

        const realPageId = res.pageId || pageId;
        this.state.pageComponents[realPageId] = components;

        // Jika pageId sebelumnya adalah mock (misal 'page-home-01') dan dikonversi ke UUID nyata:
        if (realPageId !== pageId) {
          delete this.state.pageComponents[pageId];
          this.state.pages = this.state.pages.map((p) =>
            p.id === pageId
              ? { ...p, id: realPageId, current_draft_version_id: res.versionId, updated_at: new Date().toISOString() }
              : p
          );
        } else if (res.versionId) {
          this.state.pages = this.state.pages.map((p) =>
            p.id === realPageId
              ? { ...p, current_draft_version_id: res.versionId, updated_at: new Date().toISOString() }
              : p
          );
        }

        this.state.lastSuccessMessage = 'Draf website berhasil disimpan ke database Supabase.';
        this.logActivity('Menyimpan draf halaman visual', 'page', realPageId);
        this.notify();
        return { success: true, pageId: realPageId, versionId: res.versionId };
      }

      // Mode Demo Lokal
      this.state.isLoading = false;
      this.state.lastSuccessMessage = 'Draf tersimpan (Mode Demo Lokal).';
      this.notify();
      return { success: true, pageId };
    } catch (err: any) {
      this.state.isLoading = false;
      this.state.lastErrorMessage = err?.message || 'Terjadi kesalahan saat menyimpan draf.';
      this.notify();
      return { success: false, pageId, error: this.state.lastErrorMessage || undefined };
    }
  }

  public async loadMediaAssetsAsync(workspaceId: string): Promise<void> {
    if (this.state.storageMode !== 'supabase_live') return;
    const res = await mediaService.getMediaAssets(workspaceId);
    if (res.data) {
      this.state.mediaAssets = res.data;
      this.notify();
    }
  }

  public async uploadMediaAssetAsync(
    workspaceId: string,
    file: File,
    websiteId?: string
  ): Promise<MediaAsset | null> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    const res = await mediaService.uploadMedia(workspaceId, file, websiteId);
    this.state.isLoading = false;

    if (res.error || !res.data) {
      this.state.lastErrorMessage = res.error || 'Gagal mengunggah file media.';
      this.notify();
      return null;
    }

    this.state.mediaAssets = [res.data, ...this.state.mediaAssets];
    this.state.lastSuccessMessage = `Berkas "${res.data.file_name}" berhasil diunggah ke storage.`;
    this.logActivity(`Mengunggah berkas media: ${res.data.file_name}`, 'media', res.data.id);
    this.notify();
    return res.data;
  }

  public async deleteMediaAssetAsync(id: string, storagePath?: string): Promise<boolean> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    const res = await mediaService.deleteMedia(id, storagePath);
    this.state.isLoading = false;

    if (res.error) {
      this.state.lastErrorMessage = res.error;
      this.notify();
      return false;
    }

    this.state.mediaAssets = this.state.mediaAssets.filter((m) => m.id !== id);
    this.state.lastSuccessMessage = 'Berkas media berhasil dihapus.';
    this.logActivity(`Menghapus berkas media ID: ${id}`, 'media', id);
    this.notify();
    return true;
  }

  public addMediaAsset(file: Omit<MediaAsset, 'id' | 'created_at'>) {
    const newMedia: MediaAsset = {
      ...file,
      id: `med-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    this.state.mediaAssets = [newMedia, ...this.state.mediaAssets];
    this.notify();
  }

  public async publishWebsiteAsync(
    websiteId: string,
    snapshotData: any,
    versionTag?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; version?: any }> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    const res = await publishingService.publishWebsite(websiteId, snapshotData, versionTag, notes);
    this.state.isLoading = false;

    if (res.error || !res.data) {
      this.state.lastErrorMessage = res.error || 'Gagal memublikasikan website.';
      this.notify();
      return { success: false, error: this.state.lastErrorMessage };
    }

    // Perbarui status website di state
    this.state.websites = this.state.websites.map((w) =>
      w.id === websiteId
        ? {
            ...w,
            status: 'published',
            published_version_id: res.data?.version?.id,
            updated_at: new Date().toISOString(),
          }
        : w
    );

    const publishedTag = res.data.version?.version_tag || versionTag || 'v1.0';
    this.state.lastSuccessMessage = `Situs web berhasil dipublikasikan permanen (${publishedTag})!`;
    this.logActivity(`Publikasi website versi ${publishedTag}`, 'website', websiteId);
    this.notify();
    return { success: true, version: res.data.version };
  }

  public async rollbackVersionAsync(
    websiteId: string,
    versionId: string
  ): Promise<{ success: boolean; error?: string; version?: any }> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    const res = await publishingService.rollbackToVersion(websiteId, versionId);
    this.state.isLoading = false;

    if (res.error || !res.data) {
      this.state.lastErrorMessage = res.error || 'Gagal memulihkan versi website.';
      this.notify();
      return { success: false, error: this.state.lastErrorMessage };
    }

    // Perbarui tautan versi rilis website
    this.state.websites = this.state.websites.map((w) =>
      w.id === websiteId
        ? {
            ...w,
            published_version_id: versionId,
            updated_at: new Date().toISOString(),
          }
        : w
    );

    // Jika snapshot data memiliki komponen, pulihkan ke canvas visual seluruh halaman
    if (res.data.snapshot_data?.all_page_components) {
      Object.entries(res.data.snapshot_data.all_page_components).forEach(([pId, comps]) => {
        this.state.pageComponents[pId] = comps as VisualComponentBlock[];
      });
    } else if (res.data.snapshot_data?.components && Array.isArray(res.data.snapshot_data.components)) {
      const activePageId =
        this.state.pages.find((p) => p.website_id === websiteId)?.id || 'page-home-01';
      this.state.pageComponents[activePageId] = res.data.snapshot_data.components;
    }

    // Pulihkan daftar struktur halaman jika tersimpan dalam snapshot
    if (res.data.snapshot_data?.pages && Array.isArray(res.data.snapshot_data.pages)) {
      const otherPages = this.state.pages.filter((p) => p.website_id !== websiteId);
      this.state.pages = [...otherPages, ...res.data.snapshot_data.pages];
    }

    this.state.lastSuccessMessage = `Website berhasil dipulihkan ke versi ${res.data.version_tag}.`;
    this.logActivity(`Rollback website ke versi ${res.data.version_tag}`, 'website', websiteId);
    this.notify();
    return { success: true, version: res.data };
  }

  /**
   * Memulihkan snapshot versi draf tertentu ke kanvas editor aktif.
   *
   * ATURAN KRITIKAL:
   * 1. HANYA memuat ke state kanvas editor aktif (this.state.pageComponents[pageId]).
   * 2. TIDAK mengubah status website (status tetap 'draft', TIDAK dipublikasikan).
   * 3. TIDAK menimpa atau menghapus snapshot versi sumber di tabel public.page_versions.
   * 4. Memberikan feedback status berhasil/gagal secara eksplisit.
   */
  public async loadDraftVersionToCanvasAsync(
    websiteId: string,
    pageId: string,
    versionId: string,
    fallbackVersion?: PageVersion
  ): Promise<{
    success: boolean;
    components?: VisualComponentBlock[];
    version?: PageVersion;
    error?: string;
  }> {
    this.clearMessages();
    this.state.isLoading = true;
    this.notify();

    try {
      let components: VisualComponentBlock[] = [];
      let versionObj: PageVersion | undefined = fallbackVersion;

      if (this.state.storageMode === 'supabase_live') {
        const res = await pageService.getPageVersionSnapshot(pageId, versionId);
        if (!res.data || res.error) {
          this.state.isLoading = false;
          this.state.lastErrorMessage = res.error || 'Gagal memuat snapshot versi draf dari database.';
          this.notify();
          return { success: false, error: this.state.lastErrorMessage || undefined };
        }
        components = res.data.components;
        versionObj = res.data.version;
      } else {
        // Mode Demo Lokal
        const res = await pageService.getPageVersionSnapshot(pageId, versionId);
        if (res.data) {
          components = res.data.components;
          versionObj = res.data.version;
        } else if (fallbackVersion?.components && Array.isArray(fallbackVersion.components)) {
          const val = validateAndCleanComponents(fallbackVersion.components);
          if (!val.valid) {
            this.state.isLoading = false;
            this.state.lastErrorMessage = val.error || 'Data komponen versi rusak.';
            this.notify();
            return { success: false, error: this.state.lastErrorMessage || undefined };
          }
          components = val.components;
          versionObj = fallbackVersion;
        } else {
          this.state.isLoading = false;
          this.state.lastErrorMessage = 'Data komponen versi draf tidak ditemukan.';
          this.notify();
          return { success: false, error: this.state.lastErrorMessage || undefined };
        }
      }

      // Validasi komponen
      const validation = validateAndCleanComponents(components);
      if (!validation.valid) {
        this.state.isLoading = false;
        this.state.lastErrorMessage = validation.error || 'Komponen versi draf tidak valid.';
        this.notify();
        return { success: false, error: this.state.lastErrorMessage || undefined };
      }

      const cleanComponents = validation.components;

      // Update state in-memory kanvas editor untuk halaman target
      this.state.pageComponents[pageId] = cleanComponents;
      this.state.isLoading = false;

      // PASTIKAN: status website TIDAK berubah (tetap DRAFT)
      const verNum = versionObj?.version_number ? `#${versionObj.version_number}` : '';
      this.state.lastSuccessMessage = `Versi Draf ${verNum} berhasil dimuat ke kanvas editor (Status tetap DRAF).`;
      this.logActivity(`Memuat snapshot draf ${verNum} ke kanvas`, 'page', pageId);
      this.notify();

      return {
        success: true,
        components: cleanComponents,
        version: versionObj,
      };
    } catch (err: any) {
      this.state.isLoading = false;
      this.state.lastErrorMessage = err?.message || 'Terjadi kesalahan saat memulihkan snapshot draf.';
      this.notify();
      return { success: false, error: this.state.lastErrorMessage || undefined };
    }
  }

  // =========================================================================
  // MULTI-PAGE MANAGEMENT ACTIONS
  // =========================================================================
  public async createPageAsync(
    websiteId: string,
    title: string,
    slug: string,
    isHomepage = false
  ): Promise<Page | null> {
    this.clearMessages();

    // Penegakan kuota SaaS untuk halaman website
    const quota = this.checkQuota('create_page');
    if (!quota.allowed) {
      this.state.lastErrorMessage = quota.reason || 'Batas kuota halaman telah tercapai.';
      this.notify();
      return null;
    }

    if (this.state.storageMode === 'supabase_live') {
      const web = this.state.websites.find((w) => w.id === websiteId);
      const res = await pageService.createPage({
        websiteId,
        title,
        slug,
        is_homepage: isHomepage,
        brandName: web?.name,
      });

      if (res.data) {
        this.state.pages = [...this.state.pages, res.data.page];
        this.state.pageComponents[res.data.page.id] = res.data.components;
        this.state.lastSuccessMessage = `Halaman "${title}" berhasil ditambahkan ke database.`;
        this.logActivity(`Membuat halaman baru "${title}"`, 'page', res.data.page.id);
        this.notify();
        return res.data.page;
      } else {
        this.state.lastErrorMessage = res.error || 'Gagal membuat halaman di database.';
        this.notify();
        return null;
      }
    }

    // Fallback mode demo lokal
    const newPage: Page = {
      id: `page-${Date.now()}`,
      website_id: websiteId,
      title,
      slug,
      is_homepage: isHomepage,
      display_order: this.state.pages.filter((p) => p.website_id === websiteId).length + 1,
      status: 'draft',
      seo_title: `${title} | ${this.state.websites.find((w) => w.id === websiteId)?.name || 'Arisera'}`,
      seo_description: `Halaman ${title} resmi.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const initialBlocks = createDefaultPageBlocks(
      this.state.websites.find((w) => w.id === websiteId)?.name || 'Brand Kami',
      'about'
    );

    this.state.pages = [...this.state.pages, newPage];
    this.state.pageComponents[newPage.id] = initialBlocks;
    this.state.lastSuccessMessage = `Halaman "${title}" berhasil ditambahkan.`;
    this.logActivity(`Membuat halaman baru "${title}"`, 'page', newPage.id);
    this.notify();
    return newPage;
  }

  public async updatePageAsync(
    pageId: string,
    updates: Partial<Page>
  ): Promise<boolean> {
    this.clearMessages();

    if (this.state.storageMode === 'supabase_live') {
      const res = await pageService.updatePageSettings(pageId, updates);
      if (res.error) {
        this.state.lastErrorMessage = res.error;
        this.notify();
        return false;
      }
    }

    this.state.pages = this.state.pages.map((p) =>
      p.id === pageId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
    );
    this.state.lastSuccessMessage = 'Pengaturan halaman berhasil diperbarui.';
    this.notify();
    return true;
  }

  public async deletePageAsync(pageId: string): Promise<boolean> {
    this.clearMessages();
    const page = this.state.pages.find((p) => p.id === pageId);
    if (!page) return false;
    if (page.is_homepage) {
      this.state.lastErrorMessage = 'Halaman beranda utama tidak dapat dihapus.';
      this.notify();
      return false;
    }

    if (this.state.storageMode === 'supabase_live') {
      const res = await pageService.deletePage(pageId);
      if (res.error) {
        this.state.lastErrorMessage = res.error;
        this.notify();
        return false;
      }
    }

    this.state.pages = this.state.pages.filter((p) => p.id !== pageId);
    delete this.state.pageComponents[pageId];
    this.state.lastSuccessMessage = `Halaman "${page.title}" berhasil dihapus.`;
    this.logActivity(`Menghapus halaman "${page.title}"`, 'page', pageId);
    this.notify();
    return true;
  }

  public reorderPages(pages: Page[]) {
    const websiteId = pages[0]?.website_id;
    if (!websiteId) return;

    const otherPages = this.state.pages.filter((p) => p.website_id !== websiteId);
    const updatedPages = pages.map((p, idx) => ({ ...p, display_order: idx + 1 }));
    this.state.pages = [...otherPages, ...updatedPages];
    this.notify();
  }

  // =========================================================================
  // CONTACT SUBMISSIONS ACTIONS
  // =========================================================================
  public async submitContactFormAsync(
    data: ContactFormData
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const res = await contactService.submitContactForm(data);
    if (res.error || !res.data) {
      return { success: false, message: '', error: res.error || 'Gagal mengirim pesan.' };
    }

    const newSub: ContactSubmission = {
      id: res.data.id,
      website_id: data.website_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject || 'Pesan Formulir Kontak',
      message: data.message,
      status: 'unread',
      created_at: new Date().toISOString(),
    };

    this.state.contactSubmissions = [newSub, ...this.state.contactSubmissions];
    this.notify();
    return { success: true, message: res.data.message };
  }

  public async loadContactSubmissionsAsync(websiteId: string): Promise<void> {
    if (this.state.storageMode !== 'supabase_live') return;
    const res = await contactService.getSubmissions(websiteId);
    if (res.data) {
      this.state.contactSubmissions = res.data;
      this.notify();
    }
  }

  public async updateContactSubmissionStatusAsync(
    id: string,
    status: ContactSubmission['status']
  ): Promise<boolean> {
    await contactService.updateStatus(id, status);
    this.state.contactSubmissions = this.state.contactSubmissions.map((s) =>
      s.id === id ? { ...s, status } : s
    );
    this.notify();
    return true;
  }

  public async deleteContactSubmissionAsync(id: string): Promise<boolean> {
    await contactService.deleteSubmission(id);
    this.state.contactSubmissions = this.state.contactSubmissions.filter((s) => s.id !== id);
    this.notify();
    return true;
  }

  // =========================================================================
  // SAAS PLANS & QUOTA MANAGEMENT
  // =========================================================================
  public getActiveWorkspacePlan(): {
    plan: SaaSPlanLimits;
    tier: PlanTier;
    usage: {
      websites: number;
      pages: number;
      products: number;
      members: number;
      storageMB: number;
    };
  } {
    const ws = this.state.workspaces.find((w) => w.id === this.state.activeWorkspaceId);
    const tier = ws?.plan_tier || 'starter';
    const plan = SAAS_PLANS[tier];

    const currentWebsites = this.state.websites.filter((w) => w.workspace_id === this.state.activeWorkspaceId);
    const websiteIds = new Set(currentWebsites.map((w) => w.id));
    const currentPages = this.state.pages.filter((p) => websiteIds.has(p.website_id));
    const currentProducts = this.state.products.filter((p) => websiteIds.has(p.website_id));
    const currentMembers = this.state.workspaceMembers.filter((m) => m.workspace_id === this.state.activeWorkspaceId);
    const currentMedia = this.state.mediaAssets.filter((m) => m.workspace_id === this.state.activeWorkspaceId);
    const totalStorageBytes = currentMedia.reduce((acc, m) => acc + (m.file_size || 0), 0);
    const storageMB = Math.round((totalStorageBytes / (1024 * 1024)) * 10) / 10;

    return {
      plan,
      tier,
      usage: {
        websites: currentWebsites.length,
        pages: currentPages.length,
        products: currentProducts.length,
        members: currentMembers.length,
        storageMB,
      },
    };
  }

  public checkQuota(
    action: 'create_website' | 'create_page' | 'create_product' | 'add_member' | 'custom_domain' | 'google_sync'
  ): { allowed: boolean; reason?: string } {
    const { plan, usage } = this.getActiveWorkspacePlan();

    if (action === 'create_website') {
      if (usage.websites >= plan.maxWebsites) {
        return {
          allowed: false,
          reason: `Batas kuota website tercapai (${usage.websites}/${plan.maxWebsites}) untuk ${plan.name}. Silakan upgrade paket ruang kerja Anda.`,
        };
      }
    }

    if (action === 'create_page') {
      const activeWebPages = this.state.pages.filter((p) => p.website_id === this.state.activeWebsiteId).length;
      if (activeWebPages >= plan.maxPagesPerWebsite) {
        return {
          allowed: false,
          reason: `Batas kuota halaman tercapai (${activeWebPages}/${plan.maxPagesPerWebsite} per website) untuk ${plan.name}.`,
        };
      }
    }

    if (action === 'create_product') {
      const activeWebProducts = this.state.products.filter((p) => p.website_id === this.state.activeWebsiteId).length;
      if (activeWebProducts >= plan.maxProducts) {
        return {
          allowed: false,
          reason: `Batas kuota katalog produk tercapai (${activeWebProducts}/${plan.maxProducts}) untuk ${plan.name}.`,
        };
      }
    }

    if (action === 'add_member') {
      if (usage.members >= plan.maxMembers) {
        return {
          allowed: false,
          reason: `Batas kuota anggota tim tercapai (${usage.members}/${plan.maxMembers}) untuk ${plan.name}.`,
        };
      }
    }

    if (action === 'custom_domain') {
      if (!plan.customDomainEnabled) {
        return {
          allowed: false,
          reason: `Domain kustom hanya tersedia pada Paket Pro atau Enterprise. Tingkatkan paket untuk menghubungkan domain Anda.`,
        };
      }
    }

    if (action === 'google_sync') {
      if (!plan.googleSyncEnabled) {
        return {
          allowed: false,
          reason: `Sinkronisasi Google Sheets & Drive otomatis hanya tersedia pada Paket Pro & Enterprise.`,
        };
      }
    }

    return { allowed: true };
  }

  // =========================================================================
  // WORKSPACE COLLABORATION & RBAC
  // =========================================================================
  public getWorkspaceMembers(workspaceId: string = this.state.activeWorkspaceId): WorkspaceMember[] {
    return this.state.workspaceMembers.filter((m) => m.workspace_id === workspaceId);
  }

  public getWorkspaceInvites(workspaceId: string = this.state.activeWorkspaceId): WorkspaceInvite[] {
    return this.state.workspaceInvites.filter((i) => i.workspace_id === workspaceId);
  }

  public getUserRoleInWorkspace(workspaceId: string = this.state.activeWorkspaceId): WorkspaceRole {
    const member = this.state.workspaceMembers.find(
      (m) => m.workspace_id === workspaceId && m.user_id === this.state.currentUser.id
    );
    if (member) return member.role;
    const ws = this.state.workspaces.find((w) => w.id === workspaceId);
    if (ws?.owner_id === this.state.currentUser.id) return 'owner';
    return 'viewer';
  }

  public async inviteMemberAsync(
    email: string,
    role: 'admin' | 'editor' | 'viewer'
  ): Promise<{ success: boolean; message: string; invite?: WorkspaceInvite }> {
    this.clearMessages();
    const cleanEmail = email.trim().toLowerCase();

    // Validasi email
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, message: 'Format alamat email tidak valid.' };
    }

    // Periksa otorisasi pembuat undangan
    const myRole = this.getUserRoleInWorkspace();
    if (myRole !== 'owner' && myRole !== 'admin') {
      return { success: false, message: 'Hanya Owner atau Admin yang memiliki izin mengundang anggota baru.' };
    }

    // Periksa kuota anggota
    const quotaCheck = this.checkQuota('add_member');
    if (!quotaCheck.allowed) {
      return { success: false, message: quotaCheck.reason || 'Batas kuota anggota tercapai.' };
    }

    // Periksa apakah sudah menjadi anggota
    const existingMember = this.state.workspaceMembers.find(
      (m) => m.workspace_id === this.state.activeWorkspaceId && (m.user?.email === cleanEmail || m.invited_email === cleanEmail)
    );
    if (existingMember) {
      return { success: false, message: 'Pengguna dengan email ini sudah menjadi anggota ruang kerja.' };
    }

    // Periksa apakah undangan ganda aktif
    const existingInvite = this.state.workspaceInvites.find(
      (i) => i.workspace_id === this.state.activeWorkspaceId && i.email === cleanEmail && i.status === 'pending'
    );
    if (existingInvite) {
      return { success: false, message: 'Undangan aktif ke email ini sudah pernah dikirim.' };
    }

    const newInvite: WorkspaceInvite = {
      id: `inv-${Date.now()}`,
      workspace_id: this.state.activeWorkspaceId,
      email: cleanEmail,
      role,
      invited_by: this.state.currentUser.id,
      status: 'pending',
      token: `tok-${Math.random().toString(36).substring(2, 10)}${Date.now()}`,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.state.workspaceInvites = [newInvite, ...this.state.workspaceInvites];
    this.state.lastSuccessMessage = `Undangan kolaborasi berhasil dikirimkan ke ${cleanEmail} dengan peran ${role}.`;
    this.logActivity(`Mengundang anggota baru ${cleanEmail} (${role})`, 'workspace', newInvite.id);
    this.notify();
    return { success: true, message: `Undangan berhasil dibuat untuk ${cleanEmail}`, invite: newInvite };
  }

  public async updateMemberRoleAsync(memberId: string, newRole: WorkspaceRole): Promise<boolean> {
    this.clearMessages();
    const myRole = this.getUserRoleInWorkspace();
    if (myRole !== 'owner' && myRole !== 'admin') {
      this.state.lastErrorMessage = 'Hanya Owner atau Admin yang dapat memperbarui peran anggota.';
      this.notify();
      return false;
    }

    const member = this.state.workspaceMembers.find((m) => m.id === memberId);
    if (!member) return false;

    if (member.role === 'owner' && myRole !== 'owner') {
      this.state.lastErrorMessage = 'Hanya Owner yang berhak mengubah peran sesama Owner.';
      this.notify();
      return false;
    }

    this.state.workspaceMembers = this.state.workspaceMembers.map((m) =>
      m.id === memberId ? { ...m, role: newRole } : m
    );

    this.state.lastSuccessMessage = `Peran anggota ${member.user?.full_name || member.invited_email} diubah menjadi ${newRole}.`;
    this.logActivity(`Mengubah peran anggota ${memberId} menjadi ${newRole}`, 'workspace', memberId);
    this.notify();
    return true;
  }

  public async removeMemberAsync(memberId: string): Promise<boolean> {
    this.clearMessages();
    const myRole = this.getUserRoleInWorkspace();
    if (myRole !== 'owner' && myRole !== 'admin') {
      this.state.lastErrorMessage = 'Hanya Owner atau Admin yang dapat menghapus anggota dari ruang kerja.';
      this.notify();
      return false;
    }

    const member = this.state.workspaceMembers.find((m) => m.id === memberId);
    if (!member) return false;

    if (member.role === 'owner') {
      this.state.lastErrorMessage = 'Pemilik utama (Owner) ruang kerja tidak dapat dihapus.';
      this.notify();
      return false;
    }

    this.state.workspaceMembers = this.state.workspaceMembers.filter((m) => m.id !== memberId);
    this.state.lastSuccessMessage = `Akses anggota ${member.user?.full_name || member.invited_email} berhasil dicabut.`;
    this.logActivity(`Mencabut akses anggota: ${member.user?.email || member.invited_email}`, 'workspace', memberId);
    this.notify();
    return true;
  }

  public async revokeInviteAsync(inviteId: string): Promise<boolean> {
    this.clearMessages();
    this.state.workspaceInvites = this.state.workspaceInvites.filter((i) => i.id !== inviteId);
    this.state.lastSuccessMessage = 'Undangan berhasil dibatalkan.';
    this.notify();
    return true;
  }

  // =========================================================================
  // CUSTOM DOMAINS MANAGEMENT
  // =========================================================================
  public getWebsiteDomains(websiteId: string = this.state.activeWebsiteId): WebsiteDomain[] {
    return this.state.websiteDomains.filter((d) => d.website_id === websiteId);
  }

  public async addDomainAsync(
    websiteId: string,
    rawDomain: string
  ): Promise<{ success: boolean; domain?: WebsiteDomain; error?: string }> {
    this.clearMessages();

    // Validasi kuota domain kustom
    const quota = this.checkQuota('custom_domain');
    if (!quota.allowed) {
      return { success: false, error: quota.reason };
    }

    // Normalisasi domain
    const clean = rawDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    if (!clean || !domainRegex.test(clean)) {
      return {
        success: false,
        error: 'Format domain tidak valid. Contoh yang benar: tokosaya.com atau www.tokosaya.com',
      };
    }

    // Periksa duplikasi domain
    const duplicate = this.state.websiteDomains.find((d) => d.domain === clean);
    if (duplicate) {
      return { success: false, error: 'Domain ini sudah didaftarkan pada sistem.' };
    }

    const verificationToken = `arisera-verify-${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`;
    const newDomain: WebsiteDomain = {
      id: `dom-${Date.now()}`,
      website_id: websiteId,
      domain: clean,
      is_primary: false,
      is_verified: false,
      verification_token: verificationToken,
      dns_records: [
        {
          type: 'CNAME',
          name: clean.startsWith('www.') ? 'www' : '@',
          value: 'cname.arisera.id',
          status: 'pending',
        },
        {
          type: 'TXT',
          name: '_arisera-challenge',
          value: `arisera-verification=${verificationToken}`,
          status: 'pending',
        },
      ],
      created_at: new Date().toISOString(),
    };

    this.state.websiteDomains = [...this.state.websiteDomains, newDomain];
    this.state.lastSuccessMessage = `Domain ${clean} berhasil ditambahkan. Silakan konfigurasikan DNS CNAME/TXT sesuai instruksi.`;
    this.logActivity(`Menambahkan domain kustom ${clean}`, 'domain', newDomain.id);
    this.notify();
    return { success: true, domain: newDomain };
  }

  public async verifyDomainAsync(
    domainId: string
  ): Promise<{ success: boolean; isVerified: boolean; message: string }> {
    this.clearMessages();
    const domain = this.state.websiteDomains.find((d) => d.id === domainId);
    if (!domain) {
      return { success: false, isVerified: false, message: 'Domain tidak ditemukan.' };
    }

    // Pemeriksaan DNS Nyata via Google Public DNS-over-HTTPS (DoH) API
    let cnameVerified = false;
    let txtVerified = false;

    try {
      // 1. Kueri DNS CNAME resolver global
      const cnameHost = domain.domain;
      const cnameRes = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(cnameHost)}&type=CNAME`
      );
      if (cnameRes.ok) {
        const cnameJson = await cnameRes.json();
        if (cnameJson.Answer && Array.isArray(cnameJson.Answer)) {
          cnameVerified = cnameJson.Answer.some((ans: any) =>
            ans.data && ans.data.toLowerCase().includes('cname.arisera.id')
          );
        }
      }

      // 2. Kueri DNS TXT challenge resolver global
      const txtHost = `_arisera-challenge.${domain.domain.replace(/^www\./, '')}`;
      const txtRes = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(txtHost)}&type=TXT`
      );
      if (txtRes.ok) {
        const txtJson = await txtRes.json();
        if (txtJson.Answer && Array.isArray(txtJson.Answer)) {
          txtVerified = txtJson.Answer.some((ans: any) =>
            ans.data && ans.data.includes(domain.verification_token)
          );
        }
      }
    } catch {
      // Jaringan offline / DNS error
    }

    const isVerified = cnameVerified || txtVerified;

    const updatedDns = domain.dns_records.map((r) => {
      if (r.type === 'CNAME') {
        return { ...r, status: cnameVerified ? ('verified' as const) : ('pending' as const) };
      }
      if (r.type === 'TXT') {
        return { ...r, status: txtVerified ? ('verified' as const) : ('pending' as const) };
      }
      return r;
    });

    if (isVerified) {
      this.state.websiteDomains = this.state.websiteDomains.map((d) =>
        d.id === domainId ? { ...d, is_verified: true, dns_records: updatedDns } : d
      );

      this.state.websites = this.state.websites.map((w) =>
        w.id === domain.website_id
          ? { ...w, custom_domain: domain.domain, is_domain_verified: true }
          : w
      );

      this.state.lastSuccessMessage = `Domain ${domain.domain} terkonfirmasi aktif pada DNS global & SSL aktif!`;
      this.logActivity(`Verifikasi DNS domain berhasil: ${domain.domain}`, 'domain', domainId);
      this.notify();

      return {
        success: true,
        isVerified: true,
        message: `Catatan DNS ${domain.domain} valid di resolver global. Domain aktif dan SSL diterbitkan.`,
      };
    } else {
      this.state.websiteDomains = this.state.websiteDomains.map((d) =>
        d.id === domainId ? { ...d, is_verified: false, dns_records: updatedDns } : d
      );
      this.notify();

      return {
        success: false,
        isVerified: false,
        message: `Catatan DNS untuk ${domain.domain} belum ditemukan di resolver global. Pastikan CNAME mengarah ke cname.arisera.id dan tunggu propagasi DNS (5-30 menit).`,
      };
    }
  }

  public async setPrimaryDomainAsync(domainId: string): Promise<boolean> {
    const domain = this.state.websiteDomains.find((d) => d.id === domainId);
    if (!domain || !domain.is_verified) {
      this.state.lastErrorMessage = 'Hanya domain yang sudah diverifikasi yang dapat dijadikan domain utama.';
      this.notify();
      return false;
    }

    this.state.websiteDomains = this.state.websiteDomains.map((d) => ({
      ...d,
      is_primary: d.id === domainId,
    }));

    this.state.websites = this.state.websites.map((w) =>
      w.id === domain.website_id ? { ...w, custom_domain: domain.domain } : w
    );

    this.state.lastSuccessMessage = `${domain.domain} kini menjadi domain utama website Anda.`;
    this.notify();
    return true;
  }

  public async removeDomainAsync(domainId: string): Promise<boolean> {
    const domain = this.state.websiteDomains.find((d) => d.id === domainId);
    if (!domain) return false;

    this.state.websiteDomains = this.state.websiteDomains.filter((d) => d.id !== domainId);
    this.state.websites = this.state.websites.map((w) =>
      w.custom_domain === domain.domain
        ? { ...w, custom_domain: undefined, is_domain_verified: false }
        : w
    );

    this.state.lastSuccessMessage = `Domain ${domain.domain} berhasil dihapus dari website.`;
    this.notify();
    return true;
  }

  // =========================================================================
  // GOOGLE WORKSPACE SYNC ACTIONS
  // =========================================================================
  public async importGoogleDriveMediaAsync(file: GoogleDriveFile): Promise<MediaAsset | null> {
    const quota = this.checkQuota('google_sync');
    if (!quota.allowed) {
      this.state.lastErrorMessage = quota.reason || 'Fitur Google Sync tidak aktif di paket Anda.';
      this.notify();
      return null;
    }

    // 1. Cegah duplikasi aset Google Drive yang sudah pernah diimpor
    const existingAsset = this.state.mediaAssets.find(
      (a) => a.workspace_id === this.state.activeWorkspaceId && a.external_id === file.id
    );
    if (existingAsset) {
      this.state.lastSuccessMessage = `Aset "${file.name}" sudah tersedia di pustaka media.`;
      this.notify();
      return existingAsset;
    }

    const fileUrl = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s1200') : (file.webContentLink || '');

    if (this.state.storageMode === 'supabase_live') {
      const res = await mediaService.createExternalMediaAsset(this.state.activeWorkspaceId, {
        file_name: file.name,
        file_size: file.size || 250000,
        mime_type: file.mimeType || 'image/jpeg',
        url: fileUrl,
        source: 'google_drive',
        external_id: file.id,
        website_id: this.state.activeWebsiteId,
      });

      if (res.data) {
        this.state.mediaAssets = [res.data, ...this.state.mediaAssets];
        this.state.lastSuccessMessage = `Foto "${file.name}" dari Google Drive berhasil disimpan ke Supabase!`;
        this.logActivity(`Impor aset media dari Google Drive ke Supabase: ${file.name}`, 'media', res.data.id);
        this.notify();
        return res.data;
      }
    }

    const newAsset: MediaAsset = {
      id: `med-gd-${Date.now()}`,
      workspace_id: this.state.activeWorkspaceId,
      website_id: this.state.activeWebsiteId,
      file_name: file.name,
      file_size: file.size || 250000,
      mime_type: file.mimeType || 'image/jpeg',
      url: fileUrl,
      source: 'google_drive',
      external_id: file.id,
      created_at: new Date().toISOString(),
    };

    this.state.mediaAssets = [newAsset, ...this.state.mediaAssets];
    this.state.lastSuccessMessage = `Foto "${file.name}" dari Google Drive berhasil diimpor ke pustaka media.`;
    this.logActivity(`Impor aset media dari Google Drive: ${file.name}`, 'media', newAsset.id);
    this.notify();
    return newAsset;
  }

  public async importGoogleSheetProductsAsync(
    websiteId: string,
    items: SheetRowData[]
  ): Promise<number> {
    const quota = this.checkQuota('google_sync');
    if (!quota.allowed) {
      this.state.lastErrorMessage = quota.reason || 'Sinkronisasi Google Sheets tidak aktif di paket Anda.';
      this.notify();
      return 0;
    }

    // 1. Hitung kuota tersedia sebelum melakukan mutasi untuk mencegah batch parsial
    const { plan: planLimits } = this.getActiveWorkspacePlan();
    const existingWebsiteProducts = this.state.products.filter((p) => p.website_id === websiteId);
    const availableSlots = Math.max(0, planLimits.maxProducts - existingWebsiteProducts.length);

    if (availableSlots <= 0) {
      this.state.lastErrorMessage = `Batas kuota produk tercapai (${existingWebsiteProducts.length}/${planLimits.maxProducts}) untuk ${planLimits.name}. Silakan tingkatkan paket layanan Anda.`;
      this.notify();
      return 0;
    }

    // 2. Filter item valid dan deteksi duplikasi (berdasarkan SKU atau nama yang sama)
    const validItemsToImport: SheetRowData[] = [];
    let skippedDuplicates = 0;

    for (const item of items) {
      if (!item.name || item.price <= 0) continue;
      const cleanName = item.name.trim().toLowerCase();
      const cleanSku = item.sku?.trim().toLowerCase();

      const isDuplicate = existingWebsiteProducts.some((p) => {
        if (cleanSku && p.sku && p.sku.toLowerCase() === cleanSku) return true;
        return p.name.trim().toLowerCase() === cleanName;
      });

      if (isDuplicate) {
        skippedDuplicates++;
        continue;
      }

      validItemsToImport.push(item);
    }

    if (validItemsToImport.length === 0) {
      if (skippedDuplicates > 0) {
        this.state.lastErrorMessage = `Seluruh ${skippedDuplicates} produk dari lembar sheet telah ada di katalog (duplikat dilewati).`;
      } else {
        this.state.lastErrorMessage = 'Tidak ada baris data produk valid yang dapat diimpor (pastikan kolom Nama dan Harga terisi).';
      }
      this.notify();
      return 0;
    }

    // 3. Batasi kuota agar tidak melebihi kapasitas paket
    const itemsAllowed = validItemsToImport.slice(0, availableSlots);
    const quotaExceededCount = validItemsToImport.length - itemsAllowed.length;

    let importedCount = 0;
    const newProducts: Product[] = [];

    if (this.state.storageMode === 'supabase_live') {
      for (const item of itemsAllowed) {
        const slug = item.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

        const res = await productService.createProduct({
          website_id: websiteId,
          name: item.name,
          slug: `${slug}-${Math.random().toString(36).substring(2, 5)}`,
          sku: item.sku || `GS-${Math.floor(1000 + Math.random() * 9000)}`,
          description: item.description || 'Produk disinkronkan dari Google Sheets.',
          price: item.price,
          stock_quantity: item.stock !== undefined ? item.stock : 25,
          is_available: true,
          images: ['/assets/sample-dish-1.jpg'],
        });

        if (res.data) {
          importedCount++;
          newProducts.push(res.data);
        }
      }

      if (newProducts.length > 0) {
        this.state.products = [...newProducts, ...this.state.products];
        let msg = `Berhasil menyimpan ${importedCount} produk dari Google Sheets ke database Supabase!`;
        if (skippedDuplicates > 0) msg += ` (${skippedDuplicates} produk sudah ada dilewati)`;
        if (quotaExceededCount > 0) msg += ` (${quotaExceededCount} produk dipotong karena kuota paket tercapai)`;
        this.state.lastSuccessMessage = msg;
        this.logActivity(`Sinkronisasi ${importedCount} produk dari Google Sheets ke Supabase`, 'product', websiteId);
        this.notify();
      }

      return importedCount;
    }

    for (const item of itemsAllowed) {
      const slug = item.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const newProd: Product = {
        id: `prod-gs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        website_id: websiteId,
        name: item.name,
        slug: `${slug}-${Math.random().toString(36).substring(2, 5)}`,
        sku: item.sku || `GS-${Math.floor(1000 + Math.random() * 9000)}`,
        description: item.description || `Produk disinkronkan dari Google Sheets.`,
        price: item.price,
        stock_quantity: item.stock !== undefined ? item.stock : 25,
        is_available: true,
        images: ['/assets/sample-dish-1.jpg'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      newProducts.push(newProd);
      importedCount++;
    }

    if (newProducts.length > 0) {
      this.state.products = [...newProducts, ...this.state.products];
      let msg = `Berhasil mengimpor ${importedCount} produk baru dari Google Sheets ke katalog website!`;
      if (skippedDuplicates > 0) msg += ` (${skippedDuplicates} duplikat dilewati)`;
      if (quotaExceededCount > 0) msg += ` (${quotaExceededCount} dipotong sesuai batas kuota paket)`;
      this.state.lastSuccessMessage = msg;
      this.logActivity(`Sinkronisasi ${importedCount} produk dari Google Sheets`, 'product', websiteId);
      this.notify();
    }

    return importedCount;
  }

  private logActivity(action: string, targetType: ActivityLog['target_type'], targetId: string) {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      workspace_id: this.state.activeWorkspaceId,
      user_id: this.state.currentUser.id,
      action,
      target_type: targetType,
      target_id: targetId,
      created_at: new Date().toISOString(),
    };
    this.state.activityLogs = [newLog, ...this.state.activityLogs];
  }

  // Synchronous wrappers untuk kompatibilitas UI instan
  public createWorkspace(name: string): Workspace {
    this.createWorkspaceAsync(name);
    return this.state.workspaces[0];
  }

  public createWebsite(
    name: string,
    category: Website['business_category'],
    templateId?: string
  ): Website {
    this.createWebsiteAsync(name, category, templateId);
    return this.state.websites[0];
  }

  public updateWebsiteStatus(websiteId: string, status: Website['status']) {
    this.updateWebsiteStatusAsync(websiteId, status);
  }

  public createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    this.createProductAsync(data);
    return this.state.products[0];
  }

  public updateProduct(id: string, updates: Partial<Product>) {
    this.updateProductAsync(id, updates);
  }

  public deleteProduct(id: string) {
    this.deleteProductAsync(id);
  }
}

export const store = new AriseraStore();
export default store;
