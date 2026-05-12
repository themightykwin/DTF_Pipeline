'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCatalogProduct, updateCatalogProduct } from '@/lib/actions/catalog';

const SIZE_OPTIONS = ['XXS','XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
const DEFAULT_COLORS = [
  { label: 'White', hex: '#ffffff' },
  { label: 'Black', hex: '#000000' },
  { label: 'Navy', hex: '#1b2a4a' },
  { label: 'Heather Gray', hex: '#b0b0b0' },
];

interface ProductFormProps {
  product?: {
    id: string;
    shopId?: string;
    title: string;
    description?: string | null;
    productType: string;
    availableSizes: string[];
    availableColors: { label: string; hex: string }[];
    basePriceCents: number;
    status: string;
    sortOrder: number;
  };
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [title, setTitle] = useState(product?.title ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [productType, setProductType] = useState<string>(product?.productType ?? 'tshirt');
  const [sizes, setSizes] = useState<string[]>(product?.availableSizes ?? ['S','M','L','XL']);
  const [colors, setColors] = useState<{ label: string; hex: string }[]>(
    product?.availableColors ?? DEFAULT_COLORS
  );
  const [priceCents, setPriceCents] = useState(product ? product.basePriceCents / 100 : 0);
  const [status, setStatus] = useState<string>(product?.status ?? 'draft');

  function toggleSize(size: string) {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  function removeColor(index: number) {
    setColors((prev) => prev.filter((_, i) => i !== index));
  }

  function addColor() {
    setColors((prev) => [...prev, { label: 'New Color', hex: '#cccccc' }]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      title,
      description: description || undefined,
      productType,
      availableSizes: sizes,
      availableColors: colors,
      basePriceCents: Math.round(priceCents * 100),
      status,
      sortOrder: product?.sortOrder ?? 0,
    };

    startTransition(async () => {
      try {
        if (product?.id) {
          await updateCatalogProduct(product.id, payload);
        } else {
          await createCatalogProduct(payload);
        }
        router.push('/admin/products');
      } catch (err: any) {
        setError(err.message ?? 'Something went wrong.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] resize-none"
        />
      </div>

      {/* Product Type */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Product Type *</label>
        <select
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
        >
          <option value="tshirt">T-Shirt</option>
          <option value="hoodie">Hoodie</option>
          <option value="crewneck">Crewneck</option>
        </select>
      </div>

      {/* Sizes */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Available Sizes *</label>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                sizes.includes(s)
                  ? 'bg-[#01696f] border-[#01696f] text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Available Colors</label>
        <div className="space-y-2">
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={color.hex}
                onChange={(e) =>
                  setColors((prev) => prev.map((c, idx) => idx === i ? { ...c, hex: e.target.value } : c))
                }
                className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <input
                value={color.label}
                onChange={(e) =>
                  setColors((prev) => prev.map((c, idx) => idx === i ? { ...c, label: e.target.value } : c))
                }
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                placeholder="Color name"
              />
              <button
                type="button"
                onClick={() => removeColor(i)}
                className="text-gray-300 hover:text-red-400 transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addColor}
            className="text-xs text-[#01696f] hover:underline"
          >
            + Add color
          </button>
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Base Price (USD)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={priceCents}
            onChange={(e) => setPriceCents(parseFloat(e.target.value) || 0)}
            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f]"
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-[#01696f] text-white text-sm font-medium rounded-lg hover:bg-[#0c4e54] transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="px-5 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
