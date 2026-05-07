'use client';

import { useState, useTransition } from 'react';
import { unsaveConfigFromMyCatalog, renameConfig } from '@/lib/actions/customer-catalog';
import { useRouter } from 'next/navigation';

interface Config {
  id: string;
  customerLabel: string | null;
  thumbnailUrl: string | null;
  status: string;
  updatedAt: Date;
  garmentTemplate: { label: string; garmentType: string };
  artUpload: { storageUrl: string; validationStatus: string } | null;
  catalogProduct: {
    title: string;
    images: { storageUrl: string }[];
  } | null;
}

export default function SavedProductCard({ config }: { config: Config }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(config.customerLabel ?? config.catalogProduct?.title ?? 'My Design');

  const thumb =
    config.thumbnailUrl ??
    config.catalogProduct?.images[0]?.storageUrl ??
    config.artUpload?.storageUrl;

  function handleUnsave() {
    startTransition(async () => {
      await unsaveConfigFromMyCatalog(config.id);
      router.refresh();
    });
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await renameConfig(config.id, label);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-200 text-xs">No preview</span>
        )}
      </div>

      <div className="p-4">
        {/* Label */}
        {editing ? (
          <form onSubmit={handleRename} className="flex gap-2 mb-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-[#01696f]"
              autoFocus
            />
            <button type="submit" disabled={isPending} className="text-xs text-[#01696f] font-medium hover:underline">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-start justify-between mb-1">
            <p className="text-sm font-medium text-gray-900 leading-tight">{label}</p>
            <button
              onClick={() => setEditing(true)}
              className="text-gray-300 hover:text-gray-500 text-xs ml-2 flex-shrink-0"
              title="Rename"
            >
              ✏️
            </button>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-3 capitalize">{config.garmentTemplate.label}</p>

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={`/customize?configId=${config.id}`}
            className="flex-1 text-center py-1.5 text-xs font-medium bg-[#01696f] text-white rounded-lg hover:bg-[#0c4e54] transition-colors"
          >
            Customize
          </a>
          <button
            onClick={handleUnsave}
            disabled={isPending}
            className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
