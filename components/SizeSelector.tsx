'use client';

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2X', '3X', '4X', '5X'];

interface Props {
  value: string[];
  onChange: (sizes: string[]) => void;
}

export default function SizeSelector({ value, onChange }: Props) {
  function toggle(size: string) {
    if (value.includes(size)) {
      onChange(value.filter((s) => s !== size));
    } else {
      onChange([...value, size]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {SIZES.map((size) => (
        <button
          key={size}
          onClick={() => toggle(size)}
          aria-pressed={value.includes(size)}
          className={`w-12 h-10 rounded border text-sm font-medium transition-all ${
            value.includes(size)
              ? 'bg-[#01696f] text-white border-[#01696f]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#01696f]'
          }`}
        >
          {size}
        </button>
      ))}
    </div>
  );
}
