'use client';
import { useState } from 'react';
import GarmentSelector from '@/components/GarmentSelector';
import SizeSelector from '@/components/SizeSelector';
import UploadZone from '@/components/UploadZone';
import ValidationBadge from '@/components/ValidationBadge';
import CanvasPreview from '@/components/CanvasPreview';
import type { ValidationResult } from '@/lib/validation';

const PLACEHOLDER_USER_ID = 'demo-user'; // TODO: replace with Shopify customer ID from session

export default function CustomizePage() {
  const [garmentType, setGarmentType] = useState('tshirt');
  const [sizes, setSizes] = useState<string[]>(['M']);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artUploadId, setArtUploadId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [scalePercent] = useState(84);
  const [yPercent] = useState(42);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [configId, setConfigId] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setIsUploading(true);
    setValidation(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', PLACEHOLDER_USER_ID);
      fd.append('garmentType', garmentType);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json() as { ok: boolean; data: { artUploadId: string; storageUrl: string; validation: ValidationResult } };
      if (json.ok) {
        setArtworkUrl(json.data.storageUrl);
        setArtUploadId(json.data.artUploadId);
        setValidation(json.data.validation);
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    if (!artUploadId || validation?.status === 'fail') return;
    setSubmitState('saving');
    try {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: 'your-store.myshopify.com', // TODO: inject from session
          userId: PLACEHOLDER_USER_ID,
          garmentTemplateId: garmentType,
          artUploadId,
          inputs: { garmentType, sizes },
          scalePercent,
          yPercent,
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

  return (
    <main className="min-h-screen bg-[#f7f6f2] p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Build Your Garment</h1>
        <p className="text-sm text-gray-500 mb-8">Upload your artwork, choose your garment and sizes, and save your design.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left — controls */}
          <div className="flex flex-col gap-6">
            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Garment type</h2>
              <GarmentSelector value={garmentType} onChange={setGarmentType} />
            </section>

            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Sizes</h2>
              <SizeSelector value={sizes} onChange={setSizes} />
            </section>

            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Artwork</h2>
              <UploadZone onUpload={handleUpload} isUploading={isUploading} />
            </section>

            {validation && (
              <section>
                <ValidationBadge result={validation} />
              </section>
            )}

            <button
              onClick={handleSave}
              disabled={!artUploadId || validation?.status === 'fail' || submitState === 'saving'}
              className="mt-2 w-full py-3 rounded-lg bg-[#01696f] text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0c4e54] transition-colors"
            >
              {submitState === 'saving' ? 'Saving…' : submitState === 'done' ? '\u2713 Saved' : 'Save Design'}
            </button>

            {submitState === 'done' && configId && (
              <p className="text-xs text-green-700 text-center">Config ID: {configId}</p>
            )}
            {submitState === 'error' && (
              <p className="text-xs text-red-600 text-center">Something went wrong. Please try again.</p>
            )}
          </div>

          {/* Right — canvas preview */}
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-medium text-gray-700 mb-3 self-start">Preview</h2>
            <CanvasPreview
              artworkUrl={artworkUrl}
              garmentType={garmentType}
              scalePercent={scalePercent}
              yPercent={yPercent}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
