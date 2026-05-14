import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/account/SidebarLayout';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Account — DTF Pipeline' };

export default async function AccountDashboard() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');

  const [savedCount, cartCount, orderCount] = await Promise.all([
    prisma.productConfiguration.count({ where: { userId: session.userId, isSaved: true } }),
    prisma.cartItem.count({ where: { userId: session.userId } }),
    prisma.draftOrder.count({ where: { userId: session.userId } }),
  ]);

  const firstName = session.user.name?.split(' ')[0] ?? null;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SidebarLayout userName={session.user.name ?? undefined} userEmail={session.user.email}>
      <div style={{ padding: '40px', maxWidth: '900px' }}>

        {/* Page header */}
        <div>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 28,
              color: '#F5F5F5',
              margin: 0,
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: '#888888',
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            {today}
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: 14,
              color: '#888888',
              marginTop: 4,
            }}
          >
            Welcome back, {firstName || 'there'}.
          </p>
        </div>

        {/* Primary action cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20,
            marginTop: 32,
          }}
        >
          {/* Card 1 — Re-order Saved Design */}
          <Link
            href="/account/designs"
            style={{
              background: '#131313',
              border: '1px solid #2A2A2A',
              borderLeft: '3px solid #E8FF47',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
            }}
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(232,255,71,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E8FF47"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 .49-3" />
              </svg>
            </div>

            {/* Title */}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: '#F5F5F5',
                margin: 0,
              }}
            >
              Re-order a Saved Design
            </p>

            {/* Desc */}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: '#888888',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Pick up where you left off — edit quantities or colors.
            </p>

            {/* savedCount badge */}
            {savedCount > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full self-start"
                style={{ background: '#E8FF47', color: '#0A0A0A' }}
              >
                {savedCount} saved
              </span>
            )}

            {/* Footer */}
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: '#E8FF47',
                marginTop: 'auto',
              }}
            >
              Browse Designs →
            </span>
          </Link>

          {/* Card 2 — Create New Design */}
          <Link
            href="/products"
            style={{
              background: '#131313',
              border: '1px solid #2A2A2A',
              borderLeft: '3px solid #FF4747',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
            }}
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(255,71,71,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF4747"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4v16m8-8H4" />
              </svg>
            </div>

            {/* Title */}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: '#F5F5F5',
                margin: 0,
              }}
            >
              Create New Design
            </p>

            {/* Desc */}
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: '#888888',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Upload artwork, pick a garment, configure your order.
            </p>

            {/* Footer */}
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: '#FF4747',
                marginTop: 'auto',
              }}
            >
              Start Designing →
            </span>
          </Link>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginTop: 20,
          }}
        >
          {/* Saved Designs */}
          <div
            style={{
              background: '#131313',
              border: '1px solid #2A2A2A',
              borderRadius: 12,
              padding: 20,
            }}
          >
            <p
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 36,
                color: '#F5F5F5',
                margin: 0,
              }}
            >
              {savedCount}
            </p>
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#888888',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 4,
              }}
            >
              SAVED DESIGNS
            </p>
          </div>

          {/* In Cart */}
          <Link
            href="/account/cart"
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                background: '#131313',
                border: '1px solid #2A2A2A',
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <p
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 36,
                  color: '#F5F5F5',
                  margin: 0,
                }}
              >
                {cartCount}
              </p>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: '#888888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginTop: 4,
                }}
              >
                IN CART
              </p>
            </div>
          </Link>

          {/* Orders */}
          <Link
            href="/account/orders"
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                background: '#131313',
                border: '1px solid #2A2A2A',
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <p
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: 36,
                  color: '#F5F5F5',
                  margin: 0,
                }}
              >
                {orderCount}
              </p>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: '#888888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginTop: 4,
                }}
              >
                ORDERS
              </p>
            </div>
          </Link>
        </div>

      </div>
    </SidebarLayout>
  );
}
