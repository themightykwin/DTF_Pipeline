export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SidebarLayout from '@/components/account/SidebarLayout';

export const metadata = { title: 'Products — DTF Pipeline' };

export default async function ProductsPage() {
  const products = await prisma.catalogProduct.findMany({
    where: { status: 'active' },
    include: { images: { where: { isFeatured: true }, take: 1 } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return (
    <SidebarLayout>
      <div style={{ padding: '40px' }}>
        {/* Page heading */}
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
            Catalog
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#888888',
            }}
          >
            {products.length} product{products.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {products.length === 0 ? (
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
            <p
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#888888',
                marginBottom: '8px',
              }}
            >
              No products yet
            </p>
            <p style={{ fontSize: '14px', color: '#444444' }}>
              Check back soon — products are being added.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const image = product.images[0];
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group transition-all"
                  style={{
                    background: '#131313',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'block',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#3A3A3A';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px #3A3A3A';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#2A2A2A';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Image area */}
                  <div
                    style={{
                      aspectRatio: '1 / 1',
                      background: '#1A1A1A',
                      overflow: 'hidden',
                    }}
                  >
                    {image ? (
                      <img
                        src={image.storageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                        <svg
                          style={{ width: '64px', height: '64px' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '16px' }}>
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px',
                        color: '#888888',
                        letterSpacing: '0.1em',
                        marginBottom: '4px',
                        textTransform: 'uppercase' as const,
                      }}
                    >
                      {product.productType}
                    </p>
                    <h2
                      className="group-hover:text-[#E8FF47] transition-colors"
                      style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#F5F5F5',
                        marginBottom: '8px',
                        lineHeight: '1.4',
                      }}
                    >
                      {product.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: '14px', color: '#888888' }}>
                        {product.basePriceCents > 0
                          ? `From $${(product.basePriceCents / 100).toFixed(2)}`
                          : 'Contact for pricing'}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#E8FF47',
                          fontWeight: 500,
                        }}
                      >
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
    </SidebarLayout>
  );
}
