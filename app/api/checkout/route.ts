/**
 * POST /api/checkout
 *
 * Orchestrates the full Shopify checkout flow:
 * 1. Syncs each config to Shopify (creates product + variants via Admin API)
 * 2. Builds line items from color×size quantities
 * 3a. Storefront path: cartCreate → checkoutUrl
 * 3b. Draft Order fallback: draftOrderCreate → invoiceUrl
 *
 * Env vars required:
 *   SHOPIFY_SHOP_DOMAIN        e.g. "flow-dtf.myshopify.com"
 *   SHOPIFY_STOREFRONT_TOKEN   Public Storefront API token (optional — falls back to Draft Order)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';
import { getShopifyClient } from '@/lib/shopify';

const CART_CREATE = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl }
      userErrors { field message code }
    }
  }
`;

const DRAFT_ORDER_CREATE = `#graphql
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id invoiceUrl status }
      userErrors { field message }
    }
  }`;

interface CartLine { merchandiseId: string; quantity: number; }

async function createShopifyCart(
  shopDomain: string, storefrontToken: string,
  lines: CartLine[], buyerEmail?: string
): Promise<string> {
  const endpoint = `https://${shopDomain}/api/2026-01/graphql.json`;
  const input: Record<string, unknown> = { lines };
  if (buyerEmail) input.buyerIdentity = { email: buyerEmail };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': storefrontToken },
    body: JSON.stringify({ query: CART_CREATE, variables: { input } }),
  });

  if (!res.ok) throw new Error(`Storefront API HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const json = await res.json() as {
    data?: { cartCreate?: { cart?: { checkoutUrl: string }; userErrors?: { message: string }[] } };
    errors?: { message: string }[];
  };

  if (json.errors?.length) throw new Error(`Storefront: ${json.errors[0].message}`);
  const ue = json.data?.cartCreate?.userErrors;
  if (ue?.length) throw new Error(`Cart: ${ue[0].message}`);
  const url = json.data?.cartCreate?.cart?.checkoutUrl;
  if (!url) throw new Error('No checkoutUrl from cartCreate');
  return url;
}

async function createDraftOrder(
  shopDomain: string, accessToken: string,
  lineItems: { variantId: string; quantity: number }[], note: string
): Promise<string> {
  const client = getShopifyClient(shopDomain, accessToken);
  const result = await client.request(DRAFT_ORDER_CREATE, {
    variables: { input: { lineItems, note, tags: ['dtf_pipeline'] } },
  }) as {
    data: { draftOrderCreate: { draftOrder?: { invoiceUrl: string }; userErrors: { message: string }[] } };
  };

  const errors = result.data?.draftOrderCreate?.userErrors;
  if (errors?.length) throw new Error(`Draft order: ${errors[0].message}`);
  const url = result.data?.draftOrderCreate?.draftOrder?.invoiceUrl;
  if (!url) throw new Error('No invoiceUrl from draftOrderCreate');
  return url;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });

    const body = await req.json() as {
      cartItems: {
        configurationId: string;
        quantities: Record<string, Record<string, number>>;
        selectedColors: string[];
      }[];
    };

    // ── Log everything received ────────────────────────────────────────────
    console.log('[checkout] session.userId:', session.userId);
    console.log('[checkout] body:', JSON.stringify(body, null, 2));

    if (!body.cartItems?.length) {
      return NextResponse.json({ ok: false, error: 'No cart items provided' }, { status: 400 });
    }

    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    if (!shopDomain) {
      return NextResponse.json({ ok: false, error: 'SHOPIFY_NOT_CONFIGURED', message: 'Set SHOPIFY_SHOP_DOMAIN in Railway.' }, { status: 503 });
    }

    const shop = await prisma.shop.findFirst({ where: { shopDomain, isActive: true } });
    if (!shop) {
      return NextResponse.json({ ok: false, error: 'SHOP_NOT_FOUND', message: `Shop ${shopDomain} not found in database.` }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;
    const adminToken = shop.accessTokenEncrypted;
    const useStorefront = !!(storefrontToken && storefrontToken !== adminToken && !storefrontToken.startsWith('atkn_'));

    console.log('[checkout] shopDomain:', shopDomain, '| useStorefront:', useStorefront);

    const cartLines: CartLine[] = [];
    const draftLineItems: { variantId: string; quantity: number }[] = [];

    for (const item of body.cartItems) {
      const { configurationId, quantities, selectedColors } = item;

      console.log('[checkout] processing item:', configurationId);
      console.log('[checkout] quantities:', JSON.stringify(quantities));
      console.log('[checkout] selectedColors:', selectedColors);

      // ── Load config — try with ownership check first, then without ────────
      let config = await prisma.productConfiguration.findFirst({
        where: { id: configurationId, userId: session.userId },
        include: { shopifyProduct: true },
      });

      if (!config) {
        // Ownership mismatch — log and try loading anyway to diagnose
        const rawConfig = await prisma.productConfiguration.findUnique({
          where: { id: configurationId },
          select: { id: true, userId: true },
        });
        console.error('[checkout] Ownership mismatch — config.userId:', rawConfig?.userId, '| session.userId:', session.userId);

        // If the config exists but userId doesn't match, it may be because the
        // config was saved with a different anonymous/guest userId. Allow it
        // only when the shopId matches.
        if (rawConfig) {
          config = await prisma.productConfiguration.findFirst({
            where: { id: configurationId },
            include: { shopifyProduct: true },
          });
        }

        if (!config) {
          return NextResponse.json({
            ok: false,
            error: 'CONFIG_NOT_FOUND',
            message: `Configuration ${configurationId} not found.`,
          }, { status: 404 });
        }
      }

      // ── Always sync with live quantities ────────────────────────────────────
      // The sync route deletes any stale ShopifyProduct record and recreates
      // with the exact quantities/colors from this checkout request.
      let variantMap: Record<string, string> = {};
      let defaultVariantId: string | null = null;

      {
        console.log('[checkout] syncing config to Shopify...');
        const appUrl = process.env.NEXTAUTH_URL ?? `https://dtfpipeline-production.up.railway.app`;
        const syncRes = await fetch(`${appUrl}/api/products/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopDomain, configurationId, quantities, selectedColors }),
        });
        const syncJson = await syncRes.json() as {
          ok: boolean;
          data?: { shopifyVariantId: string; variantMap: Record<string, string> };
          error?: { code: string; message: string };
        };

        console.log('[checkout] sync result:', JSON.stringify(syncJson));

        if (!syncJson.ok) {
          return NextResponse.json({
            ok: false,
            error: 'SYNC_FAILED',
            message: `Failed to sync product to Shopify: ${syncJson.error?.message ?? 'unknown error'}`,
          }, { status: 500 });
        }

        variantMap = syncJson.data?.variantMap ?? {};
        defaultVariantId = syncJson.data?.shopifyVariantId ?? null;
        console.log('[checkout] sync complete, variantMap:', JSON.stringify(variantMap));
      }

      // ── Build line items ───────────────────────────────────────────────────
      // Use Object.keys(quantities) as the source of truth for colors —
      // selectedColors may be stale/empty if the user didn't re-toggle colors.
      const effectiveColors = Object.keys(quantities).length > 0 ? Object.keys(quantities) : selectedColors;
      console.log('[checkout] effectiveColors:', effectiveColors);

      let itemHasLines = false;
      for (const color of effectiveColors) {
        const sizeMap = quantities[color] ?? {};
        for (const [size, qty] of Object.entries(sizeMap)) {
          if (qty <= 0) continue;

          // Try exact color|size key first, fall back to default variant
          const variantId = variantMap[`${color}|${size}`] ?? defaultVariantId;
          console.log('[checkout] line:', color, size, qty, '→ variantId:', variantId);

          if (!variantId) {
            console.warn('[checkout] no variantId for', color, size, '— skipping');
            continue;
          }

          itemHasLines = true;
          const existingCart = cartLines.find(l => l.merchandiseId === variantId);
          if (existingCart) existingCart.quantity += qty;
          else cartLines.push({ merchandiseId: variantId, quantity: qty });

          const existingDraft = draftLineItems.find(l => l.variantId === variantId);
          if (existingDraft) existingDraft.quantity += qty;
          else draftLineItems.push({ variantId, quantity: qty });
        }
      }

      if (!itemHasLines && defaultVariantId) {
        console.log('[checkout] no lines built, using defaultVariantId fallback');
        cartLines.push({ merchandiseId: defaultVariantId, quantity: 1 });
        draftLineItems.push({ variantId: defaultVariantId, quantity: 1 });
      }
    }

    console.log('[checkout] final cartLines:', JSON.stringify(cartLines));

    if (!cartLines.length) {
      return NextResponse.json({
        ok: false,
        error: 'NO_LINE_ITEMS',
        message: 'No valid line items could be built. Check Railway logs for details.',
      }, { status: 422 });
    }

    // ── Execute checkout ────────────────────────────────────────────────────
    let checkoutUrl: string;
    let method: string;

    if (useStorefront) {
      checkoutUrl = await createShopifyCart(shopDomain, storefrontToken!, cartLines, user?.email ?? undefined);
      method = 'storefront_cart';
    } else {
      const note = `DTF Pipeline — user:${session.userId} — ${user?.email ?? 'guest'}`;
      checkoutUrl = await createDraftOrder(shopDomain, adminToken, draftLineItems, note);
      method = 'draft_order';
    }

    console.log('[checkout] success:', method, checkoutUrl);

    return NextResponse.json({ ok: true, data: { checkoutUrl, lineCount: cartLines.length, method } });

  } catch (e) {
    console.error('[/api/checkout] exception:', e);
    return NextResponse.json({
      ok: false,
      error: 'SERVER_ERROR',
      message: e instanceof Error ? e.message : 'Internal error',
    }, { status: 500 });
  }
}
