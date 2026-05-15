'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  cartItemId: string;
  configurationId: string;
  quantities: Record<string, Record<string, number>>;
  selectedColors: string[];
}

interface Props {
  cartItemId?: string;
  configurationId: string;
  mode: 'remove' | 'checkout';
  cartItems?: CartItem[];
}

export default function CartCheckoutButton({ cartItemId, configurationId, mode, cartItems }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Remove ─────────────────────────────────────────────────────────────────
  async function handleRemove() {
    if (!cartItemId) return;
    setState('loading');
    try {
      const res = await fetch(`/api/customer/cart/${cartItemId}`, { method: 'DELETE' });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        router.refresh();
      } else {
        setErrorMsg(json.error ?? 'Failed to remove item');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
  async function handleCheckout() {
    setState('loading');
    setErrorMsg('');
    try {
      const items = cartItems ?? [
        {
          cartItemId: cartItemId ?? '',
          configurationId,
          quantities: {},
          selectedColors: [],
        },
      ];

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: items.map((i) => ({
            configurationId: i.configurationId,
            quantities: i.quantities,
            selectedColors: i.selectedColors,
          })),
        }),
      });

      const json = await res.json() as {
        ok: boolean;
        data?: { checkoutUrl: string };
        error?: string;
        message?: string;
      };

      if (json.ok && json.data?.checkoutUrl) {
        // Hand off to Shopify checkout
        window.location.href = json.data.checkoutUrl;
      } else {
        const msg = json.message ?? json.error ?? 'Checkout unavailable. Please contact support.';
        setErrorMsg(msg);
        setState('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  // ── Remove button ──────────────────────────────────────────────────────────
  if (mode === 'remove') {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleRemove}
          disabled={state === 'loading'}
          className="text-[10px] hover:underline transition-colors disabled:opacity-50"
          style={{ color: '#FF4747' }}
        >
          {state === 'loading' ? 'Removing…' : 'Remove'}
        </button>
        {state === 'error' && (
          <p className="text-[10px]" style={{ color: '#FF4747' }}>{errorMsg}</p>
        )}
      </div>
    );
  }

  // ── Checkout button ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckout}
        disabled={state === 'loading'}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '8px',
          background: state === 'loading' ? '#2A2A2A' : '#E8FF47',
          color: state === 'loading' ? '#888888' : '#0A0A0A',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: '14px',
          border: 'none',
          cursor: state === 'loading' ? 'not-allowed' : 'pointer',
          boxShadow: state === 'loading' ? 'none' : '0 0 20px rgba(232,255,71,0.25)',
          transition: 'all 0.15s ease',
          opacity: state === 'loading' ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (state !== 'loading') (e.currentTarget as HTMLButtonElement).style.background = '#C8DF1F';
        }}
        onMouseLeave={(e) => {
          if (state !== 'loading') (e.currentTarget as HTMLButtonElement).style.background = '#E8FF47';
        }}
      >
        {state === 'loading' ? 'Preparing checkout…' : 'Checkout via Shopify →'}
      </button>
      {state === 'error' && (
        <p className="text-xs text-center" style={{ color: '#FF4747' }}>{errorMsg}</p>
      )}
    </div>
  );
}
