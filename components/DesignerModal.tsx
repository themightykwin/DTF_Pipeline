'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import UploadZone from '@/components/UploadZone';
import type { ValidationResult } from '@/lib/validation';
import type { ArtworkTransform } from '@/components/GarmentPreview';
import type { ProductImage } from '@/components/ProductCustomizer';

// ── Print area constants ─────────────────────────────────────────────────────

type Side = 'front' | 'back';

const PRINT_AREA: Record<string, Record<Side, { top: number; left: number; width: number; height: number }>> = {
  tshirt: {
    front: { top: 0.22, left: 0.25, width: 0.50, height: 0.45 },
    back:  { top: 0.18, left: 0.25, width: 0.50, height: 0.48 },
  },
  hoodie: {
    front: { top: 0.20, left: 0.25, width: 0.50, height: 0.42 },
    back:  { top: 0.16, left: 0.25, width: 0.50, height: 0.45 },
  },
  crewneck: {
    front: { top: 0.22, left: 0.25, width: 0.50, height: 0.42 },
    back:  { top: 0.18, left: 0.25, width: 0.50, height: 0.45 },
  },
};

const DEFAULT_TRANSFORM: ArtworkTransform = { xPct: 0.5, yPct: 0.4, scalePct: 80 };
const MIN_SCALE = 10;
const MAX_SCALE = 160;

// Zoom levels the +/- buttons snap through
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];
const DEFAULT_ZOOM = 2.0;

// ── Types ────────────────────────────────────────────────────────────────────

export interface SideDesign {
  artUploadId: string;
  artworkUrl: string;
  transform: ArtworkTransform;
}

export interface DesignOutput {
  front: SideDesign | null;
  back: SideDesign | null;
}

interface SideState {
  artworkUrl: string | null;
  artUploadId: string | null;
  transform: ArtworkTransform;
  artAspect: number;
  validation: ValidationResult | null;
  needsBgRemoval: boolean;  // true when upload had no transparency
  isRemovingBg: boolean;    // true while remove.bg call is in flight
}

const defaultSideState = (): SideState => ({
  artworkUrl: null,
  artUploadId: null,
  transform: { ...DEFAULT_TRANSFORM },
  artAspect: 1,
  validation: null,
  needsBgRemoval: false,
  isRemovingBg: false,
});

