'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import BulkOrderGrid from '@/components/BulkOrderGrid';
import GarmentPreview, { ArtworkTransform } from '@/components/GarmentPreview';
import type { DesignOutput, SideDesign } from '@/components/DesignerModal';

const DesignerModal = dynamic(() => import('@/components/DesignerModal'), { ssr: false });

export interface ProductImage {
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
  images: ProductImage[];
}

const DEFAULT_TRANSFORM: ArtworkTransform = { xPct: 0.5, yPct: 0.4, scalePct: 80 };

// Find the best image for a given color label by checking altText.
// Falls back to the featured image or first image.
function findImageForColor(images: ProductImage[], colorLabel: string): number {
  const lower = colorLabel.toLowerCase();
  const match = images.findIndex(
    (img) => img.altText?.toLowerCase().includes(lower)
  );
  if (match !== -1) return match;
  const featured = images.findIndex((img) => img.isFeatured);
  return featured !== -1 ? featured : 0;
}

export default function ProductCustomizer({ product }: { product: Product }) {
  const { availableSizes, availableColors, images } = product;

  // Active image index — drives both the main preview and the designer canvas
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const activeImage = images[activeImageIdx] ?? images[0] ?? null;

  // Single selected color (for image switching)
  const [activeColor, setActiveColor] = useState<string>(
    availableColors.length > 0 ? availableColors[0].label : ''
  );
  // Multi-select for bulk grid
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

  // Design state
  const [design, setDesign] = useState<DesignOutput>({ front: null, back: null });
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const [designerOpen, setDesignerOpen] = useState(false);

  const currentSideDesign: SideDesign | null = design[previewSide];
  const hasAnyDesign = !!(design.front || design.back);

  function handleDesignApply(output: DesignOutput) {
    setDesign(output);
  }

  function handleColorClick(color: { label: string; hex: string }) {
    setActiveColor(color.label);
    // Toggle in/out of multi-select for bulk grid
    setSelectedColors((prev) =>
      prev.includes(color.label)
        ? prev.filter((c) => c !== color.label)
        : [...prev, color.label]
    );
    // Switch to the most relevant image for this color
    if (images.length > 1) {
      const idx = findImageForColor(images, color.label);
      setActiveImageIdx(idx);
    }
  }

  function handleThumbnailClick(idx: number) {
    setActiveImageIdx(idx);
  }

  // Save
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [configId, setConfigId] = useState<string | null>(null);

  async function handleSave() {
    if (!hasAnyDesign || totalUnits === 0) return;
    setSubmitState('saving');
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: 'your-store.myshopify.com',
          userId: 'demo-user',
          garmentTemplateId: product.productType,
          artUploadId: design.front?.artUploadId ?? design.back?.artUploadId,
          catalogProductId: product.id,
          inputs: {
            productType: product.productType,
            selectedColors,
            quantities,
            front: design.front ? { transform: design.front.transform } : null,
            back: design.back ? { transform: design.back.transform } : null,
          },
          scalePercent: Math.round(
            design.front?.transform.scalePct ?? design.back?.transform.scalePct ?? 80
          ),
          yPercent: Math.round(
            (design.front?.transform.yPct ?? design.back?.transform.yPct ?? 0.4) * 100
          ),
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

  const canSave = hasAnyDesign && totalUnits > 0;

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ── LEFT: Image preview + thumbnails ── */}
          <div className="flex flex-col gap-3">

            {/* Main preview */}
            <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-200 aspect-square">
              {activeImage ? (
                hasAnyDesign ? (
                  /* Garment preview with design overlay */
                  <GarmentPreview
                    imageSrc={activeImage.storageUrl}
                    imageAlt={activeImage.altText ?? product.title}
                    garmentType={product.productType}
                    artworkUrl={currentSideDesign?.artworkUrl ?? null}
                    transform={currentSideDesign?.transform ?? DEFAULT_TRANSFORM}
                    interactive={false}
                    className="w-full h-full"
                  />
                ) : (
                  /* Plain product photo when no design yet */
                  <img
                    src={activeImage.storageUrl}
                    alt={activeImage.altText ?? product.title}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
                  No image
                </div>
              )}

              {/* Front/Back toggle — only visible when design is active */}
              {hasAnyDesign && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full p-1">
                  {(['front', 'back'] as const).map((side) => (
                    <button
                      key={side}
                      onClick={() => setPreviewSide(side)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        previewSide === side
                          ? 'bg-white text-gray-900'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="capitalize">{side}</span>
                      {design[side] && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#01696f]" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Design badges */}
              {hasAnyDesign && (
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  {design.front && (
                    <span className="px-2 py-0.5 bg-[#01696f] text-white text-[10px] font-semibold rounded-full">
                      Front ✓
                    </span>
                  )}
                  {design.back && (
                    <span className="px-2 py-0.5 bg-[#01696f] text-white text-[10px] font-semibold rounded-full">
                      Back ✓
                    </span>
                  )}
                </div>
              )}

              {/* Open designer CTA */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <button
                  onClick={() => setDesignerOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#01696f] text-white text-sm font-semibold rounded-full shadow-lg hover:bg-[#0c4e54] transition-all hover:shadow-xl active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {hasAnyDesign ? 'Edit Design' : 'Start Designing'}
                </button>
              </div>
            </div>

            {/* Thumbnail strip — always visible when multiple images */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => handleThumbnailClick(i)}
                    title={img.altText ?? undefined}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === activeImageIdx
                        ? 'border-[#01696f]'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img.storageUrl} alt={img.altText ?? ''} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Controls ── */}
          <div className="flex flex-col gap-7">

            {/* Product info */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1 capitalize">
                {product.productType}
              </p>
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

            {/* Color swatches */}
            {availableColors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">Colors</h2>
                  {activeColor && (
                    <span className="text-xs text-gray-500">{activeColor}</span>
                  )}
                  {selectedColors.length > 1 && (
                    <span className="text-xs text-gray-400">({selectedColors.length} selected)</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {availableColors.map((color) => {
                    const isActive = activeColor === color.label;
                    const isSelected = selectedColors.includes(color.label);
                    return (
                      <button
                        key={color.label}
                        onClick={() => handleColorClick(color)}
                        title={color.label}
                        className={`group relative w-9 h-9 rounded-full border-2 transition-all ${
                          isActive
                            ? 'border-[#01696f] scale-110 shadow-md ring-2 ring-[#01696f]/20'
                            : isSelected
                            ? 'border-[#01696f]/60 scale-105 shadow-sm'
                            : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 drop-shadow"
                              style={{ color: isLightColor(color.hex) ? '#1f2937' : '#ffffff' }}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
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
                <p className="text-[10px] text-gray-400 mt-2">
                  Click a color to preview · check multiple for bulk ordering
                </p>
              </div>
            )}

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
                {submitState === 'saving'
                  ? 'Saving…'
                  : submitState === 'done'
                  ? '✓ Design Saved'
                  : totalUnits === 0
                  ? 'Enter quantities to continue'
                  : !hasAnyDesign
                  ? 'Add your design to continue'
                  : 'Save Design'}
              </button>
              {submitState === 'done' && configId && (
                <p className="text-xs text-center text-green-700 font-medium">
                  ✓ Saved — reference: {configId}
                </p>
              )}
              {submitState === 'error' && (
                <p className="text-xs text-center text-red-600">
                  Something went wrong. Try again.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen designer */}
      {designerOpen && (
        <DesignerModal
          productId={product.id}
          productType={product.productType}
          productTitle={product.title}
          productImages={images}
          activeImageIdx={activeImageIdx}
          onClose={() => setDesignerOpen(false)}
          onSave={handleDesignApply}
          initialDesign={design}
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
