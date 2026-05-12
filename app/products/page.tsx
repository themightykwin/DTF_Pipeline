export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const metadata = { title: 'Products — DTF Pipeline' };

export default async function ProductsPage() {
  const products = await prisma.catalogProduct.findMany({
    where: { status: 'active' },
    include: { images: { where: { isFeatured: true }, take: 1 } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 tracking-tight">DTF Pipeline</Link>
          <nav className="flex gap-6 text-sm text-gray-500">
            <Link href="/products" className="text-[#01696f] font-medium">Products</Link>
            <Link href="/admin/login" className="hover:text-gray-900 transition-colors">Admin</Link>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Catalog</h1>
          <p className="text-sm text-gray-500">{products.length} product{products.length !== 1 ? 's' : ''} available</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium mb-2">No products yet</p>
            <p className="text-sm">Check back soon — products are being added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const image = product.images[0];
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-[#01696f]/30 transition-all"
                >
                  {/* Image */}
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {image ? (
                      <img
                        src={image.storageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1 capitalize">{product.productType}</p>
                    <h2 className="text-sm font-semibold text-gray-900 mb-2 group-hover:text-[#01696f] transition-colors">{product.title}</h2>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {product.basePriceCents > 0
                          ? `From $${(product.basePriceCents / 100).toFixed(2)}`
                          : 'Contact for pricing'}
                      </span>
                      <span className="text-xs text-[#01696f] font-medium group-hover:underline">
                        Customize →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
