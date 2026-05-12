'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import UploadZone from '@/components/UploadZone';
import type { ValidationResult } from '@/lib/validation';
import type { ArtworkTransform } from '@/components/GarmentPreview';

// Print area as fraction of garment image for each type
const PRINT_AREA: Record<string, { top: number; left: number; width: number; height: number }> = {
  tshirt:   { top: 0.22, left: 0.25, width: 0.50, height: 0.45 },
  hoodie:   { top: 0.20, left: 0.25, width: 0.50, height: 0.42 },
  crewneck: { top: 0.22, left: 0.25, width: 0.50, height: 0.42 },
};

const GARMENT_IMAGES: Record<string, string> = {
  tshirt:   '/garments/tshirt-white.jpg',
  hoodie:   '/garments/hoodie-white.jpg',
  crewneck: '/garments/crewneck-white.jpg',
};

interface Props {
  productId: string;
  productType: string;
  productTitle: string;
  onClose: () => void;
  onSave: (artUploadId: string, artworkUrl: string, transform: ArtworkTransform) => void;
  initialArtworkUrl?: string | null;
  initialTransform?: ArtworkTransform;
}

const DEFAULT_TRANSFORM: ArtworkTransform = { xPct: 0.5, yPct: 0.4, scalePct: 80 };
const MIN_SCALE = 10;
const MAX_SCALE = 160;

type Panel = 'upload' | null;

