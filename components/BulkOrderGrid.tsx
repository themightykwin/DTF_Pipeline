'use client';

import { useMemo } from 'react';

export interface BulkOrderGridProps {
  sizes: string[];
  colors: { label: string; hex: string }[];
  selectedColors: string[];
  quantities: Record<string, Record<string, number>>;
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
      <p style={{ fontSize: 13, color: '#888888', padding: '16px 0' }}>
        Select at least one color above to enter quantities.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Table — scrollable on narrow viewports */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #2A2A2A' }}>
        <table style={{ width: '100%', minWidth: 0, borderCollapse: 'collapse' }}>

          {/* Header */}
          <thead>
            <tr style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A' }}>
              <th style={{
                padding: '10px 16px',
                textAlign: 'left',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 500,
                color: '#888888',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                minWidth: 120,
              }}>
                Color
              </th>
              {sizes.map((size) => (
                <th key={size} style={{
                  padding: '10px 8px',
                  textAlign: 'center',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#888888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  minWidth: 52,
                }}>
                  {size}
                </th>
              ))}
              <th style={{
                padding: '10px 16px',
                textAlign: 'right',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 500,
                color: '#888888',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                minWidth: 72,
              }}>
                Subtotal
              </th>
            </tr>
          </thead>

          {/* Color rows */}
          <tbody>
            {activeColors.map((color) => {
              const rowQty = sizes.reduce((sum, s) => sum + (quantities[color.label]?.[s] ?? 0), 0);
              const rowSubtotal = rowQty * basePriceCents;

              return (
                <tr key={color.label} style={{ borderBottom: '1px solid #2A2A2A' }}>
                  {/* Color label */}
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: '1px solid #3A3A3A',
                        flexShrink: 0,
                        backgroundColor: color.hex,
                        display: 'inline-block',
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#F5F5F5' }}>
                        {color.label}
                      </span>
                    </div>
                  </td>

                  {/* Qty inputs */}
                  {sizes.map((size) => (
                    <td key={size} style={{ padding: '8px 4px', textAlign: 'center' }}>
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
                        style={{
                          width: 44,
                          textAlign: 'center',
                          fontSize: 13,
                          background: '#1A1A1A',
                          border: '1px solid #2A2A2A',
                          borderRadius: 4,
                          padding: '6px 4px',
                          color: '#F5F5F5',
                          outline: 'none',
                          appearance: 'textfield',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#E8FF47'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                      />
                    </td>
                  ))}

                  {/* Row subtotal */}
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontWeight: 500, color: rowQty > 0 ? '#E8FF47' : '#444444' }}>
                    {rowQty > 0 ? `$${(rowSubtotal / 100).toFixed(2)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          {totalUnits > 0 && (
            <tfoot>
              <tr style={{ background: '#1A1A1A', borderTop: '2px solid #2A2A2A' }}>
                <td style={{
                  padding: '10px 16px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#888888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Total
                </td>
                {sizes.map((size) => {
                  const colTotal = selectedColors.reduce(
                    (sum, cl) => sum + (quantities[cl]?.[size] ?? 0),
                    0
                  );
                  return (
                    <td key={size} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: colTotal > 0 ? '#F5F5F5' : '#444444' }}>
                      {colTotal > 0 ? colTotal : '—'}
                    </td>
                  );
                })}
                <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#E8FF47' }}>
                  ${(subtotalCents / 100).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          )}

        </table>
      </div>

      {/* Summary bar */}
      {totalUnits > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(232,255,71,0.05)',
          border: '1px solid rgba(232,255,71,0.15)',
          borderRadius: 8,
          padding: '10px 16px',
        }}>
          <span style={{ fontSize: 13, color: '#888888' }}>
            <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{totalUnits} unit{totalUnits !== 1 ? 's' : ''}</span>
            {' '}across {activeColors.length} color{activeColors.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#E8FF47' }}>
            ${(subtotalCents / 100).toFixed(2)}
          </span>
        </div>
      )}

    </div>
  );
}
