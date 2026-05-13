import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AccountHeader from '@/components/account/AccountHeader';
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
    <main className="min-h-screen bg-[#f7f6f2]">
      <AccountHeader email={session.user.email} />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Designs</h1>
            <p className="text-sm text-gray-500 mt-1">
              {designs.length} saved design{designs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/products"
            className="px-4 py-2 bg-[#01696f] text-white text-sm font-medium rounded-lg hover:bg-[#0c4e54] transition-colors"
          >
            + New Design
          </Link>
        </div>

        {designs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-400 text-sm mb-3">No saved designs yet.</p>
            <Link href="/products" className="text-[#01696f] text-sm font-medium hover:underline">
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
    </main>
  );
}
