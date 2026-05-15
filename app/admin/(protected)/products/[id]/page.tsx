export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import ImageManager from '@/components/admin/ImageManager';

export const metadata = { title: 'Edit Product — Admin' };

interface Props { params: { id: string } }

export default async function EditProductPage({ params }: Props) {
  const product = await prisma.catalogProduct.findUnique({
    where: { id: params.id },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!product) notFound();

  const parsed = {
    ...product,
    availableSizes: JSON.parse(product.availableSizes) as string[],
    availableColors: (JSON.parse(product.availableColors) as { label: string; hex: string }[]),
    variantSkus: product.variantSkus ?? null, // pass raw JSON string — ProductForm parses it
  };

  return (
    <div style={{ maxWidth: '720px' }} className="space-y-10">
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#F5F5F5', marginBottom: '4px', fontFamily: 'Syne, sans-serif' }}>
          Edit Product
        </h1>
        <p style={{ fontSize: '12px', color: '#444', fontFamily: 'JetBrains Mono, monospace' }}>{product.id}</p>
      </div>
      <section>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
          Product Details
        </h2>
        <ProductForm product={parsed} />
      </section>
      <section>
        <h2 style={{ fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
          Images
        </h2>
        <ImageManager productId={product.id} images={product.images} />
      </section>
    </div>
  );
}
