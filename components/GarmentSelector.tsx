'use client';

type Garment = { id: string; type: string; label: string };

const GARMENTS: Garment[] = [
  { id: 'tshirt', type: 'tshirt', label: 'T-Shirt' },
  { id: 'hoodie', type: 'hoodie', label: 'Hoodie' },
  { id: 'crewneck', type: 'crewneck', label: 'Crewneck' },
];

interface Props {
  value: string;
  onChange: (type: string) => void;
}

export default function GarmentSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-3">
      {GARMENTS.map((g) => (
        <button
          key={g.id}
          onClick={() => onChange(g.type)}
          aria-pressed={value === g.type}
          className={`px-5 py-3 rounded-lg border text-sm font-medium transition-all ${
            value === g.type
              ? 'bg-[#01696f] text-white border-[#01696f]'
              : 'bg-white text-gray-700 border-gray-200 hover:border-[#01696f] hover:text-[#01696f]'
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
