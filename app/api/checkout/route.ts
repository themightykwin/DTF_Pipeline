/**
 * POST /api/checkout
 *
 * Orchestrates the full Shopify checkout flow for one or more cart items:
 *
 * PRIMARY path (Storefront API — preferred):
 *   Requires SHOPIFY_STOREFRONT_TOKEN (a *public* Storefront API token, NOT the Admin token).
 *   1. Syncs each config to Shopify (creates product + variants via Admin API)
 *   2. Creates a Shopify cart via Storefront API cartCreate
 *   3. Returns checkoutUrl so the client can redirect the buyer
 *
 * FALLBACK path (Draft Order — used when Storefront token is missing or same as Admin token):
 *   1. Syncs each config to Shopify
 *   2. Creates a Shopify Draft Order via Admin API with all line items
 *   3. Returns the invoiceUrl (Shopify-hosted payment page) as checkoutUrl
 *
 * Required env vars (always):
 *   SHOPIFY_SHOP_DOMAIN       e.g. "flow-dtf.myshopify.com"
 *
 * Additional env var for Storefront path:
 *   SHOPIFY_STOREFRONT_TOKEN  Public Storefront API access token (different from Admin token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';
import { getShopifyClient } from '@/lib/shopify';

// ── Storefront API cart mutation ───────────────────────────────────────────────

const CART_CREATE = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors { field message code }
    }
  }
`;

// ── Admin API Draft Order mutation ─────────────────────────────────────────────

const DRAFT_ORDER_CREATE = `#graphql
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
        status
      }
      userErrors { field message }
    }
  }`;

interface CartLine {
  merchandiseId: string;
  quantity: number;
}

// ── Storefront cart ────────────────────────────────────────────────────────────

async function createShopifyCart(
  shopDomain: string,
  storefrontToken: string,
  lines: CartLine[],
  buyerEmail?: string
): Promise<{ checkoutUrl: string; cartId: string }> {
  const endpoint = `https://${shopDomain}/api/2026-01/graphql.json`;

  const input: Record<string, unknown> = { lines };
  if (buyerEmail) input.buyerIdentity = { email: buyerEmail };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontToken,
    },
    body: JSON.stringify({ query: CART_CREATE, variables: { input } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storefront API HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json() as {
    data?: {
      cartCreate?: {
        cart?: { id: string; checkoutUrl: string };
        userErrors?: { field: string; message: string; code: string }[];
      };
    };
    errors?: { message: string }[];
  };

  if (json.errors?.length) throw new Error(`Storefront GraphQL: ${json.errors[0].message}`);

  const userErrors = json.data?.cartCreate?.userErrors;
  if (userErrors?.length) throw new Error(`Cart error: ${userErrors[0].message}`);

  const cart = json.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) throw new Error('No checkoutUrl returned from Shopify cartCreate');

  return { checkoutUrl: cart.checkoutUrl, cartId: cart.id };
}

// ── Admin API Draft Order (fallback) ──────────────────────────────────────────

async function createDraftOrderFallback(
  shopDomain: string,
  accessToken: string,
  lineItems: { variantId: string; quantity: number }[],
  note: string
): Promise<string> {
  const client = getShopifyClient(shopDomain, accessToken);

  const result = await client.request(DRAFT_ORDER_CREATE, {
    variables: {
      input: {
        lineItems: lineItems.map(({ variantId, quantity }) => ({
          variantId,
          quantity,
        })),
        note,
        tags: ['dtf_pipeline'],
      },
    },
  }) as {
    data: {
      draftOrderCreate: {
        draftOrder?: { id: string; invoiceUrl: string; status: string };
        userErrors: { field: string; message: string }[];
      };
    };
  };

  const errors = result.data?.draftOrderCreate?.userErrors;
  if (errors?.length) throw new Error(`Draft order error: ${errors[0].message}`);

  const invoiceUrl = result.data?.draftOrderCreate?.draftOrder?.invoiceUrl;
  if (!invoiceUrl) throw new Error('No invoiceUrl returned from draftOrderCreate');

  return invoiceUrl;
}

// ── POST /api/checkout ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = await req.json() as {
      cartItems: {
        configurationId: string;
        quantities: Record<string, Record<string, number>>;
        selectedColors: string[];
      }[];
    };

    if (!body.cartItems?.length) {
      return NextResponse.json({ ok: false, error: 'No cart items provided' }, { status: 400 });
    }

    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    if (!shopDomain) {
      return NextResponse.json(
        { ok: false, error: 'SHOPIFY_NOT_CONFIGURED', message: 'Set SHOPIFY_SHOP_DOMAIN in Railway environment variables.' },
        { status: 503 }
      );
    }

    // Load shop — must exist from OAuth install or seeding
    const shop = await prisma.shop.findFirst({
      where: { shopDomain, isActive: true },
    });
    if (!shop) {
      return NextResponse.json(
        {
          ok: false,
          error: 'SHOP_NOT_FOUND',
          message: `Shop ${shopDomain} not found. Visit /api/install?shop=${shopDomain} to complete Shopify OAuth.`,
        },
        { status: 404 }
      );
    }

    // Get buyer email
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });

    // Determine which path to use
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;
    const adminToken = shop.accessTokenEncrypted;
    // If no storefront token, or it looks like an admin token (same value), use fallback
    const useStorefront = storefrontToken && storefrontToken !== adminToken && !storefrontToken.startsWith('atkn_');

    // Build line items from cart items
    const cartLines: CartLine[] = [];
    const draftLineItems: { variantId: string; quantity: number }[] = [];
    const configNotes: string[] = [];

    for (const item of body.cartItems) {
      const { configurationId, quantities, selectedColors } = item;

      // Ownership check
      const config = await prisma.productConfiguration.findFirst({
        where: { id: configurationId, userId: session.userId },
        include: { shopifyProduct: true },
      });

      if (!config) {
        console.warn(`[checkout] Config ${configurationId} not found or not owned by user ${session.userId}`);
        continue;
      }

      configNotes.push(`config:${configurationId}`);

      // Sync to Shopify if not already done
      let variantMap: Record<string, string> = {};
      let defaultVariantId: string | null = null;

      if (!config.shopifyProduct) {
        const appUrl = process.env.NEXTAUTH_URL ?? `https://${shopDomain}`;
        const syncRes = await fetch(`${appUrl}/api/products/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopDomain, configurationId }),
        });
        const syncJson = await syncRes.json() as {
          ok: boolean;
          data?: { shopifyVariantId: string; variantMap: Record<string, string> };
          error?: { message: string };
        };

        if (!syncJson.ok) {
          console.error(`[checkout] Sync failed for ${configurationId}:`, syncJson.error);
          continue;
        }

        variantMap = syncJson.data?.variantMap ?? {};
        defaultVariantId = syncJson.data?.shopifyVariantId ?? null;
      } else {
        // Parse stored variant map
        try { variantMap = JSON.parse(config.shopifyProduct.metafieldKey ?? '{}'); } catch {}
        defaultVariantId = config.shopifyProduct.shopifyVariantId;
      }

      // Map color×size → variant + quantity.
      // Use keys from the quantities object directly — selectedColors may be
      // empty or stale if the user only filled the active color without
      // explicitly checking it in the multi-select.
      const effectiveColors = Object.keys(quantities).length > 0
        ? Object.keys(quantities)
        : selectedColors;

      let itemHasVariants = false;
      for (const color of effectiveColors) {
        const sizeMap = quantities[color] ?? {};
        for (const [size, qty] of Object.entries(sizeMap)) {
          if (qty <= 0) continue;
          const variantId = variantMap[`${color}|${size}`] ?? defaultVariantId;
          if (!variantId) continue;
          itemHasVariants = true;

          // Merge if same variantId appears twice
          const existingCart = cartLines.find((l) => l.merchandiseId === variantId);
          const existingDraft = draftLineItems.find((l) => l.variantId === variantId);
          if (existingCart) existingCart.quantity += qty;
          else cartLines.push({ merchandiseId: variantId, quantity: qty });
          if (existingDraft) existingDraft.quantity += qty;
          else draftLineItems.push({ variantId, quantity: qty });
        }
      }

      // Fallback if no quantity entries (e.g. design-only save with no qty)
      if (!itemHasVariants && defaultVariantId) {
        cartLines.push({ merchandiseId: defaultVariantId, quantity: 1 });
        draftLineItems.push({ variantId: defaultVariantId, quantity: 1 });
      }
    }

    if (!cartLines.length) {
      // Log what we received so this is diagnosable in Railway logs
      console.error('[checkout] NO_LINE_ITEMS — received body:', JSON.stringify({
        itemCount: body.cartItems.length,
        items: body.cartItems.map((i) => ({
          configurationId: i.configurationId,
          selectedColors: i.selectedColors,
          quantityKeys: Object.keys(i.quantities ?? {}),
          quantityValues: i.quantities,
        })),
      }));
      return NextResponse.json(
        { ok: false, error: 'NO_LINE_ITEMS', message: 'No valid line items. Ensure quantities > 0 are selected.' },
        { status: 422 }
      );
    }

    // ── Execute checkout ────────────────────────────────────────────────────

    let checkoutUrl: string;
    let method: string;

    if (useStorefront) {
      // Storefront API path
      const { checkoutUrl: url } = await createShopifyCart(
        shopDomain,
        storefrontToken!,
        cartLines,
        user?.email
      );
      checkoutUrl = url;
      method = 'storefront_cart';
    } else {
      // Draft Order fallback
      const note = `DTF Pipeline order — ${configNotes.join(', ')} — ${user?.email ?? 'guest'}`;
      checkoutUrl = await createDraftOrderFallback(shopDomain, adminToken, draftLineItems, note);
      method = 'draft_order';
    }

    return NextResponse.json({
      ok: true,
      data: { checkoutUrl, lineCount: cartLines.length, method },
    });
  } catch (e) {
    console.error('[/api/checkout]', e);
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR', message }, { status: 500 });
  }
}
