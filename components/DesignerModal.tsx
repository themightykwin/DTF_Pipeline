'use client';

import { useState, useEffect } from 'react';
import GarmentPreview, { ArtworkTransform } from '@/components/GarmentPreview';
import UploadZone from '@/components/UploadZone';
import ValidationBadge from '@/components/ValidationBadge';
import type { ValidationResult } from '@/lib/validation';

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

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
        // Reset transform on new upload
        setTransform(DEFAULT_TRANSFORM);
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleSave() {
    if (!artUploadId || !artworkUrl) return;
    onSave(artUploadId, artworkUrl, transform);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close designer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-white">{productTitle} — Designer</span>
        </div>
        <button
          onClick={handleSave}
          disabled={!artUploadId}
          className="px-5 py-2 bg-[#01696f] text-white text-sm font-semibold rounded-lg hover:bg-[#0c4e54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Apply Design
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — controls */}
        <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
          <div className="p-5 space-y-6">

            {/* Upload */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Artwork</h3>
              <UploadZone onUpload={handleUpload} isUploading={isUploading} />
              {validation && (
                <div className="mt-3">
                  <ValidationBadge result={validation} />
                </div>
              )}
            </div>

            {/* Position & Scale controls */}
            {artworkUrl && (
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Position &amp; Size</h3>

                {/* Scale */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-300">Scale</label>
                    <span className="text-xs font-mono text-[#01696f]">{transform.scalePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={150}
                    value={transform.scalePct}
                    onChange={(e) => setTransform((t) => ({ ...t, scalePct: parseInt(e.target.value) }))}
                    className="w-full accent-[#01696f]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>Smaller</span><span>Larger</span>
                  </div>
                </div>

                {/* Horizontal position */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-300">Horizontal</label>
                    <span className="text-xs font-mono text-[#01696f]">
                      {transform.xPct < 0.45 ? 'Left' : transform.xPct > 0.55 ? 'Right' : 'Center'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(transform.xPct * 100)}
                    onChange={(e) => setTransform((t) => ({ ...t, xPct: parseInt(e.target.value) / 100 }))}
                    className="w-full accent-[#01696f]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>Left</span><span>Right</span>
                  </div>
                </div>

                {/* Vertical position */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-300">Vertical</label>
                    <span className="text-xs font-mono text-[#01696f]">
                      {transform.yPct < 0.4 ? 'High' : transform.yPct > 0.6 ? 'Low' : 'Mid'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(transform.yPct * 100)}
                    onChange={(e) => setTransform((t) => ({ ...t, yPct: parseInt(e.target.value) / 100 }))}
                    className="w-full accent-[#01696f]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>Top</span><span>Bottom</span>
                  </div>
                </div>

                {/* Reset */}
                <button
                  onClick={() => setTransform(DEFAULT_TRANSFORM)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
                >
                  Reset position
                </button>
              </div>
            )}

            {/* Instructions */}
            {artworkUrl && (
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-white font-medium">Tip:</span> Drag the artwork directly on the garment to reposition it, or use the sliders above.
                </p>
              </div>
            )}

            {!artworkUrl && (
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Upload your artwork above to see it placed on the garment. PNG with transparency works best for DTF printing.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center — garment canvas */}
        <div className="flex-1 flex items-center justify-center bg-gray-950 p-8 overflow-hidden">
          <div className="relative w-full max-w-md aspect-square">
            <GarmentPreview
              garmentType={productType}
              artworkUrl={artworkUrl}
              transform={transform}
              onTransformChange={setTransform}
              interactive={true}
              className="w-full h-full rounded-2xl overflow-hidden bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
