export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ProductCustomizer from '@/components/ProductCustomizer';
import SidebarLayout from '@/components/account/SidebarLayout';
import { getCustomerSession } from '@/lib/customer-auth';

interface Props {
  params: { id: string };
  searchParams: { configId?: string };
}

export async function generateMetadata({ params }: Props) {
  const product = await prisma.catalogProduct.findUnique({ where: { id: params.id } });
  return { title: product ? `${product.title} — DTF Pipeline` : 'Product Not Found' };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const session = await getCustomerSession();

  const product = await prisma.catalogProduct.findUnique({
    where: { id: params.id, status: 'active' },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!product) notFound();

  const parsed = {
    ...product,
    availableSizes:  JSON.parse(product.availableSizes)  as string[],
    availableColors: JSON.parse(product.availableColors) as { label: string; hex: string }[],
  };

  // If a saved config ID was passed (Reorder flow), load it and extract the
  // design state so the customizer can pre-populate artwork + quantities.
  let savedConfig: SavedConfig | null = null;
  if (searchParams.configId) {
    const config = await prisma.productConfiguration.findUnique({
      where: { id: searchParams.configId },
      include: { artUpload: { select: { id: true, storageUrl: true } } },
    });
    if (config) {
      type Inputs = {
        front?: { transform?: { xPct: number; yPct: number; scalePct: number } };
        back?:  { transform?: { xPct: number; yPct: number; scalePct: number } };
        selectedColors?: string[];
        quantities?: Record<string, Record<string, number>>;
      };
      let inputs: Inputs = {};
      try { inputs = (JSON.parse(config.configJson) as { inputs?: Inputs }).inputs ?? {}; } catch {}

      savedConfig = {
        configurationId: config.id,
        artUploadId:    config.artUpload?.id ?? null,
        artworkUrl:     config.artUpload?.storageUrl ?? null,
        front:          inputs.front?.transform ?? null,
        back:           inputs.back?.transform  ?? null,
        selectedColors: inputs.selectedColors  ?? [],
        quantities:     inputs.quantities       ?? {},
      };
    }
  }

  return (
    <SidebarLayout
      userName={session?.user.name ?? undefined}
      userEmail={session?.user.email ?? undefined}
    >
      <ProductCustomizer product={parsed} savedConfig={savedConfig} />
    </SidebarLayout>
  );
}

// Exported so ProductCustomizer can import the type
export type SavedConfig = {
  configurationId: string;
  artUploadId:    string | null;
  artworkUrl:     string | null;
  front:          { xPct: number; yPct: number; scalePct: number } | null;
  back:           { xPct: number; yPct: number; scalePct: number } | null;
  selectedColors: string[];
  quantities:     Record<string, Record<string, number>>;
};
