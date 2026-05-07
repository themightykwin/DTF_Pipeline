'use client';
import { useRef, useState } from 'react';

interface Props {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export default function UploadZone({ onUpload, isUploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    onUpload(files[0]);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all min-h-[200px] ${
        dragging ? 'border-[#01696f] bg-teal-50' : 'border-gray-300 hover:border-[#01696f] bg-gray-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/tiff"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {isUploading ? (
        <p className="text-sm text-gray-500 animate-pulse">Uploading & validating…</p>
      ) : (
        <>
          <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-gray-700">Drop artwork here or <span className="text-[#01696f] underline">browse</span></p>
          <p className="text-xs text-gray-400 mt-1">PNG recommended · 300 DPI · Up to 50 MB</p>
        </>
      )}
    </div>
  );
}
