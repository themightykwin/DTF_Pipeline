'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import BulkOrderGrid from '@/components/BulkOrderGrid';
import GarmentPreview, { ArtworkTransform } from '@/components/GarmentPreview';
import type { DesignOutput, SideDesign } from '@/components/DesignerModal';
import type { SavedConfig } from '@/app/products/[id]/page';

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

export default function ProductCustomizer({ product, savedConfig }: { product: Product; savedConfig?: SavedConfig | null }) {
  const { availableSizes, availableColors, images } = product;

  // ── Seed initial color from savedConfig or first available color ──
  const initialColor = savedConfig?.selectedColors?.[0] ?? (availableColors.length > 0 ? availableColors[0].label : '');
  const initialColors = savedConfig?.selectedColors?.length
    ? savedConfig.selectedColors
    : availableColors.length > 0 ? [availableColors[0].label] : [];

  // Active image index — drives both the main preview and the designer canvas
  const [activeImageIdx, setActiveImageIdx] = useState(() => {
    if (savedConfig?.selectedColors?.[0] && images.length > 1) {
      const idx = images.findIndex(img => img.altText?.toLowerCase().includes(savedConfig.selectedColors[0].toLowerCase()));
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });
  const activeImage = images[activeImageIdx] ?? images[0] ?? null;

  // Single selected color (for image switching)
  const [activeColor, setActiveColor] = useState<string>(initialColor);
  // Multi-select for bulk grid
  const [selectedColors, setSelectedColors] = useState<string[]>(initialColors);

  // Bulk quantity grid — seed from savedConfig if present
  const [quantities, setQuantities] = useState<Record<string, Record<string, number>>>(
    savedConfig?.quantities ?? {}
  );
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

  // Design state — seed artwork from savedConfig if present
  const [design, setDesign] = useState<DesignOutput>(() => {
    if (!savedConfig?.artworkUrl) return { front: null, back: null };
    const DEFAULT_T = { xPct: 0.5, yPct: 0.4, scalePct: 80 };
    const frontSide: SideDesign | null = savedConfig.front || savedConfig.artworkUrl
      ? {
          artUploadId: savedConfig.artUploadId ?? '',
          artworkUrl:  savedConfig.artworkUrl ?? '',
          transform:   savedConfig.front ?? DEFAULT_T,
        }
      : null;
    const backSide: SideDesign | null = savedConfig.back
      ? {
          artUploadId: savedConfig.artUploadId ?? '',
          artworkUrl:  savedConfig.artworkUrl ?? '',
          transform:   savedConfig.back,
        }
      : null;
    return { front: frontSide, back: backSide };
  });
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

  // ── Action state ──────────────────────────────────────────────────────────
  const [saveState, setSaveState]   = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [cartState, setCartState]   = useState<'idle' | 'adding' | 'added' | 'error'>('idle');
  // Pre-seed with the saved config ID so reorders reuse the existing record
  const [configId,  setConfigId]    = useState<string | null>(savedConfig?.configurationId ?? null);
  const [saveError, setSaveError]   = useState('');
  const [cartError, setCartError]   = useState('');

  /** Fetch current customer session userId (or 'demo-user' as fallback) */
  async function getSessionUserId(): Promise<string> {
    try {
      const res = await fetch('/api/customer/auth/me');
      if (res.ok) {
        const json = await res.json() as { ok: boolean; user?: { id: string } };
        if (json.ok && json.user?.id) return json.user.id;
      }
    } catch {}
    return 'demo-user';
  }

  /** Build and save (or re-save) the ProductConfiguration, returning its ID */
  async function saveConfiguration(): Promise<string | null> {
    const userId = await getSessionUserId();
    const res = await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopDomain: 'demo.dtfpipeline.com',
        userId,
        garmentTemplateId: product.productType,
        artUploadId: design.front?.artUploadId ?? design.back?.artUploadId,
        catalogProductId: product.id,
        inputs: {
          productType: product.productType,
          selectedColors,
          quantities,
          front: design.front ? { transform: design.front.transform } : null,
          back:  design.back  ? { transform: design.back.transform  } : null,
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
    const json = await res.json() as { ok: boolean; data?: { configurationId: string }; error?: string };
    if (json.ok && json.data?.configurationId) {
      setConfigId(json.data.configurationId);
      return json.data.configurationId;
    }
    return null;
  }

  /** Save Design — stores config + marks isSaved; redirects to login if 401 */
  async function handleSaveDesign() {
    if (!hasAnyDesign || totalUnits === 0) return;
    setSaveState('saving');
    setSaveError('');
    try {
      const cfgId = await saveConfiguration();
      if (!cfgId) { setSaveState('error'); setSaveError('Could not save configuration.'); return; }

      // Save to customer's account
      const res = await fetch('/api/customer/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configurationId: cfgId }),
      });
      if (res.status === 401) {
        // Not logged in — redirect to login, returning here after
        window.location.href = `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setSaveState('done');
      } else {
        setSaveState('error');
        setSaveError(json.error ?? 'Failed to save design.');
      }
    } catch {
      setSaveState('error');
      setSaveError('Network error. Try again.');
    }
  }

  /** Add to Cart — saves config then adds to staging cart; redirects to login if 401 */
  async function handleAddToCart() {
    if (!hasAnyDesign || totalUnits === 0) return;
    setCartState('adding');
    setCartError('');
    try {
      const cfgId = configId ?? await saveConfiguration();
      if (!cfgId) { setCartState('error'); setCartError('Could not save configuration.'); return; }

      const res = await fetch('/api/customer/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configurationId: cfgId,
          quantities,
          selectedColors,
        }),
      });
      if (res.status === 401) {
        window.location.href = `/account/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setCartState('added');
      } else {
        setCartState('error');
        setCartError(json.error ?? 'Failed to add to cart.');
      }
    } catch {
      setCartState('error');
      setCartError('Network error. Try again.');
    }
  }

  const canAct = hasAnyDesign && totalUnits > 0;

  return (
    <>
      <div style={{ padding: '40px', maxWidth: '1400px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10">

          {/* ── LEFT: Image preview + thumbnails ── */}
          <div className="flex flex-col gap-3">

            {/* Main preview */}
            <div
              className="relative aspect-square overflow-hidden"
              style={{ background: '#131313', border: '1px solid #2A2A2A', borderRadius: '12px' }}
            >
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
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: '#444444' }}>
                  No image
                </div>
              )}

              {/* Front/Back toggle — only visible when design is active */}
              {hasAnyDesign && (
                <div
                  className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 p-1"
                  style={{
                    background: '#0D0D0D',
                    border: '1px solid #2A2A2A',
                    borderRadius: '9999px',
                  }}
                >
                  {(['front', 'back'] as const).map((side) => (
                    <button
                      key={side}
                      onClick={() => setPreviewSide(side)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all capitalize"
                      style={
                        previewSide === side
                          ? {
                              background: '#E8FF47',
                              color: '#0A0A0A',
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 600,
                              borderRadius: '9999px',
                            }
                          : {
                              color: '#888888',
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 500,
                              borderRadius: '9999px',
                            }
                      }
                    >
                      <span>{side}</span>
                      {design[side] && (
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: '#E8FF47' }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Design badges */}
              {hasAnyDesign && (
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  {design.front && (
                    <span
                      className="px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: 'rgba(232,255,71,0.15)',
                        color: '#E8FF47',
                        border: '1px solid rgba(232,255,71,0.3)',
                        borderRadius: '9999px',
                      }}
                    >
                      Front ✓
                    </span>
                  )}
                  {design.back && (
                    <span
                      className="px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: 'rgba(232,255,71,0.15)',
                        color: '#E8FF47',
                        border: '1px solid rgba(232,255,71,0.3)',
                        borderRadius: '9999px',
                      }}
                    >
                      Back ✓
                    </span>
                  )}
                </div>
              )}

              {/* Open designer CTA */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <button
                  onClick={() => setDesignerOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm active:scale-95 transition-all"
                  style={{
                    background: '#E8FF47',
                    color: '#0A0A0A',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    borderRadius: '9999px',
                    boxShadow: '0 0 20px rgba(232,255,71,0.25)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#C8DF1F'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#E8FF47'; }}
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
                {images.map((img, i) => {
                  // Use front design for thumbnail overlay; fall back to back
                  const thumbDesign = design.front ?? design.back ?? null;
                  const isActive = i === activeImageIdx;
                  return (
                    <button
                      key={img.id}
                      onClick={() => handleThumbnailClick(i)}
                      title={img.altText ?? undefined}
                      className="flex-shrink-0 w-24 h-24 overflow-hidden transition-all"
                      style={{
                        background: '#0D0D0D',
                        border: `2px solid ${isActive ? '#E8FF47' : '#2A2A2A'}`,
                        borderRadius: '8px',
                        boxShadow: isActive ? '0 0 8px rgba(232,255,71,0.3)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = '#3A3A3A';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A2A';
                      }}
                    >
                      {hasAnyDesign && thumbDesign ? (
                        <GarmentPreview
                          imageSrc={img.storageUrl}
                          imageAlt={img.altText ?? ''}
                          garmentType={product.productType}
                          artworkUrl={thumbDesign.artworkUrl}
                          transform={thumbDesign.transform}
                          interactive={false}
                          className="w-full h-full"
                        />
                      ) : (
                        <img src={img.storageUrl} alt={img.altText ?? ''} className="w-full h-full object-contain" style={{ background: '#0D0D0D' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: Controls ── */}
          <div className="flex flex-col gap-7">

            {/* Reorder banner */}
            {savedConfig && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium"
                style={{
                  background: 'rgba(232,255,71,0.05)',
                  border: '1px solid rgba(232,255,71,0.15)',
                  borderRadius: '8px',
                  color: '#E8FF47',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#E8FF47" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Saved design loaded — update quantities or colors and add to cart.
              </div>
            )}

            {/* Product info */}
            <div>
              <p
                className="mb-1 uppercase tracking-widest"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: '#888888',
                }}
              >
                {product.productType}
              </p>
              <h1
                className="mb-1"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: '24px',
                  color: '#F5F5F5',
                }}
              >
                {product.title}
              </h1>
              {product.basePriceCents > 0 && (
                <p
                  className="text-lg"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    color: '#E8FF47',
                  }}
                >
                  From ${(product.basePriceCents / 100).toFixed(2)}
                  <span
                    className="ml-1 text-sm"
                    style={{ fontWeight: 400, color: '#888888' }}
                  >
                    / unit
                  </span>
                </p>
              )}
              {product.description && (
                <p
                  className="text-sm mt-3 leading-relaxed"
                  style={{ color: '#888888' }}
                >
                  {product.description}
                </p>
              )}
            </div>

            {/* Color swatches */}
            {availableColors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2
                    className="text-sm"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      color: '#F5F5F5',
                    }}
                  >
                    Colors
                  </h2>
                  {activeColor && (
                    <span className="text-xs" style={{ color: '#888888' }}>{activeColor}</span>
                  )}
                  {selectedColors.length > 1 && (
                    <span className="text-xs" style={{ color: '#888888' }}>({selectedColors.length} selected)</span>
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
                        className="group relative w-9 h-9 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: color.hex,
                          borderColor: isActive
                            ? '#E8FF47'
                            : isSelected
                            ? 'rgba(232,255,71,0.4)'
                            : '#2A2A2A',
                          boxShadow: isActive
                            ? '0 0 0 2px #E8FF47, 0 0 8px rgba(232,255,71,0.4)'
                            : 'none',
                          transform: isActive ? 'scale(1.10)' : isSelected ? 'scale(1.05)' : 'scale(1)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive && !isSelected)
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#3A3A3A';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive && !isSelected)
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A2A';
                        }}
                      >
                        {isSelected && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <svg
                              className="w-4 h-4 drop-shadow"
                              style={{ color: '#E8FF47' }}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        <span
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                          style={{ background: '#1A1A1A', color: '#F5F5F5', border: '1px solid #2A2A2A' }}
                        >
                          {color.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] mt-2" style={{ color: '#444444' }}>
                  Click a color to preview · check multiple for bulk ordering
                </p>
              </div>
            )}

            {/* Bulk quantity grid */}
            <div>
              <h2
                className="text-sm mb-3"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  color: '#F5F5F5',
                }}
              >
                Sizes &amp; Quantities
                {totalUnits > 0 && (
                  <span
                    className="ml-2 text-xs font-normal"
                    style={{ color: '#888888' }}
                  >
                    {totalUnits} units
                  </span>
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
              {/* Hint copy when not ready */}
              {!canAct && (
                <p className="text-xs text-center" style={{ color: '#888888' }}>
                  {totalUnits === 0 && !hasAnyDesign
                    ? 'Add a design and enter quantities to continue'
                    : totalUnits === 0
                    ? 'Enter quantities to continue'
                    : 'Add your design to continue'}
                </p>
              )}

              {/* Save Design */}
              <button
                onClick={handleSaveDesign}
                disabled={!canAct || saveState === 'saving'}
                className="w-full py-3.5 transition-colors disabled:cursor-not-allowed"
                style={{
                  border: '1px solid #3A3A3A',
                  color: '#F5F5F5',
                  background: 'transparent',
                  borderRadius: '8px',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: '14px',
                  opacity: (!canAct || saveState === 'saving') ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#888888';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#3A3A3A';
                }}
              >
                {saveState === 'saving'
                  ? 'Saving…'
                  : saveState === 'done'
                  ? '✓ Design Saved'
                  : 'Save Design'}
              </button>
              {saveState === 'done' && (
                <p className="text-xs text-center font-medium" style={{ color: '#E8FF47' }}>
                  ✓ Saved to your account —{' '}
                  <a href="/account/designs" className="underline" style={{ color: '#E8FF47' }}>view designs</a>
                </p>
              )}
              {saveState === 'error' && (
                <p className="text-xs text-center" style={{ color: '#FF4747' }}>{saveError || 'Something went wrong.'}</p>
              )}

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={!canAct || cartState === 'adding'}
                className="w-full py-4 transition-colors disabled:cursor-not-allowed"
                style={{
                  background: '#E8FF47',
                  color: '#0A0A0A',
                  borderRadius: '8px',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '0 0 20px rgba(232,255,71,0.25)',
                  opacity: (!canAct || cartState === 'adding') ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (canAct && cartState !== 'adding')
                    (e.currentTarget as HTMLButtonElement).style.background = '#C8DF1F';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#E8FF47';
                }}
              >
                {cartState === 'adding'
                  ? 'Adding…'
                  : cartState === 'added'
                  ? '✓ Added to Cart'
                  : 'Add to Cart'}
              </button>
              {cartState === 'added' && (
                <p className="text-xs text-center font-medium" style={{ color: '#E8FF47' }}>
                  ✓ In your cart —{' '}
                  <a href="/account/cart" className="underline" style={{ color: '#E8FF47' }}>view cart</a>
                </p>
              )}
              {cartState === 'error' && (
                <p className="text-xs text-center" style={{ color: '#FF4747' }}>{cartError || 'Something went wrong.'}</p>
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
