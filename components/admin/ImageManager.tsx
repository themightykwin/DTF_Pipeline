'use client';

import { useState, useRef, useTransition } from 'react';
import { deleteCatalogProductImage, reorderCatalogProductImages } from '@/lib/actions/catalog';
import { useRouter } from 'next/navigation';

interface Image {
  id: string;
  storageUrl: string;
  altText?: string | null;
  isFeatured: boolean;
  sortOrder: number;
}

export default function ImageManager({
  productId,
  images: initialImages,
}: {
  productId: string;
  images: Image[];
}) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      form.append('isFeatured', images.length === 0 ? 'true' : 'false');

      const res = await fetch(`/api/admin/catalog/${productId}/images`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.ok) {
        setImages((prev) => [...prev, data.image]);
      }
    }

    setUploading(false);
    router.refresh();
  }

  function handleDelete(imageId: string) {
    startTransition(async () => {
      await deleteCatalogProductImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    });
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#01696f]/50 transition-colors"
      >
        <p className="text-sm text-gray-400">
          {uploading ? 'Uploading…' : 'Click to upload images (PNG, JPG, WEBP)'}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((img) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
                <img src={img.storageUrl} alt={img.altText ?? ''} className="w-full h-full object-cover" />
                {img.isFeatured && (
                  <span className="absolute top-1.5 left-1.5 bg-[#01696f] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    Featured
                  </span>
                )}
                <button
                  onClick={() => handleDelete(img.id)}
                  disabled={isPending}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
