'use client';

import { useRef, useEffect, useState } from 'react';

// Print area as % of garment image dimensions for each type
const PRINT_AREA: Record<string, { top: number; left: number; width: number; height: number }> = {
  tshirt:    { top: 0.22, left: 0.25, width: 0.50, height: 0.45 },
  hoodie:    { top: 0.20, left: 0.25, width: 0.50, height: 0.42 },
  crewneck:  { top: 0.22, left: 0.25, width: 0.50, height: 0.42 },
};

const GARMENT_IMAGES: Record<string, string> = {
  tshirt:   '/garments/tshirt-white.jpg',
  hoodie:   '/garments/hoodie-white.jpg',
  crewneck: '/garments/crewneck-white.jpg',
};

export interface ArtworkTransform {
  xPct: number;   // center X within print area, 0–1
  yPct: number;   // center Y within print area, 0–1
  scalePct: number; // 10–150
}

interface Props {
  garmentType: string;
  artworkUrl: string | null;
  transform: ArtworkTransform;
  onTransformChange?: (t: ArtworkTransform) => void;
  interactive?: boolean;
  className?: string;
}

export default function GarmentPreview({
  garmentType,
  artworkUrl,
  transform,
  onTransformChange,
  interactive = false,
  className = '',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startXPct: number;
    startYPct: number;
  }>({ dragging: false, startX: 0, startY: 0, startXPct: 0, startYPct: 0 });

  const area = PRINT_AREA[garmentType] ?? PRINT_AREA.tshirt;
  const garmentSrc = GARMENT_IMAGES[garmentType] ?? GARMENT_IMAGES.tshirt;

  // Artwork natural aspect ratio
  const [artAspect, setArtAspect] = useState(1);
  useEffect(() => {
    if (!artworkUrl) return;
    const img = new Image();
    img.onload = () => setArtAspect(img.naturalHeight / img.naturalWidth);
    img.src = artworkUrl;
  }, [artworkUrl]);

  function getArtStyle() {
    const scale = transform.scalePct / 100;
    // Art width relative to print area width
    const artWidthPct = 80 * scale; // 80% of print area at scale 1
    const artHeightPct = artWidthPct * artAspect * (area.width / area.height);

    // Position: center of artwork within print area
    const leftPct = area.left * 100 + area.width * 100 * transform.xPct - artWidthPct / 2;
    const topPct = area.top * 100 + area.height * 100 * transform.yPct - artHeightPct / 2;

    return {
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${artWidthPct}%`,
      height: 'auto',
    };
  }

  // Drag handlers
  function onMouseDown(e: React.MouseEvent) {
    if (!interactive || !onTransformChange) return;
    e.preventDefault();
    const onChange = onTransformChange;
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startXPct: transform.xPct,
      startYPct: transform.yPct,
    };

    function onMouseMove(e: MouseEvent) {
      if (!dragState.current.dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const printW = area.width * rect.width;
      const printH = area.height * rect.height;
      const dx = (e.clientX - dragState.current.startX) / printW;
      const dy = (e.clientY - dragState.current.startY) / printH;
      onChange({
        ...transform,
        xPct: Math.min(1, Math.max(0, dragState.current.startXPct + dx)),
        yPct: Math.min(1, Math.max(0, dragState.current.startYPct + dy)),
      });
    }

    function onMouseUp() {
      dragState.current.dragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Touch handlers
  function onTouchStart(e: React.TouchEvent) {
    if (!interactive || !onTransformChange) return;
    const touch = e.touches[0];
    dragState.current = {
      dragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startXPct: transform.xPct,
      startYPct: transform.yPct,
    };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragState.current.dragging || !containerRef.current || !onTransformChange) return;
    e.preventDefault();
    const onChange = onTransformChange;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const printW = area.width * rect.width;
    const printH = area.height * rect.height;
    const dx = (touch.clientX - dragState.current.startX) / printW;
    const dy = (touch.clientY - dragState.current.startY) / printH;
    onChange({
      ...transform,
      xPct: Math.min(1, Math.max(0, dragState.current.startXPct + dx)),
      yPct: Math.min(1, Math.max(0, dragState.current.startYPct + dy)),
    });
  }

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Garment image */}
      <img
        src={garmentSrc}
        alt={garmentType}
        className="w-full h-full object-contain"
        draggable={false}
      />

      {/* Print area overlay (visible in interactive mode) */}
      {interactive && (
        <div
          className="absolute border-2 border-dashed border-[#01696f]/40 rounded pointer-events-none"
          style={{
            left: `${area.left * 100}%`,
            top: `${area.top * 100}%`,
            width: `${area.width * 100}%`,
            height: `${area.height * 100}%`,
          }}
        >
          <span className="absolute -top-5 left-0 text-[10px] text-[#01696f]/60 font-medium whitespace-nowrap">
            Print area
          </span>
        </div>
      )}

      {/* Artwork overlay */}
      {artworkUrl && (
        <img
          ref={artRef}
          src={artworkUrl}
          alt="Design artwork"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => { dragState.current.dragging = false; }}
          draggable={false}
          className={`absolute object-contain pointer-events-auto ${
            interactive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
          }`}
          style={{
            ...getArtStyle(),
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* No artwork placeholder */}
      {!artworkUrl && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: `${area.left * 100}%`,
            top: `${area.top * 100}%`,
            width: `${area.width * 100}%`,
            height: `${area.height * 100}%`,
          }}
        >
          <span className="text-xs text-gray-300 font-medium text-center leading-tight px-2">
            Your design<br />appears here
          </span>
        </div>
      )}
    </div>
  );
}
