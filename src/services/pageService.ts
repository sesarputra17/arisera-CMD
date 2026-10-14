/**
 * ARISERA Platform - Page & Visual Draft Data Service
 * Mengelola tabel `public.pages` dan `public.page_versions` pada Supabase PostgreSQL.
 * Menyediakan penyimpanan draf visual tanpa mempublikasikan website (status DRAF dipertahankan),
 * pemuatan draf versi terbaru per halaman, pembuatan halaman default otomatis per website,
 * dan fallback aman ke mode demo lokal.
 */

import { getSupabase, isSupabaseLive } from './supabase';
import { Page, PageVersion, VisualComponentBlock, Website } from '../types/database';

export interface PageServiceResult<T> {
  data: T | null;
  error: string | null;
}

export interface SaveDraftResult {
  success: boolean;
  pageId: string;
  versionId?: string;
  error?: string;
}

/**
 * Pembuat blok komponen visual bawaan untuk halaman baru,
 * disesuaikan secara dinamis dengan nama brand / toko website.
 */
export function createDefaultPageBlocks(
  brandName: string,
  pageType: 'home' | 'menu' | 'about' | 'contact' = 'home'
): VisualComponentBlock[] {
  const currentYear = new Date().getFullYear();
  const safeBrand = brandName?.trim() || 'Brand Kami';

  const commonHeader: VisualComponentBlock = {
    id: `comp-header-${Date.now()}-1`,
    type: 'header',
    order: 1,
    content: {
      brandName: safeBrand,
      navLinks: [
        { label: 'Beranda', href: '#beranda', pageSlug: 'home' },
        { label: 'Katalog', href: '#katalog', pageSlug: 'menu' },
        { label: 'Tentang', href: '#tentang', pageSlug: 'about' },
        { label: 'Kontak', href: '#kontak', pageSlug: 'contact' },
      ],
      ctaText: 'Pesan Sekarang',
    },
    styles: {
      bgColor: '#FFFFFF',
      textColor: '#11111B',
      isSticky: true,
    },
  };

  const commonFooter: VisualComponentBlock = {
    id: `comp-footer-${Date.now()}-99`,
    type: 'footer',
    order: 10,
    content: {
      copyrightText: `© ${currentYear} ${safeBrand}. Diberdayakan oleh Arisera.`,
      address: 'Pusat Operasional Bisnis, Indonesia',
      phone: '+62 812-3456-7890',
      socialLinks: [
        { platform: 'Instagram', url: 'https://instagram.com' },
        { platform: 'WhatsApp', url: 'https://wa.me/6281234567890' },
      ],
    },
    styles: {
      bgColor: '#F8F8FC',
      textColor: '#85859A',
    },
  };

  if (pageType === 'home') {
    return [
      commonHeader,
      {
        id: `comp-hero-${Date.now()}-2`,
        type: 'hero',
        order: 2,
        content: {
          badgeText: 'Koleksi Terbaik & Terpercaya',
          headline: `Selamat Datang di ${safeBrand}`,
          subheadline:
            'Temukan produk dan layanan pilihan berkualitas tinggi dengan pengalaman pemesanan yang cepat, praktis, dan langsung terhubung ke WhatsApp.',
          ctaText: 'Lihat Produk Pilihan',
          ctaLink: '#produk',
          imageUrl:
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
        },
        styles: {
          bgColor: '#FFFFFF',
          textColor: '#11111B',
          textAlign: 'left',
          overlayOpacity: 0,
        },
      },
      {
        id: `comp-products-${Date.now()}-3`,
        type: 'product_featured',
        order: 3,
        content: {
          heading: 'Koleksi Produk Pilihan',
          subheading: 'Pilihan terfavorit dengan ulasan terbaik dari pelanggan kami.',
          limit: 4,
          columns: 4,
          showPrice: true,
          showOrderButton: true,
        },
        styles: {
          bgColor: '#F8F8FC',
          textColor: '#11111B',
        },
      },
      {
        id: `comp-wa-${Date.now()}-4`,
        type: 'whatsapp_cta',
        order: 4,
        content: {
          heading: 'Punya Pertanyaan atau Butuh Bantuan Khusus?',
          description:
            'Tim layanan pelanggan kami siap membantu Anda setiap hari. Hubungi langsung melalui WhatsApp resmi kami.',
          buttonText: 'Chat WhatsApp Kami',
          floatingPosition: 'right',
        },
        styles: {
          bgColor: '#25D366',
          textColor: '#FFFFFF',
        },
      },
      commonFooter,
    ];
  }

  return [commonHeader, commonFooter];
}

