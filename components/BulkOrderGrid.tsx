'use client';

import { useMemo } from 'react';

export interface BulkOrderGridProps {
  sizes: string[];
  colors: { label: string; hex: string }[];
  selectedColors: string[];
  quantities: Record<string, Record<string, number>>; // quantities[colorLabel][size] = qty
  onChange: (colorLabel: string, size: string, qty: number) => void;
  basePriceCents: number;
}

export default function BulkOrderGrid({
  sizes,
  colors,
  selectedColors,
  quantities,
  onChange,
  basePriceCents,
}: BulkOrderGridProps) {
  const activeColors = colors.filter((c) => selectedColors.includes(c.label));

  const subtotalCents = useMemo(() => {
    let total = 0;
    for (const colorLabel of selectedColors) {
      for (const size of sizes) {
        const qty = quantities[colorLabel]?.[size] ?? 0;
        total += qty * basePriceCents;
      }
    }
    return total;
  }, [quantities, selectedColors, sizes, basePriceCents]);

  const totalUnits = useMemo(() => {
    let units = 0;
    for (const colorLabel of selectedColors) {
      for (const size of sizes) {
        units += quantities[colorLabel]?.[size] ?? 0;
      }
    }
    return units;
  }, [quantities, selectedColors, sizes]);

  if (activeColors.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">Select at least one color above to enter quantities.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[140px]">
                Color
              </th>
              {sizes.map((size) => (
                <th key={size} className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[60px]">
                  {size}
                </th>
              ))}
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[80px]">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeColors.map((color) => {
              const rowQty = sizes.reduce((sum, s) => sum + (quantities[color.label]?.[s] ?? 0), 0);
              const rowSubtotal = rowQty * basePriceCents;

              return (
                <tr key={color.label} className="hover:bg-gray-50 transition-colors">
                  {/* Color label */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-xs font-medium text-gray-700 leading-tight">{color.label}</span>
                    </div>
                  </td>

                  {/* Qty inputs per size */}
                  {sizes.map((size) => (
                    <td key={size} className="px-2 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="9999"
                        value={quantities[color.label]?.[size] || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          onChange(color.label, size, isNaN(val) || val < 0 ? 0 : val);
                        }}
                        className="w-14 text-center text-sm border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-[#01696f]/30 focus:border-[#01696f] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  ))}

                  {/* Row subtotal */}
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    {rowQty > 0 ? `$${(rowSubtotal / 100).toFixed(2)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer totals */}
          {totalUnits > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Total
                </td>
                {sizes.map((size) => {
                  const colTotal = selectedColors.reduce(
                    (sum, cl) => sum + (quantities[cl]?.[size] ?? 0),
                    0
                  );
                  return (
                    <td key={size} className="px-2 py-3 text-center text-xs font-semibold text-gray-700">
                      {colTotal > 0 ? colTotal : '—'}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right text-sm font-bold text-[#01696f]">
                  ${(subtotalCents / 100).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Summary bar */}
      {totalUnits > 0 && (
        <div className="flex items-center justify-between bg-[#01696f]/5 border border-[#01696f]/20 rounded-xl px-4 py-3">
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{totalUnits} units</span> across {activeColors.length} color{activeColors.length !== 1 ? 's' : ''}
          </span>
          <span className="text-base font-bold text-[#01696f]">
            ${(subtotalCents / 100).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
