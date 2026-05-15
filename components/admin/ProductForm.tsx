'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCatalogProduct, updateCatalogProduct } from '@/lib/actions/catalog';

const SIZE_OPTIONS = ['XXS','XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
const DEFAULT_COLORS = [
  { label: 'White',        hex: '#ffffff' },
  { label: 'Black',        hex: '#000000' },
  { label: 'Navy',         hex: '#1b2a4a' },
  { label: 'Heather Gray', hex: '#b0b0b0' },
];

interface ColorEntry { label: string; hex: string }

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
    variantSkus?: string | null; // JSON string from DB
    status: string;
    sortOrder: number;
  };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const inputCls = [
  'w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 transition-colors',
  'bg-[#131313] border border-[#2A2A2A] text-[#F5F5F5] placeholder-[#444444]',
  'focus:ring-[#E8FF47]/30 focus:border-[#E8FF47]',
].join(' ');

const skuInputCls = [
  'w-full px-2 py-1.5 text-xs rounded focus:outline-none focus:ring-1 transition-colors',
  'bg-[#0A0A0A] border border-[#2A2A2A] text-[#F5F5F5] placeholder-[#444]',
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

// ── Parse variantSkus from DB JSON string ─────────────────────────────────────
function parseVariantSkus(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, string>; }
  catch { return {}; }
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
    product?.availableColors?.map(c => ({ label: c.label, hex: c.hex }))
    ?? DEFAULT_COLORS
  );
  const [basePrice, setBasePrice] = useState((product?.basePriceCents ?? 0) / 100);
  const [cost, setCost]           = useState((product?.costCents ?? 0) / 100);
  const [status, setStatus]       = useState(product?.status ?? 'draft');

  // variantSkus state: { "Color|Size": "SKU-VALUE" }
  const [variantSkus, setVariantSkus] = useState<Record<string, string>>(
    parseVariantSkus(product?.variantSkus)
  );

  function setSku(color: string, size: string, val: string) {
    const key = `${color}|${size}`;
    setVariantSkus(prev => {
      const next = { ...prev };
      if (val.trim()) { next[key] = val.trim(); }
      else { delete next[key]; }
      return next;
    });
  }

  function toggleSize(size: string) {
    setSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  }

  function updateColor(i: number, patch: Partial<ColorEntry>) {
    const oldLabel = colors[i].label;
    setColors(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
    // If label changes, migrate SKU keys
    if (patch.label && patch.label !== oldLabel) {
      setVariantSkus(prev => {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev)) {
          const [cl, sz] = k.split('|');
          next[cl === oldLabel ? `${patch.label}|${sz}` : k] = v;
        }
        return next;
      });
    }
  }

  function removeColor(i: number) {
    const label = colors[i].label;
    setColors(prev => prev.filter((_, idx) => idx !== i));
    setVariantSkus(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith(`${label}|`)) delete next[k];
      }
      return next;
    });
  }

  function addColor() {
    setColors(prev => [...prev, { label: 'New Color', hex: '#cccccc' }]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      title,
      description: description || undefined,
      productType,
      availableSizes: sizes,
      availableColors: colors.map(c => ({ label: c.label, hex: c.hex })),
      basePriceCents: Math.round(basePrice * 100),
      costCents: Math.round(cost * 100),
      variantSkus: Object.keys(variantSkus).length > 0 ? variantSkus : undefined,
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

  // Only show sizes that are currently selected in the matrix
  const matrixSizes = SIZE_OPTIONS.filter(s => sizes.includes(s));

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

      {/* Colors */}
      <div>
        <label className={labelCls}>Available Colors</label>
        <div className="space-y-2">
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: '8px', alignItems: 'center' }}>
            <span />
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color Name</span>
            <span />
          </div>
          {colors.map((color, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: '8px', alignItems: 'center' }}>
              <input type="color" value={color.hex}
                onChange={e => updateColor(i, { hex: e.target.value })}
                style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #2A2A2A', cursor: 'pointer', padding: '2px', background: '#131313' }}
              />
              <input value={color.label} onChange={e => updateColor(i, { label: e.target.value })}
                className={inputCls} placeholder="Color name" />
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

      {/* Variant SKU Matrix */}
      {colors.length > 0 && matrixSizes.length > 0 && (
        <div>
          <label className={labelCls}>Variant SKUs</label>
          <p style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
            Enter the exact SKU for each Color × Size combination. Your DTF production software uses these to identify the correct product.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#666', fontWeight: 500, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2A2A2A', whiteSpace: 'nowrap' }}>Color</th>
                  {matrixSizes.map(s => (
                    <th key={s} style={{ padding: '6px 8px', textAlign: 'center', color: '#888', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2A2A2A', whiteSpace: 'nowrap', minWidth: '72px' }}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colors.map((color, ci) => (
                  <tr key={ci} style={{ borderBottom: '1px solid #1A1A1A' }}>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color.hex, border: '1px solid #333', flexShrink: 0 }} />
                        <span style={{ color: '#C0C0C0', fontWeight: 500 }}>{color.label || '—'}</span>
                      </div>
                    </td>
                    {matrixSizes.map(size => {
                      const key = `${color.label}|${size}`;
                      return (
                        <td key={size} style={{ padding: '4px 4px' }}>
                          <input
                            type="text"
                            value={variantSkus[key] ?? ''}
                            onChange={e => setSku(color.label, size, e.target.value)}
                            placeholder="—"
                            className={skuInputCls}
                            style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
