'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import BulkOrderGrid from '@/components/BulkOrderGrid';
import GarmentPreview, { ArtworkTransform } from '@/components/GarmentPreview';
import type { ValidationResult } from '@/lib/validation';

// Load designer modal only client-side (it locks body scroll, uses window)
const DesignerModal = dynamic(() => import('@/components/DesignerModal'), { ssr: false });

interface Image {
  id: string;
  storageUrl: string;
  altText?: string | null;
  isFeatured: boolean;
  sortOrder: number;
}

interface Product {
  id: string;
  title: string;
  description?: string | null;
  productType: string;
  availableSizes: string[];
  availableColors: { label: string; hex: string }[];
  basePriceCents: number;
  images: Image[];
}

const DEFAULT_TRANSFORM: ArtworkTransform = { xPct: 0.5, yPct: 0.4, scalePct: 80 };
const PLACEHOLDER_USER_ID = 'demo-user';

export default function ProductCustomizer({ product }: { product: Product }) {
  const { availableSizes, availableColors, images } = product;

  // Image gallery
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const activeImage = images[activeImageIdx] ?? null;

  // Color selection (multi)
  const [selectedColors, setSelectedColors] = useState<string[]>(
    availableColors.length > 0 ? [availableColors[0].label] : []
  );

  // Bulk quantity grid
  const [quantities, setQuantities] = useState<Record<string, Record<string, number>>>({});
  const handleQtyChange = useCallback((colorLabel: string, size: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [colorLabel]: { ...(prev[colorLabel] ?? {}), [size]: qty },
    }));
  }, []);

  const totalUnits = Object.values(quantities).reduce(
    (sum, sizeMap) => sum + Object.values(sizeMap).reduce((s, q) => s + q, 0),
    0
  );

  // Artwork / design state
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artUploadId, setArtUploadId] = useState<string | null>(null);
  const [artTransform, setArtTransform] = useState<ArtworkTransform>(DEFAULT_TRANSFORM);
  const [designerOpen, setDesignerOpen] = useState(false);

  function handleDesignApply(uploadId: string, url: string, transform: ArtworkTransform) {
    setArtUploadId(uploadId);
    setArtworkUrl(url);
    setArtTransform(transform);
  }

  function toggleColor(label: string) {
    setSelectedColors((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );
  }

  // Save design
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [configId, setConfigId] = useState<string | null>(null);

  async function handleSave() {
    if (!artUploadId || totalUnits === 0) return;
    setSubmitState('saving');
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: 'your-store.myshopify.com',
          userId: PLACEHOLDER_USER_ID,
          garmentTemplateId: product.productType,
          artUploadId,
          catalogProductId: product.id,
          inputs: { productType: product.productType, selectedColors, quantities, transform: artTransform },
          scalePercent: Math.round(artTransform.scalePct),
          yPercent: Math.round(artTransform.yPct * 100),
          priceSnapshot: (product.basePriceCents / 100) * totalUnits,
        }),
      });
      const json = await res.json() as { ok: boolean; data: { configurationId: string } };
      if (json.ok) {
        setConfigId(json.data.configurationId);
        setSubmitState('done');
      } else {
        setSubmitState('error');
      }
    } catch {
      setSubmitState('error');
    }
  }

  const canSave = !!artUploadId && totalUnits > 0;

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ── LEFT: Garment preview ── */}
          <div className="flex flex-col gap-4">

            {/* Main garment preview with artwork overlay */}
            <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-200 aspect-square">
              {/* Always show garment preview — it shows the product photo when no artwork,
                  and composites artwork over the garment mockup when uploaded */}
              {activeImage && !artworkUrl ? (
                // Show admin product photo when no design uploaded yet
                <img
                  src={activeImage.storageUrl}
                  alt={activeImage.altText ?? product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                // Show garment mockup with artwork composited on top
                <GarmentPreview
                  garmentType={product.productType}
                  artworkUrl={artworkUrl}
                  transform={artTransform}
                  interactive={false}
                  className="w-full h-full"
                />
              )}

              {/* Open Designer CTA overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <button
                  onClick={() => setDesignerOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#01696f] text-white text-sm font-semibold rounded-full shadow-lg hover:bg-[#0c4e54] transition-all hover:shadow-xl active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {artworkUrl ? 'Edit Design' : 'Start Designing'}
                </button>
              </div>

              {/* Design applied badge */}
              {artworkUrl && (
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 bg-[#01696f] text-white text-[10px] font-semibold rounded-full">
                    Design applied
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail strip (admin product photos) */}
            {images.length > 1 && !artworkUrl && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIdx(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === activeImageIdx ? 'border-[#01696f]' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img.storageUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Controls ── */}
          <div className="flex flex-col gap-7">

            {/* Product info */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 capitalize">{product.productType}</p>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.title}</h1>
              {product.basePriceCents > 0 && (
                <p className="text-lg font-semibold text-[#01696f]">
                  From ${(product.basePriceCents / 100).toFixed(2)}
                  <span className="text-sm font-normal text-gray-400 ml-1">/ unit</span>
                </p>
              )}
              {product.description && (
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* Colors */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Colors</h2>
                <span className="text-xs text-gray-400">({selectedColors.length} selected)</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {availableColors.map((color) => {
                  const isSelected = selectedColors.includes(color.label);
                  return (
                    <button
                      key={color.label}
                      onClick={() => toggleColor(color.label)}
                      title={color.label}
                      className={`group relative w-9 h-9 rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-[#01696f] scale-110 shadow-md'
                          : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <svg
                            className="w-4 h-4 drop-shadow"
                            style={{ color: isLightColor(color.hex) ? '#1f2937' : '#ffffff' }}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {color.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bulk quantity grid */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Sizes &amp; Quantities
                {totalUnits > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{totalUnits} units</span>
                )}
              </h2>
              <BulkOrderGrid
                sizes={availableSizes}
                colors={availableColors}
                selectedColors={selectedColors}
                quantities={quantities}
                onChange={handleQtyChange}
                basePriceCents={product.basePriceCents}
              />
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={!canSave || submitState === 'saving'}
                className="w-full py-4 rounded-xl bg-[#01696f] text-white font-semibold text-sm hover:bg-[#0c4e54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {submitState === 'saving' ? 'Saving…'
                  : submitState === 'done' ? '✓ Design Saved'
                  : totalUnits === 0 ? 'Enter quantities to continue'
                  : !artUploadId ? 'Add your design to continue'
                  : 'Save Design'}
              </button>

              {submitState === 'done' && configId && (
                <p className="text-xs text-center text-green-700 font-medium">
                  ✓ Saved — reference: {configId}
                </p>
              )}
              {submitState === 'error' && (
                <p className="text-xs text-center text-red-600">Something went wrong. Try again.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen designer modal */}
      {designerOpen && (
        <DesignerModal
          productId={product.id}
          productType={product.productType}
          productTitle={product.title}
          onClose={() => setDesignerOpen(false)}
          onSave={handleDesignApply}
          initialArtworkUrl={artworkUrl}
          initialTransform={artTransform}
        />
      )}
    </>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