export default function DesignerModal({
  productType,
  productTitle,
  onClose,
  onSave,
  initialArtworkUrl,
  initialTransform,
}: Props) {
  const [artworkUrl, setArtworkUrl] = useState<string | null>(initialArtworkUrl ?? null);
  const [artUploadId, setArtUploadId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transform, setTransform] = useState<ArtworkTransform>(initialTransform ?? DEFAULT_TRANSFORM);
  const [activePanel, setActivePanel] = useState<Panel>(artworkUrl ? null : 'upload');
  const [artAspect, setArtAspect] = useState(1);
  const [selected, setSelected] = useState(false);

  // Canvas refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLImageElement>(null);

  // Drag state
  const drag = useRef<{
    active: boolean;
    mode: 'move' | 'scale';
    startX: number; startY: number;
    startXPct: number; startYPct: number;
    startScale: number;
    canvasW: number; canvasH: number;
  }>({ active: false, mode: 'move', startX: 0, startY: 0, startXPct: 0, startYPct: 0, startScale: 80, canvasW: 0, canvasH: 0 });

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Track artwork aspect ratio
  useEffect(() => {
    if (!artworkUrl) return;
    const img = new Image();
    img.onload = () => setArtAspect(img.naturalHeight / img.naturalWidth);
    img.src = artworkUrl;
  }, [artworkUrl]);

  // Deselect on canvas background click
  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.garment) {
      setSelected(false);
    }
  }

  // ── Drag: move artwork ──
  const startMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = canvasRef.current!.getBoundingClientRect();
    drag.current = {
      active: true, mode: 'move',
      startX: clientX, startY: clientY,
      startXPct: transform.xPct, startYPct: transform.yPct,
      startScale: transform.scalePct,
      canvasW: rect.width, canvasH: rect.height,
    };

    const area = PRINT_AREA[productType] ?? PRINT_AREA.tshirt;

    function onMove(e: MouseEvent | TouchEvent) {
      if (!drag.current.active) return;
      const cx = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const cy = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      const dx = (cx - drag.current.startX) / (drag.current.canvasW * area.width);
      const dy = (cy - drag.current.startY) / (drag.current.canvasH * area.height);
      setTransform(t => ({
        ...t,
        xPct: Math.min(1, Math.max(0, drag.current.startXPct + dx)),
        yPct: Math.min(1, Math.max(0, drag.current.startYPct + dy)),
      }));
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
  }, [transform, productType]);

  // ── Drag: scale from corner handle ──
  const startScale = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = canvasRef.current!.getBoundingClientRect();
    drag.current = {
      active: true, mode: 'scale',
      startX: clientX, startY: clientY,
      startXPct: transform.xPct, startYPct: transform.yPct,
      startScale: transform.scalePct,
      canvasW: rect.width, canvasH: rect.height,
    };

    function onMove(e: MouseEvent | TouchEvent) {
      if (!drag.current.active) return;
      const cx = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const cy = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      // Scale based on diagonal movement
      const delta = ((cx - drag.current.startX) + (drag.current.startY - cy)) / 3;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, drag.current.startScale + delta));
      setTransform(t => ({ ...t, scalePct: Math.round(newScale) }));
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
  }, [transform]);

  // ── Artwork position / size calculation ──
  function getArtworkStyle() {
    const area = PRINT_AREA[productType] ?? PRINT_AREA.tshirt;
    const scale = transform.scalePct / 100;
    const artWidthPct = area.width * 80 * scale;
    const artHeightPct = artWidthPct * artAspect * (area.width / area.height);
    const leftPct = area.left * 100 + area.width * 100 * transform.xPct - artWidthPct / 2;
    const topPct = area.top * 100 + area.height * 100 * transform.yPct - artHeightPct / 2;
    return { left: `${leftPct}%`, top: `${topPct}%`, width: `${artWidthPct}%` };
  }

  async function handleUpload(file: File) {
    setIsUploading(true);
    setValidation(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', 'demo-user');
      fd.append('garmentType', productType);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json() as {
        ok: boolean;
        data: { artUploadId: string; storageUrl: string; validation: ValidationResult };
      };
      if (json.ok) {
        setArtworkUrl(json.data.storageUrl);
        setArtUploadId(json.data.artUploadId);
        setValidation(json.data.validation);
        setTransform(DEFAULT_TRANSFORM);
        setSelected(true);
        setActivePanel(null); // close panel, show full canvas
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleApply() {
    if (!artUploadId || !artworkUrl) return;
    onSave(artUploadId, artworkUrl, transform);
    onClose();
  }

  const artStyle = getArtworkStyle();
  const area = PRINT_AREA[productType] ?? PRINT_AREA.tshirt;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#111] border-b border-white/10 flex-shrink-0 h-14">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">{productTitle}</span>
          {artworkUrl && (
            <span className="text-xs text-[#01696f] bg-[#01696f]/20 px-2 py-0.5 rounded-full">Design applied</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {artworkUrl && (
            <button
              onClick={() => setTransform(DEFAULT_TRANSFORM)}
              className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-white/10"
            >
              Reset position
            </button>
          )}
          <button
            onClick={handleApply}
            disabled={!artUploadId}
            className="px-5 py-2 bg-[#01696f] text-white text-sm font-semibold rounded-lg hover:bg-[#0c4e54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
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
            active={activePanel === 'upload'}
            onClick={() => setActivePanel(p => p === 'upload' ? null : 'upload')}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            }
          />
        </div>

        {/* ── Slide-in panel ── */}
        {activePanel === 'upload' && (
          <div className="w-80 flex-shrink-0 bg-[#1e1e1e] border-r border-white/10 flex flex-col overflow-y-auto">
            <div className="p-5 space-y-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upload Artwork</h3>
              <UploadZone onUpload={handleUpload} isUploading={isUploading} />
              {validation && (
                <div className={`rounded-xl p-3 text-xs ${
                  validation.status === 'pass' ? 'bg-green-900/30 text-green-400' :
                  validation.status === 'warn' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>
                  <p className="font-semibold mb-0.5">{validation.summary}</p>
                  <p className="opacity-80">{validation.detail}</p>
                </div>
              )}
              <div className="bg-white/5 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
                <span className="text-white font-medium">Tip:</span> PNG with transparency works best for DTF printing. After uploading, drag the design directly on the garment to reposition it.
              </div>
            </div>
          </div>
        )}

        {/* ── Main canvas ── */}
        <div className="flex-1 flex items-center justify-center bg-[#2a2a2a] overflow-hidden p-6 md:p-10">
          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{
              width: 'min(75vh, 680px)',
              height: 'min(75vh, 680px)',
              cursor: 'default',
            }}
          >
            {/* Garment image */}
            <img
              src={GARMENT_IMAGES[productType] ?? GARMENT_IMAGES.tshirt}
              alt={productType}
              data-garment="true"
              className="w-full h-full object-contain select-none"
              draggable={false}
            />

            {/* Print area dashed guide */}
            <div
              className="absolute border border-dashed border-[#01696f]/30 pointer-events-none rounded"
              style={{
                left: `${area.left * 100}%`,
                top: `${area.top * 100}%`,
                width: `${area.width * 100}%`,
                height: `${area.height * 100}%`,
              }}
            />

            {/* Artwork + handles */}
            {artworkUrl && (
              <div
                className="absolute"
                style={{ left: artStyle.left, top: artStyle.top, width: artStyle.width }}
              >
                {/* The artwork image — draggable */}
                <div className="relative group">
                  <img
                    ref={artRef}
                    src={artworkUrl}
                    alt="Design artwork"
                    draggable={false}
                    onMouseDown={startMove}
                    onTouchStart={startMove}
                    onClick={(e) => { e.stopPropagation(); setSelected(true); }}
                    className="w-full h-auto block select-none"
                    style={{
                      mixBlendMode: 'multiply',
                      cursor: selected ? 'grab' : 'pointer',
                    }}
                  />

                  {/* Selection border + handles */}
                  {selected && (
                    <>
                      {/* Selection outline */}
                      <div className="absolute inset-0 border-2 border-[#01696f] rounded pointer-events-none" />

                      {/* Delete handle — top left */}
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setArtworkUrl(null); setArtUploadId(null); setSelected(false); }}
                        className="absolute -top-3.5 -left-3.5 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                        title="Remove design"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Scale handle — bottom right */}
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

                      {/* Center button — top right */}
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setTransform(t => ({ ...t, xPct: 0.5, yPct: 0.5 })); }}
                        className="absolute -top-3.5 -right-3.5 w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                        title="Center design"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* No artwork placeholder */}
            {!artworkUrl && (
              <div
                className="absolute flex flex-col items-center justify-center pointer-events-none"
                style={{
                  left: `${area.left * 100}%`,
                  top: `${area.top * 100}%`,
                  width: `${area.width * 100}%`,
                  height: `${area.height * 100}%`,
                }}
              >
                <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-xs text-gray-300 text-center leading-tight">
                  Upload artwork<br />to get started
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right hint panel ── */}
        {artworkUrl && selected && (
          <div className="w-52 flex-shrink-0 bg-[#1e1e1e] border-l border-white/10 flex flex-col p-4 gap-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Design</h3>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Scale</span>
                <span className="font-mono text-[#01696f]">{transform.scalePct}%</span>
              </div>
              <input
                type="range" min={MIN_SCALE} max={MAX_SCALE}
                value={transform.scalePct}
                onChange={(e) => setTransform(t => ({ ...t, scalePct: parseInt(e.target.value) }))}
                className="w-full accent-[#01696f]"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setTransform(t => ({ ...t, xPct: 0.5, yPct: 0.5 }))}
                className="w-full text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg py-2 transition-colors"
              >
                Center on garment
              </button>
              <button
                onClick={() => setTransform(t => ({ ...t, yPct: 0.3 }))}
                className="w-full text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg py-2 transition-colors"
              >
                Move to chest
              </button>
            </div>

            <div className="mt-auto text-[10px] text-gray-600 leading-relaxed">
              Drag the design on the garment to reposition. Use the corner handle to resize.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  label, active, onClick, icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
        active ? 'bg-[#01696f] text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
      <span className="text-[9px] font-medium leading-none">{label}</span>
    </button>
  );
}
