'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const links = [
  {
    href: '/admin/products',
    label: 'Products',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="2" y="3" width="7" height="7" rx="1"/><rect x="15" y="3" width="7" height="7" rx="1"/>
        <rect x="2" y="14" width="7" height="7" rx="1"/><rect x="15" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: '220px', flexShrink: 0, background: '#0D0D0D',
      borderRight: '1px solid #222222', display: 'flex', flexDirection: 'column', minHeight: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px', borderBottom: '1px solid #1A1A1A' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color: '#F5F5F5', letterSpacing: '-0.02em' }}>
          DTF Pipeline
        </span>
        <span style={{ display: 'block', fontSize: '10px', color: '#444', marginTop: '2px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {links.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '6px', marginBottom: '2px',
              fontSize: '13px', fontWeight: active ? 600 : 400,
              color: active ? '#E8FF47' : '#888',
              background: active ? '#1A1A1A' : 'transparent',
              borderLeft: active ? '3px solid #E8FF47' : '3px solid transparent',
              textDecoration: 'none', transition: 'all 0.15s',
            }}>
              {icon}{label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #1A1A1A' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          style={{
            width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: '6px',
            fontSize: '13px', color: '#555', background: 'none', border: 'none', cursor: 'pointer',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FF4747')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
