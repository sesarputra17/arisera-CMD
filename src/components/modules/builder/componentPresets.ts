import { VisualComponentBlock, ComponentBlockType } from '../../../types/database';

export interface ComponentPreset {
  type: ComponentBlockType;
  title: string;
  description: string;
  category: 'layout' | 'content' | 'commerce' | 'interactive';
  icon: string;
  defaultContent: Record<string, any>;
  defaultStyles: Record<string, any>;
}

export const COMPONENT_PRESETS: ComponentPreset[] = [
  {
    type: 'header',
    title: 'Navbar / Header',
    description: 'Bilah navigasi atas dengan logo, tautan halaman, dan tombol WhatsApp.',
    category: 'layout',
    icon: 'Navigation',
    defaultContent: {
      brandName: '',
      navLinks: [
        { label: 'Beranda', href: '#beranda' },
        { label: 'Produk', href: '#produk' },
        { label: 'Tentang', href: '#tentang' },
        { label: 'Kontak', href: '#kontak' },
      ],
      ctaText: 'Hubungi Kami',
    },
    defaultStyles: {
      bgColor: '#FFFFFF',
      textColor: '#11111B',
      isSticky: true,
    },
  },
  {
    type: 'hero',
    title: 'Hero Banner',
    description: 'Bagian utama pembuka website dengan headline, subheadline, dan aksi utama.',
    category: 'layout',
    icon: 'Sparkles',
    defaultContent: {
      headline: 'Solusi Terbaik untuk Bisnis Anda',
      subheadline: 'Hadirkan produk berkualitas dengan pemesanan langsung tanpa hambatan.',
      badgeText: 'Pilihan Terpercaya 2026',
      primaryButtonText: 'Lihat Produk',
      primaryButtonLink: '#produk',
      whatsappButtonText: 'Chat WhatsApp',
    },
    defaultStyles: {
      bgColor: '#F8F8FC',
      alignment: 'center',
    },
  },
  {
    type: 'text',
    title: 'Teks & Cerita Brand',
    description: 'Blok paragraf untuk menjelaskan cerita, profil bisnis, atau visi.',
    category: 'content',
    icon: 'FileText',
    defaultContent: {
      heading: 'Kisah di Balik Produk Kami',
      body: 'Berawal dari dedikasi menghadirkan kualitas terbaik, kami terus berinovasi untuk memberikan kepuasan bagi setiap pelanggan setia kami di seluruh Indonesia.',
    },
    defaultStyles: {
      bgColor: '#FFFFFF',
      textColor: '#11111B',
    },
  },
  {
    type: 'image',
    title: 'Gambar Utama',
    description: 'Foto banner atau visual showcase beresolusi tinggi.',
    category: 'content',
    icon: 'Image',
    defaultContent: {
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      altText: 'Foto Produk dan Suasana',
      caption: 'Kualitas terbaik disajikan dengan ketelitian tinggi.',
    },
    defaultStyles: {
      bgColor: '#FFFFFF',
      borderRadius: '12px',
    },
  },
  {
    type: 'gallery',
    title: 'Galeri Foto Showcase',
    description: 'Koleksi 3 foto produk, portofolio, atau suasana toko.',
    category: 'content',
    icon: 'Grid',
    defaultContent: {
      title: 'Galeri Pilihan',
      subtitle: 'Dokumentasi karya dan produk terfavorit kami',
      items: [
        {
          url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
          title: 'Kualitas Segar Pilihan',
        },
        {
          url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
          title: 'Resep Autentik Tradisional',
        },
        {
          url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
          title: 'Layanan Terbaik & Ramah',
        },
      ],
    },
    defaultStyles: {
      bgColor: '#FFFFFF',
      textColor: '#11111B',
      borderRadius: '8px',
    },
  },
  {
    type: 'features',
    title: 'Keunggulan & Fitur',
    description: 'Tiga poin nilai tambah untuk meyakinkan calon pembeli.',
    category: 'content',
    icon: 'Award',
    defaultContent: {
      title: 'Mengapa Memilih Kami?',
      subtitle: 'Standar kualitas terbaik yang selalu kami pegang teguh',
      items: [
        {
          title: 'Bahan Baku Pilihan',
          desc: 'Dipilih segar setiap hari dari mitra terpercaya dengan standar kebersihan tertinggi.',
        },
        {
          title: 'Pesan Cepat via WhatsApp',
          desc: 'Pemesanan langsung ditangani tim customer support tanpa antrean rumit.',
        },
        {
          title: 'Jaminan Kepuasan',
          desc: 'Garansi mutu dan rasa pada setiap pesanan yang Anda terima.',
        },
      ],
    },
    defaultStyles: {
      bgColor: '#FFFFFF',
      textColor: '#11111B',
    },
  },
  {
    type: 'product_grid',
    title: 'Katalog Produk (CMS Sync)',
    description: 'Grid produk interaktif dengan sinkronisasi harga & tombol beli WhatsApp.',
    category: 'commerce',
    icon: 'ShoppingBag',
    defaultContent: {
      sectionTitle: 'Katalog Pilihan',
      sectionSubtitle: 'Pesan langsung ke WhatsApp admin kami',
    },
    defaultStyles: {
      columns: 3,
      bgColor: '#FFFFFF',
      textColor: '#11111B',
    },
  },
  {
    type: 'product_featured',
    title: 'Sorotan Produk Unggulan',
    description: 'Tampilan spotlight besar untuk 1 produk terlaris atau menu spesial.',
    category: 'commerce',
    icon: 'Star',
    defaultContent: {
      badge: 'Sorotan Produk Unggulan',
      title: 'Menu Terlaris Minggu Ini',
      description: 'Pilihan paling disukai oleh pelanggan dengan rating sempurna.',
    },
    defaultStyles: {
      bgColor: '#F8F8FC',
      textColor: '#11111B',
    },
  },
  {
    type: 'testimonials',
    title: 'Testimoni Pelanggan',
    description: 'Ulasan positif dari pembeli nyata untuk meningkatkan kepercayaan.',
    category: 'content',
    icon: 'MessageSquare',
    defaultContent: {
      title: 'Kata Mereka Tentang Kami',
      subtitle: 'Pengalaman nyata dari pelanggan terpuaskan',
      items: [
        {
          name: 'Siti Rahmawati',
          role: 'Pelanggan Setia',
          comment: 'Pelayanan sangat ramah dan pesanan via WhatsApp langsung diproses cepat!',
          rating: 5,
        },
        {
          name: 'Budi Santoso',
          role: 'Pecinta Kuliner',
          comment: 'Rasa autentik tidak pernah berubah. Sangat direkomendasikan untuk katering.',
          rating: 5,
        },
      ],
    },
    defaultStyles: {
      bgColor: '#FFFFFF',
      textColor: '#11111B',
    },
  },
  {
    type: 'whatsapp_cta',
    title: 'Banner WhatsApp CTA',
    description: 'Tombol aksi besar yang langsung membuka chat WhatsApp toko.',
    category: 'interactive',
    icon: 'MessageCircle',
    defaultContent: {
      title: 'Pesan Sekarang Langsung via WhatsApp',
      description: 'Dapatkan konfirmasi instan dari tim layanan pelanggan kami dalam hitungan menit.',
      buttonText: 'Mulai Chat WhatsApp Sekarang',
    },
    defaultStyles: {
      bgColor: '#11111B',
      textColor: '#FFFFFF',
    },
  },
  {
    type: 'contact',
    title: 'Informasi Kontak Toko',
    description: 'Detail kontak, nomor WhatsApp, email, dan alamat fisik toko.',
    category: 'interactive',
    icon: 'Phone',
    defaultContent: {
      title: 'Hubungi Kami',
      subtitle: 'Kami siap melayani kebutuhan Anda setiap hari kerja.',
      email: 'halo@arisera.id',
      location: 'Jakarta, Indonesia',
    },
    defaultStyles: {
      bgColor: '#FFFFFF',
      textColor: '#11111B',
    },
  },
  {
    type: 'footer',
    title: 'Footer Website',
    description: 'Bagian penutup halaman dengan hak cipta dan alamat bisnis.',
    category: 'layout',
    icon: 'PanelBottom',
    defaultContent: {
      copyrightText: '',
      address: 'Jl. Merdeka Raya No. 45, Kebayoran Baru, Jakarta Selatan',
    },
    defaultStyles: {
      bgColor: '#F8F8FC',
      textColor: '#85859A',
    },
  },
];

export function createBlockFromPreset(
  preset: ComponentPreset,
  order: number,
  websiteName?: string
): VisualComponentBlock {
  const content = { ...preset.defaultContent };
  if (preset.type === 'header' && !content.brandName && websiteName) {
    content.brandName = websiteName;
  }
  if (preset.type === 'footer' && !content.copyrightText && websiteName) {
    content.copyrightText = `© 2026 ${websiteName}. Seluruh hak cipta dilindungi.`;
  }

  return {
    id: `comp-${preset.type}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    type: preset.type,
    order,
    content,
    styles: { ...preset.defaultStyles },
    is_hidden: false,
  };
}
