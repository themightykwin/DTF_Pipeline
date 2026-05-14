'use client';

import Link from 'next/link';
import GarmentPreview from '@/components/GarmentPreview';

interface DesignCardProps {
  designId: string;
  label: string;
  garmentType: string;
  garmentImageSrc: string;
  artworkUrl: string | null;
  transform: { xPct: number; yPct: number; scalePct: number };
  totalUnits: number;
  selectedColors: string[];
  catalogProductId: string | null;
}

export default function DesignCard({
  label,
  garmentType,
  garmentImageSrc,
  artworkUrl,
  transform,
  totalUnits,
  selectedColors,
  catalogProductId,
}: DesignCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Preview — garment + artwork overlay via GarmentPreview */}
      <div className="aspect-square bg-gray-50 p-4">
        <GarmentPreview
          imageSrc={garmentImageSrc}
          imageAlt={label}
          garmentType={garmentType}
          artworkUrl={artworkUrl}
          transform={transform}
          interactive={false}
          className="w-full h-full"
        />
      </div>

      <div className="p-4">
        <p className="font-semibold text-gray-900 text-sm truncate">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 capitalize">{garmentType}</p>
        {totalUnits > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {totalUnits} unit{totalUnits !== 1 ? 's' : ''}
            {selectedColors.length > 0 ? ` · ${selectedColors.join(', ')}` : ''}
          </p>
        )}
        <div className="mt-3">
          <Link
            href={`/products/${catalogProductId ?? ''}?configId=${designId}`}
            className="block w-full text-center py-2 text-xs font-semibold bg-[#01696f] text-white rounded-lg hover:bg-[#0c4e54] transition-colors"
          >
            Reorder
          </Link>
        </div>
      </div>
    </div>
  );
}
