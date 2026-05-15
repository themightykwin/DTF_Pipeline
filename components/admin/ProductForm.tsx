'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCatalogProduct, updateCatalogProduct } from '@/lib/actions/catalog';

const SIZE_OPTIONS = ['XXS','XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
const DEFAULT_COLORS = [
  { label: 'White',        hex: '#ffffff', sku: '' },
  { label: 'Black',        hex: '#000000', sku: '' },
  { label: 'Navy',         hex: '#1b2a4a', sku: '' },
  { label: 'Heather Gray', hex: '#b0b0b0', sku: '' },
];

interface ColorEntry { label: string; hex: string; sku: string }

interface ProductFormProps {
  product?: {
    id: string;
    shopId?: string | null;
    title: string;
    description?: string | null;
    productType: string;
    availableSizes: string[];
    availableColors: ColorEntry[];
    basePriceCents: number;
    costCents: number;
    skuPrefix?: string | null;
    status: string;
    sortOrder: number;
  };
}

// ── Input style ───────────────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 transition-colors',
  'bg-[#131313] border border-[#2A2A2A] text-[#F5F5F5] placeholder-[#444444]',
  'focus:ring-[#E8FF47]/30 focus:border-[#E8FF47]',
].join(' ');

const labelCls = 'block text-xs font-medium mb-1.5 text-[#888888] uppercase tracking-wider';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function PriceInput({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {hint && <p className="text-[11px] text-[#666] mb-1">{hint}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] text-sm">$</span>
        <input
          type="number" min="0" step="0.01"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={inputCls + ' pl-7'}
        />
      </div>
    </div>
  );
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [title, setTitle]             = useState(product?.title ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [productType, setProductType] = useState(product?.productType ?? 'tshirt');
  const [sizes, setSizes]             = useState<string[]>(product?.availableSizes ?? ['S','M','L','XL']);
  const [colors, setColors]           = useState<ColorEntry[]>(
    product?.availableColors?.map(c => ({ ...c, sku: (c as ColorEntry).sku ?? '' }))
    ?? DEFAULT_COLORS
  );
  const [basePrice, setBasePrice]     = useState((product?.basePriceCents ?? 0) / 100);
  const [cost, setCost]               = useState((product?.costCents ?? 0) / 100);
  const [skuPrefix, setSkuPrefix]     = useState(product?.skuPrefix ?? '');
  const [status, setStatus]           = useState(product?.status ?? 'draft');

  function toggleSize(size: string) {
    setSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  }

  function updateColor(i: number, patch: Partial<ColorEntry>) {
    setColors(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function removeColor(i: number) {
    setColors(prev => prev.filter((_, idx) => idx !== i));
  }

  function addColor() {
    setColors(prev => [...prev, { label: 'New Color', hex: '#cccccc', sku: '' }]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      title,
      description: description || undefined,
      productType,
      availableSizes: sizes,
      availableColors: colors.map(c => ({ label: c.label, hex: c.hex, sku: c.sku || undefined })),
      basePriceCents: Math.round(basePrice * 100),
      costCents: Math.round(cost * 100),
      skuPrefix: skuPrefix || undefined,
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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  }

  const margin = basePrice > 0 && cost > 0
    ? `$${(basePrice - cost).toFixed(2)} margin (${Math.round(((basePrice - cost) / basePrice) * 100)}%)`
    : null;

  return (
    <form onSubmit={handleSubmit} style={{ color: '#F5F5F5' }} className="space-y-6">

      {/* Title */}
      <Field label="Title *">
        <input value={title} onChange={e => setTitle(e.target.value)} required className={inputCls} placeholder="e.g. Classic Tee" />
      </Field>

      {/* Description */}
      <Field label="Description">
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          className={inputCls + ' resize-none'} placeholder="Optional product description" />
      </Field>

      {/* Product Type */}
      <Field label="Product Type *">
        <select value={productType} onChange={e => setProductType(e.target.value)} className={inputCls}>
          <option value="tshirt">T-Shirt</option>
          <option value="hoodie">Hoodie</option>
          <option value="crewneck">Crewneck</option>
        </select>
      </Field>

      {/* Sizes */}
      <Field label="Available Sizes *">
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map(s => (
            <button key={s} type="button" onClick={() => toggleSize(s)}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: `1px solid ${sizes.includes(s) ? '#E8FF47' : '#2A2A2A'}`,
                background: sizes.includes(s) ? 'rgba(232,255,71,0.12)' : 'transparent',
                color: sizes.includes(s) ? '#E8FF47' : '#888',
                fontSize: '12px',
                fontWeight: sizes.includes(s) ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
              {s}
            </button>
          ))}
        </div>
      </Field>

      {/* Pricing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <PriceInput label="Base Price (USD) *" hint="Customer-facing price" value={basePrice} onChange={setBasePrice} />
        <PriceInput label="Cost Per Unit" hint="Your production cost" value={cost} onChange={setCost} />
      </div>
      {margin && (
        <p style={{ fontSize: '11px', color: '#E8FF47', marginTop: '-12px' }}>
          ↑ {margin}
        </p>
      )}

      {/* SKU Prefix */}
      <Field label="SKU Prefix">
        <input value={skuPrefix} onChange={e => setSkuPrefix(e.target.value)} className={inputCls}
          placeholder="e.g. FLOW-TEE — variants will be FLOW-TEE-BLACK-M" />
        <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Leave blank to skip SKU generation. Per-color SKUs below override this prefix.
        </p>
      </Field>

      {/* Colors */}
      <div>
        <label className={labelCls}>Available Colors</label>
        <div className="space-y-2">
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
            <span />
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color Name</span>
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU Override</span>
            <span />
          </div>
          {colors.map((color, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
              <input type="color" value={color.hex}
                onChange={e => updateColor(i, { hex: e.target.value })}
                style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #2A2A2A', cursor: 'pointer', padding: '2px', background: '#131313' }}
              />
              <input value={color.label} onChange={e => updateColor(i, { label: e.target.value })}
                className={inputCls} placeholder="Color name" />
              <input value={color.sku} onChange={e => updateColor(i, { sku: e.target.value })}
                className={inputCls} placeholder={skuPrefix ? `${skuPrefix}-${color.label.toUpperCase().replace(/\s+/g,'-')}` : 'Optional SKU'} />
              <button type="button" onClick={() => removeColor(i)}
                style={{ color: '#444', cursor: 'pointer', background: 'none', border: 'none', fontSize: '16px', lineHeight: 1, padding: '4px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FF4747')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}
              >✕</button>
            </div>
          ))}
          <button type="button" onClick={addColor}
            style={{ fontSize: '12px', color: '#E8FF47', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
            + Add color
          </button>
        </div>
      </div>

      {/* Status */}
      <Field label="Status">
        <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </Field>

      {error && (
        <p style={{ fontSize: '12px', color: '#FF4747', padding: '8px 12px', background: 'rgba(255,71,71,0.1)', borderRadius: '6px', border: '1px solid rgba(255,71,71,0.2)' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
        <button type="submit" disabled={isPending}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer',
            background: isPending ? '#2A2A2A' : '#E8FF47', color: isPending ? '#666' : '#0A0A0A',
            fontWeight: 700, fontSize: '14px', transition: 'all 0.15s', opacity: isPending ? 0.6 : 1,
          }}>
          {isPending ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
        </button>
        <button type="button" onClick={() => router.push('/admin/products')}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: '1px solid #2A2A2A', cursor: 'pointer',
            background: 'transparent', color: '#888', fontWeight: 500, fontSize: '14px', transition: 'all 0.15s',
          }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
