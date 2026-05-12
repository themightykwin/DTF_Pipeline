import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AccountHeader from '@/components/account/AccountHeader';
import CartCheckoutButton from '@/components/account/CartCheckoutButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cart — DTF Pipeline' };

export default async function CartPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');

  const items = await prisma.cartItem.findMany({
    where: { userId: session.userId },
    include: {
      configuration: {
        include: {
          catalogProduct: {
            select: {
              id: true,
              title: true,
              basePriceCents: true,
              productType: true,
              images: {
                where: { isFeatured: true },
                take: 1,
                select: { storageUrl: true, altText: true },
              },
            },
          },
          artUpload: { select: { storageUrl: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Compute totals per item
  const enriched = items.map((item) => {
    let quantities: Record<string, Record<string, number>> = {};
    let selectedColors: string[] = [];
    try { quantities    = JSON.parse(item.quantities as string); } catch {}
    try { selectedColors = JSON.parse(item.selectedColors as string); } catch {}

    const totalUnits = Object.values(quantities).reduce(
      (sum, sizeMap) => sum + Object.values(sizeMap).reduce((s, q) => s + q, 0),
      0
    );
    const basePriceCents = item.configuration.catalogProduct?.basePriceCents ?? 0;
    const priceCents = basePriceCents * totalUnits;
    return { ...item, quantities, selectedColors, totalUnits, priceCents };
  });

  const grandTotalCents = enriched.reduce((s, i) => s + i.priceCents, 0);

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <AccountHeader email={user?.email ?? session.user.email} />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-sm text-gray-500 mt-1">
            {enriched.length === 0
              ? 'No items yet'
              : `${enriched.length} item${enriched.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {enriched.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-24 text-center">
            <p className="text-gray-400 text-sm mb-4">Your cart is empty.</p>
            <Link
              href="/products"
              className="inline-block px-5 py-2.5 bg-[#01696f] text-white text-sm font-semibold rounded-xl hover:bg-[#0c4e54] transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Cart items */}
            {enriched.map((item) => {
              const product = item.configuration.catalogProduct;
              if (!product) return null;
              const image = product.images[0];
              const artUrl = item.configuration.artUpload?.storageUrl;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 flex gap-5"
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 relative">
                    {image ? (
                      <img
                        src={image.storageUrl}
                        alt={image.altText ?? product.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Art overlay */}
                    {artUrl && (
                      <img
                        src={artUrl}
                        alt="Design"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        style={{ padding: '20%' }}
                      />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${product.id}`}
                      className="font-semibold text-gray-900 hover:text-[#01696f] transition-colors text-sm leading-snug"
                    >
                      {product.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{product.productType}</p>

                    {/* Colors */}
                    {item.selectedColors.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        Colors: {item.selectedColors.join(', ')}
                      </p>
                    )}

                    {/* Quantities breakdown */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(item.quantities).map(([color, sizes]) =>
                        Object.entries(sizes as Record<string, number>)
                          .filter(([, qty]) => qty > 0)
                          .map(([size, qty]) => (
                            <span
                              key={`${color}-${size}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600 font-medium"
                            >
                              {color} / {size} × {qty}
                            </span>
                          ))
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-2 italic">Note: {item.notes}</p>
                    )}
                  </div>

                  {/* Price + remove */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="font-semibold text-gray-900 text-sm">
                      ${(item.priceCents / 100).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-400">{item.totalUnits} unit{item.totalUnits !== 1 ? 's' : ''}</span>
                    <CartCheckoutButton
                      cartItemId={item.id}
                      configurationId={item.configuration.id}
                      mode="remove"
                    />
                  </div>
                </div>
              );
            })}

            {/* Order summary + checkout */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-2">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-semibold text-gray-900">Estimated Total</span>
                <span className="text-lg font-bold text-[#01696f]">
                  ${(grandTotalCents / 100).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-5">
                Final pricing is confirmed at checkout. Shipping and applicable taxes may be added by Shopify.
              </p>

              {/* Checkout — iterates all cart items and creates a Shopify draft order */}
              <CartCheckoutButton
                configurationId={enriched[0]?.configuration.id ?? ''}
                mode="checkout"
                cartItems={enriched.map((i) => ({
                  cartItemId: i.id,
                  configurationId: i.configuration.id,
                }))}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
