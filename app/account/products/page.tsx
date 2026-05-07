import { getMySavedProducts } from '@/lib/actions/customer-catalog';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SavedProductCard from '@/components/account/SavedProductCard';

export const metadata = { title: 'My Products — DTF Pipeline' };

export default async function MyProductsPage() {
  let configs;
  try {
    configs = await getMySavedProducts();
  } catch (e: any) {
    if (e.message === 'UNAUTHENTICATED' || e.message === 'INVALID_SESSION') {
      redirect('/account/login');
    }
    throw e;
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">My Products</h1>
            <p className="text-sm text-gray-500 mt-1">Your saved custom designs</p>
          </div>
          <Link
            href="/customize"
            className="px-4 py-2 bg-[#01696f] text-white text-sm font-medium rounded-lg hover:bg-[#0c4e54] transition-colors"
          >
            + Create New
          </Link>
        </div>

        {configs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-400 text-sm mb-3">You haven't saved any designs yet.</p>
            <Link href="/customize" className="text-[#01696f] text-sm hover:underline">
              Start designing →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {configs.map((config) => (
              <SavedProductCard key={config.id} config={config} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
