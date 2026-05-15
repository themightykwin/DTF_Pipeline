export const dynamic = 'force-dynamic';

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#F5F5F5', margin: 0, fontFamily: 'Syne, sans-serif' }}>
            Catalog Products
          </h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{products.length} products</p>
        </div>
        <Link
          href="/admin/products/new"
          style={{
            padding: '9px 18px',
            background: '#E8FF47',
            color: '#0A0A0A',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
        >
          + New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#555' }}>
          <p style={{ fontSize: '14px' }}>No products yet.</p>
          <Link href="/admin/products/new" style={{ color: '#E8FF47', fontSize: '13px', marginTop: '8px', display: 'inline-block' }}>
            Create your first product →
          </Link>
        </div>
      ) : (
        <div style={{ background: '#131313', borderRadius: '12px', border: '1px solid #2A2A2A', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Product</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Price</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Configs</th>
                <th style={{ padding: '12px 16px' }} />
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: i < products.length - 1 ? '1px solid #1A1A1A' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1A1A1A')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {p.images[0] ? (
                        <img src={p.images[0].storageUrl} alt={p.title} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #2A2A2A' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#1A1A1A', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#444', letterSpacing: '0.05em' }}>IMG</div>
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#E8E8E8' }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888', textTransform: 'capitalize' }}>{p.productType}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#C0C0C0', fontFamily: 'JetBrains Mono, monospace' }}>${(p.basePriceCents / 100).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}><ProductStatusBadge status={p.status} /></td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>{p._count.configurations}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link href={`/admin/products/${p.id}`} style={{ fontSize: '12px', color: '#E8FF47', fontWeight: 600, textDecoration: 'none' }}>
                      Edit →
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
