'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  cartItemId: string;
  configurationId: string;
}

interface Props {
  cartItemId?: string;
  configurationId: string;
  mode: 'remove' | 'checkout';
  cartItems?: CartItem[]; // used in checkout mode
}

export default function CartCheckoutButton({ cartItemId, configurationId, mode, cartItems }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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

  async function handleCheckout() {
    setState('loading');
    setErrorMsg('');
    try {
      // Create a draft order for the first config (single-item checkout)
      // For multi-item carts a more sophisticated flow would batch them,
      // but Shopify draft orders are per-product-configuration here.
      const targetConfigId = cartItems?.[0]?.configurationId ?? configurationId;

      const res = await fetch('/api/draft-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: 'demo.dtfpipeline.com',
          configurationId: targetConfigId,
          shopifyCustomerId: 'gid://shopify/Customer/demo',
          shippingAddress: {
            firstName: 'Customer',
            lastName: '',
            address1: 'TBD',
            city: 'TBD',
            province: 'TBD',
            zip: '00000',
            country: 'US',
          },
        }),
      });

      const json = await res.json() as {
        ok: boolean;
        data?: { invoiceUrl: string };
        error?: { message: string };
      };

      if (json.ok && json.data?.invoiceUrl) {
        // Redirect to Shopify invoice URL
        window.location.href = json.data.invoiceUrl;
      } else {
        // Shopify integration not fully configured yet — show a friendly message
        const msg = json.error?.message ?? 'Checkout unavailable. Please contact support.';
        setErrorMsg(msg);
        setState('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  if (mode === 'remove') {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleRemove}
          disabled={state === 'loading'}
          className="text-[10px] text-red-500 hover:text-red-700 hover:underline transition-colors disabled:opacity-50"
        >
          {state === 'loading' ? 'Removing…' : 'Remove'}
        </button>
        {state === 'error' && (
          <p className="text-[10px] text-red-500">{errorMsg}</p>
        )}
      </div>
    );
  }

  // Checkout mode
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckout}
        disabled={state === 'loading'}
        className="w-full py-3.5 rounded-xl bg-[#01696f] text-white font-semibold text-sm hover:bg-[#0c4e54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
      >
        {state === 'loading' ? 'Preparing checkout…' : 'Checkout via Shopify →'}
      </button>
      {state === 'error' && (
        <p className="text-xs text-red-600 text-center">{errorMsg}</p>
      )}
    </div>
  );
}
