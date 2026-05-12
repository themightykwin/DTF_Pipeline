export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductCustomizer from '@/components/ProductCustomizer';
import Link from 'next/link';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  const product = await prisma.catalogProduct.findUnique({ where: { id: params.id } });
  return { title: product ? `${product.title} — DTF Pipeline` : 'Product Not Found' };
}

export default async function ProductPage({ params }: Props) {
  const product = await prisma.catalogProduct.findUnique({
    where: { id: params.id, status: 'active' },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!product) notFound();

  const parsed = {
    ...product,
    availableSizes: JSON.parse(product.availableSizes) as string[],
    availableColors: JSON.parse(product.availableColors) as { label: string; hex: string }[],
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 tracking-tight">DTF Pipeline</Link>
          <nav className="flex gap-6 text-sm text-gray-500">
            <Link href="/products" className="hover:text-gray-900 transition-colors">← All Products</Link>
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
        </nav>
      </div>

      {/* Product customizer client component */}
      <ProductCustomizer product={parsed} />
    </main>
  );
}
