import React, { useState } from 'react';
import {
  MessageCircle,
  ShoppingBag,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Award,
  Truck,
  ArrowRight,
  Send,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { VisualComponentBlock, Website, Product } from '../../../types/database';
import store from '../../../services/store';

interface ComponentRendererProps {
  block: VisualComponentBlock;
  website: Website;
  products: Product[];
  isEditable?: boolean;
  onNavigatePage?: (slug: string) => void;
}

const InteractiveContactForm: React.FC<{
  website: Website;
  content: Record<string, any>;
  primaryColor: string;
  borderRadius: string;
  isEditable?: boolean;
}> = ({ website, content, primaryColor, borderRadius, isEditable }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (isEditable) {
      setSubmitSuccess('Simulasi pengiriman formulir kontak berhasil (Mode Editor Builder).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await store.submitContactFormAsync({
        website_id: website.id,
        name,
        email,
        phone,
        subject,
        message,
        honeypot,
      });

      if (res.success) {
        setSubmitSuccess(
          content.successMessage ||
            'Pesan Anda berhasil diterima dan disimpan di sistem Arisera. Pemilik website dapat melihatnya di dasbor pesan masuk.'
        );
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
        setHoneypot('');
      } else {
        setSubmitError(res.error || 'Terjadi kendala saat mengirim pesan.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Gagal mengirim pesan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs space-y-4 text-left"
    >
      {/* Honeypot Spam Bot Trap (Tidak terlihat oleh pengunjung manusia) */}
      <div style={{ display: 'none', position: 'absolute', left: '-9999px' }} aria-hidden="true">
        <label htmlFor="hp_field">Do not fill</label>
        <input
          id="hp_field"
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Pesan Berhasil Terkirim!</span>
            <span>{submitSuccess}</span>
          </div>
        </div>
      )}

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#6D4AFF] outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Alamat Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#6D4AFF] outline-hidden"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nomor WhatsApp / Telepon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+62 812-xxxx-xxxx"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#6D4AFF] outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Subjek / Keperluan
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: Reservasi Meja / Pemesanan Katering"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#6D4AFF] outline-hidden"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Isi Pesan <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tuliskan pesan, rincian pesanan, atau pertanyaan Anda di sini..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#6D4AFF] outline-hidden"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-400">
          Dilindungi oleh proteksi anti-spam Arisera.
        </span>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
          style={{ backgroundColor: primaryColor, borderRadius }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Mengirim Pesan...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>{content.submitButtonText || 'Kirim Pesan Sekarang'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  block,
  website,
  products,
  isEditable = false,
  onNavigatePage,
}) => {
  const content = block.content || {};
  const styles = block.styles || {};

  const getWaLink = (product?: Product, customMessage?: string) => {
    const rawNumber = (website.whatsapp_number || '6281234567890').replace(/[^0-9]/g, '');
    let message =
      customMessage ||
      website.whatsapp_message_template ||
      'Halo kak, saya tertarik dengan produk {product_name}';

    if (product) {
      message = message
        .replace('{product_name}', product.name)
        .replace('{price}', `Rp ${product.price.toLocaleString('id-ID')}`)
        .replace('{quantity}', '1');
    }

    return `https://wa.me/${rawNumber}?text=${encodeURIComponent(message)}`;
  };

  const primaryColor = styles.primaryColor || website.theme_settings?.primaryColor || '#6D4AFF';
  const textColor = styles.textColor || website.theme_settings?.textColor || '#11111B';
  const bgColor = styles.bgColor || '#FFFFFF';
  const borderRadius = styles.borderRadius || website.theme_settings?.borderRadius || '8px';

  switch (block.type) {
    // 1. HEADER / NAVBAR
    case 'header': {
      const brandName = content.brandName || website.name;
      const navLinks = Array.isArray(content.navLinks)
        ? content.navLinks
        : [
            { label: 'Beranda', href: '#beranda' },
            { label: 'Produk', href: '#produk' },
            { label: 'Tentang', href: '#tentang' },
            { label: 'Kontak', href: '#kontak' },
          ];

      return (
        <header
          className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between transition-all ${
            styles.isSticky ? 'sticky top-0 z-30 shadow-xs' : ''
          }`}
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <div className="flex items-center gap-3">
            {website.theme_settings?.logoUrl && (
              <img
                src={website.theme_settings.logoUrl}
                alt={brandName}
                className="h-8 w-auto object-contain"
              />
            )}
            <span className="font-extrabold text-base tracking-tight">{brandName}</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
            {navLinks.map((link: any, idx: number) => (
              <a
                key={idx}
                href={link.href || '#'}
                onClick={(e) => {
                  if (link.pageSlug && onNavigatePage) {
                    e.preventDefault();
                    onNavigatePage(link.pageSlug);
                  }
                }}
                className="hover:opacity-75 transition-opacity"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href={getWaLink(undefined, content.ctaMessage || 'Halo, saya ingin bertanya seputar produk/layanan.')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90 transition-opacity flex items-center gap-1.5"
            style={{ backgroundColor: primaryColor, borderRadius }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{content.ctaText || 'Chat WhatsApp'}</span>
          </a>
        </header>
      );
    }

    // 2. HERO SECTION
    case 'hero': {
      const alignment = styles.alignment || 'center';
      const alignClass =
        alignment === 'left' ? 'text-left items-start' : alignment === 'right' ? 'text-right items-end' : 'text-center items-center';

      return (
        <section
          className={`py-12 px-6 sm:py-20 sm:px-12 flex flex-col justify-center border-b border-slate-100 ${alignClass}`}
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {content.badgeText && (
            <div
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-4 shadow-xs"
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              <Zap className="w-3 h-3" />
              <span>{content.badgeText}</span>
            </div>
          )}

          <h1
            className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight max-w-3xl leading-tight mb-4"
            style={{ color: textColor }}
          >
            {content.headline || 'Selamat Datang di Website Resmi Kami'}
          </h1>

          <p
            className="text-xs sm:text-base max-w-2xl leading-relaxed mb-6 opacity-80"
            style={{ color: textColor }}
          >
            {content.subheadline ||
              'Solusi kebutuhan produk berkualitas dengan pemesanan langsung dan layanan pelanggan responsif.'}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {content.primaryButtonText && (
              <a
                href={content.primaryButtonLink || '#produk'}
                className="px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor, borderRadius }}
              >
                {content.primaryButtonText}
              </a>
            )}

            {content.whatsappButtonText && (
              <a
                href={getWaLink(undefined, content.whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-2"
                style={{ borderRadius }}
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>{content.whatsappButtonText}</span>
              </a>
            )}
          </div>
        </section>
      );
    }

    // 3. TEXT / CONTENT BLOCK
    case 'text': {
      return (
        <section
          className="py-10 px-6 sm:py-14 sm:px-12 max-w-4xl mx-auto"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {content.heading && (
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight mb-3">
              {content.heading}
            </h2>
          )}
          <div className="prose prose-sm max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line opacity-85">
            {content.body ||
              'Tuliskan cerita brand, filosofi usaha, atau penjelasan detail produk Anda di blok ini.'}
          </div>
        </section>
      );
    }

    // 4. IMAGE BLOCK
    case 'image': {
      const imgUrl =
        content.imageUrl ||
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80';

      return (
        <section
          className="py-8 px-6 sm:px-12 max-w-5xl mx-auto"
          style={{ backgroundColor: bgColor }}
        >
          <div className="overflow-hidden shadow-md" style={{ borderRadius }}>
            <img
              src={imgUrl}
              alt={content.altText || 'Gambar visual'}
              className="w-full h-auto object-cover max-h-[500px]"
            />
          </div>
          {content.caption && (
            <p className="text-center text-xs text-slate-500 mt-2 italic">{content.caption}</p>
          )}
        </section>
      );
    }

    // 5. GALLERY BLOCK
    case 'gallery': {
      const items = Array.isArray(content.items) && content.items.length > 0
        ? content.items
        : [
            {
              url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
              title: 'Sajian Segar Pilihan',
            },
            {
              url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
              title: 'Rempah Otentik Tradisional',
            },
            {
              url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
              title: 'Kenyamanan Tempat & Pelayanan',
            },
          ];

      return (
        <section
          className="py-12 px-6 sm:px-12 space-y-6"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {content.title && (
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-black">{content.title}</h2>
              {content.subtitle && <p className="text-xs opacity-75">{content.subtitle}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {items.map((it: any, idx: number) => (
              <div
                key={idx}
                className="overflow-hidden group border border-slate-200 bg-white shadow-xs"
                style={{ borderRadius }}
              >
                <img
                  src={it.url}
                  alt={it.title || `Galeri ${idx + 1}`}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {it.title && (
                  <div className="p-3 text-xs font-semibold text-slate-800 bg-white">
                    {it.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    // 6. FEATURES / KEUNGGULAN
    case 'features': {
      const items = Array.isArray(content.items) && content.items.length > 0
        ? content.items
        : [
            {
              title: 'Bahan Baku Pilihan',
              desc: 'Dipilih segar setiap hari dari pemasok lokal terbaik.',
            },
            {
              title: 'Pesan Instan via WhatsApp',
              desc: 'Tanpa ribet daftar akun, langsung terhubung dengan admin.',
            },
            {
              title: 'Jaminan Rasa & Kualitas',
              desc: 'Garansi kepuasan pelanggan pada setiap pesanan.',
            },
          ];

      return (
        <section
          className="py-12 px-6 sm:px-12 border-y border-slate-100"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {content.title && (
            <div className="text-center mb-8 space-y-1">
              <h2 className="text-xl sm:text-2xl font-black">{content.title}</h2>
              {content.subtitle && <p className="text-xs opacity-75">{content.subtitle}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {items.map((it: any, idx: number) => (
              <div
                key={idx}
                className="p-5 border border-slate-100 bg-slate-50/70 shadow-xs space-y-2.5"
                style={{ borderRadius }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold">{it.title}</h3>
                <p className="text-xs opacity-75 leading-relaxed">{it.desc}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    // 7. PRODUCT GRID (CMS SYNC + WA CHECKOUT)
    case 'product_grid': {
      const displayProducts = products.length > 0 ? products : [];
      const columns = styles.columns || 3;
      const colClass =
        columns === 4
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          : columns === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

      return (
        <section
          id="produk"
          className="py-12 px-6 sm:px-12 space-y-6"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black">
              {content.sectionTitle || 'Katalog Produk Pilihan'}
            </h2>
            <p className="text-xs opacity-75">
              {content.sectionSubtitle || 'Pesan langsung ke WhatsApp admin kami.'}
            </p>
          </div>

          {displayProducts.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto text-xs text-slate-500">
              Belum ada produk yang ditambahkan ke katalog. Tambahkan melalui menu CMS Produk.
            </div>
          ) : (
            <div className={`grid ${colClass} gap-5 max-w-6xl mx-auto`}>
              {displayProducts.map((prod) => {
                const waUrl = getWaLink(prod);
                const hasImg = prod.images && prod.images.length > 0;

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
                    style={{ borderRadius }}
                  >
                    <div className="space-y-3">
                      <div className="h-40 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                        {hasImg ? (
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ShoppingBag className="w-10 h-10 text-slate-300" />
                        )}
                        {prod.sale_price && (
                          <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            Diskon
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {prod.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {prod.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs font-mono font-bold text-slate-900">
                        {prod.sale_price ? (
                          <div className="flex flex-col">
                            <span className="text-red-600 font-bold">
                              Rp {prod.sale_price.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through">
                              Rp {prod.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ) : (
                          <span>Rp {prod.price.toLocaleString('id-ID')}</span>
                        )}
                      </div>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
                        style={{ borderRadius }}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Pesan via WA</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    // 8. PRODUCT FEATURED SPOTLIGHT
    case 'product_featured': {
      const featProd = products[0];

      return (
        <section
          className="py-12 px-6 sm:px-12 border-y border-slate-100"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2 h-64 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
              {featProd?.images?.[0] ? (
                <img
                  src={featProd.images[0]}
                  alt={featProd.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBag className="w-16 h-16 text-slate-300" />
              )}
            </div>

            <div className="w-full md:w-1/2 space-y-4">
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded uppercase tracking-wider"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                {content.badge || 'Sorotan Produk Unggulan'}
              </span>

              <h2 className="text-2xl font-black">
                {featProd ? featProd.name : content.title || 'Produk Spesial Minggu Ini'}
              </h2>

              <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                {featProd
                  ? featProd.description
                  : content.description ||
                    'Rekomendasi terbaik yang paling diminati oleh pelanggan setia kami.'}
              </p>

              {featProd && (
                <div className="text-lg font-mono font-bold text-slate-900">
                  Rp {featProd.price.toLocaleString('id-ID')}
                </div>
              )}

              <a
                href={getWaLink(featProd)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor, borderRadius }}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Pesan Produk Unggulan</span>
              </a>
            </div>
          </div>
        </section>
      );
    }

    // 9. TESTIMONIALS / TESTIMONI
    case 'testimonials': {
      const items = Array.isArray(content.items) && content.items.length > 0
        ? content.items
        : [
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
          ];

      return (
        <section
          className="py-12 px-6 sm:px-12 space-y-6"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black">
              {content.title || 'Apa Kata Pelanggan Kami'}
            </h2>
            <p className="text-xs opacity-75">{content.subtitle || 'Kepuasan Anda adalah prioritas kami.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {items.map((it: any, idx: number) => (
              <div
                key={idx}
                className="p-5 border border-slate-200 bg-white shadow-xs space-y-3"
                style={{ borderRadius }}
              >
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: it.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs italic opacity-85 leading-relaxed">"{it.comment}"</p>
                <div>
                  <div className="font-bold text-xs">{it.name}</div>
                  <div className="text-[10px] opacity-60">{it.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    // 10. WHATSAPP CTA
    case 'whatsapp_cta': {
      return (
        <section
          className="py-12 px-6 sm:px-14 text-center space-y-4"
          style={{
            backgroundColor: styles.bgColor || '#11111B',
            color: styles.textColor || '#FFFFFF',
          }}
        >
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-3xl font-black tracking-tight">
              {content.title || 'Pesan Sekarang Langsung via WhatsApp'}
            </h2>
            <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
              {content.description ||
                'Hubungi tim kami untuk pertanyaan produk, kustomisasi pesanan, atau konsultasi gratis.'}
            </p>
          </div>

          <a
            href={getWaLink(undefined, content.customMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-md"
            style={{ borderRadius }}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{content.buttonText || 'Mulai Chat WhatsApp Sekarang'}</span>
          </a>
        </section>
      );
    }

    // 11. CONTACT / KONTAK
    case 'contact': {
      return (
        <section
          id="kontak"
          className="py-12 px-6 sm:px-12 border-t border-slate-100"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-1.5">
              <h2 className="text-xl sm:text-3xl font-black">{content.title || 'Hubungi Kami'}</h2>
              <p className="text-xs sm:text-sm opacity-75 max-w-xl mx-auto">
                {content.subtitle || 'Kami siap melayani kebutuhan dan menjawab pertanyaan Anda setiap hari.'}
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5 shadow-xs">
                <div className="w-9 h-9 rounded-full bg-[#6D4AFF]/10 text-[#6D4AFF] flex items-center justify-center mx-auto">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900">WhatsApp & Telepon</div>
                <div className="text-xs opacity-80">{website.whatsapp_number || '+62 812-3456-7890'}</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5 shadow-xs">
                <div className="w-9 h-9 rounded-full bg-[#6D4AFF]/10 text-[#6D4AFF] flex items-center justify-center mx-auto">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900">Alamat Email</div>
                <div className="text-xs opacity-80">{content.email || 'halo@arisera.id'}</div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5 shadow-xs">
                <div className="w-9 h-9 rounded-full bg-[#6D4AFF]/10 text-[#6D4AFF] flex items-center justify-center mx-auto">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-900">Lokasi / Alamat</div>
                <div className="text-xs opacity-80">{content.location || 'Indonesia'}</div>
              </div>
            </div>

            {/* Formulir Kontak Nyata */}
            <InteractiveContactForm
              website={website}
              content={content}
              primaryColor={primaryColor}
              borderRadius={borderRadius}
              isEditable={isEditable}
            />
          </div>
        </section>
      );
    }

    // 12. FOOTER
    case 'footer': {
      return (
        <footer
          className="py-8 px-6 sm:px-12 border-t border-slate-200 text-center text-xs space-y-2"
          style={{
            backgroundColor: styles.bgColor || '#F8F8FC',
            color: styles.textColor || '#85859A',
          }}
        >
          <p className="font-bold">
            {content.copyrightText || `© 2026 ${website.name}. Seluruh hak cipta dilindungi.`}
          </p>
          {content.address && <p className="text-[11px] opacity-80">{content.address}</p>}
          <p className="text-[10px] opacity-60">
            Diberdayakan oleh Platform Arisera · Sistem Manajemen Konten Universal
          </p>
        </footer>
      );
    }

    default:
      return null;
  }
};
