'use client';
import { useEffect, useRef } from 'react';

interface Props {
  artworkUrl: string | null;
  garmentType: string;
  scalePercent: number;
  yPercent: number;
}

export default function CanvasPreview({ artworkUrl, garmentType, scalePercent, yPercent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 400;
    const H = 500;
    canvas.width = W;
    canvas.height = H;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Draw garment silhouette placeholder
    ctx.fillStyle = '#f3f4f6';
    ctx.roundRect(60, 40, 280, 400, 12);
    ctx.fill();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(garmentType.charAt(0).toUpperCase() + garmentType.slice(1), W / 2, H / 2 + (artworkUrl ? 180 : 0));

    if (!artworkUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const printAreaW = 200;
      const printAreaH = 240;
      const artW = printAreaW * (scalePercent / 100);
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const artH = artW * aspectRatio;
      const artX = (W - artW) / 2;
      const artY = (H * (yPercent / 100)) - (artH / 2);
      ctx.drawImage(img, artX, artY, artW, artH);
    };
    img.src = artworkUrl;
  }, [artworkUrl, garmentType, scalePercent, yPercent]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Product preview"
      className="rounded-xl border border-gray-200 w-full max-w-[400px]"
    />
  );
}
