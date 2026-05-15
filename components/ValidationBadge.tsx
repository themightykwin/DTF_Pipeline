'use client';
import type { ValidationResult } from '@/lib/validation';

interface Props {
  result: ValidationResult;
}

export default function ValidationBadge({ result }: Props) {
  const isPass = result.status === 'pass';
  const isWarn = result.status === 'warn';

  const colors = {
    pass: { bg: '#f0fdf4', border: '#bbf7d0', heading: '#166534', body: '#15803d', muted: '#16a34a' },
    warn: { bg: '#fefce8', border: '#fef08a', heading: '#854d0e', body: '#a16207', muted: '#ca8a04' },
    fail: { bg: '#fef2f2', border: '#fecaca', heading: '#991b1b', body: '#b91c1c', muted: '#dc2626' },
  };
  const c = colors[result.status];

  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '12px 14px' }}>
      {/* Summary */}
      <p style={{ fontSize: '13px', fontWeight: 700, color: c.heading, marginBottom: '3px' }}>
        {isPass ? '✓' : isWarn ? '⚠' : '✕'} {result.summary}
      </p>
      <p style={{ fontSize: '12px', color: c.body, lineHeight: 1.5, marginBottom: isPass ? 0 : '10px' }}>
        {result.detail}
      </p>

      {/* Detailed requirements — only shown on warn/fail */}
      {!isPass && (
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Required</span>
            <span style={{ color: c.heading, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              {result.required.widthPx.toLocaleString()} × {result.required.heightPx.toLocaleString()} px
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Your file</span>
            <span style={{ color: c.body, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              {result.actual.widthPx.toLocaleString()} × {result.actual.heightPx.toLocaleString()} px ({result.qualityPct}%)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Min DPI needed</span>
            <span style={{ color: c.heading, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>300 DPI</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: c.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Your DPI (W / H)</span>
            <span style={{ color: c.body, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              {result.effectiveDpiWidth} / {result.effectiveDpiHeight}
            </span>
          </div>
        </div>
      )}

      {/* Transparency note — always shown */}
      <p style={{ fontSize: '11px', color: c.muted, marginTop: isPass ? '6px' : '8px' }}>
        {result.transparencyNote}
      </p>
    </div>
  );
}
