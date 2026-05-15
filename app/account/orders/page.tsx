import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/account/SidebarLayout';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Order History — DTF Pipeline' };

const STATUS_LABELS: Record<string, string> = {
  open:           'Open',
  invoice_sent:   'Invoice Sent',
  completed:      'Completed',
  cancelled:      'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  open:           'bg-blue-100 text-blue-700',
  invoice_sent:   'bg-yellow-100 text-yellow-700',
  completed:      'bg-green-100 text-green-700',
  cancelled:      'bg-gray-100 text-gray-500',
};

interface StatusStyle {
  background: string;
  color: string;
  border: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  open: {
    background: 'rgba(37,99,235,0.15)',
    color: '#60A5FA',
    border: 'rgba(37,99,235,0.3)',
  },
  invoice_sent: {
    background: 'rgba(234,179,8,0.15)',
    color: '#FCD34D',
    border: 'rgba(234,179,8,0.3)',
  },
  completed: {
    background: 'rgba(232,255,71,0.1)',
    color: '#E8FF47',
    border: 'rgba(232,255,71,0.2)',
  },
  cancelled: {
    background: 'rgba(255,71,71,0.1)',
    color: '#FF4747',
    border: 'rgba(255,71,71,0.2)',
  },
};

const DEFAULT_STATUS_STYLE: StatusStyle = {
  background: 'rgba(136,136,136,0.1)',
  color: '#888888',
  border: 'rgba(136,136,136,0.2)',
};

export default async function OrderHistoryPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');

  const orders = await prisma.draftOrder.findMany({
    where: { userId: session.userId },
    include: {
      configuration: {
        include: {
          catalogProduct: {
            select: {
              title: true,
              images: { where: { isFeatured: true }, take: 1, select: { storageUrl: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <SidebarLayout userName={session.user.name ?? undefined} userEmail={session.user.email}>
      <div style={{ padding: '40px', maxWidth: '900px' }}>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '28px',
            color: '#F5F5F5',
            marginBottom: '32px',
            letterSpacing: '-0.02em',
          }}
        >
          Order History
        </h1>

        {orders.length === 0 ? (
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
            <p style={{ color: '#888888', fontSize: '14px', marginBottom: '12px' }}>
              No orders yet.
            </p>
            <Link
              href="/products"
              style={{
                color: '#E8FF47',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
              className="hover:underline"
            >
              Start designing →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map((order) => {
              const img = order.configuration.catalogProduct?.images?.[0]?.storageUrl;
              const statusStyle = STATUS_STYLES[order.status] ?? DEFAULT_STATUS_STYLE;

              return (
                <div
                  key={order.id}
                  style={{
                    background: '#131313',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      background: '#1A1A1A',
                      border: '1px solid #2A2A2A',
                      flexShrink: 0,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {img ? (
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#444444', fontSize: '12px' }}>—</span>
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#F5F5F5',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '2px',
                      }}
                    >
                      {order.configuration.catalogProduct?.title ?? 'Custom Order'}
                    </p>
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        color: '#888888',
                        marginBottom: '2px',
                      }}
                    >
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {order.totalPrice && (
                      <p style={{ fontSize: '12px', color: '#888888' }}>
                        ${order.totalPrice.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Status + invoice */}
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
                        paddingLeft: '10px',
                        paddingRight: '10px',
                        paddingTop: '2px',
                        paddingBottom: '2px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: statusStyle.background,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    {order.invoiceUrl && (
                      <a
                        href={order.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '12px',
                          color: '#E8FF47',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                        className="hover:underline"
                      >
                        View Invoice →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