/**
 * Cache memori lokal untuk versi draf ketika Supabase tidak aktif / mode simulasi.
 */
export const localDraftVersionsCache: Record<string, PageVersion[]> = {};

export function clearLocalDraftVersionsCache() {
  Object.keys(localDraftVersionsCache).forEach((k) => delete localDraftVersionsCache[k]);
}

/**
 * Validasi dan normalisasi struktur array komponen visual.
 * Memastikan setiap blok memiliki id, type, order, content, dan styles yang aman.
 */
export function validateAndCleanComponents(raw: any): {
  valid: boolean;
  components: VisualComponentBlock[];
  error?: string;
} {
  let parsed = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {
        valid: false,
        components: [],
        error: 'Data komponen tersimpan dalam string JSON yang rusak atau tidak valid.',
      };
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      valid: false,
      components: [],
      error: 'Format data komponen tidak valid (harus berupa array blok visual).',
    };
  }

  const cleanComponents: VisualComponentBlock[] = parsed.map((c: any, idx: number) => ({
    id: typeof c?.id === 'string' && c.id.trim() ? c.id : `comp-${c?.type || 'block'}-${idx + 1}`,
    type: c?.type || 'text',
    order: typeof c?.order === 'number' ? c.order : idx + 1,
    content: c?.content && typeof c.content === 'object' ? c.content : {},
    styles: c?.styles && typeof c.styles === 'object' ? c.styles : {},
    is_hidden: Boolean(c?.is_hidden),
  }));

  return { valid: true, components: cleanComponents };
}

