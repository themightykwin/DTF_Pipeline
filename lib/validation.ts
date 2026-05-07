export interface PrintRule {
  garmentType: string;
  maxPrintWidthIn: number;
  maxPrintHeightIn: number;
  minDpi: number;
}

export interface ArtworkInput {
  widthPx: number;
  heightPx: number;
  mimeType: string;
}

export interface ValidationResult {
  status: 'pass' | 'warn' | 'fail';
  summary: string;
  detail: string;
  required: { widthPx: number; heightPx: number };
  actual: { widthPx: number; heightPx: number };
  qualityPct: number;
  effectiveDpiWidth: number;
  effectiveDpiHeight: number;
  transparencyNote: string;
}

/**
 * Validate uploaded artwork against a garment's print rules.
 * Artwork is evaluated against the maximum approved print size
 * so that the same file is safe for all sizes in the range.
 */
export function validateArtwork(
  artwork: ArtworkInput,
  rule: PrintRule
): ValidationResult {
  const reqW = rule.maxPrintWidthIn * rule.minDpi;
  const reqH = rule.maxPrintHeightIn * rule.minDpi;
  const limitingRatio = Math.min(artwork.widthPx / reqW, artwork.heightPx / reqH);
  const qualityPct = Math.round(limitingRatio * 100);

  let status: 'pass' | 'warn' | 'fail';
  let summary: string;
  let detail: string;

  if (limitingRatio >= 1) {
    status = 'pass';
    summary = 'Print-ready for full size range';
    detail = 'The artwork meets or exceeds the pixel dimensions needed for the maximum approved print area.';
  } else if (limitingRatio >= 0.75) {
    status = 'warn';
    summary = 'Usable for smaller sizes only';
    detail = 'This artwork may work on smaller garments but is risky for the largest supported sizes.';
  } else {
    status = 'fail';
    summary = 'Not production-ready';
    detail = 'This file is below the minimum pixel dimensions needed for the largest approved print size.';
  }

  const transparencyNote =
    artwork.mimeType === 'image/png'
      ? 'PNG detected — preferred for DTF transparency workflows.'
      : 'Non-PNG upload detected. Consider a transparent PNG for cleaner DTF output.';

  return {
    status,
    summary,
    detail,
    required: { widthPx: reqW, heightPx: reqH },
    actual: { widthPx: artwork.widthPx, heightPx: artwork.heightPx },
    qualityPct,
    effectiveDpiWidth: Math.round(artwork.widthPx / rule.maxPrintWidthIn),
    effectiveDpiHeight: Math.round(artwork.heightPx / rule.maxPrintHeightIn),
    transparencyNote,
  };
}

// Default print rules matching the three garment families
export const DEFAULT_PRINT_RULES: Record<string, PrintRule> = {
  tshirt: {
    garmentType: 'tshirt',
    maxPrintWidthIn: 12,
    maxPrintHeightIn: 16,
    minDpi: 300,
  },
  hoodie: {
    garmentType: 'hoodie',
    maxPrintWidthIn: 12,
    maxPrintHeightIn: 16,
    minDpi: 300,
  },
  crewneck: {
    garmentType: 'crewneck',
    maxPrintWidthIn: 12,
    maxPrintHeightIn: 15,
    minDpi: 300,
  },
};
