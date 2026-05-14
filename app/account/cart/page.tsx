import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/account/SidebarLayout';
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
    <SidebarLayout userName={session.user.name ?? undefined} userEmail={user?.email ?? session.user.email}>
      <main style={{ padding: '40px', maxWidth: '960px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '28px',
              color: '#F5F5F5',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Your Cart
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#888888',
            }}
          >
            {enriched.length === 0
              ? 'No items yet'
              : `${enriched.length} item${enriched.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {enriched.length === 0 ? (
          <div
            style={{
              background: '#131313',
              border: '1px solid #2A2A2A',
              borderRadius: '12px',
              paddingTop: '96px',
              paddingBottom: '96px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#888888', fontSize: '14px', marginBottom: '16px' }}>
              Your cart is empty.
            </p>
            <Link
              href="/products"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: '#E8FF47',
                color: '#0A0A0A',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 0 20px rgba(232,255,71,0.25)',
              }}
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cart items */}
            {enriched.map((item) => {
              const product = item.configuration.catalogProduct;
              if (!product) return null;
              const image = product.images[0];
              const artUrl = item.configuration.artUpload?.storageUrl;

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#131313',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    gap: '20px',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      position: 'relative',
                    }}
                  >
                    {image ? (
                      <img
                        src={image.storageUrl}
                        alt={image.altText ?? product.title}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#444444',
                        }}
                      >
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
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          pointerEvents: 'none',
                          padding: '20%',
                        }}
                      />
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/products/${product.id}`}
                      style={{
                        fontWeight: 600,
                        color: '#F5F5F5',
                        fontSize: '14px',
                        lineHeight: '1.4',
                        textDecoration: 'none',
                        display: 'block',
                        marginBottom: '2px',
                      }}
                      className="hover:text-[#E8FF47] transition-colors"
                    >
                      {product.title}
                    </Link>
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px',
                        color: '#888888',
                        textTransform: 'capitalize',
                        marginBottom: '6px',
                      }}
                    >
                      {product.productType}
                    </p>

                    {/* Colors */}
                    {item.selectedColors.length > 0 && (
                      <p style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
                        Colors: {item.selectedColors.join(', ')}
                      </p>
                    )}

                    {/* Quantities breakdown */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {Object.entries(item.quantities).map(([color, sizes]) =>
                        Object.entries(sizes as Record<string, number>)
                          .filter(([, qty]) => qty > 0)
                          .map(([size, qty]) => (
                            <span
                              key={`${color}-${size}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                paddingLeft: '8px',
                                paddingRight: '8px',
                                paddingTop: '2px',
                                paddingBottom: '2px',
                                background: '#1A1A1A',
                                border: '1px solid #2A2A2A',
                                borderRadius: '9999px',
                                fontSize: '10px',
                                color: '#888888',
                                fontWeight: 500,
                              }}
                            >
                              {color} / {size} × {qty}
                            </span>
                          ))
                      )}
                    </div>

                    {item.notes && (
                      <p style={{ fontSize: '12px', color: '#888888', marginTop: '8px', fontStyle: 'italic' }}>
                        Note: {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Price + remove */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '8px',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#F5F5F5',
                      }}
                    >
                      ${(item.priceCents / 100).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '10px', color: '#888888' }}>
                      {item.totalUnits} unit{item.totalUnits !== 1 ? 's' : ''}
                    </span>
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
            <div
              style={{
                background: '#131313',
                border: '1px solid #2A2A2A',
                borderRadius: '12px',
                padding: '24px',
                marginTop: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#F5F5F5' }}>
                  Estimated Total
                </span>
                <span
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#E8FF47',
                  }}
                >
                  ${(grandTotalCents / 100).toFixed(2)}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#888888', marginBottom: '20px' }}>
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
    </SidebarLayout>
  );
}
