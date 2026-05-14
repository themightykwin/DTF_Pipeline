import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AccountHeader from '@/components/account/AccountHeader';
import LogoutButton from '@/components/account/LogoutButton';

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

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      <AccountHeader email={session.user.email} />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="text-sm text-gray-400 mt-2">{session.user.email}</p>
        </div>

        {/* Primary action cards — matches XD flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {/* Re-order Saved Design */}
          <Link
            href="/account/designs"
            className="group relative bg-white rounded-2xl border border-gray-200 p-7 hover:border-[#01696f]/40 hover:shadow-md transition-all flex flex-col gap-4"
          >
            {savedCount > 0 && (
              <span className="absolute top-4 right-4 bg-[#01696f] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {savedCount}
              </span>
            )}
            <div className="w-11 h-11 rounded-xl bg-[#01696f]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#01696f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-base">Re-order Saved Design</p>
              <p className="text-sm text-gray-400 mt-1 leading-snug">
                Pick up where you left off — edit, update quantities, or re-add to cart.
              </p>
            </div>
            <span className="text-xs font-medium text-[#01696f] group-hover:underline mt-auto">
              View saved designs →
            </span>
          </Link>

          {/* Create New Design */}
          <Link
            href="/products"
            className="group relative bg-[#01696f] rounded-2xl p-7 hover:bg-[#0c4e54] transition-colors flex flex-col gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white text-base">Create New Design</p>
              <p className="text-sm text-white/70 mt-1 leading-snug">
                Browse the catalog, upload your artwork, and customize your garment.
              </p>
            </div>
            <span className="text-xs font-medium text-white/90 group-hover:text-white mt-auto">
              Browse products →
            </span>
          </Link>
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/account/cart"
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#01696f]/30 transition-colors text-center group"
          >
            <p className="text-2xl font-bold text-gray-900">{cartCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Cart</p>
            {cartCount > 0 && (
              <p className="text-[10px] text-[#01696f] font-medium mt-1 group-hover:underline">Checkout →</p>
            )}
          </Link>
          <Link
            href="/account/orders"
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#01696f]/30 transition-colors text-center group"
          >
            <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Orders</p>
            {orderCount > 0 && (
              <p className="text-[10px] text-[#01696f] font-medium mt-1 group-hover:underline">View all →</p>
            )}
          </Link>
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-red-100 transition-colors text-center">
            <LogoutButton
              label="Sign out"
              className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-red-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
