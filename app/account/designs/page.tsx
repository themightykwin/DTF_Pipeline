import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AccountHeader from '@/components/account/AccountHeader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Designs — DTF Pipeline' };

export default async function MyDesignsPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');

  const designs = await prisma.productConfiguration.findMany({
    where: { userId: session.userId, isSaved: true },
    include: {
      catalogProduct: {
        select: {
          id: true, title: true, productType: true, basePriceCents: true,
          images: { where: { isFeatured: true }, take: 1, select: { storageUrl: true, altText: true } },
        },
      },
      artUpload: { select: { storageUrl: true } },
      garmentTemplate: { select: { label: true, garmentType: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const inputs = designs.map(d => {
    try { return JSON.parse(d.configJson) as Record<string, unknown>; }
    catch { return {}; }
  });

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      <AccountHeader />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Designs</h1>
            <p className="text-sm text-gray-500 mt-1">{designs.length} saved design{designs.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/products" className="px-4 py-2 bg-[#01696f] text-white text-sm font-medium rounded-lg hover:bg-[#0c4e54] transition-colors">
            + New Design
          </Link>
        </div>

        {designs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-400 text-sm mb-3">No saved designs yet.</p>
            <Link href="/products" className="text-[#01696f] text-sm font-medium hover:underline">Browse products →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {designs.map((design, i) => {
              const cfg = inputs[i];
              const img = design.catalogProduct?.images?.[0]?.storageUrl ?? design.artUpload?.storageUrl;
              const totalUnits = Object.values((cfg?.quantities as Record<string, Record<string, number>> | undefined) ?? {})
                .reduce((sum, sizes) => sum + Object.values(sizes).reduce((s, q) => s + q, 0), 0);
              return (
                <div key={design.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img src={img} alt={design.customerLabel ?? design.catalogProduct?.title ?? 'Design'} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-gray-300 text-xs text-center">No preview</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {design.customerLabel ?? design.catalogProduct?.title ?? design.garmentTemplate?.label ?? 'Untitled Design'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{design.garmentTemplate?.garmentType ?? '—'}</p>
                    {totalUnits > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{totalUnits} units · {(cfg?.selectedColors as string[])?.join(', ')}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/products/${design.catalogProductId ?? ''}`}
                        className="flex-1 text-center py-1.5 text-xs font-medium text-[#01696f] border border-[#01696f]/30 rounded-lg hover:bg-[#01696f]/5 transition-colors"
                      >
                        Edit
                      </Link>
                      <Link
                        href="/account/cart"
                        className="flex-1 text-center py-1.5 text-xs font-medium bg-[#01696f] text-white rounded-lg hover:bg-[#0c4e54] transition-colors"
                      >
                        Add to Cart
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
