export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductCustomizer from '@/components/ProductCustomizer';
import Link from 'next/link';

interface Props {
  params: { id: string };
  searchParams: { configId?: string };
}

export async function generateMetadata({ params }: Props) {
  const product = await prisma.catalogProduct.findUnique({ where: { id: params.id } });
  return { title: product ? `${product.title} — DTF Pipeline` : 'Product Not Found' };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await prisma.catalogProduct.findUnique({
    where: { id: params.id, status: 'active' },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!product) notFound();

  const parsed = {
    ...product,
    availableSizes:  JSON.parse(product.availableSizes)  as string[],
    availableColors: JSON.parse(product.availableColors) as { label: string; hex: string }[],
  };

  // If a saved config ID was passed (Reorder flow), load it and extract the
  // design state so the customizer can pre-populate artwork + quantities.
  let savedConfig: SavedConfig | null = null;
  if (searchParams.configId) {
    const config = await prisma.productConfiguration.findUnique({
      where: { id: searchParams.configId },
      include: { artUpload: { select: { id: true, storageUrl: true } } },
    });
    if (config) {
      type Inputs = {
        front?: { transform?: { xPct: number; yPct: number; scalePct: number } };
        back?:  { transform?: { xPct: number; yPct: number; scalePct: number } };
        selectedColors?: string[];
        quantities?: Record<string, Record<string, number>>;
      };
      let inputs: Inputs = {};
      try { inputs = (JSON.parse(config.configJson) as { inputs?: Inputs }).inputs ?? {}; } catch {}

      savedConfig = {
        configurationId: config.id,
        artUploadId:    config.artUpload?.id ?? null,
        artworkUrl:     config.artUpload?.storageUrl ?? null,
        front:          inputs.front?.transform ?? null,
        back:           inputs.back?.transform  ?? null,
        selectedColors: inputs.selectedColors  ?? [],
        quantities:     inputs.quantities       ?? {},
      };
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 tracking-tight">DTF Pipeline</Link>
          <nav className="flex gap-6 text-sm text-gray-500">
            <Link href="/products" className="hover:text-gray-900 transition-colors">← All Products</Link>
            <Link href="/account" className="hover:text-gray-900 transition-colors">My Account</Link>
            <Link href="/account/cart" className="hover:text-gray-900 transition-colors">Cart</Link>
            <Link href="/admin/login" className="hover:text-gray-900 transition-colors">Admin</Link>
          </nav>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 py-3">
        <nav className="text-xs text-gray-400 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-gray-600">Products</Link>
          <span>/</span>
          <span className="text-gray-700">{product.title}</span>
          {savedConfig && <><span>/</span><span className="text-[#01696f]">Reordering saved design</span></>}
        </nav>
      </div>

      <ProductCustomizer product={parsed} savedConfig={savedConfig} />
    </main>
  );
}

// Exported so ProductCustomizer can import the type
export type SavedConfig = {
  configurationId: string;
  artUploadId:    string | null;
  artworkUrl:     string | null;
  front:          { xPct: number; yPct: number; scalePct: number } | null;
  back:           { xPct: number; yPct: number; scalePct: number } | null;
  selectedColors: string[];
  quantities:     Record<string, Record<string, number>>;
};
