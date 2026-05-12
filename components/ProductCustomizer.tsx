'use client';

import { useState, useCallback } from 'react';
import BulkOrderGrid from '@/components/BulkOrderGrid';
import UploadZone from '@/components/UploadZone';
import CanvasPreview from '@/components/CanvasPreview';
import ValidationBadge from '@/components/ValidationBadge';
import type { ValidationResult } from '@/lib/validation';

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

const PLACEHOLDER_USER_ID = 'demo-user';

export default function ProductCustomizer({ product }: { product: Product }) {
  const { availableSizes, availableColors, images } = product;

  // Image gallery
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const activeImage = images[activeImageIdx] ?? null;

  // Color selection
  const [selectedColors, setSelectedColors] = useState<string[]>(
    availableColors.length > 0 ? [availableColors[0].label] : []
  );

  // Bulk qty grid state: quantities[colorLabel][size] = number
  const [quantities, setQuantities] = useState<Record<string, Record<string, number>>>({});

  const handleQtyChange = useCallback((colorLabel: string, size: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [colorLabel]: { ...(prev[colorLabel] ?? {}), [size]: qty },
    }));
  }, []);

  function toggleColor(label: string) {
    setSelectedColors((prev) =>
      prev.includes(label)
        ? prev.filter((c) => c !== label)
        : [...prev, label]
    );
  }

  // Total units
  const totalUnits = Object.values(quantities).reduce(
    (sum, sizeMap) => sum + Object.values(sizeMap).reduce((s, q) => s + q, 0),
    0
  );

  // Artwork upload
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artUploadId, setArtUploadId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(file: File) {
    setIsUploading(true);
    setValidation(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', PLACEHOLDER_USER_ID);
      fd.append('garmentType', product.productType);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json() as {
        ok: boolean;
        data: { artUploadId: string; storageUrl: string; validation: ValidationResult };
      };
      if (json.ok) {
        setArtworkUrl(json.data.storageUrl);
        setArtUploadId(json.data.artUploadId);
        setValidation(json.data.validation);
      }
    } finally {
      setIsUploading(false);
    }
  }

  // Save design
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [configId, setConfigId] = useState<string | null>(null);

  async function handleSave() {
    if (!artUploadId || validation?.status === 'fail' || totalUnits === 0) return;
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
          inputs: { productType: product.productType, selectedColors, quantities },
          scalePercent: 84,
          yPercent: 42,
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

  const canSave = !!artUploadId && validation?.status !== 'fail' && totalUnits > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* ── LEFT: Image gallery ── */}
        <div className="flex flex-col gap-4">
          {/* Main image */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-white border border-gray-200">
            {activeImage ? (
              <img
                src={activeImage.storageUrl}
                alt={activeImage.altText ?? product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
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

          {/* Artwork preview canvas */}
          {artworkUrl && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-2">Artwork preview</p>
              <CanvasPreview
                artworkUrl={artworkUrl}
                garmentType={product.productType}
                scalePercent={84}
                yPercent={42}
              />
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
                From ${(product.basePriceCents / 100).toFixed(2)} <span className="text-sm font-normal text-gray-400">/ unit</span>
              </p>
            )}
            {product.description && (
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Color selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Colors
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({selectedColors.length} selected)
                </span>
              </h2>
              {selectedColors.length > 0 && (
                <span className="text-xs text-gray-400">
                  {selectedColors.join(', ')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
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
                    {/* Tooltip */}
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] bg-gray-900 text-white rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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
                <span className="ml-2 text-xs font-normal text-gray-400">{totalUnits} units selected</span>
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

          {/* Artwork upload */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Upload Artwork</h2>
            <UploadZone onUpload={handleUpload} isUploading={isUploading} />
            {validation && <div className="mt-3"><ValidationBadge result={validation} /></div>}
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3 pt-2">
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
                ? 'Select sizes & quantities to continue'
                : !artUploadId
                ? 'Upload artwork to continue'
                : 'Save Design'}
            </button>

            {!canSave && totalUnits > 0 && !artUploadId && (
              <p className="text-xs text-center text-gray-400">Upload your artwork file to save this design.</p>
            )}
            {submitState === 'done' && configId && (
              <p className="text-xs text-center text-green-700 font-medium">
                ✓ Design saved — reference ID: {configId}
              </p>
            )}
            {submitState === 'error' && (
              <p className="text-xs text-center text-red-600">Something went wrong. Please try again.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Determine if a hex color is light (for checkmark contrast)
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
