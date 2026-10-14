import React, { useState } from 'react';
import { X, Sparkles, Layout, MessageSquare, Check } from 'lucide-react';
import { BusinessCategory, WebsiteTemplate } from '../../../types/database';

interface CreateWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: WebsiteTemplate[];
  onCreate: (name: string, category: BusinessCategory, templateId?: string) => void;
}

export const CreateWebsiteModal: React.FC<CreateWebsiteModalProps> = ({
  isOpen,
  onClose,
  templates,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('kuliner');
  const [creationMode, setCreationMode] = useState<'template' | 'blank'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama website wajib diisi.');
      return;
    }
    onCreate(name.trim(), category, creationMode === 'template' ? selectedTemplateId : undefined);
    setName('');
    onClose();
  };

  const categories: { id: BusinessCategory; label: string }[] = [
    { id: 'kuliner', label: 'Kuliner & F&B' },
    { id: 'fashion', label: 'Fashion & Busana' },
    { id: 'kosmetik', label: 'Kosmetik & Kecantikan' },
    { id: 'elektronik', label: 'Elektronik & Gadget' },
    { id: 'jasa', label: 'Jasa & Konsultan' },
    { id: 'retail', label: 'Retail & Toko' },
    { id: 'portofolio', label: 'Portofolio & Kreatif' },
  ];

  const generatedSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Buat Website Bisnis Baru</h3>
            <p className="text-xs text-[#85859A]">Mulai dari templat visual atau kanvas kosong</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Nama Website */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Usaha / Website
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: Kopi Nusantara, Aura Glow Skincare"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF]"
              autoFocus
            />
            {name && (
              <p className="mt-1 text-xs text-[#85859A]">
                Subdomain:{' '}
                <span className="font-mono text-[#6D4AFF] font-medium">
                  {generatedSlug || 'nama-website'}.arisera.id
                </span>
              </p>
            )}
          </div>

          {/* Kategori Bisnis */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori Bisnis
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BusinessCategory)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/20 focus:border-[#6D4AFF] bg-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metode Mulai */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Metode Pembuatan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCreationMode('template')}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  creationMode === 'template'
                    ? 'border-[#6D4AFF] bg-[#6D4AFF]/5 ring-1 ring-[#6D4AFF]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-[#6D4AFF]" />
                    <span>Pakai Templat</span>
                  </div>
                  {creationMode === 'template' && <Check className="w-3.5 h-3.5 text-[#6D4AFF]" />}
                </div>
                <span className="text-[11px] text-[#85859A]">
                  Rekomendasi siap pakai dengan tata letak optimal
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCreationMode('blank')}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                  creationMode === 'blank'
                    ? 'border-[#6D4AFF] bg-[#6D4AFF]/5 ring-1 ring-[#6D4AFF]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Layout className="w-3.5 h-3.5 text-slate-600" />
                    <span>Kanvas Kosong</span>
                  </div>
                  {creationMode === 'blank' && <Check className="w-3.5 h-3.5 text-[#6D4AFF]" />}
                </div>
                <span className="text-[11px] text-[#85859A]">
                  Mulai dari nol sesuai kebebasan arsitektur Anda
                </span>
              </button>
            </div>
          </div>

          {/* Pilih Template jika mode template */}
          {creationMode === 'template' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Templat Desain
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-100 rounded-lg p-1.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-xs text-left transition-colors ${
                      selectedTemplateId === tpl.id
                        ? 'bg-[#6D4AFF]/10 text-[#6D4AFF] font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{tpl.name}</div>
                      <div className="text-[10px] text-[#85859A]">{tpl.description}</div>
                    </div>
                    {selectedTemplateId === tpl.id && (
                      <Check className="w-4 h-4 text-[#6D4AFF] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-[#6D4AFF] hover:bg-[#5b3ce0] rounded-lg transition-colors shadow-sm"
            >
              Buat Website
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWebsiteModal;
