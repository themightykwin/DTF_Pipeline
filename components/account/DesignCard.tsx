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
  designId,
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
    <div
      className="overflow-hidden transition-colors"
      style={{
        background: '#131313',
        border: '1px solid #2A2A2A',
        borderRadius: '12px',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#3A3A3A';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A2A';
      }}
    >
      {/* Preview — garment + artwork overlay via GarmentPreview */}
      <div className="aspect-square p-4" style={{ background: '#1A1A1A' }}>
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
        <p
          className="truncate text-sm"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            color: '#F5F5F5',
          }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 capitalize"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: '#888888',
          }}
        >
          {garmentType}
        </p>
        {totalUnits > 0 && (
          <p
            className="mt-0.5"
            style={{
              fontSize: '10px',
              color: '#888888',
            }}
          >
            {totalUnits} unit{totalUnits !== 1 ? 's' : ''}
            {selectedColors.length > 0 ? ` · ${selectedColors.join(', ')}` : ''}
          </p>
        )}
        <div className="mt-3">
          <Link
            href={`/products/${catalogProductId ?? ''}?configId=${designId}`}
            className="block w-full text-center py-2 text-xs transition-colors"
            style={{
              background: '#E8FF47',
              color: '#0A0A0A',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              borderRadius: '8px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = '#C8DF1F';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = '#E8FF47';
            }}
          >
            Reorder
          </Link>
        </div>
      </div>
    </div>
  );
}
