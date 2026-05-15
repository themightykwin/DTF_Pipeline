/**
 * POST /api/checkout
 *
 * Orchestrates the full Shopify checkout flow for one or more cart items:
 * 1. For each item — sync config to Shopify (create product + variants if needed)
 * 2. Build line items using variant IDs and quantities
 * 3. Create a Shopify cart via Storefront API
 * 4. Return the cart's checkoutUrl so the client can redirect the buyer
 *
 * Required env vars:
 *   SHOPIFY_SHOP_DOMAIN       e.g. "my-store.myshopify.com"
 *   SHOPIFY_STOREFRONT_TOKEN  Public Storefront API access token
 *   (The shop's Admin access token is read from the Shop DB record)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';

// ── Storefront API cart mutation ───────────────────────────────────────────────

const CART_CREATE = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        lines(first: 50) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product { title }
                }
              }
            }
          }
        }
      }
      userErrors { field message code }
    }
  }
`;

interface CartLine {
  merchandiseId: string; // Shopify variant GID
  quantity: number;
}

async function createShopifyCart(
  shopDomain: string,
  storefrontToken: string,
  lines: CartLine[],
  buyerEmail?: string
): Promise<{ checkoutUrl: string; cartId: string }> {
  const endpoint = `https://${shopDomain}/api/2026-01/graphql.json`;

  const input: Record<string, unknown> = { lines };
  if (buyerEmail) {
    input.buyerIdentity = { email: buyerEmail };
  }

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
    throw new Error(`Storefront API HTTP ${res.status}: ${text.slice(0, 200)}`);
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

  if (json.errors?.length) {
    throw new Error(`Storefront GraphQL error: ${json.errors[0].message}`);
  }

  const userErrors = json.data?.cartCreate?.userErrors;
  if (userErrors?.length) {
    throw new Error(`Cart user error: ${userErrors[0].message}`);
  }

  const cart = json.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) {
    throw new Error('No checkoutUrl returned from Shopify cartCreate');
  }

  return { checkoutUrl: cart.checkoutUrl, cartId: cart.id };
}

// ── POST handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth — buyer must be logged in
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = await req.json() as {
      cartItems: { configurationId: string; quantities: Record<string, Record<string, number>>; selectedColors: string[] }[];
    };

    if (!body.cartItems?.length) {
      return NextResponse.json({ ok: false, error: 'No cart items provided' }, { status: 400 });
    }

    // Read required env vars
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;

    if (!shopDomain || !storefrontToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'SHOPIFY_NOT_CONFIGURED',
          message: 'Shopify integration is not yet configured. Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_STOREFRONT_TOKEN environment variables.',
        },
        { status: 503 }
      );
    }

    // Resolve the shop record (needed for Admin API sync)
    const shop = await prisma.shop.findFirst({
      where: { shopDomain, isActive: true },
    });
    if (!shop) {
      return NextResponse.json(
        { ok: false, error: 'SHOP_NOT_FOUND', message: `Shop ${shopDomain} not found in database. Complete the Shopify OAuth install first.` },
        { status: 404 }
      );
    }

    // Get buyer email for cart identity
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });

    // Build Shopify line items
    const cartLines: CartLine[] = [];

    for (const item of body.cartItems) {
      const { configurationId, quantities, selectedColors } = item;

      // Load the config
      const config = await prisma.productConfiguration.findFirst({
        where: { id: configurationId, userId: session.userId }, // ownership check
        include: {
          shopifyProduct: true,
          garmentTemplate: true,
          catalogProduct: true,
        },
      });

      if (!config) {
        console.warn(`[checkout] Config ${configurationId} not found or not owned by user`);
        continue;
      }

      // Sync to Shopify if not already done
      let shopifyProductId = config.shopifyProduct?.shopifyProductId;
      let variantMap: Record<string, string> = {};

      if (!config.shopifyProduct) {
        // Call the sync endpoint internally
        const syncRes = await fetch(
          `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/products/sync`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shopDomain,
              configurationId,
            }),
          }
        );
        const syncJson = await syncRes.json() as {
          ok: boolean;
          data?: { shopifyProductId: string; variantMap: Record<string, string> };
          error?: { message: string };
        };

        if (!syncJson.ok) {
          console.error(`[checkout] Sync failed for config ${configurationId}:`, syncJson.error);
          continue;
        }

        shopifyProductId = syncJson.data!.shopifyProductId;
        variantMap = syncJson.data!.variantMap ?? {};
      } else {
        // Parse stored variant map from metafieldKey (we stored it there as JSON)
        try {
          variantMap = JSON.parse(config.shopifyProduct.metafieldKey ?? '{}');
        } catch {
          variantMap = {};
        }
        // If no map stored, use the single shopifyVariantId for all items
        if (!Object.keys(variantMap).length && config.shopifyProduct.shopifyVariantId) {
          // Fall back: lump all qty into one variant
          let totalQty = 0;
          for (const color of selectedColors) {
            for (const qty of Object.values(quantities[color] ?? {})) totalQty += qty;
          }
          if (totalQty > 0) {
            cartLines.push({ merchandiseId: config.shopifyProduct.shopifyVariantId, quantity: totalQty });
          }
          continue;
        }
      }

      // Map each color×size → variantId, accumulate line items
      for (const color of selectedColors) {
        const sizeMap = quantities[color] ?? {};
        for (const [size, qty] of Object.entries(sizeMap)) {
          if (qty <= 0) continue;
          const variantId = variantMap[`${color}|${size}`];
          if (!variantId) {
            console.warn(`[checkout] No variant found for ${color}|${size} in config ${configurationId}`);
            continue;
          }
          // Merge identical variant IDs (shouldn't happen but be safe)
          const existing = cartLines.find((l) => l.merchandiseId === variantId);
          if (existing) {
            existing.quantity += qty;
          } else {
            cartLines.push({ merchandiseId: variantId, quantity: qty });
          }
        }
      }
    }

    if (!cartLines.length) {
      return NextResponse.json(
        { ok: false, error: 'NO_LINE_ITEMS', message: 'No valid line items could be built. Check that your selections have quantities > 0.' },
        { status: 422 }
      );
    }

    // Create Shopify cart → get checkoutUrl
    const { checkoutUrl, cartId } = await createShopifyCart(
      shopDomain,
      storefrontToken,
      cartLines,
      user?.email
    );

    return NextResponse.json({
      ok: true,
      data: { checkoutUrl, cartId, lineCount: cartLines.length },
    });
  } catch (e) {
    console.error('[/api/checkout]', e);
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json(
      { ok: false, error: 'SERVER_ERROR', message },
      { status: 500 }
    );
  }
}
