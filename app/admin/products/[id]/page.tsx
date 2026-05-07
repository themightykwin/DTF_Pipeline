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
    availableColors: JSON.parse(product.availableColors) as { label: string; hex: string }[],
  };

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Edit Product</h1>
        <p className="text-sm text-gray-400">{product.id}</p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-gray-700 mb-4">Product Details</h2>
        <ProductForm product={parsed} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-700 mb-4">Images</h2>
        <ImageManager productId={product.id} images={product.images} />
      </section>
    </div>
  );
}
