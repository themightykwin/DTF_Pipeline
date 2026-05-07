import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import ProductStatusBadge from '@/components/admin/ProductStatusBadge';

export const metadata = { title: 'Products — Admin' };

export default async function AdminProductsPage() {
  const products = await prisma.catalogProduct.findMany({
    include: {
      images: { where: { isFeatured: true }, take: 1 },
      _count: { select: { configurations: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Catalog Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.length} products</p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-[#01696f] text-white text-sm font-medium rounded-lg hover:bg-[#0c4e54] transition-colors"
        >
          + New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm">No products yet.</p>
          <Link href="/admin/products/new" className="text-[#01696f] text-sm mt-2 inline-block hover:underline">
            Create your first product →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Configs</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {p.images[0] ? (
                      <img src={p.images[0].storageUrl} alt={p.title} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">IMG</div>
                    )}
                    <span className="text-sm font-medium text-gray-900">{p.title}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{p.productType}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">${(p.basePriceCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3"><ProductStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p._count.configurations}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/products/${p.id}`} className="text-xs text-[#01696f] hover:underline font-medium">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
