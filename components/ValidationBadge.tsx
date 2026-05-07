'use client';
import type { ValidationResult } from '@/lib/validation';

interface Props {
  result: ValidationResult;
}

export default function ValidationBadge({ result }: Props) {
  const colors = {
    pass: 'bg-green-50 border-green-200 text-green-800',
    warn: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    fail: 'bg-red-50 border-red-200 text-red-800',
  };

  const icons = {
    pass: '\u2713',
    warn: '\u26a0',
    fail: '\u2717',
  };

  return (
    <div className={`rounded-lg border p-4 text-sm ${colors[result.status]}`}>
      <p className="font-semibold">{icons[result.status]} {result.summary}</p>
      <p className="mt-1 text-xs opacity-80">{result.detail}</p>
      <div className="mt-2 flex gap-4 text-xs opacity-70">
        <span>DPI (W): {result.effectiveDpiWidth}</span>
        <span>DPI (H): {result.effectiveDpiHeight}</span>
        <span>Quality: {result.qualityPct}%</span>
      </div>
      <p className="mt-1 text-xs opacity-70">{result.transparencyNote}</p>
    </div>
  );
}