export const pageService = {
  /**
   * Mengambil daftar halaman (pages) untuk website tertentu dari Supabase.
   */
  async getPages(websiteId: string): Promise<PageServiceResult<Page[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return {
        data: null,
        error: 'Supabase belum terkonfigurasi. Berjalan dalam mode lokal.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('website_id', websiteId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Page[], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat halaman dari database.' };
    }
  },

  /**
   * Mengambil komponen draf terbaru untuk halaman tertentu dari `public.page_versions`.
   */
  async getPageDraftComponents(
    pageId: string
  ): Promise<PageServiceResult<VisualComponentBlock[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: null, error: 'Supabase belum terhubung.' };
    }

    try {
      // 1. Ambil data halaman untuk mengecek pointer current_draft_version_id
      const { data: pageRow } = await supabase
        .from('pages')
        .select('current_draft_version_id')
        .eq('id', pageId)
        .maybeSingle();

      if (pageRow?.current_draft_version_id) {
        const { data: verRow, error: verErr } = await supabase
          .from('page_versions')
          .select('components')
          .eq('id', pageRow.current_draft_version_id)
          .maybeSingle();

        if (!verErr && verRow && Array.isArray(verRow.components) && verRow.components.length > 0) {
          return { data: verRow.components as VisualComponentBlock[], error: null };
        }
      }

      // 2. Fallback: Ambil versi terbaru yang pernah disimpan untuk halaman ini
      const { data: latestVer, error: latestErr } = await supabase
        .from('page_versions')
        .select('components')
        .eq('page_id', pageId)
        .order('version_number', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestErr) {
        return { data: null, error: latestErr.message };
      }

      if (latestVer && Array.isArray(latestVer.components) && latestVer.components.length > 0) {
        return { data: latestVer.components as VisualComponentBlock[], error: null };
      }

      return { data: null, error: 'Belum ada draf versi komponen untuk halaman ini.' };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat komponen draf.' };
    }
  },

  /**
   * Mengambil seluruh halaman beserta komponen draf masing-masing untuk sebuah website.
   * Jika website di Supabase belum memiliki baris `pages`, fungsi ini secara otomatis
   * menginisialisasi halaman Beranda awal dan versi draf pertama di Supabase.
   */
  async getPagesWithDrafts(
    website: { id: string; name: string }
  ): Promise<{
    pages: Page[];
    pageComponents: Record<string, VisualComponentBlock[]>;
    error: string | null;
  }> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { pages: [], pageComponents: {}, error: 'Supabase belum terkonfigurasi' };
    }

    try {
      // 1. Ambil daftar halaman dari tabel public.pages
      const { data: pagesData, error: pagesErr } = await supabase
        .from('pages')
        .select('*')
        .eq('website_id', website.id)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (pagesErr) {
        return { pages: [], pageComponents: {}, error: pagesErr.message };
      }

      // 2. Jika website belum memiliki halaman sama sekali di Supabase:
      // Buatkan halaman Beranda utama dan versi draf perdananya secara otomatis.
      if (!pagesData || pagesData.length === 0) {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUserId = sessionData?.session?.user?.id || null;

        const initialBlocks = createDefaultPageBlocks(website.name, 'home');

        // Insert halaman baru ke tabel public.pages (status tetap draft)
        const { data: newPageRow, error: createPageErr } = await supabase
          .from('pages')
          .insert({
            website_id: website.id,
            title: 'Beranda',
            slug: 'home',
            is_homepage: true,
            display_order: 1,
            status: 'draft',
            seo_title: `${website.name} - Beranda Resmi`,
            seo_description: `Website resmi ${website.name}. Hubungi dan pesan langsung via WhatsApp.`,
          })
          .select()
          .single();

        if (createPageErr || !newPageRow) {
          return {
            pages: [],
            pageComponents: {},
            error: `Gagal menginisialisasi halaman Beranda: ${createPageErr?.message || 'Unknown error'}`,
          };
        }

        // Insert draf perdana ke tabel public.page_versions (is_published = false)
        const { data: verRow, error: verErr } = await supabase
          .from('page_versions')
          .insert({
            page_id: newPageRow.id,
            version_number: 1,
            components: initialBlocks,
            is_published: false,
            created_by: currentUserId,
          })
          .select()
          .single();

        if (!verErr && verRow) {
          // Update pointer current_draft_version_id pada tabel pages
          await supabase
            .from('pages')
            .update({
              current_draft_version_id: verRow.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', newPageRow.id);

          newPageRow.current_draft_version_id = verRow.id;
        }

        return {
          pages: [newPageRow as Page],
          pageComponents: {
            [newPageRow.id]: initialBlocks,
          },
          error: null,
        };
      }

      // 3. Website sudah memiliki halaman: Ambil draf komponen untuk setiap halaman
      const pages = pagesData as Page[];
      const pageComponents: Record<string, VisualComponentBlock[]> = {};

      await Promise.all(
        pages.map(async (page) => {
          const draftRes = await this.getPageDraftComponents(page.id);
          if (draftRes.data && draftRes.data.length > 0) {
            pageComponents[page.id] = draftRes.data;
          } else {
            // Jika belum ada versi draf di page_versions, buat draf perdana untuk halaman ini
            const initialBlocks = createDefaultPageBlocks(
              website.name,
              page.is_homepage ? 'home' : 'about'
            );
            pageComponents[page.id] = initialBlocks;

            const { data: sessionData } = await supabase.auth.getSession();
            const currentUserId = sessionData?.session?.user?.id || null;

            const { data: verRow } = await supabase
              .from('page_versions')
              .insert({
                page_id: page.id,
                version_number: 1,
                components: initialBlocks,
                is_published: false,
                created_by: currentUserId,
              })
              .select()
              .single();

            if (verRow) {
              await supabase
                .from('pages')
                .update({
                  current_draft_version_id: verRow.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', page.id);
            }
          }
        })
      );

      return { pages, pageComponents, error: null };
    } catch (err: any) {
      return {
        pages: [],
        pageComponents: {},
        error: err?.message || 'Gagal memuat halaman dan komponen website dari database.',
      };
    }
  },

  /**
   * Menyimpan draf komponen visual halaman ke tabel `public.page_versions`
   * dan memperbarui pointer `current_draft_version_id` pada `public.pages`.
   *
   * KRITIKAL:
   * 1. Status website pada tabel `public.websites` TIDAK diubah menjadi published (tetap DRAFT).
   * 2. Row pada `page_versions` disimpan dengan `is_published: false`.
   * 3. Menyimpan komponen dalam bentuk serialisasi JSON yang konsisten.
   * 4. Memverifikasi konfirmasi database sebelum mengembalikan status berhasil.
   */
  async savePageDraft(params: {
    websiteId: string;
    pageId: string;
    components: VisualComponentBlock[];
    title?: string;
  }): Promise<SaveDraftResult> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      // Validasi komponen
      const val = validateAndCleanComponents(params.components);
      if (!val.valid) {
        return {
          success: false,
          pageId: params.pageId,
          error: val.error || 'Format data komponen tidak valid.',
        };
      }

      // Catat ke cache versi draf lokal (simulasi/demo)
      const existingList = localDraftVersionsCache[params.pageId] || [];
      const nextVerNum = (existingList[0]?.version_number || 0) + 1;
      const localVersionId = `draft-ver-local-${Date.now()}-${nextVerNum}`;
      const newLocalVer: PageVersion = {
        id: localVersionId,
        page_id: params.pageId,
        version_number: nextVerNum,
        components: val.components,
        is_published: false,
        created_by: 'local-demo-user',
        created_at: new Date().toISOString(),
      };
      localDraftVersionsCache[params.pageId] = [newLocalVer, ...existingList];

      return {
        success: true,
        pageId: params.pageId,
        versionId: localVersionId,
      };
    }

    try {
      // Validasi komponen serializable
      if (!Array.isArray(params.components)) {
        return {
          success: false,
          pageId: params.pageId,
          error: 'Format data komponen tidak valid (harus berupa array).',
        };
      }

      // 1. Dapatkan identitas pengguna saat ini dari Supabase Auth
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || null;

      // 2. Pastikan ID halaman benar dan terikat ke website yang sesuai
      let targetPageId = params.pageId;

      // Cek apakah targetPageId adalah UUID yang sudah ada di tabel public.pages
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id, is_homepage')
        .eq('id', targetPageId)
        .eq('website_id', params.websiteId)
        .maybeSingle();

      if (!existingPage) {
        // Jika targetPageId tidak ditemukan (misal ID demo lokal 'page-home-01'):
        // Cari apakah website ini sudah memiliki halaman beranda di Supabase
        const { data: homePage } = await supabase
          .from('pages')
          .select('id')
          .eq('website_id', params.websiteId)
          .eq('is_homepage', true)
          .maybeSingle();

        if (homePage) {
          targetPageId = homePage.id;
        } else {
          // Jika belum ada halaman sama sekali, buatkan halaman baru di public.pages
          const { data: newPage, error: createPageErr } = await supabase
            .from('pages')
            .insert({
              website_id: params.websiteId,
              title: params.title || 'Beranda',
              slug: 'home',
              is_homepage: true,
              display_order: 1,
              status: 'draft',
            })
            .select()
            .single();

          if (createPageErr || !newPage) {
            return {
              success: false,
              pageId: params.pageId,
              error: `Gagal membuat data halaman di database: ${createPageErr?.message || 'Error tidak diketahui'}`,
            };
          }
          targetPageId = newPage.id;
        }
      }

      // 3. Hitung nomor versi draf berikutnya pada page_versions
      const { data: latestVer } = await supabase
        .from('page_versions')
        .select('version_number')
        .eq('page_id', targetPageId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersionNumber = (latestVer?.version_number || 0) + 1;

      // Bersihkan dan amankan struktur data setiap blok
      const cleanComponents: VisualComponentBlock[] = params.components.map((c, idx) => ({
        id: c.id || `comp-${c.type || 'block'}-${idx + 1}`,
        type: c.type,
        order: typeof c.order === 'number' ? c.order : idx + 1,
        content: c.content ? JSON.parse(JSON.stringify(c.content)) : {},
        styles: c.styles ? JSON.parse(JSON.stringify(c.styles)) : {},
        is_hidden: Boolean(c.is_hidden),
      }));

      // 4. Masukkan rekaman draf baru ke tabel public.page_versions (DRAF: is_published = false)
      const { data: versionRow, error: versionError } = await supabase
        .from('page_versions')
        .insert({
          page_id: targetPageId,
          version_number: nextVersionNumber,
          components: cleanComponents,
          is_published: false,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (versionError || !versionRow) {
        return {
          success: false,
          pageId: targetPageId,
          error: `Gagal menulis draf ke tabel page_versions: ${versionError?.message || 'Error simpan versi'}`,
        };
      }

      // 5. Perbarui pointer current_draft_version_id pada tabel public.pages
      const { error: pageUpdateError } = await supabase
        .from('pages')
        .update({
          current_draft_version_id: versionRow.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetPageId);

      if (pageUpdateError) {
        return {
          success: false,
          pageId: targetPageId,
          error: `Versi draf tersimpan, namun gagal memperbarui pointer halaman: ${pageUpdateError.message}`,
        };
      }

      // Verifikasi: Status website di public.websites TIDAK disentuh (tetap DRAFT)
      return {
        success: true,
        pageId: targetPageId,
        versionId: versionRow.id,
      };
    } catch (err: any) {
      return {
        success: false,
        pageId: params.pageId,
        error: err?.message || 'Terjadi kegagalan jaringan saat menyimpan draf ke Supabase.',
      };
    }
  },

  /**
   * Membuat halaman baru di tabel `public.pages` dan versi draf perdananya.
   */
  async createPage(params: {
    websiteId: string;
    title: string;
    slug: string;
    is_homepage?: boolean;
    brandName?: string;
  }): Promise<PageServiceResult<{ page: Page; components: VisualComponentBlock[] }>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: null, error: 'Supabase belum terhubung.' };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id || null;

      // 1. Cek display_order tertinggi
      const { data: existingPages } = await supabase
        .from('pages')
        .select('display_order')
        .eq('website_id', params.websiteId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = (existingPages?.[0]?.display_order || 0) + 1;

      // 2. Buat halaman baru
      const { data: pageRow, error: pageErr } = await supabase
        .from('pages')
        .insert({
          website_id: params.websiteId,
          title: params.title.trim(),
          slug: params.slug.trim().toLowerCase(),
          is_homepage: Boolean(params.is_homepage),
          display_order: nextOrder,
          status: 'draft',
          seo_title: `${params.title} | ${params.brandName || 'Arisera'}`,
          seo_description: `Halaman ${params.title} resmi.`,
        })
        .select()
        .single();

      if (pageErr || !pageRow) {
        return { data: null, error: pageErr?.message || 'Gagal membuat halaman baru.' };
      }

      // 3. Buat komponen draf awal
      const initialBlocks = createDefaultPageBlocks(params.brandName || 'Brand Anda', 'about');

      const { data: verRow, error: verErr } = await supabase
        .from('page_versions')
        .insert({
          page_id: pageRow.id,
          version_number: 1,
          components: initialBlocks,
          is_published: false,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (!verErr && verRow) {
        await supabase
          .from('pages')
          .update({
            current_draft_version_id: verRow.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pageRow.id);

        pageRow.current_draft_version_id = verRow.id;
      }

      return {
        data: {
          page: pageRow as Page,
          components: initialBlocks,
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menambahkan halaman baru ke database.' };
    }
  },

  /**
   * Memperbarui informasi halaman (judul, slug, SEO, status) di tabel `public.pages`.
   */
  async updatePageSettings(
    pageId: string,
    updates: Partial<Page>
  ): Promise<PageServiceResult<Page>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: null, error: 'Supabase belum terhubung.' };
    }

    try {
      const { data, error } = await supabase
        .from('pages')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as Page, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memperbarui pengaturan halaman.' };
    }
  },

  /**
   * Mengambil seluruh riwayat versi draf untuk halaman tertentu dari `public.page_versions`.
   */
  async getPageDraftVersions(pageId: string): Promise<PageServiceResult<PageVersion[]>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: localDraftVersionsCache[pageId] || [], error: null };
    }

    try {
      const { data, error } = await supabase
        .from('page_versions')
        .select('*')
        .eq('page_id', pageId)
        .order('version_number', { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: (data || []) as PageVersion[], error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal memuat riwayat versi draf dari database.' };
    }
  },

  /**
   * Mengambil snapshot versi draf tertentu dari `public.page_versions`
   * berdasarkan versionId dan pageId, serta memvalidasi struktur komponennya.
   * Tidak mengubah snapshot atau status website di database.
   */
  async getPageVersionSnapshot(
    pageId: string,
    versionId: string
  ): Promise<PageServiceResult<{ version: PageVersion; components: VisualComponentBlock[] }>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      const localVersions = localDraftVersionsCache[pageId] || [];
      const found = localVersions.find((v) => v.id === versionId);
      if (found) {
        const val = validateAndCleanComponents(found.components);
        if (!val.valid) {
          return { data: null, error: val.error || 'Struktur data komponen draf lokal rusak.' };
        }
        return {
          data: {
            version: { ...found, components: val.components },
            components: val.components,
          },
          error: null,
        };
      }
      return { data: null, error: 'Versi draf tidak ditemukan dalam riwayat lokal.' };
    }

    try {
      // Ambil record snapshot dari public.page_versions
      const { data, error } = await supabase
        .from('page_versions')
        .select('*')
        .eq('id', versionId)
        .eq('page_id', pageId)
        .maybeSingle();

      if (error) {
        return { data: null, error: `Gagal memuat snapshot dari database: ${error.message}` };
      }

      if (!data) {
        return { data: null, error: 'Versi draf tidak ditemukan di database Supabase.' };
      }

      // Validasi dan normalisasi komponen
      const val = validateAndCleanComponents(data.components);
      if (!val.valid) {
        return { data: null, error: val.error || 'Struktur data komponen snapshot tidak valid.' };
      }

      const versionObj: PageVersion = {
        id: data.id,
        page_id: data.page_id,
        version_number: data.version_number,
        components: val.components,
        is_published: Boolean(data.is_published),
        created_by: data.created_by,
        created_at: data.created_at,
      };

      return {
        data: {
          version: versionObj,
          components: val.components,
        },
        error: null,
      };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Terjadi kesalahan sistem saat memuat versi draf.' };
    }
  },

  /**
   * Menghapus halaman dari tabel `public.pages` (otomatis menghapus `page_versions` via CASCADE).
   */
  async deletePage(pageId: string): Promise<PageServiceResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseLive()) {
      return { data: null, error: 'Supabase belum terhubung.' };
    }

    try {
      const { error } = await supabase.from('pages').delete().eq('id', pageId);
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: true, error: null };
    } catch (err: any) {
      return { data: null, error: err?.message || 'Gagal menghapus halaman dari database.' };
    }
  },
};

export default pageService;
