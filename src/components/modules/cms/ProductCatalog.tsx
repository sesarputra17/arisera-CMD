import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  MessageCircle,
  Edit2,
  Trash2,
  Tag,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Product, ProductCategory, Website } from '../../../types/database';

interface ProductCatalogProps {
  website: Website;
  products: Product[];
  categories: ProductCategory[];
  onAddProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  website,
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number | undefined>(undefined);
  const [formStock, setFormStock] = useState<number>(10);
  const [formDescription, setFormDescription] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);

  const websiteProducts = products.filter((p) => p.website_id === website.id);

  const filteredProducts = websiteProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat =
      selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormCategory(categories[0]?.id || '');
    setFormPrice(25000);
    setFormSalePrice(undefined);
    setFormStock(20);
    setFormDescription('');
    setFormIsAvailable(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku || '');
    setFormCategory(p.category_id || '');
    setFormPrice(p.price);
    setFormSalePrice(p.sale_price);
    setFormStock(p.stock_quantity);
    setFormDescription(p.description);
    setFormIsAvailable(p.is_available);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, {
          name: formName.trim(),
          sku: formSku.trim() || undefined,
          category_id: formCategory || undefined,
          price: Number(formPrice),
          sale_price: formSalePrice ? Number(formSalePrice) : undefined,
          stock_quantity: Number(formStock),
          description: formDescription,
          is_available: formIsAvailable,
        });
      } else {
        const slug = formName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

        await onAddProduct({
          website_id: website.id,
          name: formName.trim(),
          slug: slug || `produk-${Date.now()}`,
          sku: formSku.trim() || undefined,
          category_id: formCategory || undefined,
          price: Number(formPrice),
          sale_price: formSalePrice ? Number(formSalePrice) : undefined,
          stock_quantity: Number(formStock),
          description: formDescription,
          is_available: formIsAvailable,
          images: [],
        });
      }
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp order link generator tester
  const generateWhatsAppUrl = (p: Product) => {
    const rawNumber = (website.whatsapp_number || '6281234567890').replace(/[^0-9]/g, '');
    const template =
      website.whatsapp_message_template ||
      'Halo, saya ingin memesan produk {product_name} seharga {price}.';

    const formattedPrice = `Rp ${p.price.toLocaleString('id-ID')}`;
    const message = template
      .replace('{product_name}', p.name)
      .replace('{price}', formattedPrice)
      .replace('{quantity}', '1');

    return `https://wa.me/${rawNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#85859A]">
            <span>CMS Produk & Katalog</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-800">{website.name}</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            Manajemen Produk & Pesanan WhatsApp
          </h1>
          <p className="text-xs text-[#85859A] mt-0.5">
            Kelola inventaris, kategori, harga, dan format checkout WhatsApp otomatis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Configuration Strip */}
      <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-emerald-950 block">
              Pemesanan WhatsApp Langsung Terintegrasi
            </span>
            <span className="text-emerald-800">
              Nomor:{' '}
              <span className="font-mono font-medium">
                +{website.whatsapp_number || '6281234567890'}
              </span>
            </span>
          </div>
        </div>
        <div className="text-[11px] text-emerald-800 bg-white/70 px-3 py-1.5 rounded-lg border border-emerald-200 truncate max-w-md">
          Format: <em>"{website.whatsapp_message_template}"</em>
        </div>
      </div>

      {/* Controls: Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk atau SKU..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] bg-white"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#11111B] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({websiteProducts.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === c.id
                  ? 'bg-[#11111B] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table (High-density SaaS data grid with tabular numbers) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[#85859A] font-semibold">
              <tr>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Harga Satuan</th>
                <th className="py-3 px-4 text-right">Stok</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Checkout WA</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-medium">Belum ada produk di website ini</p>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-3 text-xs text-[#6D4AFF] font-semibold hover:underline"
                    >
                      + Tambahkan Produk Pertama
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const categoryObj = categories.find((c) => c.id === p.category_id);
                  const waUrl = generateWhatsAppUrl(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[#6D4AFF]">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{p.name}</span>
                            {p.sku && (
                              <span className="font-mono text-[10px] text-[#85859A]">
                                SKU: {p.sku}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {categoryObj?.name || 'Tanpa Kategori'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {p.sale_price ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              Rp {p.sale_price.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through ml-1.5">
                              Rp {p.price.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">
                            Rp {p.price.toLocaleString('id-ID')}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            p.stock_quantity < 5 ? 'text-amber-600' : 'text-slate-700'
                          }`}
                        >
                          {p.stock_quantity}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            p.is_available
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.is_available ? 'Tersedia' : 'Habis'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>Tes Pesan</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Yakin ingin menghapus produk "${p.name}"?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Paket Nasi Liwet Gurih"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="NL-001"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF] bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Normal (Rp)
                  </label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Diskon (Rp)
                  </label>
                  <input
                    type="number"
                    value={formSalePrice || ''}
                    onChange={(e) =>
                      setFormSalePrice(e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="Opsional"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stok</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Keterangan bahan, rasa, ukuran, atau panduan pemesanan..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#6D4AFF]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="avail-check"
                  checked={formIsAvailable}
                  onChange={(e) => setFormIsAvailable(e.target.checked)}
                  className="rounded text-[#6D4AFF]"
                />
                <label htmlFor="avail-check" className="text-xs text-slate-700 font-medium">
                  Tersedia untuk dipesan pengunjung
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProduct ? 'Simpan Perubahan' : 'Tambahkan Produk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
