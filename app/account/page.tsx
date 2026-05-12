import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Account — DTF Pipeline' };

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/account/login');

  const [savedCount, cartCount, orderCount] = await Promise.all([
    prisma.productConfiguration.count({ where: { userId: session.userId, isSaved: true } }),
    prisma.cartItem.count({ where: { userId: session.userId } }),
    prisma.draftOrder.count({ where: { userId: session.userId } }),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 tracking-tight">DTF Pipeline</Link>
          <nav className="flex gap-6 text-sm text-gray-500">
            <Link href="/products" className="hover:text-gray-900 transition-colors">Shop</Link>
            <Link href="/account/cart" className="hover:text-gray-900 transition-colors relative">
              Cart
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-3 w-4 h-4 bg-[#01696f] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Hey{session.user.name ? `, ${session.user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">{session.user.email}</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Saved Designs', value: savedCount, href: '/account/designs', cta: 'View designs →' },
            { label: 'Cart Items',    value: cartCount,  href: '/account/cart',    cta: 'View cart →' },
            { label: 'Orders',        value: orderCount, href: '/account/orders',  cta: 'View orders →' },
          ].map(({ label, value, href, cta }) => (
            <Link key={label} href={href} className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-[#01696f]/40 hover:shadow-sm transition-all group">
              <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
              <p className="text-sm text-gray-500 mb-3">{label}</p>
              <p className="text-xs text-[#01696f] font-medium group-hover:underline">{cta}</p>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/products" className="px-4 py-2 bg-[#01696f] text-white text-sm font-medium rounded-lg hover:bg-[#0c4e54] transition-colors">
              + Start New Design
            </Link>
            <Link href="/account/designs" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:border-gray-400 transition-colors">
              My Saved Designs
            </Link>
            <Link href="/account/orders" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:border-gray-400 transition-colors">
              Order History
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function LogoutButton() {
  return (
    <form action="/api/customer/auth/logout" method="POST">
      <button type="submit" className="hover:text-gray-900 transition-colors">Sign Out</button>
    </form>
  );
}
