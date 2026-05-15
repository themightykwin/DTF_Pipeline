import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/account/SidebarLayout';
import DesignCard from '@/components/account/DesignCard';

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
          images: {
            where: { isFeatured: true },
            take: 1,
            select: { storageUrl: true, altText: true },
          },
        },
      },
      artUpload: { select: { storageUrl: true } },
      garmentTemplate: { select: { label: true, garmentType: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <SidebarLayout userName={session.user.name ?? undefined} userEmail={session.user.email}>
      <div style={{ padding: '40px' }}>

        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
          }}
        >
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
              My Designs
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
              {designs.length} saved design{designs.length !== 1 ? 's' : ''}
            </p>
          </div>

          <Link
            href="/products"
            style={{
              background: '#E8FF47',
              color: '#0A0A0A',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              padding: '8px 16px',
              borderRadius: 8,
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'opacity 0.15s',
            }}
          >
            + New Design
          </Link>
        </div>

        {/* Empty state */}
        {designs.length === 0 ? (
          <div
            style={{
              background: '#131313',
              border: '1px solid #2A2A2A',
              borderRadius: 12,
              padding: '96px 24px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                color: '#888888',
                marginBottom: 12,
              }}
            >
              No saved designs yet.
            </p>
            <Link
              href="/products"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 14,
                color: '#E8FF47',
                textDecoration: 'none',
              }}
            >
              Browse products →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {designs.map((design) => {
              // Parse saved configJson to recover transform + quantities
              let cfg: Record<string, unknown> = {};
              try { cfg = JSON.parse(design.configJson) as Record<string, unknown>; } catch {}

              // configJson shape: { garmentType, artUploadId, inputs: { front, back, selectedColors, quantities }, scalePercent, yPercent }
              type SideTransform = { transform?: { xPct: number; yPct: number; scalePct: number } };
              const inputs = cfg?.inputs as { front?: SideTransform; back?: SideTransform; selectedColors?: string[]; quantities?: Record<string, Record<string, number>> } | undefined;
              const frontTransform = inputs?.front?.transform;
              const backTransform  = inputs?.back?.transform;
              const transform = frontTransform ?? backTransform ?? { xPct: 0.5, yPct: 0.4, scalePct: 80 };

              const quantities = inputs?.quantities ?? {};
              const totalUnits = Object.values(quantities).reduce(
                (sum, sizes) => sum + Object.values(sizes).reduce((s, q) => s + q, 0), 0
              );
              const selectedColors = inputs?.selectedColors ?? [];

              // Prefer featured product image, fall back to first image
              const garmentImageSrc =
                design.catalogProduct?.images?.[0]?.storageUrl ?? '';

              const garmentType =
                design.garmentTemplate?.garmentType ??
                design.catalogProduct?.productType ??
                'tshirt';

              const label =
                design.customerLabel ??
                design.catalogProduct?.title ??
                design.garmentTemplate?.label ??
                'Untitled Design';

              return (
                <DesignCard
                  key={design.id}
                  designId={design.id}
                  label={label}
                  garmentType={garmentType}
                  garmentImageSrc={garmentImageSrc}
                  artworkUrl={design.artUpload?.storageUrl ?? null}
                  transform={transform}
                  totalUnits={totalUnits}
                  selectedColors={selectedColors}
                  catalogProductId={design.catalogProductId}
                />
              );
            })}
          </div>
        )}

      </div>
    </SidebarLayout>
  );
}
