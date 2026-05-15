'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SidebarProps {
  /** Current pathname for active state detection (kept for backward compatibility — internally uses usePathname) */
  activePath: string;
  userName?: string;
  userEmail?: string;
}

// ─── Inline SVG Icons (16×16, stroke, strokeWidth 1.5) ───────────────────────

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5l1.8 3.6 4 .58-2.9 2.82.68 3.98L8 10.27l-3.58 1.88.68-3.98L2.2 5.68l4-.58L8 1.5z" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 5.5v7a1 1 0 01-1 1h-9a1 1 0 01-1-1v-7" />
      <path d="M1.5 3.5h13l-1 2h-11l-1-2z" />
      <path d="M6.5 7.5h3" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 1.5h1.8l1.7 7.5h7l1.5-5H4.5" />
      <circle cx="6.5" cy="12.5" r="1" />
      <circle cx="11.5" cy="12.5" r="1" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.5v11M2.5 8h11" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.92.92M11.68 11.68l.92.92M3.4 12.6l.92-.92M11.68 4.32l.92-.92" />
    </svg>
  );
}

// ─── Nav Items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/account',         label: 'Dashboard',  icon: 'grid'     },
  { href: '/account/designs', label: 'My Designs', icon: 'star'     },
  { href: '/account/orders',  label: 'Orders',     icon: 'box'      },
  { href: '/account/cart',    label: 'Cart',       icon: 'cart'     },
  { href: '/products',        label: 'New Design', icon: 'plus'     },
  { href: '/admin/login',     label: 'Admin',      icon: 'settings' },
] as const;

function renderIcon(icon: string) {
  switch (icon) {
    case 'grid':     return <IconGrid />;
    case 'star':     return <IconStar />;
    case 'box':      return <IconBox />;
    case 'cart':     return <IconCart />;
    case 'plus':     return <IconPlus />;
    case 'settings': return <IconSettings />;
    default:         return null;
  }
}

// ─── Initials Helper ──────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/account') return pathname === '/account';
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: '220px',
        minWidth: '220px',
        background: '#0D0D0D',
        borderRight: '1px solid #222222',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* ── Wordmark ── */}
      <div style={{ padding: '24px 20px' }}>
        <Link
          href="/account"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <span style={{ color: '#E8FF47', fontSize: '10px', lineHeight: 1 }}>●</span>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '14px',
              color: '#F5F5F5',
              letterSpacing: '-0.01em',
            }}
          >
            DTF Pipeline
          </span>
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav
        style={{
          flex: 1,
          padding: '12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={!active ? 'hover:bg-[#1A1A1A]' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingTop: '8px',
                paddingBottom: '8px',
                paddingRight: '12px',
                paddingLeft: active ? '9px' : '12px',
                borderRadius: '0 8px 8px 0',
                fontSize: '14px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: active ? 500 : 400,
                textDecoration: 'none',
                transition: 'background 0.15s',
                color: active ? '#E8FF47' : '#888888',
                background: active ? '#1A1A1A' : 'transparent',
                borderLeft: active ? '3px solid #E8FF47' : '3px solid transparent',
              }}
            >
              {renderIcon(icon)}
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── User Footer ── */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #222222',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            background: '#1A1A1A',
            border: '1px solid #E8FF47',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            color: '#E8FF47',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          {getInitials(userName)}
        </div>

        {/* Name + Sign out */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              fontSize: '12px',
              color: '#F5F5F5',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
            title={userName || userEmail}
          >
            {userName || userEmail || 'Account'}
          </span>
          <button
            onClick={() => { window.location.href = '/api/customer/auth/logout'; }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: '10px',
              fontFamily: 'Inter, sans-serif',
              color: '#888888',
              textAlign: 'left',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#FF4747'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888888'; }}
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
