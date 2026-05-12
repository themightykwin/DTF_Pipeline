import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AccountHeader from '@/components/account/AccountHeader';

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
    <main className="min-h-screen bg-[#f7f6f2]">
      <AccountHeader />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Order History</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-400 text-sm mb-3">No orders yet.</p>
            <Link href="/products" className="text-[#01696f] text-sm font-medium hover:underline">Start designing →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const img = order.configuration.catalogProduct?.images?.[0]?.storageUrl;
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden">
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">—</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {order.configuration.catalogProduct?.title ?? 'Custom Order'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {order.totalPrice && (
                      <p className="text-xs text-gray-500 mt-0.5">${order.totalPrice.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    {order.invoiceUrl && (
                      <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#01696f] hover:underline font-medium">
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
    </main>
  );
}
