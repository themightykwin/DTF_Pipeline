'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/account/LogoutButton';

const NAV_LINKS = [
  { href: '/account',         label: 'Dashboard' },
  { href: '/account/designs', label: 'My Designs' },
  { href: '/account/cart',    label: 'Cart'       },
  { href: '/account/orders',  label: 'Orders'     },
];

interface AccountHeaderProps {
  email?: string;
}

export default function AccountHeader({ email }: AccountHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <Link href="/account" className="text-lg font-bold text-gray-900 tracking-tight">
          DTF Pipeline
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === '/account'
                ? pathname === '/account'
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#01696f]/10 text-[#01696f]'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-xs text-gray-400 truncate max-w-[160px]">
            {email}
          </span>
          <LogoutButton
            label="Sign out"
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
          />
        </div>
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden border-t border-gray-100 bg-gray-50">
        <div className="flex overflow-x-auto">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive =
              href === '/account'
                ? pathname === '/account'
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#01696f] text-[#01696f]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