interface Props {
  productId: string;
  productType: string;
  productTitle: string;
  productImages: ProductImage[];
  activeImageIdx: number;
  onClose: () => void;
  onSave: (design: DesignOutput) => void;
  initialDesign?: DesignOutput;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DesignerModal({
  productType,
  productTitle,
  productImages,
  activeImageIdx,
  onClose,
  onSave,
  initialDesign,
}: Props) {
  const [activeSide, setActiveSide] = useState<Side>('front');
  const [canvasImageIdx, setCanvasImageIdx] = useState(activeImageIdx);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const [sides, setSides] = useState<Record<Side, SideState>>({
    front: initialDesign?.front
      ? { artworkUrl: initialDesign.front.artworkUrl, artUploadId: initialDesign.front.artUploadId, transform: initialDesign.front.transform, artAspect: 1, validation: null, needsBgRemoval: false, isRemovingBg: false }
      : defaultSideState(),
    back: initialDesign?.back
      ? { artworkUrl: initialDesign.back.artworkUrl, artUploadId: initialDesign.back.artUploadId, transform: initialDesign.back.transform, artAspect: 1, validation: null, needsBgRemoval: false, isRemovingBg: false }
      : defaultSideState(),
  });

  const [isUploading, setIsUploading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selected, setSelected] = useState(false);

  // The outer scrollable viewport
  const viewportRef = useRef<HTMLDivElement>(null);
  // The canvas card (square, fixed size — zoom is applied via CSS transform)
  const canvasRef = useRef<HTMLDivElement>(null);

  const drag = useRef<{
    active: boolean; mode: 'move' | 'scale';
    startX: number; startY: number;
    startXPct: number; startYPct: number; startScale: number;
    canvasW: number; canvasH: number;
  }>({ active: false, mode: 'move', startX: 0, startY: 0, startXPct: 0, startYPct: 0, startScale: 80, canvasW: 0, canvasH: 0 });

  const current = sides[activeSide];
  const area = (PRINT_AREA[productType] ?? PRINT_AREA.tshirt)[activeSide];
  const canvasImage = productImages[canvasImageIdx] ?? productImages[0];

  // Canvas logical size (pre-zoom). Zoom is applied via CSS transform;
  // the scroll container is sized to CANVAS_SIZE * zoom so the browser
  // actually allocates scroll space for the full painted area.
  const CANVAS_SIZE = 700;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Track artwork aspect ratio
  useEffect(() => {
    if (!current.artworkUrl) return;
    const img = new Image();
    img.onload = () => updateSide(activeSide, { artAspect: img.naturalHeight / img.naturalWidth });
    img.src = current.artworkUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.artworkUrl, activeSide]);

  function updateSide(side: Side, patch: Partial<SideState>) {
    setSides(prev => ({ ...prev, [side]: { ...prev[side], ...patch } }));
  }
  function updateTransform(side: Side, patch: Partial<ArtworkTransform>) {
    setSides(prev => ({
      ...prev,
      [side]: { ...prev[side], transform: { ...prev[side].transform, ...patch } },
    }));
  }

  // ── Zoom helpers ──
  function zoomIn() {
    setZoom(z => {
      const next = ZOOM_STEPS.find(s => s > z + 0.01);
      return next ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
    });
  }
  function zoomOut() {
    setZoom(z => {
      const prev = [...ZOOM_STEPS].reverse().find(s => s < z - 0.01);
      return prev ?? ZOOM_STEPS[0];
    });
  }
  function zoomFit() { setZoom(DEFAULT_ZOOM); }

  // ── Artwork position calc ──
  // artWidthPct  = scalePct% of the print-area width, expressed as % of full canvas
  // artHeightPct = artWidthPct × natural aspect ratio (no extra area correction needed)
  function getArtworkStyle(side: Side) {
    const s = sides[side];
    const a = (PRINT_AREA[productType] ?? PRINT_AREA.tshirt)[side];
    const scale = s.transform.scalePct / 100;
    const artWidthPct  = a.width * 100 * scale;          // % of full canvas width
    const artHeightPct = artWidthPct * s.artAspect;       // % of full canvas width (height in same space)
    const leftPct = a.left   * 100 + a.width  * 100 * s.transform.xPct - artWidthPct  / 2;
    const topPct  = a.top    * 100 + a.height * 100 * s.transform.yPct - artHeightPct / 2;
    return { left: `${leftPct}%`, top: `${topPct}%`, width: `${artWidthPct}%` };
  }

  // ── Drag: move ──
  const startMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSelected(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = canvasRef.current!.getBoundingClientRect();
    const side = activeSide;
    const t = sides[side].transform;
    const a = (PRINT_AREA[productType] ?? PRINT_AREA.tshirt)[side];
    // Account for zoom when translating pixel deltas to percentage deltas
    drag.current = {
      active: true, mode: 'move',
      startX: clientX, startY: clientY,
      startXPct: t.xPct, startYPct: t.yPct, startScale: t.scalePct,
      canvasW: rect.width, canvasH: rect.height,
    };
    function onMove(e: MouseEvent | TouchEvent) {
      if (!drag.current.active) return;
      const cx = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const cy = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      // rect.width is the zoomed width; divide by zoom to get logical canvas coords
      const logicalW = drag.current.canvasW;
      const logicalH = drag.current.canvasH;
      const dx = (cx - drag.current.startX) / (logicalW * a.width);
      const dy = (cy - drag.current.startY) / (logicalH * a.height);
      updateTransform(side, {
        xPct: Math.min(1, Math.max(0, drag.current.startXPct + dx)),
        yPct: Math.min(1, Math.max(0, drag.current.startYPct + dy)),
      });
    }
    function onUp() {
      drag.current.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [activeSide, sides, productType]);

  // ── Drag: scale ──
  const startScale = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = canvasRef.current!.getBoundingClientRect();
    const side = activeSide;
    const t = sides[side].transform;
    drag.current = {
      active: true, mode: 'scale',
      startX: clientX, startY: clientY,
      startXPct: t.xPct, startYPct: t.yPct, startScale: t.scalePct,
      canvasW: rect.width, canvasH: rect.height,
    };
    function onMove(e: MouseEvent | TouchEvent) {
      if (!drag.current.active) return;
      const cx = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const cy = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const delta = ((cx - drag.current.startX) + (drag.current.startY - cy)) / 3;
      updateTransform(side, { scalePct: Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, drag.current.startScale + delta))) });
    }
    function onUp() {
      drag.current.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [activeSide, sides]);

  // ── Upload ──
  async function handleUpload(file: File) {
    setIsUploading(true);
    const side = activeSide;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', 'demo-user');
      fd.append('garmentType', productType);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json() as {
        ok: boolean;
        data: {
          artUploadId: string;
          storageUrl: string;
          validation: ValidationResult;
          needsBgRemoval: boolean;
        };
      };
      if (json.ok) {
        updateSide(side, {
          artworkUrl: json.data.storageUrl,
          artUploadId: json.data.artUploadId,
          validation: json.data.validation,
          needsBgRemoval: json.data.needsBgRemoval ?? false,
          isRemovingBg: false,
          transform: { ...DEFAULT_TRANSFORM },
        });
        setSelected(true);
        setPanelOpen(true); // keep panel open so banner is visible
      }
    } finally {
      setIsUploading(false);
    }
  }

  // ── Remove background (opt-in) ──
  async function handleRemoveBg(side: Side) {
    const artUploadId = sides[side].artUploadId;
    if (!artUploadId) return;
    updateSide(side, { isRemovingBg: true });
    try {
      const res = await fetch('/api/upload/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artUploadId }),
      });
      const json = await res.json() as { ok: boolean; data?: { storageUrl: string } };
      if (json.ok && json.data?.storageUrl) {
        updateSide(side, {
          artworkUrl: json.data.storageUrl,
          needsBgRemoval: false,
          isRemovingBg: false,
        });
      } else {
        updateSide(side, { isRemovingBg: false });
      }
    } catch {
      updateSide(side, { isRemovingBg: false });
    }
  }

  // ── Apply ──
  function handleApply() {
    const toDesign = (s: SideState): SideDesign | null =>
      s.artUploadId && s.artworkUrl
        ? { artUploadId: s.artUploadId, artworkUrl: s.artworkUrl, transform: s.transform }
        : null;
    onSave({ front: toDesign(sides.front), back: toDesign(sides.back) });
    onClose();
  }

  const hasAnyDesign = !!(sides.front.artUploadId || sides.back.artUploadId);
  const artStyle = getArtworkStyle(activeSide);
  const zoomPct = Math.round(zoom * 100);
  // Actual painted size after CSS scale — used to size the scroll container
  const scaledSize = CANVAS_SIZE * zoom;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#111] border-b border-white/10 flex-shrink-0 h-14">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">{productTitle}</span>
          <div className="flex items-center gap-1">
            {sides.front.artUploadId && <span className="px-2 py-0.5 bg-[#01696f]/20 text-[#01696f] rounded-full text-xs">Front ✓</span>}
            {sides.back.artUploadId  && <span className="px-2 py-0.5 bg-[#01696f]/20 text-[#01696f] rounded-full text-xs">Back ✓</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {current.artworkUrl && (
            <button onClick={() => updateTransform(activeSide, { xPct: 0.5, yPct: 0.4 })} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
              Reset position
            </button>
          )}
          <button onClick={handleApply} disabled={!hasAnyDesign} className="px-5 py-2 bg-[#01696f] text-white text-sm font-semibold rounded-lg hover:bg-[#0c4e54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            Apply Design →
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left toolbar ── */}
        <div className="w-16 flex-shrink-0 bg-[#111] border-r border-white/10 flex flex-col items-center py-4 gap-2">
          <ToolButton
            label="Upload"
            active={panelOpen}
            onClick={() => setPanelOpen(p => !p)}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            }
          />
        </div>

        {/* ── Upload panel ── */}
        {panelOpen && (
          <div className="w-72 flex-shrink-0 bg-[#1e1e1e] border-r border-white/10 flex flex-col overflow-y-auto">
            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Upload Artwork</h3>
                <p className="text-xs text-gray-500">
                  Uploading to: <span className="text-white font-medium capitalize">{activeSide}</span>
                </p>
              </div>
              <UploadZone onUpload={handleUpload} isUploading={isUploading} />

              {/* BG removal banner — shown when upload has no transparency */}
              {current.needsBgRemoval && !current.isRemovingBg && (
                <div style={{
                  background: 'rgba(232,255,71,0.08)',
                  border: '1px solid rgba(232,255,71,0.25)',
                  borderRadius: '10px',
                  padding: '12px',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#E8FF47', marginBottom: '4px' }}>
                    No transparent background detected
                  </p>
                  <p style={{ fontSize: '11px', color: '#999', lineHeight: 1.5, marginBottom: '10px' }}>
                    Your image has a solid background. For best DTF results, remove it so only your design prints on the garment.
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveBg(activeSide)}
                      style={{
                        flex: 1, padding: '7px 10px', borderRadius: '7px', border: 'none',
                        background: '#E8FF47', color: '#0A0A0A', fontSize: '11px',
                        fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s',
                      }}
                    >
                      Remove Background
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSide(activeSide, { needsBgRemoval: false })}
                      style={{
                        padding: '7px 10px', borderRadius: '7px',
                        border: '1px solid #333', background: 'transparent',
                        color: '#666', fontSize: '11px', cursor: 'pointer',
                      }}
                    >
                      Keep as-is
                    </button>
                  </div>
                </div>
              )}

              {/* Spinner while BG removal is running */}
              {current.isRemovingBg && (
                <div style={{
                  background: 'rgba(232,255,71,0.06)',
                  border: '1px solid rgba(232,255,71,0.15)',
                  borderRadius: '10px',
                  padding: '14px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <svg className="animate-spin" style={{ flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#E8FF47" strokeWidth="2.5" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#E8FF47" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  <p style={{ fontSize: '11px', color: '#E8FF47', fontWeight: 600 }}>Removing background…</p>
                </div>
              )}

              {current.validation && (
                <div className={`rounded-xl p-3 text-xs ${
                  current.validation.status === 'pass' ? 'bg-green-900/30 text-green-400'
                  : current.validation.status === 'warn' ? 'bg-yellow-900/30 text-yellow-400'
                  : 'bg-red-900/30 text-red-400'
                }`}>
                  <p className="font-semibold mb-0.5">{current.validation.summary}</p>
                  <p className="opacity-80">{current.validation.detail}</p>
                </div>
              )}
              <div className="bg-white/5 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
                <span className="text-white font-medium">Tip:</span> Switch Front / Back below the canvas. Use + / − to zoom in for precise placement.
              </div>
            </div>
          </div>
        )}

        {/* ── Canvas area ── */}
        <div className="flex-1 flex flex-col bg-[#2a2a2a] overflow-hidden">

          {/* ── Canvas toolbar: side switcher + zoom ── */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#222] border-b border-white/10 flex-shrink-0">
            {/* Front / Back */}
            <div className="flex items-center gap-1 bg-[#111] rounded-xl p-1">
              {(['front', 'back'] as Side[]).map((side) => (
                <button
                  key={side}
                  onClick={() => { setActiveSide(side); setSelected(false); }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    activeSide === side ? 'bg-[#01696f] text-white shadow' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {side === 'front'
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 20v-2a6 6 0 0112 0v2"/></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16M4 20L20 4"/><circle cx="12" cy="12" r="4"/></svg>
                  }
                  <span className="capitalize">{side}</span>
                  {sides[side].artUploadId && <span className="w-2 h-2 rounded-full bg-[#4ade80]" />}
                </button>
              ))}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-[#111] rounded-xl p-1">
              <button
                onClick={zoomOut}
                disabled={zoom <= ZOOM_STEPS[0]}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg font-bold"
                title="Zoom out"
              >
                −
              </button>
              <button
                onClick={zoomFit}
                className="px-3 h-8 flex items-center justify-center rounded-lg text-xs font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-colors min-w-[52px]"
                title={zoom === DEFAULT_ZOOM ? 'Fit (default)' : 'Reset to fit'}
              >
                {zoomPct}%
              </button>
              <button
                onClick={zoomIn}
                disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg font-bold"
                title="Zoom in"
              >
                +
              </button>
            </div>
          </div>

          {/* ── Scrollable canvas viewport ── */}
          <div
            ref={viewportRef}
            className="flex-1 overflow-auto"
            style={{ padding: '40px' }}
          >
            {/*
              Outer wrapper is sized to the *scaled* dimensions so the
              scrollbar tracks the full painted area. The inner canvas card
              is transformed to match, anchored at top-left via origin-top-left.
            */}
            <div
              className="relative mx-auto"
              style={{ width: `${scaledSize}px`, height: `${scaledSize}px` }}
            >
            {/* Canvas card — fixed logical size, zoom via CSS transform */}
            <div
              ref={canvasRef}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target === canvasRef.current || target.dataset.garment) setSelected(false);
              }}
              className="absolute top-0 left-0 bg-white rounded-2xl shadow-2xl overflow-hidden origin-top-left transition-transform duration-150"
              style={{
                width:  `${CANVAS_SIZE}px`,
                height: `${CANVAS_SIZE}px`,
                transform: `scale(${zoom})`,
              }}
            >
              {/* Product photo — z-index 0 */}
              {canvasImage && (
                <img
                  src={canvasImage.storageUrl}
                  alt={canvasImage.altText ?? productTitle}
                  data-garment="true"
                  className="w-full h-full object-contain select-none"
                  draggable={false}
                  style={{ position: 'relative', zIndex: 0 }}
                />
              )}

              {/* Print area guide — z-index 10 */}
              <div
                className="absolute border border-dashed border-[#01696f]/40 rounded pointer-events-none"
                style={{
                  left: `${area.left * 100}%`, top: `${area.top * 100}%`,
                  width: `${area.width * 100}%`, height: `${area.height * 100}%`,
                  zIndex: 10,
                }}
              />

              {/* Artwork — z-index 20 */}
              {current.artworkUrl && (
                <div className="absolute" style={{ left: artStyle.left, top: artStyle.top, width: artStyle.width, zIndex: 20 }}>
                  <div className="relative">
                    <img
                      src={current.artworkUrl}
                      alt="Design"
                      draggable={false}
                      onMouseDown={startMove}
                      onTouchStart={startMove}
                      onClick={(e) => { e.stopPropagation(); setSelected(true); }}
                      className="w-full h-auto block select-none"
                      style={{ cursor: selected ? 'grab' : 'pointer' }}
                    />
                    {selected && (
                      <>
                        <div className="absolute inset-0 border-2 border-[#01696f] rounded pointer-events-none" />
                        {/* Delete */}
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); updateSide(activeSide, { artworkUrl: null, artUploadId: null }); setSelected(false); }}
                          className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg z-10 transition-colors"
                          title="Remove design"
                        >
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {/* Center */}
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); updateTransform(activeSide, { xPct: 0.5, yPct: 0.5 }); }}
                          className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center shadow-lg z-10 transition-colors"
                          title="Center design"
                        >
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                        {/* Scale handle */}
                        <div
                          onMouseDown={startScale}
                          onTouchStart={startScale}
                          className="absolute -bottom-3.5 -right-3.5 w-7 h-7 bg-[#01696f] hover:bg-[#0c4e54] rounded-full flex items-center justify-center shadow-lg cursor-nwse-resize z-10 touch-none"
                          title="Drag to resize"
                        >
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* No artwork placeholder */}
              {!current.artworkUrl && (
                <div
                  className="absolute flex flex-col items-center justify-center pointer-events-none"
                  style={{
                    left: `${area.left * 100}%`, top: `${area.top * 100}%`,
                    width: `${area.width * 100}%`, height: `${area.height * 100}%`,
                    zIndex: 10,
                  }}
                >
                  <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-xs text-gray-300 text-center leading-tight">
                    Upload artwork<br />for {activeSide}
                  </span>
                </div>
              )}
            </div>
            </div>{/* end scroll wrapper */}
          </div>{/* end viewport */}

          {/* ── Image thumbnail strip ── */}
          {productImages.length > 1 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#222] border-t border-white/10 flex-shrink-0 overflow-x-auto">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-1 flex-shrink-0">View:</span>
              {productImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setCanvasImageIdx(i)}
                  title={img.altText ?? undefined}
                  className={`w-11 h-11 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    i === canvasImageIdx ? 'border-[#01696f] scale-105' : 'border-white/20 hover:border-white/50 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.storageUrl} alt={img.altText ?? ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel: scale slider when artwork selected ── */}
        {current.artworkUrl && selected && (
          <div className="w-52 flex-shrink-0 bg-[#1e1e1e] border-l border-white/10 flex flex-col p-4 gap-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider capitalize">{activeSide} Design</h3>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Scale</span>
                <span className="font-mono text-[#01696f]">{current.transform.scalePct}%</span>
              </div>
              <input
                type="range" min={MIN_SCALE} max={MAX_SCALE}
                value={current.transform.scalePct}
                onChange={(e) => updateTransform(activeSide, { scalePct: parseInt(e.target.value) })}
                className="w-full accent-[#01696f]"
              />
            </div>
            <div className="space-y-2">
              <button onClick={() => updateTransform(activeSide, { xPct: 0.5, yPct: 0.5 })} className="w-full text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg py-2 transition-colors">
                Center on garment
              </button>
              <button onClick={() => updateTransform(activeSide, { yPct: 0.3 })} className="w-full text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg py-2 transition-colors">
                Move to chest/upper
              </button>
            </div>
            <p className="mt-auto text-[10px] text-gray-600 leading-relaxed">Drag to reposition. Corner handle to resize. Use zoom for precision.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} title={label} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'bg-[#01696f] text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
      {icon}
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </button>
  );
}
